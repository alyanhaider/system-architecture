# API Design & Responses

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to design consistent, production-grade REST APIs — covering URL structure, HTTP verbs, response shapes, status codes, pagination, input validation, error handling, structured logging, and the N+1 query problem.

## When to Load This Skill

Load this skill whenever you are:

- Adding or modifying any API route or endpoint
- Choosing between REST, GraphQL, or tRPC
- Deciding which HTTP verb or status code to use
- Shaping success or error JSON responses
- Adding pagination to a list endpoint
- Validating request input (body, query params)
- Setting up versioning (`/api/v1/`)
- Writing error handling or logging code
- Getting N+1 query issues on a list route

**Trigger phrases:** `add an endpoint`, `what status code`, `API response`, `error handling`, `pagination`, `validate input`, `logging`, `N+1`, `route`, `REST`

## Key Rules from This Skill

- All responses use a single shape: `{ success, data, meta }` for success and `{ success, error: { code, message } }` for errors
- Use `ok()` and `fail()` helper functions — never write response shapes inline
- Status codes matter: `201` for creation, `204` for deletion, `401` for unauthenticated, `403` for unauthorized — never `200` for errors
- All list endpoints must be paginated — no unbounded queries
- Never query inside a loop — use JOINs or ORM includes
- All routes prefixed with `/api/v1/`
- Validate all request bodies with Zod before the controller runs

## Related Skills

- [`backend-architecture`](../backend-architecture/) — where routes, controllers, and services live
- [`authentication-security`](../authentication-security/) — for auth-specific route protection
- [`security-hardening`](../security-hardening/) — for rate limiting and input sanitization

---

*Part of the [AI Coding Skills Library](../../README.md)*
