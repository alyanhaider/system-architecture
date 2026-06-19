# Project Structure

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to structure any frontend or backend project from scratch — including multi-tool frontends, feature-based folder layouts, shared components, backend layer separation, and the process to follow before writing any code.

## When to Load This Skill

Load this skill whenever you are:

- Starting any new project or feature
- Deciding where a new file should go
- Asking how to organize folders
- Adding a new feature to an existing codebase
- Finding the project is getting hard to navigate or change
- Setting up a multi-tool SaaS frontend
- Cursor/AI is about to create files and folders

**Trigger phrases:** `how should I structure`, `where should I put`, `project is getting messy`, `how do I add a new feature`, `folder structure`, `organize`, `architecture`, `where does this go`, `project layout`

## Key Rules from This Skill

**Frontend:**
- Organize by **feature, not by layer** — `src/tools/[tool-name]/` not `src/components/`
- Only move something to `shared/` when it's used by **2+ features** — not speculatively
- Each feature folder must be **deletable without breaking other features**

**Backend:**
- Routes → Controllers → Services → Models — strict one-direction data flow
- Controllers handle HTTP; Services handle business logic; Models handle database
- Third-party integrations live in `integrations/[service-name]/`
- All env vars load from `config/env.js` on startup

**Naming:**
- Name things after **what they do**, not what they are
- Bad: `helpers.ts`, `utils.js`, `stuff.tsx`
- Good: `formatDate.ts`, `useProjectStore.ts`, `parseNodeConnections.ts`

## Process Before Writing Code

1. Write user stories first — "As a user I can ___"
2. Sketch data entities and relationships
3. Build vertically (full slice per story) — not horizontally (all components then all hooks)
4. Write a spec comment before prompting the AI for any feature

## Related Skills

- [`backend-architecture`](../backend-architecture/) — backend layer detail
- [`api-design-and-responses`](../api-design-and-responses/) — route and endpoint design
- [`monorepo-vs-multirepo`](../monorepo-vs-multirepo/) — when to split repos

---

*Part of the [AI Coding Skills Library](../../README.md)*
