# 🤖 Agent Rules — Automatic Skill Activation System

This file is the **entry point** for your AI coding agent. It defines how the agent must behave before writing any code. The agent must follow these rules automatically — the user does not need to mention skills, domains, or rules. The agent detects the context and loads what is needed.

---

## ⚡ How This Works

Every time the user sends a message, the agent must:

1. **Silently scan** the user's request for keywords, intent, and domain signals.
2. **Identify all matching skill domains** from the table below.
3. **Read every matching `skill.md` file in full** before writing any code or giving any advice.
4. **Apply the skill's rules** — the skill supersedes the agent's training defaults.

The user never needs to say "load a skill", "use the auth skill", or "follow the rules". The agent handles this transparently, every time.

---

## 🗺️ Automatic Skill Trigger Map

The agent must load the corresponding skill file the moment it detects any of the listed keywords or task types in the user's input. Multiple skills must be loaded when multiple domains are touched.

| If the user's message involves any of these... | Load this skill file |
|---|---|
| `login`, `signup`, `logout`, `password`, `reset password`, `token`, `JWT`, `session`, `cookie`, `OAuth`, `Google login`, `GitHub login`, `protected route`, `remember me`, `auth`, `authentication`, `authorization` | `skills/authentication-security/skill.md` |
| `endpoint`, `route`, `REST`, `API`, `status code`, `response shape`, `error handling`, `pagination`, `validation`, `logging`, `404`, `401`, `403`, `500`, `JSON response`, `request body`, `add a route`, `add an endpoint` | `skills/api-design-and-responses/skill.md` |
| `CORS`, `cross-origin`, `blocked by CORS`, `Access-Control-Allow-Origin`, `preflight`, `credentials mode`, `frontend can't call backend`, `OPTIONS request` | `skills/cors-configuration/skill.md` |
| `folder structure`, `where should I put`, `how should I structure`, `project layout`, `feature folder`, `project is getting messy`, `add a new feature`, `organize files`, `architecture` | `skills/project-structure/skill.md` |
| `controller`, `service`, `model`, `repository`, `layer separation`, `integrations folder`, `third-party`, `business logic`, `route handler`, `backend structure` | `skills/backend-architecture/skill.md` |
| `schema`, `table`, `migration`, `index`, `foreign key`, `relationship`, `query`, `ORM`, `Prisma`, `MySQL`, `PostgreSQL`, `SQLite`, `MongoDB`, `database design` | `skills/database-design/skill.md` |
| `cache`, `Redis`, `queue`, `worker`, `background job`, `BullMQ`, `cron`, `scheduled task`, `job processor`, `retry`, `async job` | `skills/caching-and-background-jobs/skill.md` |
| `deploy`, `CI/CD`, `Docker`, `Dockerfile`, `Railway`, `Render`, `Vercel`, `AWS`, `environment variable`, `.env`, `pipeline`, `staging`, `production`, `container` | `skills/deployment-pipeline/skill.md` |
| `file upload`, `upload`, `multipart`, `form-data`, `S3`, `R2`, `cloud storage`, `image upload`, `attachment`, `file size`, `file type`, `presigned URL` | `skills/file-uploads-and-storage/skill.md` |
| `monorepo`, `multirepo`, `workspace`, `Turborepo`, `nx`, `shared packages`, `pnpm workspace`, `yarn workspace`, `package linking` | `skills/monorepo-vs-multirepo/skill.md` |
| `slow`, `performance`, `N+1`, `optimize`, `lazy load`, `bundle size`, `profiling`, `lighthouse`, `query speed`, `too many queries`, `load time` | `skills/performance-optimization/skill.md` |
| `SQL injection`, `sanitize`, `rate limit`, `XSS`, `CSRF`, `security headers`, `helmet`, `input validation`, `injection`, `prototype pollution`, `CSP`, `secure headers` | `skills/security-hardening/skill.md` |

---

