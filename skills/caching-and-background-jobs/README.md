# Caching & Background Jobs

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

When and how to add caching with Redis, how to set up background job queues (BullMQ), and how to run scheduled or asynchronous tasks without blocking the request cycle.

## When to Load This Skill

Load this skill whenever you are:

- Adding Redis to a project
- Setting up a job queue or background worker
- Implementing caching for API responses or database queries
- Running scheduled or recurring tasks (cron jobs)
- Sending emails, processing files, or calling slow APIs asynchronously
- Dealing with operations that are too slow to run in a request handler

**Trigger phrases:** `cache`, `Redis`, `queue`, `worker`, `background job`, `BullMQ`, `cron`, `async task`, `job processing`, `rate limiting with Redis`

## Key Rules from This Skill

- Never do slow work (email sending, image processing, external API calls) synchronously in a request handler — queue it
- Cache data that is expensive to compute and changes infrequently
- Always set cache TTLs — never cache indefinitely without a strategy
- Use cache invalidation patterns that match your data update frequency
- Background workers should be idempotent — safe to run more than once
- Use BullMQ (or similar) for reliable queues — not in-memory arrays

## Related Skills

- [`deployment-pipeline`](../deployment-pipeline/) — deploying Redis as part of your infrastructure
- [`performance-optimization`](../performance-optimization/) — caching as a performance tool
- [`api-design-and-responses`](../api-design-and-responses/) — keeping request handlers fast

---

*Part of the [AI Coding Skills Library](../../README.md)*
