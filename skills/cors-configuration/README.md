# CORS Configuration

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to configure CORS (Cross-Origin Resource Sharing) correctly so your frontend can talk to your backend without browser blocks, while not leaving your API open to every website on the internet.

## When to Load This Skill

Load this skill whenever you are:

- Getting a CORS error in the browser
- Setting up a frontend and backend on different domains or ports
- Connecting a Vercel/Netlify frontend to a Railway/Render/AWS backend
- Adding `Access-Control-Allow-Origin` headers
- Configuring credentials with cross-origin requests
- Setting up preflight (OPTIONS) handling
- Asking why API calls are being blocked

**Trigger phrases:** `CORS`, `CORS error`, `blocked by CORS policy`, `Access-Control-Allow-Origin`, `cross-origin`, `preflight`, `credentials mode`, `my frontend can't call my backend`, `allow origin star`, `cross-site`

## The Most Important Rule

**Never use `origin: '*'` on any API that uses cookies for authentication.**

The `*` wildcard + `credentials: true` combination is both broken (browsers reject it) and dangerous (any site can make authenticated requests on behalf of your users).

## Key Rules from This Skill

- Always load allowed origins from the `ALLOWED_ORIGINS` environment variable (comma-separated)
- Set `credentials: true` when using httpOnly cookies for auth
- When `credentials: true`, origin **cannot** be `*` — must be an explicit URL
- Handle `OPTIONS` preflight with `app.options('*', corsMiddleware)` **before all routes**
- Apply CORS middleware as the **first** middleware in `app.js`, before routes
- Set `maxAge: 86400` to cache preflight responses for 24 hours

## Common AI Blunders Prevented

| Blunder | What Goes Wrong |
|---|---|
| `origin: '*'` with cookies | Cookies silently fail to send; users appear logged out |
| Missing `app.options('*', ...)` | Preflight requests get 404; all POST/DELETE/PATCH fail |
| CORS applied after routes | Routes process before CORS headers set; all requests blocked |
| Localhost origin in production | Real domains can't reach the API |

## Related Skills

- [`authentication-security`](../authentication-security/) — httpOnly cookies and credentials interaction
- [`deployment-pipeline`](../deployment-pipeline/) — setting `ALLOWED_ORIGINS` env vars per environment
- [`security-hardening`](../security-hardening/) — broader security headers

---

*Part of the [AI Coding Skills Library](../../README.md)*
