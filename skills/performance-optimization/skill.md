How to find and fix the most common database and backend performance problems — covering the N+1 query problem, indexes, database connection pooling, slow query analysis, and what happens to your app when traffic spikes. Use this skill whenever the user asks about app performance, slow queries, database optimization, why their app slows down at scale, or mentions "N+1". Also trigger for phrases like "app is getting slow", "database is slow", "too many queries", "query optimization", "connection pool", "how do I scale my database", "slow at 1000 users", "query taking too long", or any time Cursor is writing code that queries inside a loop, fetches lists without pagination, or makes multiple sequential DB calls that could be batched. Always check for N+1 patterns before approving any code that reads from the database in a loop or renders a list of related items.Performance Optimization Skill
The Core Mental Model
Your app has three bottlenecks in order of how often they bite indie devs:

N+1 queries — making 100 DB calls when 1 would do (most common, immediate impact)
Missing indexes — full table scans on large tables (kills you at scale)
Connection pool exhaustion — too many simultaneous requests starving each other
No query analysis — never knowing which queries are actually slow

AI generates code with all four problems by default. None of them show up at 100 rows. All of them appear at 10,000+ rows or 100+ concurrent users.

Problem 1: The N+1 Query — The Silent Killer
What It Is
You fetch a list of things, then for each thing you make another DB query. Ten items = eleven queries. A hundred items = a hundred and one queries. The number scales with your data.
What AI writes:
javascript// N+1 problem — AI generates this constantly
const projects = await db.query(
  'SELECT * FROM projects WHERE user_id = ?', [userId]
)

for (const project of projects) {
  // separate query for EACH project — disaster at scale
  project.pages = await db.query(
    'SELECT * FROM pages WHERE project_id = ?', [project.id]
  )
  project.owner = await db.query(
    'SELECT * FROM users WHERE id = ?', [project.userId]
  )
}
// 10 projects = 21 queries. 100 projects = 201 queries. 1000 projects = 2001 queries.
The Fix: JOIN or ORM Includes
Raw SQL — use a JOIN:
javascript// one query instead of N+1
const projects = await db.query(`
  SELECT 
    projects.*,
    json_agg(
      json_build_object('id', pages.id, 'title', pages.title)
      ORDER BY pages.created_at
    ) FILTER (WHERE pages.id IS NOT NULL) AS pages
  FROM projects
  LEFT JOIN pages ON pages.project_id = projects.id
  WHERE projects.user_id = $1
  GROUP BY projects.id
  ORDER BY projects.created_at DESC
`, [userId])
Prisma — use include:
javascript// Prisma handles the JOIN automatically
const projects = await prisma.project.findMany({
  where: { userId },
  include: {
    pages: {
      orderBy: { createdAt: 'asc' }
    },
    _count: {
      select: { pages: true }  // just the count, not all page data
    }
  },
  orderBy: { createdAt: 'desc' }
})
When you need counts only — don't fetch all rows:
javascript// Wrong — fetches ALL pages just to count them
const pages = await db.query('SELECT * FROM pages WHERE project_id = ?', [id])
const count = pages.length

// Correct — database counts for you
const result = await db.query(
  'SELECT COUNT(*) as count FROM pages WHERE project_id = ?', [id]
)
const count = parseInt(result.rows[0].count)
The Rule for Cursor

"Never query inside a loop. Never use .length on a fetched array to count records. Use JOINs or ORM includes for related data. Use COUNT(*) for counts. If you see a for...of loop that contains a db.query or prisma.findX call, that is an N+1 bug — rewrite it."


Problem 2: Missing Indexes — Slow at Scale
What It Is
Without an index, every query scans every row in the table. Works fine at 1,000 rows. At 100,000 rows, a single query can take seconds. At 1,000,000 rows, minutes.
AI creates tables and never adds indexes. The app is fast during development (small data), slow in production (real data).
Where to Always Add Indexes
Rule: if you write WHERE column = ? or ORDER BY column or JOIN ON column, that column needs an index.
sql-- Foreign keys — ALWAYS indexed (AI almost never does this)
CREATE INDEX idx_projects_user_id     ON projects(user_id);
CREATE INDEX idx_pages_project_id     ON pages(project_id);
CREATE INDEX idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX idx_usage_user_id        ON usage(user_id);

