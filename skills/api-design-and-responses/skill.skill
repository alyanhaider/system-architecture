Use this skill whenever designing or modifying API routes/endpoints, choosing between REST/GraphQL/tRPC, deciding HTTP verbs or status codes, shaping success/error JSON responses, adding pagination, validating request input, versioning an API, or writing error handling and logging code. Trigger on requests like "add an endpoint for X," "what status code should this return," "my API responses look inconsistent," "how should I handle this error," "set up logging," or "why is this query slow" (N+1 queries). Trigger proactively whenever any new route is being added, since inconsistent API shape compounds the longer it's left unaddressed.API Design & Error Handling
Why this matters more than it looks like it should
An API is a contract: send this, get back that. The moment a frontend, mobile app, or any other client starts relying on the current shape of a response, changing that shape means updating every consumer simultaneously. The cost of inconsistency isn't paid upfront — it's paid later, all at once, when something has to change and nothing agrees with anything else. Getting it consistent from the first route costs nothing extra; fixing it after ten routes exist costs a migration.
Choosing REST, GraphQL, or tRPC
REST — each URL is a resource, HTTP verbs are the action. Universally understood, works with every tool and tutorial. The right default for almost everything.
GraphQL — one endpoint, the client specifies exactly what fields it wants. Solves over-fetching, but adds real complexity. Worth it at scale with many different client types; overkill for most indie/small-team projects.
tRPC — backend functions become directly callable from the frontend with full type safety, no manually-maintained contract. Only works when frontend and backend are both TypeScript in the same codebase — genuinely excellent in that specific setup, useless outside it.
Default to REST. Move to tRPC only in a full TypeScript monorepo. Leave GraphQL alone until there's a concrete multi-client reason for it.
URL design rules — apply every one, every time
The danger here isn't any single rule being hard — it's that an AI agent applies them inconsistently across routes without noticing, so the same resource ends up reachable as /getUsers on one route and /user/list on another.

Nouns, never verbs. The HTTP verb already is the action: GET /projects not GET /getProjects; DELETE /projects/123 not POST /deleteProject.
Plural for collections. /projects, /users, /blog-posts — not /project, /user, /blogPost.
Nest for real relationships, but stop at two levels. /projects/123/pages and /projects/123/pages/456 are fine. /projects/123/pages/456/nodes/789/connections is too deep — flatten it into its own top-level resource instead.
Kebab-case for multi-word resources. /blog-posts, /user-settings, /ai-generations — not camelCase.

HTTP verbs, used for what they actually mean
GET     → read, never changes data, safe to retry
POST    → create a new resource, or trigger an action
PUT     → replace the entire resource
PATCH   → update only the fields sent
DELETE  → remove the resource
The PUT/PATCH distinction is the one most often blurred: PUT means "here is the complete object, replace what's there" — any field left out gets wiped. PATCH means "here are the changed fields only, leave everything else alone."
javascript// PUT — every field must be present or it gets wiped
PUT /projects/123
body: { name: 'New Name', description: 'New desc', color: 'blue' }

// PATCH — only what's sent changes
PATCH /projects/123
body: { name: 'New Name' }
One response shape, used everywhere without exception
The single most common AI-generated inconsistency: one route returns a bare array, another wraps it in data, error responses use three different field names across different routes. The frontend ends up writing special-case handling per route, and every new contributor has to relearn which route returns what.
Pick one shape and never deviate:
javascript// success
{
  success: true,
  data: { ... },       // single object or array
  meta: {               // optional, for lists
    total: 100, page: 1, perPage: 20
  }
}

// error
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',     // machine-readable
    message: 'Email is invalid',  // human-readable
    fields: { email: 'Must be a valid email address' }  // optional
  }
}
Write one helper pair and route every response through it — this is what actually enforces the consistency, rather than relying on remembering the shape every time:
javascript// utils/response.js
const ok = (res, data, meta = null) =>
  res.json({ success: true, data, ...(meta && { meta }) })

const fail = (res, status, code, message, fields = null) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(fields && { fields }) }
  })

