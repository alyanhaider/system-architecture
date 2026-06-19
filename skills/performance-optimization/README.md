# Performance Optimization

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to identify and fix performance bottlenecks — covering database query optimization, the N+1 query problem, caching strategies, lazy loading, bundle size reduction, and how to profile and measure before optimizing.

## When to Load This Skill

Load this skill whenever you are:

- Dealing with slow API responses or page loads
- Debugging queries that take too long
- Getting N+1 query warnings in your ORM
- Optimizing a list endpoint that returns a lot of data
- Reducing JavaScript bundle size
- Adding lazy loading to images or components
- Profiling a Node.js application
- Adding indexes to database tables for performance

**Trigger phrases:** `slow`, `N+1`, `optimize`, `lazy load`, `bundle size`, `profiling`, `lighthouse`, `performance`, `query is slow`, `too many queries`, `response time`, `latency`

## Key Rules from This Skill

- **Measure first, then optimize** — never guess at bottlenecks
- N+1 queries are the #1 backend performance killer — always use JOINs or ORM `include`/`with`
- Add indexes on columns you filter, sort, or join on — but don't over-index
- Cache at the right layer: database query results, computed values, or full response bodies
- Paginate every list endpoint — return at most 20–50 items per page
- Use `EXPLAIN ANALYZE` on slow queries before rewriting them
- Lazy-load images and below-the-fold content on the frontend

## Related Skills

- [`database-design`](../database-design/) — indexing and query patterns
- [`caching-and-background-jobs`](../caching-and-background-jobs/) — caching as a performance tool
- [`api-design-and-responses`](../api-design-and-responses/) — pagination patterns

---

*Part of the [AI Coding Skills Library](../../README.md)*
