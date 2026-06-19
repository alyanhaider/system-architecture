Detailed rules for building a clean, maintainable backend — covering the routes/controllers/services/models layer pattern, third-party service integration structure, environment variable management, middleware design, and how to tell Cursor to build each layer correctly. Use this skill whenever the user is building a backend, adding an API endpoint, integrating a third-party service (Stripe, OpenAI, SendGrid, Cloudinary, etc.), asking how backend code should be organized, or asking why their backend is getting messy. Also trigger for phrases like "add an endpoint", "connect to Stripe/OpenAI/SendGrid", "backend is getting complicated", "how do I structure my API", or "where does this backend code go".Backend Architecture Skill
The Fundamental Rule
Every backend file has exactly one job. The moment a file does two jobs, bugs have a place to hide and changes start breaking things.

The Layer Pattern
Layer Definitions
routes/           → Map URL + HTTP method to a controller function
controllers/      → Read the request, call a service, send the response
services/         → All business logic — no HTTP objects allowed here
models/           → All database interaction — nothing else
middleware/       → Functions that run before the handler (auth, validation, rate limit)
utils/            → Pure helper functions — no side effects, no imports from other layers
integrations/     → Third-party API wrappers — one folder per service
config/           → App configuration and environment variable loading
One-Way Data Flow
HTTP Request
    ↓
Route (maps to controller)
    ↓
Middleware (auth, validation, rate limit)
    ↓
Controller (reads req, calls service, sends res)
    ↓
Service (business logic, calls models + integrations)
    ↓
Model / Integration (DB query or 3rd party API call)
    ↓
Response back up the chain
Nothing skips a layer. Nothing flows backwards.

File-by-File Rules
Routes (routes/)
Only URL mapping. No logic.
javascript// routes/projects.js
const router = require('express').Router()
const { createProject, getProject, updateProject } = require('../controllers/projectController')
const { requireAuth } = require('../middleware/auth')
const { checkLimit } = require('../middleware/checkLimits')

router.post('/',     requireAuth, checkLimit('projects'), createProject)
router.get('/:id',  requireAuth, getProject)
router.put('/:id',  requireAuth, updateProject)

module.exports = router
Controllers (controllers/)
Only HTTP in / HTTP out. Never directly touch the DB.
javascript// controllers/projectController.js
const projectService = require('../services/projectService')

async function createProject(req, res) {
  try {
    const { name, description } = req.body
    const project = await projectService.createProject(req.user.id, { name, description })
    res.status(201).json({ project })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

module.exports = { createProject, getProject, updateProject }
Services (services/)
Business logic only. No req, no res, no HTTP objects — ever.
javascript// services/projectService.js
const Project = require('../models/Project')
const { checkProjectLimit } = require('./limitService')

async function createProject(userId, data) {
  // Business rule: validate before creating
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Project name is required')
  }

  // Business rule: check user's plan limit
  await checkProjectLimit(userId)

  return Project.create({ userId, ...data })
}

module.exports = { createProject }
Models (models/)
Only database queries. Use parameterized queries always.
javascript// models/Project.js
const db = require('../config/database')

const Project = {
  async create({ userId, name, description }) {
    const result = await db.query(
      'INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name, description]    // ← parameterized, never concatenated
    )
    return result.rows[0]
  },

  async findById(id, userId) {
    const result = await db.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    )
    return result.rows[0] || null
  }
}

module.exports = Project

Third-Party Service Integration Structure
When the backend connects to many external services, put each in integrations/[service-name]/.
integrations/
  stripe/
    stripeClient.js       ← initialize Stripe once, export the instance
    stripeService.js      ← your wrapper: createCustomer, createSubscription, etc.
    stripeWebhooks.js     ← webhook signature verification + event handlers

  openai/
    openaiClient.js
    openaiService.js      ← generateText, summarize, etc.

  sendgrid/
    emailClient.js
    emailService.js       ← sendWelcomeEmail, sendPasswordReset, etc.

  cloudinary/
    storageClient.js
    storageService.js     ← uploadImage, deleteImage, etc.
Client File Pattern — Initialize Once
javascript// integrations/stripe/stripeClient.js
const Stripe = require('stripe')
const { stripe: stripeKey } = require('../../config/env')

