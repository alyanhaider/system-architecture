# 🤖 Agent Rules — How to Use These Skills

This file tells an AI coding agent (Cursor, Claude, GitHub Copilot, etc.) **when and how** to load and apply the skill documents in this repository. Follow these rules exactly.

---

## Core Principle

These skills exist because AI agents make the same high-cost mistakes repeatedly — using `*` for CORS origins, storing tokens in localStorage, skipping pagination, collapsing controller and service logic. Each skill is a targeted correction for a specific mistake pattern. **Read the relevant skill before writing any code in that area.**

---

## Rule 1 — Identify the Active Skill Domain

Before writing code, check whether the task touches any of the following domains. If yes, **load and read that skill file first**.

| Task involves... | Load this skill |
|---|---|
| API routes, endpoints, HTTP verbs, status codes, response shape, error handling, logging, pagination | `skills/api-design-and-responses/skill.md` |
| Login, signup, logout, password reset, tokens, sessions, cookies, JWT, OAuth, "Login with Google" | `skills/authentication-security/skill.md` |
| Folder structure, where a file goes, adding a new feature, project layout, layer separation | `skills/project-structure/skill.md` |
| Route/controller/service/model split, backend file organization, third-party integrations folder | `skills/backend-architecture/skill.md` |
| CORS errors, `Access-Control-Allow-Origin`, cross-origin, frontend calling backend, preflight | `skills/cors-configuration/skill.md` |
| Database schema, tables, relationships, indexes, migrations, query patterns, foreign keys | `skills/database-design/skill.md` |
| Caching, Redis, background jobs, queues, workers, scheduled tasks | `skills/caching-and-background-jobs/skill.md` |
| CI/CD, deployment, Docker, environment variables, Railway/Render/Vercel/AWS setup | `skills/deployment-pipeline/skill.md` |
| File uploads, multipart/form-data, S3/cloud storage, file validation, size limits | `skills/file-uploads-and-storage/skill.md` |
| Monorepo, multirepo, workspace, Turborepo, nx, package linking | `skills/monorepo-vs-multirepo/skill.md` |
| Slow queries, performance, profiling, lazy loading, N+1, bundle size | `skills/performance-optimization/skill.md` |
| SQL injection, input sanitization, rate limiting, security headers, XSS, CSRF | `skills/security-hardening/skill.md` |

---

## Rule 2 — Multiple Skills May Apply

A single task often touches more than one skill. Example: "Add a login endpoint" touches **authentication-security** AND **api-design-and-responses** AND **project-structure**. Load all relevant skills before starting.

---

## Rule 3 — Trigger Words

Load the appropriate skill when any of these phrases appear in a request:

**Authentication:** `auth`, `login`, `signup`, `logout`, `token`, `JWT`, `session`, `cookie`, `password`, `OAuth`, `Google login`, `protected route`, `remember me`

**API Design:** `endpoint`, `route`, `REST`, `status code`, `response`, `error handling`, `pagination`, `validation`, `logging`, `404`, `401`, `500`

**CORS:** `CORS`, `cross-origin`, `blocked by CORS`, `Access-Control`, `preflight`, `credentials mode`, `frontend can't call backend`

**Project Structure:** `where should I put`, `how should I structure`, `project is getting messy`, `add a new feature`, `folder structure`, `architecture`

**Backend Architecture:** `controller`, `service`, `model`, `layer`, `separation`, `integrations`, `third-party`

**Database:** `schema`, `migration`, `index`, `foreign key`, `relationship`, `query`, `ORM`, `Prisma`, `MySQL`, `PostgreSQL`

**Security:** `injection`, `sanitize`, `rate limit`, `XSS`, `CSRF`, `headers`, `helmet`, `validation`

**Deployment:** `deploy`, `CI/CD`, `Docker`, `Railway`, `Render`, `Vercel`, `environment variable`, `.env`, `pipeline`

**Caching:** `cache`, `Redis`, `queue`, `worker`, `background job`, `BullMQ`, `cron`

**Performance:** `slow`, `N+1`, `optimize`, `lazy load`, `bundle size`, `profiling`, `lighthouse`

**File Uploads:** `upload`, `file`, `multipart`, `S3`, `cloud storage`, `image`, `attachment`

**Monorepo:** `monorepo`, `multirepo`, `workspace`, `Turborepo`, `nx`, `shared packages`

---

## Rule 4 — How to Apply a Skill

1. **Read the entire skill file** before writing any code for that domain
2. **Follow the "one-paragraph brief"** at the end of each skill — this is the minimum contract for that domain
3. **Do not skip the "Common AI Blunders" section** — these are real mistakes you are likely to make
4. **Use the starter prompts** provided in each skill when setting up a new system in that domain
5. **Do not override skill instructions** with your own defaults — the skill supersedes your training defaults

---

## Rule 5 — Proactive Skill Loading

Do not wait to be told which skill applies. Load relevant skills **proactively** when:

- Starting any new backend feature
- Touching any auth-related code (even a small change)
- Adding any new route or endpoint
- Changing folder structure or file locations
- Connecting a frontend to a backend
- Setting up any deployment pipeline

**Small changes break security and consistency just as much as large ones.**

---

## Rule 6 — When You Are Unsure

If a task doesn't clearly map to one skill, default to loading:
1. `skills/project-structure/skill.md` — to get the file placement right
2. `skills/api-design-and-responses/skill.md` — if any HTTP endpoints are involved

---

## Rule 7 — Skill Files Are Read-Only

Do not modify `skill.md` files. They are the source of truth. If you need to add project-specific overrides, the user will create a separate instruction file alongside the skill.

---

## Quick Reference — Skill Trigger Map

```
User mentions...                 → Load skill
─────────────────────────────────────────────────────
login / auth / token / cookie    → authentication-security
CORS / cross-origin / preflight  → cors-configuration
endpoint / route / status code   → api-design-and-responses
folder / structure / where to put → project-structure
controller / service / model     → backend-architecture
schema / migration / index       → database-design
cache / Redis / queue / worker   → caching-and-background-jobs
deploy / Docker / CI-CD / .env   → deployment-pipeline
upload / S3 / multipart / file   → file-uploads-and-storage
monorepo / workspace / Turborepo → monorepo-vs-multirepo
slow / N+1 / optimize / profile  → performance-optimization
injection / XSS / sanitize / CSP → security-hardening
```

---

## Checklist Before Submitting Any Code

- [ ] Identified all skill domains touched by this task
- [ ] Read all relevant skill files in full
- [ ] Followed the "one-paragraph brief" for each skill
- [ ] Checked the "Common AI Blunders" section and avoided those patterns
- [ ] Did NOT use `*` for CORS origin when credentials are involved
- [ ] Did NOT store auth tokens in localStorage
- [ ] Did NOT return inconsistent response shapes across routes
- [ ] Did NOT query inside a loop (N+1)
- [ ] Did NOT put business logic in a route handler
- [ ] Did NOT hardcode secrets — used environment variables

---

*This rules file is the entry point for the agent. All skill details live in their respective `skill.md` files.*
