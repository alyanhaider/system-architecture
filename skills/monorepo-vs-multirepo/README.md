# Monorepo vs. Multirepo

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

When to use a monorepo vs. separate repositories, how to set one up with Turborepo or nx, how to manage shared packages, and how to avoid the tooling complexity that makes monorepos painful when they're not the right fit.

## When to Load This Skill

Load this skill whenever you are:

- Starting a new project with both a frontend and backend
- Deciding whether to put frontend and backend in the same repo
- Setting up shared TypeScript types or utility packages
- Configuring Turborepo, nx, or npm/yarn/pnpm workspaces
- Dealing with package linking between internal packages
- Asking "should this be its own package?"

**Trigger phrases:** `monorepo`, `multirepo`, `workspace`, `Turborepo`, `nx`, `shared packages`, `package linking`, `pnpm workspaces`, `same repo`, `separate repos`

## Key Rules from This Skill

- Default to **separate repos** unless you have a strong reason for a monorepo
- Monorepos are worth it when: you share TypeScript types/utilities between frontend and backend, you need atomic commits across packages, or you're running tRPC (requires same TS codebase)
- Don't set up a monorepo just because it sounds organized — the tooling overhead is real
- If using a monorepo, use **Turborepo** for most setups — simpler than nx for most projects
- Shared packages should be explicit packages with their own `package.json`, not just symlinked folders

## Related Skills

- [`project-structure`](../project-structure/) — how to structure files within a monorepo package
- [`deployment-pipeline`](../deployment-pipeline/) — deploying monorepo apps correctly (per-package builds)
- [`backend-architecture`](../backend-architecture/) — where backend code lives in a monorepo

---

*Part of the [AI Coding Skills Library](../../README.md)*
