# Database Design

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to design database schemas that scale — covering table relationships, primary/foreign keys, indexing strategies, migration patterns, query optimization, and how to avoid the most common schema mistakes that are expensive to fix later.

## When to Load This Skill

Load this skill whenever you are:

- Designing or modifying a database schema
- Creating or running migrations
- Adding indexes to a table
- Designing relationships between entities (one-to-many, many-to-many)
- Writing complex queries or debugging slow queries
- Using an ORM (Prisma, Sequelize, TypeORM, Drizzle)
- Asking where to put database access code

**Trigger phrases:** `schema`, `migration`, `index`, `foreign key`, `relationship`, `one-to-many`, `many-to-many`, `query`, `ORM`, `Prisma`, `MySQL`, `PostgreSQL`, `join`, `table design`

## Key Rules from This Skill

- Always use parameterized queries — never concatenate user input into SQL
- Add indexes on all foreign keys and columns frequently used in WHERE clauses
- Every table needs a `created_at` and `updated_at` timestamp
- Use migrations for all schema changes — never alter production schema by hand
- Model files contain database queries only — no business logic
- Soft delete (add `deleted_at`) rather than hard delete when data relationships matter

## Related Skills

- [`backend-architecture`](../backend-architecture/) — where model files live in the layer stack
- [`performance-optimization`](../performance-optimization/) — query optimization and N+1 patterns
- [`security-hardening`](../security-hardening/) — SQL injection prevention

---

*Part of the [AI Coding Skills Library](../../README.md)*
