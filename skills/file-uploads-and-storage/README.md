# File Uploads & Storage

**Skill file:** [`skill.md`](./skill.md)

## What This Skill Covers

How to handle file uploads securely — covering multipart/form-data parsing, cloud storage (S3, Cloudflare R2, etc.), file type validation, size limits, and preventing the common security holes that come with allowing users to upload files.

## When to Load This Skill

Load this skill whenever you are:

- Adding file upload functionality (images, documents, videos, etc.)
- Integrating with AWS S3, Cloudflare R2, or similar cloud storage
- Handling `multipart/form-data` requests
- Validating uploaded file types or sizes
- Generating pre-signed URLs for direct client uploads
- Storing user avatars, attachments, or media

**Trigger phrases:** `upload`, `file`, `multipart`, `form-data`, `S3`, `R2`, `cloud storage`, `image upload`, `attachment`, `file size`, `file type`, `avatar`

## Key Rules from This Skill

- Always validate file **type by MIME type**, not just extension — extensions can be faked
- Set explicit file **size limits** before saving — never accept unlimited uploads
- Never store uploaded files in your app's `public/` folder — use cloud storage
- Generate unique, non-guessable filenames (UUIDs) — never use the original filename
- Use pre-signed URLs for client-to-cloud direct uploads when files are large
- Scan or validate content for dangerous file types (executables, scripts)
- Store only the cloud URL in the database — never the raw file content

## Related Skills

- [`authentication-security`](../authentication-security/) — ensuring only authenticated users can upload
- [`backend-architecture`](../backend-architecture/) — where upload service code lives
- [`security-hardening`](../security-hardening/) — preventing file-based attacks

---

*Part of the [AI Coding Skills Library](../../README.md)*