module.exports = { ok, fail }
Status codes, used for what they mean
200  OK                 → successful GET, PATCH, PUT
201  Created            → successful POST that created something
204  No Content         → successful DELETE
400  Bad Request        → validation error, malformed request
401  Unauthorized        → not logged in
403  Forbidden           → logged in, but not allowed to do this
404  Not Found           → resource doesn't exist
409  Conflict            → duplicate, e.g. email already registered
422  Unprocessable       → right format, wrong data
429  Too Many Requests   → rate limited
500  Server Error        → something broke server-side
The most commonly confused pair is 401 vs 403, and the distinction matters because clients often behave differently on each (401 typically triggers a redirect to login; 403 should not). 401 means "I don't know who you are — log in." 403 means "I know exactly who you are, you're just not allowed to do this." A free-tier user hitting a pro-only endpoint gets 403, never 401 — they're authenticated, just not authorized. Returning 200 for an error, which AI sometimes defaults to, breaks every monitoring tool and HTTP client that checks the status code instead of parsing the body.
Versioning from day one, even solo
A field will eventually get renamed, a response shape will improve, a route will need restructuring — and if anything depends on the current behavior, changing it without warning breaks that consumer. Put the version in the URL before the first route ships:
/api/v1/projects
/api/v1/users
javascriptapp.use('/api/v1', require('./routes/v1'))
// later, breaking changes go into v2 without touching v1
app.use('/api/v2', require('./routes/v2'))
Even with a single client (your own frontend), this costs nothing now and avoids a forced big-bang migration later.
Pagination — required on every list endpoint
Returning every row works at 50 records and falls over at 50,000 — both for the database and for whatever has to render the response. Offset pagination covers most cases:
javascript// GET /projects?page=2&perPage=20
const { page = 1, perPage = 20 } = req.query
const offset = (page - 1) * perPage

const projects = await db.query(
  'SELECT * FROM projects WHERE user_id = ? LIMIT ? OFFSET ?',
  [userId, perPage, offset]
)
const total = await db.query('SELECT COUNT(*) FROM projects WHERE user_id = ?', [userId])

return ok(res, projects, {
  total: total[0].count,
  page: Number(page),
  perPage: Number(perPage),
  totalPages: Math.ceil(total[0].count / perPage)
})
Cursor-based pagination (using the last item's ID as the position marker instead of a page number) is the better fit for feeds, infinite scroll, or anything where new items get inserted mid-list — offset pagination shifts under you in that case.
Validate at the route, before the controller runs
Trusting whatever arrives in req.body means an empty string for a required field surfaces as a cryptic database error, and a negative number where a price is expected just... works. Validate before the controller ever sees the request:
javascriptconst { z } = require('zod')

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.enum(['blue', 'green', 'red', 'purple']).optional()
})

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Invalid input', result.error.flatten().fieldErrors)
    }
    req.body = result.data
    next()
  }
}

