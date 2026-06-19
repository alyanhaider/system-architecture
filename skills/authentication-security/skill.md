Use this skill whenever building or modifying login, signup, logout, password reset, session handling, token storage, "remember me" behavior, protected routes, or "Login with Google/GitHub" (OAuth) flows. Trigger on requests like "add auth," "protect this route," "add login with Google," "users keep getting logged out," "how should I store the token," or any question about JWT, sessions, cookies, or password hashing. This is the single most common place an AI coding agent introduces a security hole that doesn't show up until someone is actively trying to exploit it — trigger proactively any time auth code is touched, even for what looks like a small change.Authentication & Session Security
Authentication vs. authorization — keep these separate
Authentication answers "who are you?" Authorization answers "what are you allowed to do?" They run in sequence — you can't check permissions for an identity you haven't verified yet — but they are different systems and should be written as different functions. A requireAuth middleware confirms identity; a separate requirePro or requireRole check (built on top of it) confirms permission. Collapsing them into one check is how an app ends up either locking out users who should have access, or — worse — letting an authenticated-but-unauthorized user through because "they're logged in" got treated as good enough.
Why this area is unusually dangerous
HTTP is stateless — every request is a stranger to the server unless something proves otherwise. That "something" is a token, and almost every serious auth vulnerability comes down to that token being readable, forgeable, or impossible to revoke. An AI coding agent will produce a login flow that works perfectly in the demo — user logs in, sees their dashboard — while leaving in place exactly the gaps that only matter once someone is trying to steal a session, enumerate real emails, or replay an old token. The fixes below aren't theoretical hardening; each one closes a specific, commonly-exploited gap.
Sessions vs. JWT — pick deliberately, don't default
Sessions: the server stores login state. On login, a session record is created (DB or Redis), a random session ID goes to the browser as a cookie, and every request looks that ID up server-side. State lives on the server, which means it can be deleted instantly — log out, ban a user, or force a re-login, and it takes effect immediately.
JWT (JSON Web Token): the server stores nothing. The token itself contains the user's ID and role, signed with a secret key, and the server verifies the signature mathematically on each request — no database lookup needed. The serious downside: a JWT cannot be invalidated before it expires. If a user logs out, gets compromised, or gets banned, their token keeps working until it naturally expires.
The practical rule: never rely on a single long-lived JWT alone. Either use sessions (Redis-backed for speed), or use short-lived JWTs paired with refresh tokens (below) so the access token's blast radius if stolen is small.
Where the token lives: this is the part AI gets wrong by default
localStorage is the easy default an agent reaches for — store the token, read it, attach it to the Authorization header. The problem: any JavaScript running on the page can read localStorage, including injected JavaScript. If the app ever has an XSS vulnerability anywhere — one unescaped field, one third-party script — every token is readable instantly.
httpOnly cookies can't be read by JavaScript at all, including the app's own code. The browser attaches the cookie to requests automatically. An XSS attack steals nothing, because there's nothing for the script to read.
Default to httpOnly cookies. The tradeoff is needing CSRF protection, which is a smaller and much more solvable problem than "every user's session is stealable via XSS":
javascriptres.cookie('token', jwt, {
  httpOnly: true,        // JavaScript cannot read this, period
  secure: true,           // only sent over HTTPS
  sameSite: 'strict',     // not sent on cross-site requests — CSRF protection
  maxAge: 15 * 60 * 1000  // 15 minutes for an access token
})
Access + refresh tokens: solving the lifespan problem
A short-lived JWT fixes the "can't invalidate it" problem but creates a new one: the user gets logged out every 15 minutes. Two tokens working together solve this.

Access token — short-lived (≈15 min), used on every API request, kept in memory or an httpOnly cookie.
Refresh token — long-lived (7–30 days), used only to get a new access token, kept in an httpOnly cookie and never sent on ordinary API calls.

The flow: login issues both. The access token is used for requests until it expires, at which point the app silently calls /auth/refresh with the refresh token. The server verifies it, issues a new access token and a new refresh token, and invalidates the old refresh token. The user never notices.
Rotation is what makes this safe, not optional polish. Every time a refresh token is used, it's replaced. If an attacker steals a refresh token and the real user has already used theirs since, the server sees a refresh token it already invalidated — a clear signal of theft — and can kill every session for that user immediately. Without rotation, a stolen refresh token is a 30-day backdoor with no way to detect it's being used.
Password handling
Never store a password — store a hash, a one-way transformation that can't be reversed back to the original. Login compares hashes, not plaintext.
The specific mistake AI tools make here: reaching for MD5 or SHA256. Both are designed to be fast, which is exactly wrong for a password — it means an attacker with a GPU can attempt billions of guesses per second against a stolen hash. Use bcrypt, which is deliberately slow and has a tunable cost factor that can be raised as hardware gets faster:
javascriptconst bcrypt = require('bcrypt')

// storing
const hash = await bcrypt.hash(password, 12)   // 12 rounds minimum

// checking
const match = await bcrypt.compare(inputPassword, storedHash)
AI tools often default to a cost factor around 8 — too low. Use 12 as a floor. The cost is milliseconds for a real user logging in, but a meaningful multiplier against brute-force attempts at scale.
The recurring shape of AI auth bugs
Every blunder below has the same shape: the agent implements the version that works when nobody is trying to break it, and skips the part that only matters under attack.
No rate limiting on login. Without a limit, an attacker can script millions of password attempts against any account. Apply a strict limit specifically to auth routes:
javascriptconst authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 5,                       // 5 attempts
  skipSuccessfulRequests: true  // only failed attempts count
})

