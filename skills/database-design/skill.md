How to design a correct, safe, and scalable database schema — including migrations, indexes, foreign keys, subscription/billing tables, usage tracking, and plan limit enforcement. Use this skill whenever the user is designing a database, adding tables or columns, building a subscription/billing system, adding pro vs free plan features, building usage tracking, or asking about database structure. Also trigger for phrases like "how should I set up the database", "how does Stripe connect to my DB", "how do I track usage", "pro and free plan in database", "database is getting messy", "how do I add a column safely", "migrations", or any time Cursor is about to write CREATE TABLE or ALTER TABLE commands. This skill prevents the most common database blunders that break apps in production.Database Design Skill
The Most Common Database Blunders AI Makes
Read this before writing any schema. These mistakes look fine at first and destroy apps later.

Blunder 1: No Migrations — Running Raw SQL Manually
What AI does: Tells you to run CREATE TABLE users (...) directly in your database console.
Why it breaks: Three months later you add a column with ALTER TABLE manually. Now your local DB, production DB, and team member's DB are different shapes. Nobody knows what the "real" schema is. Bugs appear only in production.
What to do instead: Use migrations — versioned files that describe every schema change in order.
bash# Prisma (recommended for Node.js)
npx prisma migrate dev --name add_users_table

# Knex
npx knex migrate:make add_users_table
Every change to the DB goes through a migration file. You run them in sequence. Every environment stays identical.

Blunder 2: No Indexes on Queried Columns
What AI does: Creates tables with columns but never adds indexes.
Why it breaks: Works fine with 100 rows. At 100,000 rows, every search query scans the entire table. The app slows to a crawl.
What to do: Add indexes on every column you filter or sort by.
sql-- Always index foreign keys
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Index columns you search or sort by
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_usage_user_period ON usage(user_id, period);
Rule of thumb: if you write WHERE column = ? or ORDER BY column, that column needs an index.

Blunder 3: Relationships Without Foreign Key Constraints
What AI does: Creates a user_id column in a table but doesn't enforce it as an actual foreign key.
Why it breaks: You delete a user, all their projects stay in the DB pointing at a user that no longer exists. Orphaned data. The database has no integrity.
What to do:
sql-- Always declare foreign keys with ON DELETE behavior
user_id UUID REFERENCES users(id) ON DELETE CASCADE
-- CASCADE: when user is deleted, their data is deleted too

-- Or use RESTRICT to prevent accidental deletion
user_id UUID REFERENCES users(id) ON DELETE RESTRICT
-- RESTRICT: can't delete user if they have projects

Blunder 4: Storing Sensitive Data Incorrectly
What AI does: Stores plain text passwords, full API keys, sensitive data unencrypted.
Rules:

Passwords → hashed with bcrypt, never plain text
API keys → stored in .env, never in the DB
Sensitive user data → encrypted at rest if required by compliance
Stripe keys → never in the DB, only in environment variables


The Correct Schema for Users and Subscriptions
Users Table
sqlCREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,  -- bcrypt hash, NEVER plain text
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
Subscriptions Table — SEPARATE from users, always
The most important rule: Plan is NOT a property of a user. It's a property of a subscription that can expire, get cancelled, go past due, be refunded.
Never store plan or is_pro on the users table. A subscription is its own entity.
sqlCREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                  VARCHAR(50) NOT NULL,        -- 'free', 'pro', 'enterprise'
  status                VARCHAR(50) NOT NULL,        -- 'active', 'cancelled', 'past_due', 'trialing'
  stripe_customer_id    VARCHAR(255) UNIQUE,
  stripe_sub_id         VARCHAR(255) UNIQUE,
  current_period_end    TIMESTAMP,                   -- when billing period ends
  cancel_at_period_end  BOOLEAN DEFAULT FALSE,       -- cancelled but still has access until period end
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_sub_id);
Plan Limits Table — Don't Hardcode Limits in Code
When limits are in code, changing them requires a deployment. In the DB, you update a row.
sqlCREATE TABLE plan_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan         VARCHAR(50) NOT NULL,    -- 'free', 'pro'
  feature      VARCHAR(100) NOT NULL,  -- 'projects', 'exports', 'ai_calls'
  limit_value  INTEGER NOT NULL        -- -1 means unlimited
);

-- Seed data
INSERT INTO plan_limits (plan, feature, limit_value) VALUES
  ('free', 'projects',  3),
  ('free', 'exports',   0),
  ('free', 'ai_calls',  10),
  ('pro',  'projects',  -1),
  ('pro',  'exports',   -1),
  ('pro',  'ai_calls',  500);
Usage Tracking Table
sqlCREATE TABLE usage (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature  VARCHAR(100) NOT NULL,
  used_at  TIMESTAMP DEFAULT NOW(),
  period   VARCHAR(7) NOT NULL    -- '2024-01' billing period, YYYY-MM format
);

CREATE INDEX idx_usage_user_period ON usage(user_id, period);
CREATE INDEX idx_usage_user_feature ON usage(user_id, feature);
Processed Webhooks Table — Idempotency
Stripe sends webhooks multiple times if your server is slow. Without this table, you process the same event twice — user gets two upgrades, or double-charged.
sqlCREATE TABLE processed_webhooks (
  stripe_event_id  VARCHAR(255) PRIMARY KEY,
  processed_at     TIMESTAMP DEFAULT NOW()
);

