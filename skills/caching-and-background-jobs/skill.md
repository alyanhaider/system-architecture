Use this skill whenever adding caching (Redis, HTTP cache headers, or any "don't recompute this every time" logic), or whenever work needs to happen outside the HTTP request cycle — sending emails, generating PDFs/exports, processing images, calling AI APIs, scheduled/recurring tasks, or anything a user shouldn't have to wait on synchronously. Trigger on requests like "this is slow," "cache this," "send an email after signup," "this export takes too long," "run this every night," or "the database is getting hammered." Trigger proactively whenever a route does expensive work, calls an external API, or makes a user wait more than about a second.Caching & Background Jobs
These two are grouped because they solve the same underlying problem from opposite directions: caching avoids redoing expensive work; background jobs avoid making a user wait for it. Both exist because a database query takes real time, an external API call takes real time, and a server that does either of those synchronously inside every request will eventually buckle under its own success.
Part 1 — Caching
The mental model
A cache is the server remembering an answer it already worked out, instead of recomputing it. Three concrete reasons this matters for a small project specifically: speed (a cache hit is under 1ms vs. 50-200ms for a real query), money (every OpenAI or paid-API call costs money — ten users asking the same thing in the same minute should trigger one call, not ten), and survival (a database has a connection limit; an uncached app under a traffic spike hits the database with every single request at once and chokes).
Three layers, three different problems

Browser cache — the browser stores responses based on HTTP headers the server sends. Free, automatic, zero infrastructure — if the headers are actually set, which AI tools routinely skip.
Server memory cache — a plain object/Map on the server. Fastest possible, but gone on restart and useless across multiple server instances.
Redis — a separate in-memory store built for exactly this. Survives independently of the web server, shared across however many server instances exist. The standard choice for anything beyond a single-instance toy project.

HTTP cache headers — the free layer almost nobody sets up
javascript// static assets with a content hash in the filename — cache for a year
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

// API responses that always need to be fresh
res.setHeader('Cache-Control', 'no-store')

// API responses that rarely change
res.setHeader('Cache-Control', 'public, max-age=300')

// user-specific data — browser only, never a shared cache/CDN
res.setHeader('Cache-Control', 'private, max-age=60')
public vs private is not a minor detail: public allows CDNs and shared proxies to cache it, which is fine for identical-for-everyone data and actively wrong for anything personal.
Redis — the entire mental model in one pattern
Store a value under a key, retrieve it by that key, give it an expiry so it disappears automatically:
javascriptawait redis.set('projects:user:123', JSON.stringify(projects), 'EX', 300)  // 300s expiry
const cached = await redis.get('projects:user:123')
Cache-aside — the one pattern that covers most real use
Check the cache first. Hit → return it. Miss → fetch from the source, store it, return it.
javascriptasync function getProjects(userId) {
  const cacheKey = `projects:user:${userId}`

  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const projects = await db.query('SELECT * FROM projects WHERE user_id = ?', [userId])
  await redis.set(cacheKey, JSON.stringify(projects), 'EX', 300)
  return projects
}
Every other caching pattern is this same shape applied somewhere else — an API response, an AI completion, a rate-limit counter.
Invalidation — the part that's actually hard
The failure mode: a user creates something, the cached list doesn't know about it, the user refreshes and their own new item appears to be missing. Two strategies, and they're not interchangeable:

TTL only — let it expire naturally. Fine when slightly stale data doesn't matter (a public leaderboard, pricing info). Not fine when a user expects to immediately see the result of their own action.
Active invalidation — delete the relevant cache key the moment the underlying data changes:

javascriptasync function createProject(userId, data) {
  const project = await db.query('INSERT INTO projects (user_id, name) VALUES (?, ?)', [userId, data.name])
  await redis.del(`projects:user:${userId}`)  // next read is a guaranteed cache miss → fresh data
  return project
}
Key naming — structure it or lose track of what's cached
A consistent resource:scope:identifier pattern is what makes targeted invalidation possible later:
javascript`projects:user:${userId}`
`project:${projectId}`
`ai:response:${promptHash}`
`user:${userId}:usage:${period}`
This also enables clearing everything for one user by pattern: redis.keys('*:user:' + userId + ':*') then deleting the results.
What to cache, what never to cache
Good candidates: plan limits/features (changes rarely, read constantly), public content, expensive computed results (AI responses, analytics), external API responses (rates, third-party data), a user's own resource lists (with active invalidation), aggregate counts.
Never cache: passwords or auth tokens, payment information, anything with row-level security, one-time tokens (password reset, email verification links), or genuinely real-time data (live chat, live collaboration).
The caching security bug specific to multi-tenant data
This is not a performance bug — it's a data leak. If a cache key doesn't include the user ID for user-specific data, the first user to populate the cache determines what every subsequent user sees:
javascript// dangerous — no user scoping
const cached = await redis.get('projects')   // user B gets user A's projects