router.post('/login', authLimit, loginController)
router.post('/forgot-password', authLimit, forgotController)
Leaking whether an email exists. Separate messages like "email not found" vs. "wrong password" let an attacker enumerate real accounts by trying thousands of emails and collecting which ones say "wrong password" instead of "not found" — that's now a target list of confirmed real users. Always return the same message regardless of which thing actually failed:
javascript// wrong
if (!user) return res.json({ error: 'Email not found' })
if (!match) return res.json({ error: 'Wrong password' })

// correct
if (!user || !match) {
  return res.json({ error: 'Invalid email or password' })
}
Password reset tokens stored in plain text. If a reset token sits in the database exactly as it was generated, read access to the database (a leak, an injection, an insider) is enough to reset any account. Treat reset tokens like passwords: store a hash of the token, and only ever send the real token through the email itself.
javascriptconst crypto = require('crypto')

const token = crypto.randomBytes(32).toString('hex')
const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

// store tokenHash in the DB; the email contains `token`, never the hash
await db.query(
  'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
  [tokenHash, Date.now() + 3600000, userId]   // 1 hour expiry
)
// on click: hash whatever the user's link contains and compare to the stored hash
No session invalidation on password change. Updating the password hash does nothing about sessions that were already issued before the change. If someone had already stolen a session, the password change doesn't stop them — that stolen session keeps working. Changing a password should invalidate every existing session for that user, not just update the hash.
Weak or hardcoded JWT secret. jwt.sign(payload, 'secret') or any short, guessable string lets an attacker brute-force the secret and forge valid tokens for any user. Generate a cryptographically random 256-bit (64-byte hex) value once and keep it in the environment, never in source:
javascript// generate once, put the output in .env
require('crypto').randomBytes(64).toString('hex')

// use it
jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' })
OAuth ("Login with Google/GitHub")
OAuth delegates identity verification to another provider — the app never sees the user's password. The flow: user clicks "Login with Google" → Google shows a consent screen → user approves → Google redirects back to a callback URL with a code → the server exchanges that code for an access token → the server fetches the user's email/Google ID → the user is found or created in the database → the app issues its own session/token as usual.
The piece AI tools routinely skip: the state parameter. Before redirecting to the provider, generate a random string, store it server-side (session), and pass it along in the redirect. The provider sends it back unchanged. The callback must verify it matches before doing anything else — this prevents a CSRF attack against the OAuth flow itself, where an attacker tricks a victim's browser into completing a login flow the attacker initiated.
javascript// before redirect
const state = crypto.randomBytes(16).toString('hex')
req.session.oauthState = state
res.redirect(`https://accounts.google.com/o/oauth2/auth?state=${state}&...`)

// in the callback, before anything else happens
if (req.query.state !== req.session.oauthState) {
  return res.status(403).json({ error: 'Invalid state' })
}
Folder structure
This sits inside integrations/ per the backend-architecture pattern, since auth often involves an external identity provider (OAuth) alongside its own internal logic:
src/
  integrations/
    auth/
      authController.js     ← login, logout, refresh endpoints
      authService.js         ← business logic, token creation
      authMiddleware.js       ← requireAuth, requirePro / requireRole
      passwordService.js      ← hash, compare, reset token generation
      tokenService.js          ← JWT sign, verify, refresh rotation
      oauthService.js          ← Google, GitHub OAuth flows
      authRoutes.js             ← route definitions only
The middleware that gets attached to every protected route:
javascriptasync function requireAuth(req, res, next) {
  const token = req.cookies.accessToken   // from the httpOnly cookie

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await getUserById(payload.userId)
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired' })
  }
}

router.get('/projects', requireAuth, projectController)
router.post('/export',  requireAuth, requirePro, exportController)
Authorization checks (requirePro, requireRole) always run after requireAuth in the middleware chain — never instead of it, and never merged into the same function.
The one-paragraph brief for an AI coding agent
Paste this before any auth-related prompt:

"Use httpOnly, secure, sameSite cookies for token storage — never localStorage. Short-lived access tokens (15 minutes), long-lived refresh tokens (7 days) with rotation — invalidate the old refresh token on every use. Hash passwords with bcrypt, cost factor 12 minimum. Rate limit login and password-reset routes to 5 attempts per 15 minutes. Return an identical error message for wrong email and wrong password. Store password reset tokens as SHA256 hashes, never plain text. Add a state parameter to every OAuth flow and verify it in the callback before anything else. Invalidate all existing sessions when a password changes. JWT secret comes from an env var, generated as a cryptographically random 64-byte value."

What's deliberately not covered here
Multi-factor authentication (2FA/TOTP, SMS codes), account lockout policies as distinct from rate limiting, and email verification on signup are real parts of a complete auth system but weren't part of the source material this skill was built from — treat their absence as a gap to raise explicitly with the user rather than something to invent confidently. For request validation and broken access control on non-auth resources, see database-design-security. For where requireAuth and related middleware sit in the overall route → controller → service chain, see backend-architecture.