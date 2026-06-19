# Security Hardening

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to harden a web application against the most common attacks — covering SQL injection prevention, input sanitization, rate limiting, security headers (Helmet), XSS, CSRF, and the layered defense approach that actually stops real threats.

## When to Load This Skill

Load this skill whenever you are:

- Adding or modifying any input-handling code
- Setting up HTTP security headers
- Adding rate limiting to routes
- Protecting against SQL injection or NoSQL injection
- Adding CSRF protection
- Using `helmet` or similar security middleware
- Reviewing code that handles user-submitted data
- Storing, displaying, or processing user-generated content

**Trigger phrases:** `injection`, `sanitize`, `rate limit`, `XSS`, `CSRF`, `headers`, `helmet`, `validation`, `security`, `input validation`, `malicious input`, `Content-Security-Policy`, `SQL injection`

## Key Rules from This Skill

- **Always use parameterized queries** — never concatenate user input into SQL strings
- Apply `helmet()` middleware to set secure HTTP headers by default
- Rate-limit all public endpoints — especially auth routes (5 attempts / 15 minutes)
- Validate and sanitize ALL user input — both server-side and client-side
- Never trust data from `req.body`, `req.query`, or `req.params` without validation
- Set `Content-Security-Policy` headers to prevent XSS injection attacks
- Use `sameSite: 'strict'` on cookies for CSRF protection
- Never log sensitive data (passwords, tokens, payment info) — mask or omit them

## Related Skills

- [`authentication-security`](../authentication-security/) — auth-specific security patterns
- [`api-design-and-responses`](../api-design-and-responses/) — input validation with Zod
- [`cors-configuration`](../cors-configuration/) — cross-origin attack prevention
- [`database-design`](../database-design/) — parameterized queries and ORM usage

---

*Part of the [AI Coding Skills Library](../../README.md)*