// correct — always scope user-specific keys to the user
const cached = await redis.get(`projects:user:${req.user.id}`)
Treat this as a hard rule, not a style preference: any cache key for data that differs per user must contain that user's ID.
Caching expensive AI calls
A deterministic hash of the prompt makes a stable cache key, and AI completions for an identical prompt don't change, so they're safe to cache far longer than ordinary data:
javascriptconst promptHash = crypto.createHash('sha256').update(prompt.trim().toLowerCase()).digest('hex').slice(0, 16)
const cacheKey = `ai:${promptHash}`

const cached = await redis.get(cacheKey)
if (cached) { await trackUsage(userId, 'ai_calls'); return JSON.parse(cached) }

const result = (await openai.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] }))
  .choices[0].message.content

await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400)  // 24h — won't change for the same prompt
await trackUsage(userId, 'ai_calls')
return result
Usage tracking still runs on a cache hit — a cached response still counts against the user's quota, since the value being served is the same either way.
Rate limiting via Redis, not in-memory
An in-memory counter is per-process — with two server instances, a user can get double the intended limit just by landing on different instances. Redis gives one shared counter:
javascriptasync function rateLimit(userId, action, limit, windowSeconds) {
  const key = `ratelimit:${action}:${userId}`
  const current = await redis.incr(key)
  if (current === 1) await redis.expire(key, windowSeconds)
  if (current > limit) {
    const ttl = await redis.ttl(key)
    throw new Error(`Rate limit exceeded. Try again in ${ttl} seconds.`)
  }
  return current
}
Folder structure
src/
  integrations/
    redis/
      redisClient.js       ← initialize the Redis connection once
      cacheService.js       ← get/set/del/invalidate helpers
      rateLimitService.js    ← rate limiting logic
  services/
    projectService.js        ← uses cacheService internally
Nothing outside integrations/redis/ imports Redis directly — every other file goes through cacheService.js, so switching cache providers later means changing one file.

Part 2 — Background Jobs
The problem they solve
Doing heavy work inline blocks the request: a user clicks "export," the server spends 8 seconds generating a PDF, and the user stares at a spinner the entire time. Worse, if the server crashes mid-generation the work is just gone, and if 50 users click export at once, 50 requests do heavy work simultaneously and the server strains under all of it together.
A queue breaks this: the request adds a job (milliseconds) and responds immediately; a separate worker process picks the job up and does the actual work; if the worker crashes, the job is still sitting in the queue waiting, not lost.
The decision rule for what belongs in a job
Not a fixed list — a test: if it takes more than ~500ms, touches an external service, or can fail and needs a retry, it belongs in a background job. Sending emails/SMS, generating exports, processing uploaded images, AI content generation, syncing to third-party services, charging subscriptions, and anything scheduled all pass that test. Reading from the database, simple calculations, returning cached results, and auth checks don't — they stay inline because there's nothing to gain by deferring them.
The queue/worker model
Producer (your API)  →  [job][job][job]  →  Worker (separate process)
The web server only ever adds jobs and responds; it never processes them. A separate worker process pulls jobs and does the work. The queue itself (Redis, via BullMQ) is what makes this durable — jobs persist there, survive a worker crash, and get retried automatically per their retry config.
BullMQ structure
src/
  queues/
    index.js              ← create/export all queues
    emailQueue.js
    exportQueue.js
  workers/
    index.js               ← starts all workers (separate process from the web server)
    emailWorker.js
    exportWorker.js
  jobs/
    sendWelcomeEmail.js     ← the actual logic for one job type
    generatePdfExport.js