-- Columns you filter by
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_exports_status       ON exports(status);

-- Composite indexes for compound filters (column order matters)
-- "give me user X's usage in period Y" needs both columns
CREATE INDEX idx_usage_user_period    ON usage(user_id, period);
-- "give me all active subscriptions for user X"
CREATE INDEX idx_sub_user_status      ON subscriptions(user_id, status);

-- Stripe IDs — always looked up, always unique
CREATE UNIQUE INDEX idx_sub_stripe_id ON subscriptions(stripe_sub_id)
  WHERE stripe_sub_id IS NOT NULL;
Composite Index Column Order
The order of columns in a composite index matters. Put the most selective column first — the one that narrows down results the most.
sql-- Correct: user_id first (high selectivity), then period
CREATE INDEX idx_usage_user_period ON usage(user_id, period);

-- This index helps: WHERE user_id = ? AND period = ?
-- This index helps: WHERE user_id = ?
-- This index does NOT help: WHERE period = ? alone
How to Know If You're Missing an Index (EXPLAIN ANALYZE)
Run this before any slow query to see what the database is actually doing:
sql-- PostgreSQL
EXPLAIN ANALYZE 
SELECT * FROM projects WHERE user_id = 'abc123' ORDER BY created_at DESC;
Look for these words in the output:

Seq Scan → full table scan → you need an index
Index Scan → using an index → good
Index Only Scan → reading from index alone, no table → best

sql-- Before index: 
-- Seq Scan on projects (cost=0.00..843.20 rows=4 width=120) (actual time=23.4..45.2 rows=4 loops=1)
-- After index:
-- Index Scan using idx_projects_user_id on projects (cost=0.28..12.3 rows=4 width=120) (actual time=0.05..0.08 rows=4 loops=1)
The actual time field shows the real difference. Seconds vs milliseconds.
Adding Indexes to Existing Tables (Without Downtime)
sql-- PostgreSQL — CONCURRENTLY lets the table stay readable while building
CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);

-- MySQL
CREATE INDEX idx_projects_user_id ON projects(user_id) ALGORITHM=INPLACE, LOCK=NONE;
Never run a regular CREATE INDEX on a large production table — it locks the table for reads.

Problem 3: Database Connection Pooling
What It Is
Your database has a maximum number of simultaneous connections — typically 20-100 for a small VPS. If 200 users hit your app at once and each request opens a new DB connection, 180 of them wait in line or get errors.
A connection pool keeps a fixed set of connections open and reuses them. Requests borrow a connection, use it, return it to the pool.
What AI does (wrong):
javascript// Creates a new connection for every single request
const { Client } = require('pg')

async function getUser(id) {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()              // new connection every time
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id])
  await client.end()                  // closes it immediately
  return result.rows[0]
}
// At 100 concurrent requests: 100 simultaneous DB connections
// Your DB has 20 connection limit: 80 requests fail
The correct setup — one pool, used everywhere:
javascript// config/database.js — create the pool ONCE on app startup
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                   // maximum simultaneous connections
  min: 2,                    // keep 2 connections always ready
  idleTimeoutMillis: 30000,  // close idle connections after 30s
  connectionTimeoutMillis: 2000,  // error if can't get connection in 2s
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
})

// log connection errors
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err)
})

module.exports = pool

// Every query helper uses the pool — never creates a new connection
async function query(text, params) {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  
  // log slow queries in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn('Slow query detected:', { text, duration: `${duration}ms` })
  }
  
  return result
}

