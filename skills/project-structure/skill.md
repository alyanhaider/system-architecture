How to structure any frontend or backend project from scratch — including multi-tool frontends, feature-based folder layouts, shared components, and backend layer separation. Use this skill whenever the user is starting a new project, adding a new feature, asking where a file should go, asking how to organize folders, asking about project architecture, or whenever Cursor/AI is about to create files and folders. Also trigger when the user says things like "how should I structure this", "where should I put this", "my project is getting messy", "how do I add a new feature", or "project is hard to change without breaking things". Always use this skill before writing any folder or file structure — even for small projects.Project Structure Skill
The Core Mental Model
Before touching any file or folder, answer these 3 questions:

What does this thing actually do? Write it as a user action: "User creates X, does Y, saves Z." One sentence per core action. If you have more than 5 sentences, the scope is too large.
What are the data entities? Everything the app needs to remember. These become your DB schema.
Where does data live and who owns it? Browser only (localStorage/IndexedDB)? Server + DB? Third-party (Supabase)? This single decision shapes every other decision.

The Naming Rule
Name things after what they do, not what they are.

Bad: helpers.ts, utils.js, stuff.tsx
Good: formatDate.ts, useProjectStore.ts, parseNodeConnections.ts

Vague names become dumping grounds. Specific names force clarity.

Frontend Structure
Single-tool project
src/
  components/         ← UI pieces
  hooks/              ← state logic (useX naming)
  utils/              ← pure functions, no React
  types.ts            ← TypeScript interfaces
  store.ts            ← Zustand/state store
  App.tsx
Multi-tool project (most SaaS products)
Organize by feature, not by layer.
src/
  tools/
    writing-planner/
      index.tsx              ← entry point for this tool
      components/            ← UI only for this tool
      hooks/                 ← state logic for this tool
      utils/                 ← helpers specific to this tool
      types.ts               ← types for this tool only
      store.ts               ← Zustand store if needed

    debt-calculator/
      index.tsx
      components/
      hooks/
      utils/
      types.ts

    seo-analyzer/
      index.tsx
      components/
      hooks/
      utils/
      types.ts

  shared/                    ← ONLY things used by 2+ tools
    components/              ← Button, Modal, Input, Toast
    hooks/                   ← useLocalStorage, useDebounce
    utils/                   ← formatDate, truncateText
    types.ts                 ← shared TypeScript interfaces
    constants.ts             ← app-wide constants

  app/                       ← routing, layout, global state
    routes.tsx
    Layout.tsx
    globalStore.ts           ← only truly global state (auth, theme)
Key Rules for Shared/

Something only moves to shared/ when it's actually used in 2+ tools — not because you think it might be reused someday.
Premature sharing turns shared/ into a dumping ground.

The Deletion Test
Each tool folder must be deletable without touching anything else. If deleting writing-planner/ breaks debt-calculator/, your separation is wrong.
File vs Folder Decision
SituationDecisionOne component, one hook, or one utilityNew file onlyFeature has 3+ files that belong togetherNew folderShared by 2+ featuresMove to shared/
Never let Cursor decide structure. You decide where files go, then tell Cursor:

"Create a comments/ folder inside src/features/. Add CommentList.tsx, useComments.ts, and types.ts inside it. No other files."


Backend Structure
Backend files have strict jobs. One file doing two jobs is how bugs hide.
Standard Backend Layout
src/
  routes/        ← URL definitions only — maps URLs to controllers
  controllers/   ← HTTP in, HTTP out — reads req, calls service, sends res
  services/      ← business logic — no HTTP code here
  models/        ← database queries only
  middleware/    ← auth, validation, rate limiting
  utils/         ← pure helper functions, no side effects

  integrations/  ← one folder per third-party service
    stripe/
      stripeClient.js      ← initialize client once
      stripeService.js     ← your wrapper functions
      stripeWebhooks.js    ← webhook handlers
    openai/
      openaiClient.js
      openaiService.js
    sendgrid/
      emailClient.js
      emailService.js

config/
  env.js         ← loads and validates ALL env vars on startup
  database.js    ← DB connection setup
.env             ← secrets — NEVER committed to git
server.js        ← starts the server, that's it
app.js           ← Express setup, registers routes
Layer Jobs (memorize this)
File typeIts only jobExampleRouteMap URL + method to a handlerPOST /users → createUserControllerReceive request, call service, send responsecreateUser(req, res)ServiceBusiness logic — no HTTP stuffregisterUser(email, password)ModelTalk to the databaseUser.findById(id)MiddlewareRun before handlerrequireAuth(req, res, next)UtilsPure functions, no side effectshashPassword(str)
The Most Important Separation: Controller vs Service

Controller knows about HTTP — reads req.body, sends res.json()
Service knows nothing about HTTP — takes plain data, returns plain data

This means you can test your service without faking a request object.
Data Flow — One Direction Only
Route → Controller → Service → Integration → Third Party API
                   ↓
                 Model → Database
Nothing skips a layer. Nothing calls backwards. A controller never imports from stripeService.js directly — it goes through a business service first.

The Planning Process Before Any Feature
Step 1 — Write user stories first, not code.
"As a user I can ___." Fill in 5–8 blanks. These become your routes, components, and DB tables. Everything maps to a user action.
Step 2 — Sketch the data, not the UI.
Draw boxes for entities and arrows for relationships. User has many Projects. Project has many Pages. This is your entire schema. Do it on paper in 5 minutes.
Step 3 — Build vertically, not horizontally.
Pick one user story — "user can create a project" — and build the entire slice: UI → state → storage → done. Then next story. Never build all components first, then all hooks, then wire.
Step 4 — Write a spec comment before prompting Cursor.
Before prompting for any new feature, write this at the top of a scratch file:

"This feature needs to do X. The data is Y. It will live in Z folder. It touches these existing files: A, B."

This forces thinking before building and makes Cursor prompts 10x better.

Starter Prompt for Cursor (paste before any backend project)
Project structure:
- Frontend: src/tools/[tool-name]/ per tool with shared components in src/shared/
- Backend: routes → controllers → services → integrations pattern
- Third-party services: src/integrations/[service-name]/ with a client file and service file
- All env vars load from config/env.js only — never scattered across files
- Never call third-party APIs from controllers directly
- Always use parameterized queries — never concatenate user input into SQL
- Always verify webhooks with signature verification

Common Mistakes Cursor Makes

Dumps files wherever it wants — always specify the exact path
Adds new code instead of replacing broken code — tell Cursor "replace the existing X, don't add alongside it"
Puts everything in one giant file — tell Cursor to build one layer at a time: "add the service layer for auth, the route and controller come next"
Forgets the layer separation — route handlers with DB queries buried inside = instant future mess

ARCHITECTURE.md — Keep This in Your Project Root
Create a 20–30 line file describing:

Where state lives
How features are structured
Naming conventions
Which third-party services and where their code lives

Paste it at the top of any important Cursor prompt. This is your single source of truth for the AI across sessions.