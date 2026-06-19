# Deployment Pipeline

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to set up a reliable deployment pipeline — covering CI/CD configuration, environment variable management, Docker setup, platform-specific deployment (Railway, Render, Vercel, AWS), and the common mistakes that cause deployments to fail silently or expose secrets.

## When to Load This Skill

Load this skill whenever you are:

- Setting up CI/CD for the first time (GitHub Actions, etc.)
- Configuring deployment to Railway, Render, Vercel, Fly.io, or AWS
- Managing environment variables across environments (dev/staging/prod)
- Writing or modifying Dockerfiles
- Debugging a deployment that works locally but fails in production
- Setting up health checks or zero-downtime deployments
- Configuring build steps and environment-specific behavior

**Trigger phrases:** `deploy`, `CI/CD`, `Docker`, `Railway`, `Render`, `Vercel`, `environment variable`, `.env`, `pipeline`, `GitHub Actions`, `production`, `staging`, `build`, `container`

## Key Rules from This Skill

- Never commit `.env` files — use platform environment variable settings
- Validate all required environment variables on startup — fail fast if any are missing
- Separate environment configs strictly: dev/staging/prod should never share secrets
- Always run database migrations before starting the app in CI/CD
- Use health check endpoints so platforms can verify the app is running
- Pin Docker base image versions — never use `:latest` in production

## Related Skills

- [`cors-configuration`](../cors-configuration/) — setting `ALLOWED_ORIGINS` per environment
- [`database-design`](../database-design/) — running migrations in the pipeline
- [`backend-architecture`](../backend-architecture/) — `config/env.js` pattern for env var loading

---

*Part of the [AI Coding Skills Library](../../README.md)*