## 🔁 When Multiple Skills Apply

A single user request often touches more than one domain. The agent must load **all** relevant skills — never just one.

**Examples of multi-skill situations:**

- *"Add a login endpoint"* → load `authentication-security` + `api-design-and-responses` + `backend-architecture`
- *"Set up file uploads to S3"* → load `file-uploads-and-storage` + `security-hardening` + `deployment-pipeline`
- *"Add a job queue for sending emails"* → load `caching-and-background-jobs` + `backend-architecture`
- *"I'm getting CORS errors on my login request"* → load `cors-configuration` + `authentication-security`
- *"My list endpoint is slow"* → load `performance-optimization` + `api-design-and-responses` + `database-design`

---

## 🚦 Proactive Loading — Do Not Wait for Explicit Signals

The agent must load skills **proactively** even when the user hasn't used an exact trigger word, if the intent is clear:

- Starting or modifying any backend feature → load `backend-architecture` + `project-structure`
- Touching any auth-related code, even a small change → load `authentication-security`
- Adding or modifying any API route → load `api-design-and-responses`
- Connecting a frontend to a backend → load `cors-configuration`
- Setting up a deployment or environment → load `deployment-pipeline`
- Discussing or changing database schema → load `database-design`
- Any security-adjacent discussion → load `security-hardening`

**Small changes break security and consistency just as much as large ones.**

---

## 📖 How to Apply a Loaded Skill

Once the agent has identified and loaded the relevant skill file(s):

1. **Read the entire `skill.md` file** — do not skim it.
2. **Follow the "one-paragraph brief"** at the end of each skill — this is the minimum non-negotiable contract.
3. **Do not skip the "Common AI Blunders" section** — these are real mistakes the agent is likely to reproduce.
4. **Use the code examples** in the skill when implementing the feature.
5. **Do not override skill instructions** with training defaults — the skill supersedes defaults in every case.

---

## 🆘 Fallback Rule — When Unsure

If the user's request doesn't clearly map to a skill, default to:

1. `skills/project-structure/skill.md` — to get file placement right
2. `skills/api-design-and-responses/skill.md` — if any HTTP communication is involved

---

## 🔒 Skill Files Are Read-Only

The agent must **never modify `skill.md` files**. They are the source of truth. Project-specific overrides must go in a separate instruction file alongside the skill, created by the user.

---

## ✅ Checklist — Before Submitting Any Code

The agent must silently verify every item before outputting code:

- [ ] Identified all skill domains touched by this task
- [ ] Read all relevant `skill.md` files in full
- [ ] Followed the "one-paragraph brief" for each loaded skill
- [ ] Checked the "Common AI Blunders" section and avoided those patterns
- [ ] Did NOT use `*` for CORS origin when credentials are involved
- [ ] Did NOT store auth tokens in `localStorage`
- [ ] Did NOT return inconsistent response shapes across routes
- [ ] Did NOT query inside a loop (N+1 problem)
- [ ] Did NOT put business logic inside a route handler
- [ ] Did NOT hardcode secrets — used environment variables
- [ ] Did NOT use MD5 or SHA256 for password hashing — used bcrypt (cost ≥ 12)
- [ ] Did NOT skip pagination on any list endpoint
- [ ] Did NOT expose raw error messages or stack traces to the client

---

## 📁 Skill File Locations

```
skills/
├── api-design-and-responses/skill.md
├── authentication-security/skill.md
├── backend-architecture/skill.md
├── caching-and-background-jobs/skill.md
├── cors-configuration/skill.md
├── database-design/skill.md
├── deployment-pipeline/skill.md
├── file-uploads-and-storage/skill.md
├── monorepo-vs-multirepo/skill.md
├── performance-optimization/skill.md
├── project-structure/skill.md
└── security-hardening/skill.md
```

---

*This rules file is the agent's entry point. Skill selection and loading is fully automatic — based entirely on what the user asks. No manual instruction is required from the user.*
