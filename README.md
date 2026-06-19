# 🧠 Production-Grade AI Coding Skills & Rules

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/badge/npm-%40alyanhaider%2Fsystem--architecture-blue.svg)](https://www.npmjs.com/)
[![GitHub stars](https://img.shields.io/github/stars/alyanhaider/system-architecture.svg?style=social)](https://github.com/alyanhaider/system-architecture)

A curated collection of production-grade skill files and rule systems designed for AI coding agents (**Claude 3.5 Sonnet, Cursor, Windsurf, Claude Code, and GitHub Copilot**). 

---

## ⚡ The Core Problem

**AI agents write code that works *now*, not code that scales in 3 weeks.**

When prompting an AI to build a feature, it defaults to the path of least resistance:
* It hardcodes CORS origins to `*` (security vulnerability).
* It dumps business logic straight into Express routes or controllers.
* It writes database queries inside loops (generating N+1 query performance kills).
* It stores session tokens in browser `localStorage` (making sessions stealable via XSS).

This repository bridges the gap. By loading these specific skill files into your AI workspace, you enforce **strict architectural boundaries, industry-standard security patterns, and robust coding rules** automatically—without having to repeat yourself in every prompt session.

---

## 📁 Skills Index

| Skill Domain | Description | Prevents these AI Blunders |
|---|---|---|
| 🔒 [**`authentication-security`**](./skills/authentication-security/) | secure cookie configurations, JWT access/refresh rotation, password hashing, OAuth state | Storing tokens in `localStorage`, MD5/SHA256 password storage, missing OAuth state parameter |
| 🛡️ [**`security-hardening`**](./skills/security-hardening/) | input sanitization, rate-limiting rules, security headers (Helmet), injection prevention | SQL injection, prototype pollution, missing request limits, raw logging of passwords |
| 🌐 [**`cors-configuration`**](./skills/cors-configuration/) | environment-based allowed origins, credentials configuration, preflight (OPTIONS) handlers | Wildcard `*` origins, silent auth failures, 404 responses for OPTIONS preflight checks |
| 🏛️ [**`backend-architecture`**](./skills/backend-architecture/) | strict Route ➔ Controller ➔ Service ➔ Model layer isolation, config routing | Mixing business logic with HTTP route handlers, direct DB calls in route controllers |
| 🏗️ [**`project-structure`**](./skills/project-structure/) | feature-based folder layouts, shared modules, deleting-features isolation testing | "Dumping grounds" folders (`utils/helpers`), circular code dependencies |
| 💾 [**`database-design`**](./skills/database-design/) | schema patterns, migrations, indexes, soft-delete rules, parameterized queries | Schema conflicts in production, slow unindexed queries, missing timestamps |
| 🚀 [**`deployment-pipeline`**](./skills/deployment-pipeline/) | environment configs, CI/CD, dockerization, health endpoints, fail-fast variable loaders | Leaking `.env` keys, container start failures, unrun migrations during staging |
| 📥 [**`file-uploads-and-storage`**](./skills/file-uploads-and-storage/) | multi-part parsing, S3/R2 storage integration, pre-signed URLs, validation | Malicious executable uploads, server filesystem crashes, unchecked file sizes |
| ⚡ [**`performance-optimization`**](./skills/performance-optimization/) | list pagination, N+1 prevention, Redis caching, profiling, lazy-loading | Unbounded list queries, database overload via looping queries, missing cache TTLs |
| 📦 [**`caching-and-background-jobs`**](./skills/caching-and-background-jobs/) | Redis setup, BullMQ background tasks, worker idempotency, cron triggers | Blocking the main thread, lost jobs on server crash, non-idempotent workers |
| 🔗 [**`monorepo-vs-multirepo`**](./skills/monorepo-vs-multirepo/) | shared workspaces, package configurations, Turborepo setup, type sharing | Tooling overhead, circular imports across client/server, broken yarn/pnpm links |
| 🗺️ [**`api-design-and-responses`**](./skills/api-design-and-responses/) | REST standards, ok/fail response wrappers, status codes, standard error shapes | Inconsistent response payloads, HTTP 200 returned on server crashes |

---

## 📥 Installation & Usage

You can download and inject any specific skill directly into your current project's rules folder (e.g. `.cursor/rules/`) using `npx` or our lightweight installation scripts.

### Method 1: Using `npx` (Universal CLI)
Run this command from the root of your project:
```bash
# General syntax:
npx @alyanhaider/system-architecture install <skill-name>

# Example - Install CORS Configuration:
npx @alyanhaider/system-architecture install cors-configuration
```

### Method 2: Unix Shell Script (macOS / Linux)
```bash
curl -sSL https://raw.githubusercontent.com/alyanhaider/system-architecture/main/install.sh | bash -s -- <skill-name>
```

### Method 3: Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/alyanhaider/system-architecture/main/install.ps1 | iex; Install-Skill -Skill <skill-name>"
```

---

## 🤖 Configuring Your AI Editor

### 1. For Cursor (Automatic Rules Activation)
Download the desired skills into your project's `.cursor/rules/` directory (e.g., `.cursor/rules/cors-configuration.md`). At the top of your markdown skill files, add context instructions like this to tell Cursor when to load the rule:
```markdown
---
description: Run on all backend files when configuring CORS or cross-origin requests
globs: src/backend/**/*, app.js, server.js
---
```

### 2. For Windsurf, Claude Code, or Copilot
Append the key rules and custom profiles from [`rules.md`](./rules.md) to your workspace context files:
- **VS Code / Copilot**: Add rules to `.github/copilot-instructions.md`.
- **Claude Code**: Add instructions to `.clauderules` in the project root.
- **Custom Claude System Prompts**: Copy-paste the "One-paragraph brief" from the bottom of your chosen skill directly into your system prompt.

---

## ✏️ Contributing & Suggestions

If you find a new recurring AI bug or have an optimization to suggest:
1. Fork the repository.
2. Create your feature branch.
3. Submit a Pull Request.

---

## 📄 License & Author

Developed and maintained by **[Alyan Haider](https://github.com/alyanhaider)**. Released under the [MIT License](./LICENSE).