module.exports = new Stripe(stripeKey, {
  apiVersion: '2023-10-16'
})
// Import this one instance everywhere — never new Stripe(key) in multiple places
Service File Pattern — Thin Wrappers
javascript// integrations/stripe/stripeService.js
const stripe = require('./stripeClient')

async function createCustomer(email, userId) {
  return stripe.customers.create({
    email,
    metadata: { userId }
  })
}

async function createSubscription(customerId, priceId) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  })
}

module.exports = { createCustomer, createSubscription }
Calling Integrations from Services (never from controllers)
javascript// services/billingService.js — correct
const stripeService = require('../integrations/stripe/stripeService')
const User = require('../models/User')

async function upgradeUserToPro(userId, priceId) {
  const user = await User.findById(userId)
  const customer = await stripeService.createCustomer(user.email, userId)
  const subscription = await stripeService.createSubscription(customer.id, priceId)
  await User.updateSubscription(userId, subscription.id)
  return subscription
}

Environment Variables — The Config Pattern
Never scatter process.env.ANYTHING across 20 files. All env vars load through one file.
javascript// config/env.js
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'SENDGRID_API_KEY'
]

// App won't start if any secret is missing — no silent failures
required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

module.exports = {
  db: process.env.DATABASE_URL,
  jwt: process.env.JWT_SECRET,
  stripe: process.env.STRIPE_SECRET_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
  openai: process.env.OPENAI_API_KEY,
  email: process.env.SENDGRID_API_KEY,
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
}
Then import from config everywhere:
javascriptconst { stripe, openai } = require('../config/env')
// Never: process.env.STRIPE_SECRET_KEY directly in a service file

Middleware Patterns
Auth Middleware
javascript// middleware/auth.js
const jwt = require('jsonwebtoken')
const { jwt: jwtSecret } = require('../config/env')
const User = require('../models/User')

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.user = await User.findById(decoded.userId)
    if (!req.user) return res.status(401).json({ error: 'User not found' })
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { requireAuth }
Rate Limiting — Per Route, Not Global
Different routes need different limits. OpenAI routes burn money if abused.
javascript// middleware/rateLimit.js
const rateLimit = require('express-rate-limit')

const openaiLimit   = rateLimit({ windowMs: 60_000, max: 10  })  // 10/min
const authLimit     = rateLimit({ windowMs: 60_000, max: 5   })  // 5/min
const generalLimit  = rateLimit({ windowMs: 60_000, max: 100 })  // 100/min

// Applied per route in routes files:
// router.post('/ai/generate', openaiLimit, aiController)
// router.post('/auth/login',  authLimit,   authController)
// router.get('/projects',     generalLimit, projectController)

module.exports = { openaiLimit, authLimit, generalLimit }

Cursor Prompts for Each Layer
When adding a new feature, prompt Cursor one layer at a time:
Step 1 — Route:

"In routes/projects.js, add a DELETE /:id route that calls deleteProject from the project controller. Apply the requireAuth middleware."

Step 2 — Controller:

"In controllers/projectController.js, add a deleteProject function. It should get the project ID from req.params.id and the user ID from req.user.id, call projectService.deleteProject, and return 200 with { deleted: true }. No business logic here."

Step 3 — Service:

"In services/projectService.js, add deleteProject(userId, projectId). It should verify the project belongs to this user (throw 403 if not), then call Project.delete(projectId). All business logic lives here."

Step 4 — Model:

"In models/Project.js, add a delete(projectId) method that runs a parameterized DELETE query. Never concatenate the ID into the query string."


The Server Entry Files
server.js — Only starts the server
javascript// server.js
require('dotenv').config()
const app = require('./app')
const { port } = require('./config/env')

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
app.js — Only wires things together
javascript// app.js
const express = require('express')
const app = express()

app.use(express.json())
app.use('/api/projects', require('./routes/projects'))
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/billing',  require('./routes/billing'))

// Webhook routes use raw body — must be before express.json()
app.use('/webhooks/stripe', require('./integrations/stripe/stripeWebhooks'))

module.exports = app

Checklist Before Adding Any Endpoint

 Route file only maps URL to controller — no logic
 Controller only reads req and sends res — calls service, nothing else
 Service contains all business logic — no HTTP objects
 Model uses parameterized queries — no string concatenation
 Third-party calls go through integrations/ — not called from controllers directly
 New env vars added to config/env.js required list
 Rate limiting applied at the route level
 Auth middleware applied where needed