The Correct Subscription Access Check
What AI does (wrong):
javascriptif (user.plan === 'pro') { allowAccess() }
A user can be on the pro plan but their payment failed. Status is past_due. They should NOT have access.
The correct check:
javascriptfunction hasProAccess(subscription) {
  if (!subscription) return false

  const activeStatuses = ['active', 'trialing']
  const withinPeriod = new Date(subscription.current_period_end) > new Date()

  return (
    activeStatuses.includes(subscription.status) ||
    // Cancelled but paid through end of period — still has access
    (subscription.cancel_at_period_end && withinPeriod)
  )
}
Always check status, not plan name.

The Correct Feature Limit Enforcement
Frontend-only enforcement is not enforcement. Attackers bypass the frontend and hit your API directly:
bashcurl -X POST https://yourapp.com/api/export \
  -H "Authorization: Bearer FREE_USER_TOKEN"
# Backend exports anyway if there's no server-side check
Every limit must be enforced in backend middleware:
javascript// middleware/checkLimits.js
function checkLimit(feature) {
  return async (req, res, next) => {
    const sub = await getSubscription(req.user.id)
    const plan = sub?.plan || 'free'
    const limit = await getPlanLimit(plan, feature)
    const used = await getUsageCount(req.user.id, feature, currentPeriod())

    if (limit !== -1 && used >= limit) {
      return res.status(403).json({
        error: `${feature} limit reached`,
        limit,
        used,
        upgrade: true
      })
    }
    next()
  }
}

// Applied at the route level — never buried inside feature functions
router.post('/ai/generate', checkLimit('ai_calls'), aiController)
router.post('/export',      checkLimit('exports'),  exportController)

The Correct Webhook Handler
Mistake: Not Verifying Webhook Signatures
Anyone can send a fake webhook to your server claiming a user paid. Without verification, your backend processes it.
Correct Pattern:
javascript// integrations/stripe/stripeWebhooks.js
const stripe = require('./stripeClient')
const { stripeWebhook: webhookSecret } = require('../../config/env')
const db = require('../../config/database')

// Route must use raw body — before express.json() in app.js
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event

    // 1. Verify signature
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        webhookSecret
      )
    } catch {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // 2. Idempotency check — don't process duplicates
    const already = await db.query(
      'SELECT stripe_event_id FROM processed_webhooks WHERE stripe_event_id = $1',
      [event.id]
    )
    if (already.rows.length > 0) return res.json({ received: true })

    // 3. Handle the event
    await handleByType(event)

    // 4. Mark as processed
    await db.query(
      'INSERT INTO processed_webhooks (stripe_event_id) VALUES ($1)',
      [event.id]
    )

    res.json({ received: true })
  }
)
Webhook Events You Must Handle
javascriptconst handlers = {
  'checkout.session.completed':          handleNewSubscription,
  'customer.subscription.updated':       handlePlanChange,
  'customer.subscription.deleted':       handleCancellation,
  'invoice.payment_failed':              handlePaymentFailed,    // downgrade to free
  'invoice.payment_succeeded':           handleRenewal,
  'customer.subscription.trial_ending':  handleTrialEnding
}
Missing invoice.payment_failed means users whose cards expire keep pro access forever.

Billing Security: Never Trust the Client on Price
Wrong (AI's version):
javascriptapp.post('/create-checkout', async (req, res) => {
  const { plan, price } = req.body   // hacker changes price to 1 cent
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price_data: { unit_amount: price } }]
  })
})
Correct — price IDs live on the server only:
javascript// Server owns the price mapping
const PRICES = {
  pro_monthly: 'price_stripe_id_from_dashboard',
  pro_annual:  'price_stripe_id_from_dashboard'
}

app.post('/create-checkout', async (req, res) => {
  const { plan } = req.body
  const priceId = PRICES[plan]
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' })

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }]
  })
})

Starter Prompt for Cursor (Billing Features)
Paste before any billing-related prompt:
Subscriptions live in their own table separate from users — never store plan on the users table.
Always check subscription status (active/trialing/past_due) not just plan name.
All feature limits enforced in backend middleware, not frontend.
Verify Stripe webhook signatures with raw body buffer — raw body must come before express.json().
Handle these webhook events: checkout.session.completed, subscription.updated,
subscription.deleted, invoice.payment_failed, invoice.payment_succeeded.
Store processed webhook IDs in processed_webhooks table to prevent duplicate processing.
Never trust plan name or price from the frontend — map plan names to Stripe price IDs server-side only.
Use parameterized queries everywhere — never concatenate into SQL strings.
Add indexes on all foreign keys and columns used in WHERE or ORDER BY clauses.
Use migrations for all schema changes — never run raw SQL manually in production.

Pre-Schema Checklist
Before writing any table, answer these:

 Does this table have an index on every foreign key?
 Does this table have indexes on columns used in WHERE/ORDER BY?
 Are foreign keys declared with ON DELETE behavior?
 Is subscription data in its own table, not on users?
 Are plan limits in the DB, not hardcoded?
 Are there migrations set up, not raw SQL?
 Are passwords hashed (bcrypt), never plain text?
 Is there a processed_webhooks table if using Stripe?