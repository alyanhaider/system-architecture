# Backend Architecture

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to structure a Node.js/Express backend with strict layer separation — Route → Controller → Service → Model — and where third-party integrations, config, middleware, and utilities live.

## When to Load This Skill

Load this skill whenever you are:

- Starting a new backend project or feature
- Deciding where a new file should go in the backend
- Setting up controller/service/model patterns
- Adding a third-party integration (Stripe, OpenAI, SendGrid, etc.)
- Questioning whether business logic belongs in a route handler or controller
- Setting up the folder structure for a Node.js/Express app

**Trigger phrases:** `controller`, `service`, `model`, `layer`, `route handler`, `backend structure`, `integrations`, `business logic`, `where does this file go`

## Key Rules from This Skill

- **Routes** — URL definitions only; map URLs to controllers. No logic.
- **Controllers** — HTTP in, HTTP out. Read `req`, call service, send `res`. No business logic.
- **Services** — Business logic only. No HTTP code (`req`/`res`). Testable in isolation.
- **Models** — Database queries only. No business logic.
- **Integrations** — One folder per third-party service (`integrations/stripe/`, `integrations/openai/`)
- **Middleware** — Auth, validation, rate limiting. Runs before handlers.
- **Config** — `config/env.js` loads ALL environment variables on startup. Never scattered across files.
- Data flow is one direction only: Route → Controller → Service → Integration → Third Party

The key separation that prevents the most bugs: **a controller never calls third-party APIs directly** — it always goes through a business service first.

## Related Skills

- [`project-structure`](../project-structure/) — frontend and full project structure
- [`api-design-and-responses`](../api-design-and-responses/) — route/response design
- [`authentication-security`](../authentication-security/) — auth middleware and service patterns

---

*Part of the [AI Coding Skills Library](../../README.md)*
