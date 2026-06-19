# Authentication & Session Security

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to build secure authentication from scratch — covering httpOnly cookies vs. localStorage, JWT access + refresh token rotation, bcrypt password hashing, rate limiting on auth routes, OAuth (Google/GitHub), password reset token security, and session invalidation.

## When to Load This Skill

Load this skill whenever you are:

- Building or modifying login, signup, or logout flows
- Implementing password reset
- Handling session management or token storage
- Adding "Login with Google/GitHub" (OAuth)
- Protecting routes with auth middleware
- Working with JWT, sessions, or cookies
- Adding a "remember me" feature
- Changing how tokens are verified or refreshed

**Trigger phrases:** `auth`, `login`, `signup`, `logout`, `JWT`, `token`, `session`, `cookie`, `password`, `OAuth`, `Google login`, `protected route`, `remember me`, `refresh token`

## Key Rules from This Skill

- **Never store tokens in `localStorage`** — use httpOnly cookies only
- Access tokens: short-lived (15 min), in httpOnly cookies
- Refresh tokens: long-lived (7–30 days), rotated on every use, stored as httpOnly cookie
- Hash passwords with **bcrypt at cost factor 12 minimum** — never MD5 or SHA256
- Rate limit login and password-reset routes to **5 attempts per 15 minutes**
- Return the **same error message** for wrong email and wrong password — never leak which one failed
- Store password reset tokens as **SHA256 hashes** in the DB — never plain text
- Always add a `state` parameter to OAuth flows and verify it in the callback
- Invalidate **all existing sessions** when a password changes
- JWT secret must be a **cryptographically random 64-byte env var** — never a hardcoded string

## The AI Blunder Pattern

> "The agent implements the version that works when nobody is trying to break it, and skips the part that only matters under attack."

Read the "Common Auth Bugs AI Makes" section in `skill.md` carefully.

## Related Skills

- [`api-design-and-responses`](../api-design-and-responses/) — for auth route response shapes
- [`cors-configuration`](../cors-configuration/) — credentials + CORS interaction
- [`security-hardening`](../security-hardening/) — rate limiting, headers, injection prevention

---

*Part of the [AI Coding Skills Library](../../README.md)*