javascript// queues/index.js
const { Queue } = require('bullmq')
const emailQueue  = new Queue('email',  { connection: redis })
const exportQueue = new Queue('export', { connection: redis })
module.exports = { emailQueue, exportQueue }
javascript// workers/emailWorker.js — runs in its OWN process, never inside the web server
const emailWorker = new Worker('email', async (job) => {
  const handler = handlers[job.name]
  if (!handler) throw new Error(`Unknown job type: ${job.name}`)
  await handler(job.data)
}, { connection: { connection: redis }, concurrency: 5 })
javascript// adding a job from a service — fire-and-add, don't await the work itself
await emailQueue.add('welcome-email', { userId: user.id, email: user.email })
// registration response is instant; the email sends separately
Why workers must be a separate process
If worker code lives inside app.js alongside the web server, a heavy job blocks request handling, and a web-server crash takes the workers down with it. Running them as separate entry points means a restart of one doesn't affect the other:
json{
  "scripts": {
    "start": "node src/server.js",
    "worker": "node src/workers/index.js"
  }
}
Retry with backoff — external services fail, plan for it
javascriptawait exportQueue.add('generate-pdf', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }   // 2s, then 4s, then 8s
})
Without this, one transient failure (SendGrid hiccup, OpenAI 503) means the job is gone permanently — there's no second attempt unless one was explicitly configured.
Concurrency limits — per queue, based on what the downstream service can take
A default concurrency setting doesn't know that an external API has a rate limit. Ten simultaneous AI-generation jobs hitting OpenAI at once will get several of them rate-limited and failed:
javascriptconst aiWorker = new Worker('ai-generation', handler, { concurrency: 2 })       // rate-limited externally — keep low
const emailWorker = new Worker('email', handler, { concurrency: 10 })          // can send many in parallel
Visibility into failures
A job that exhausts all its retries shouldn't just vanish. Log it with full context and alert on it so a permanent failure is something a human can actually investigate and re-run:
javascriptworker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    logger.error({ message: 'Job permanently failed', queue: job.queueName, jobId: job.id, error: err.message })
    await alertService.notify(`Job failed: ${job.name}`, err)
  }
})
A dashboard (Bull Board) mounted behind admin auth gives a live view of every queue's pending, failed, and completed jobs — essential once there's more than a couple of queues to reason about.
Letting the user track progress
A job running invisibly behind a permanent spinner is a worse experience than no job at all. Store status on a DB row the job updates as it runs, and let the frontend poll it:
javascript// the job itself updates status as it progresses
await db.query('UPDATE exports SET status = ? WHERE id = ?', ['processing', exportId])
// ... do the work ...
await db.query('UPDATE exports SET status = ?, file_url = ? WHERE id = ?', ['complete', url, exportId])
javascript// frontend polls this every few seconds
// GET /api/exports/:exportId/status → { status, fileUrl, error }
Server-Sent Events are a lighter alternative to polling for one-way "notify me when this finishes" updates, without needing full WebSocket infrastructure.
Scheduled jobs
Recurring work — clearing expired tokens, a weekly digest, a daily subscription-status check — uses BullMQ's repeat option with a cron pattern, not a long-lived setInterval in the web process (which would die with the server and wouldn't survive a restart cleanly):
javascriptawait schedulerQueue.add('clear-expired-tokens', {}, { repeat: { pattern: '0 * * * *' } })   // every hour
await schedulerQueue.add('weekly-digest', {}, { repeat: { pattern: '0 9 * * 1' } })           // Monday 9am
The one-paragraph brief for an AI coding agent

"Use Redis for caching via cacheService.js only — never import Redis directly elsewhere. Cache keys for user-specific data must always include the user ID (resource:user:userId). Actively invalidate cache on writes for user-owned data; don't rely on TTL alone. Never cache passwords, tokens, or payment data. Set Cache-Control headers on responses appropriately (no-store for private API data, max-age for public/static). Move any work over ~500ms, any external API call, or anything needing retry into a BullMQ queue. Workers run as a separate process from the web server, one worker file per queue. Configure retry with exponential backoff (3 attempts minimum). Set per-queue concurrency based on the external service's rate limits. Store job progress in the database so the frontend can poll status. Use BullMQ's repeat/cron for scheduled tasks, not setInterval. Log and alert on permanently failed jobs."

Where this skill stops
For the database schema patterns underlying job-progress tables, see database-design-security. For where Redis and queue clients sit in the overall backend folder structure, see backend-architecture's integrations/ pattern. For rate limiting specifically on auth endpoints, see authentication-security.