router.post('/projects', requireAuth, validate(createProjectSchema), projectController.create)
The N+1 query problem
This is a database bug that shows up specifically in API-list endpoints: fetch a list, then loop over it making one more query per item. Ten items means eleven queries; a hundred means a hundred and one, hammering the database for no reason.
javascript// the bug — one query per project
const projects = await db.query('SELECT * FROM projects WHERE user_id = ?', [userId])
for (const project of projects) {
  project.pages = await db.query('SELECT * FROM pages WHERE project_id = ?', [project.id])
}
javascript// fixed — one query total, via JOIN or an ORM's include/with
const projects = await prisma.project.findMany({
  where: { userId },
  include: { pages: true }
})
The instruction that prevents this reliably: never query inside a loop — use a JOIN or an ORM's include/with feature instead.
Error handling: the same response system, applied to failures
An error response is just the fail() branch of the same contract — but getting there cleanly needs two more pieces: a way to distinguish error types, and one place that turns any thrown error into the right response.
Two audiences, one thrown error
A user needs something actionable and human ("your session expired, log in again") — never a stack trace, never a raw database message. The person debugging at 2am needs everything: full stack trace, request details, user ID, timestamp. The error-handling system's job is to produce both from the same error, automatically, every time — not to require remembering to write both by hand in every catch block.
Custom error classes — so errors carry their own response shape
Generic thrown errors are indistinguishable from each other by the time they reach a catch block. A small class hierarchy fixes that:
javascript// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true   // expected error vs. a programmer mistake
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message, fields = null) { super(message, 400, 'VALIDATION_ERROR', { fields }) }
}
class AuthError extends AppError {
  constructor(message = 'Not authenticated') { super(message, 401, 'AUTH_ERROR') }
}
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') { super(message, 403, 'FORBIDDEN') }
}
class NotFoundError extends AppError {
  constructor(resource = 'Resource') { super(`${resource} not found`, 404, 'NOT_FOUND') }
}
class ConflictError extends AppError {
  constructor(message) { super(message, 409, 'CONFLICT') }
}
class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service} is unavailable`, 503, 'EXTERNAL_SERVICE_ERROR', { service })
    this.originalMessage = message   // log this; never send it to the client
  }
}

module.exports = { AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, ExternalServiceError }
Services throw these directly, with zero HTTP awareness — which keeps the service layer testable on its own, per backend-architecture's controller/service split:
javascriptasync function getProject(projectId, userId) {
  const project = await db.query('SELECT * FROM projects WHERE id = ?', [projectId])
  if (!project) throw new NotFoundError('Project')
  if (project.userId !== userId) throw new ForbiddenError('You do not own this project')
  return project
}
One central handler for everything
Express's four-argument error middleware catches everything thrown anywhere upstream, which is what makes this a single point of control instead of duplicated try/catch logic in every controller:
javascript// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    statusCode: err.statusCode || 500,
    stack: err.stack,
    request: { method: req.method, url: req.url, userId: req.user?.id || null, ip: req.ip },
    ...(err.details && { details: err.details }),
  })

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) }
    })
  }

  // programmer errors / unexpected crashes — never expose internals
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  })
}

module.exports = { errorHandler }
Registered last, after every route: app.use(errorHandler).
Catching async errors — Express doesn't do this automatically
An async route handler that throws doesn't reach the error handler on its own (on Express 4) — the request just hangs with no response and eventually times out. Wrap every async handler:
javascript// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.get('/projects', requireAuth, asyncHandler(async (req, res) => {
  const projects = await projectService.getAll(req.user.id)
  return ok(res, projects)
}))
Structured logging instead of console.log
console.log in production prints to stdout and disappears — it can't be searched, filtered, or alerted on. Structured JSON logging (Winston or similar) means every entry can be queried by field:
javascriptconst logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
})
Use the right level — error for things needing immediate attention, warn for things that might become a problem, info for normal significant events (user registered, payment processed), debug for development-only detail. Mask sensitive fields before logging anything — never log a raw password, token, or full card number:
javascriptfunction maskSensitive(data) {
  const masked = { ...data }
  if (masked.password) masked.password = '[REDACTED]'
  if (masked.token) masked.token = masked.token.slice(0, 8) + '...'
  return masked
}
A request-logging middleware that fires on every response (res.on('finish', ...)) gives automatic per-request logs — method, URL, status, duration, user — without adding a log call to every route by hand.
External services fail — don't let their raw errors reach the client
Wrap third-party calls so a Stripe or OpenAI failure becomes a controlled ExternalServiceError, not a raw error message leaking provider internals to the user:
javascriptasync function generateContent(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4', messages: [{ role: 'user', content: prompt }], timeout: 30000
    })
    return response.choices[0].message.content
  } catch (err) {
    logger.error({ message: 'OpenAI call failed', error: err.message })
    throw new ExternalServiceError('AI service', err.message)
  }
}
Process-level safety net
Some failures — unhandled promise rejections, uncaught exceptions — slip past everything else. Catching them at the process level prevents a server from silently corrupting state:
javascriptprocess.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled promise rejection', reason: reason?.message || reason })
})

process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', error: err.message, stack: err.stack })
  process.exit(1)   // exit after logging — an uncaught exception leaves state unknown; let a process manager restart cleanly
})
An error-monitoring service (Sentry or similar) sits on top of this and captures unhandled errors automatically with stack trace, affected user, and the triggering request — the difference between learning about a bug from a dashboard versus from a user's complaint.
The one-paragraph brief for an AI coding agent

"Use REST with consistent URL naming — plural nouns, kebab-case, nested resources max two levels deep. All responses use shared ok()/fail() helpers; success shape is { success: true, data, meta }, error shape is { success: false, error: { code, message, fields } }. Use correct status codes — 201 for creation, 204 for deletion, 401 for unauthenticated, 403 for unauthorized. Validate all request bodies with Zod before the controller runs. All list endpoints are paginated. Never query inside a loop — use JOINs or ORM includes. All routes prefixed with /api/v1. Throw custom error classes (ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, ExternalServiceError) from services; one central error handler converts them to responses. Wrap every async route handler. Log with structured JSON, masking sensitive fields, never with console.log."

Where this skill stops
For where these route/controller files sit in the overall layering, see backend-architecture. For input validation that's specifically about access control (does this user own this resource), see database-design-security. For rate-limiting specifics on auth routes, see authentication-security.