module.exports = { query, pool }
Connection Pool Sizing
SituationMax connectionsSmall VPS / hobby project5–10Standard production10–20Multiple server instancesmax / number_of_instancesSupabase free tier6 (they have their own limit)
If you have 3 server instances each with max: 20, your database gets up to 60 connections — make sure your database plan supports that.
The Transaction Pattern (Don't Forget to Release)
When doing multiple operations atomically, always release the client:
javascriptasync function transferCredits(fromUserId, toUserId, amount) {
  const client = await pool.connect()  // get connection from pool
  
  try {
    await client.query('BEGIN')
    
    await client.query(
      'UPDATE users SET credits = credits - $1 WHERE id = $2',
      [amount, fromUserId]
    )
    
    await client.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2',
      [amount, toUserId]
    )
    
    await client.query('COMMIT')
    
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()  // ALWAYS return to pool — even if error occurs
  }
}
Forgetting client.release() in the finally block leaks connections. Eventually your pool is full of leaked connections and all new requests hang forever.

Problem 4: Slow Query Analysis in Production
You can't run EXPLAIN ANALYZE in production on every query. Use pg_stat_statements to log slow queries automatically.
Enable in PostgreSQL:
sql-- Enable the extension (done once, requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find your slowest queries
SELECT 
  query,
  calls,
  total_exec_time / calls AS avg_ms,
  rows / calls AS avg_rows,
  total_exec_time
FROM pg_stat_statements
WHERE calls > 10                -- ignore one-off queries
ORDER BY avg_ms DESC            -- slowest average first
LIMIT 20;
In Node.js — log slow queries automatically:
javascript// In your query wrapper (config/database.js)
async function query(text, params) {
  const start = Date.now()
  
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    // log anything over 500ms to your logger
    if (duration > 500) {
      logger.warn({
        message: 'Slow query',
        query: text.slice(0, 200),  // truncate long queries
        duration: `${duration}ms`,
        rows: result.rowCount
      })
    }
    
    return result
  } catch (err) {
    logger.error({
      message: 'Query failed',
      query: text.slice(0, 200),
      error: err.message
    })
    throw err
  }
}

Problem 5: Selecting Too Much Data
AI writes SELECT * everywhere. You fetch 30 columns when you needed 3. At scale with many concurrent requests, this wastes memory, network bandwidth, and DB processing time.
javascript// Wrong — fetches everything for a list view
const projects = await db.query('SELECT * FROM projects WHERE user_id = $1', [userId])

// Correct — fetch only what the list actually displays
const projects = await db.query(
  'SELECT id, name, color, created_at, updated_at FROM projects WHERE user_id = $1',
  [userId]
)

// Prisma equivalent
const projects = await prisma.project.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    color: true,
    createdAt: true,
    updatedAt: true
    // password_hash NOT included, description NOT included
  }
})
Use SELECT * only when you genuinely need every column — which is rarely.

The Query Optimization Checklist
Apply before any feature that reads from the database:

 Any query inside a loop? → N+1 bug → rewrite with JOIN or include
 Any .length on fetched array to count records? → use COUNT(*)
 Foreign key columns indexed? (user_id, project_id, etc.)
 Columns in WHERE clauses indexed?
 Columns in ORDER BY clauses indexed?
 Using SELECT * on a list endpoint? → select only needed columns
 Pool configured in config/database.js? → never new Client() in service files
 Transactions releasing client in finally block?
 Slow query logging enabled in development?


Starter Prompt for Cursor (Performance)
Paste before any database-related feature:
Performance requirements for all database code:
- Never query inside a loop — use JOINs or ORM includes for related data
- Never use array.length on fetched rows to count — use COUNT(*) in SQL
- SELECT only columns actually needed — never SELECT * on list endpoints
- All foreign key columns must have indexes (user_id, project_id, etc.)
- All columns in WHERE and ORDER BY clauses must have indexes
- Database connection via pool in config/database.js only — never new Client() in services
- Pool max 20 connections, always release client in finally block in transactions
- Log queries over 500ms to the logger as warnings
- For pagination: use LIMIT and OFFSET with COUNT(*) for total — never fetch all rows to count