How to configure CORS (Cross-Origin Resource Sharing) correctly so your frontend can talk to your backend without browser blocks, while not leaving your API open to every website on the internet. Use this skill whenever the user mentions CORS, gets a CORS error in the browser, is setting up a frontend and backend on different domains or ports, asks why their API calls are being blocked, or is connecting a Vercel frontend to a Railway/Render backend. Also trigger for phrases like "CORS error", "blocked by CORS policy", "Access-Control-Allow-Origin", "cross-origin", "my frontend can't call my backend", "allow origin star", "credentials mode", "preflight", or any time a frontend on one domain (or localhost port) is calling an API on a different domain or port. Always apply correct CORS config before any backend is deployed — AI gets this wrong constantly, either blocking legitimate requests or opening the API to everyone.CORS Configuration Skill
What CORS Actually Is
When your frontend (on writingplanner.com) makes a request to your backend (on api.writingplanner.com), the browser asks the backend: "is this frontend allowed to talk to you?" This check is CORS — Cross-Origin Resource Sharing.
"Origin" means domain + protocol + port. These are all different origins:

https://writingplanner.com
http://writingplanner.com (different protocol)
https://api.writingplanner.com (different subdomain)
https://writingplanner.com:3001 (different port)
http://localhost:3000 (local development)

The browser enforces this. You cannot turn it off on the client side. You configure it on the server.

The Dangerous AI Mistake: Access-Control-Allow-Origin: *
This is the most important thing in this skill. Read it twice.
When AI can't figure out CORS, it does this:
javascript// AI's lazy fix — DO NOT USE THIS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
})
The * wildcard means: any website on the internet can make requests to your API.
This seems harmless until you understand the attack: a malicious site evil.com can make requests to api.yourapp.com and the browser will include your users' cookies in those requests. This is called CSRF (Cross-Site Request Forgery). Your API happily processes those requests thinking they came from your app — because the user's auth cookie is included.
Never use * on any API that uses cookies for authentication.
The only safe use of * is for truly public, read-only APIs with no authentication.

The Correct CORS Setup
Installation
bashnpm install cors
Basic Configuration (Most Common Setup)
javascript// config/cors.js
const cors = require('cors')

const allowedOrigins = {
  development: [
    'http://localhost:3000',    // React dev server
    'http://localhost:5173',    // Vite dev server
    'http://localhost:4000',    // another local port
  ],
  staging: [
    'https://staging.writingplanner.com',
    'https://writingplanner-staging.vercel.app'
  ],
  production: [
    'https://writingplanner.com',
    'https://www.writingplanner.com',
    'https://app.writingplanner.com'
  ]
}

const corsOptions = {
  origin: function(origin, callback) {
    // allow requests with no origin (Postman, curl, server-to-server calls)
    if (!origin) return callback(null, true)
    
    const env = process.env.NODE_ENV || 'development'
    const allowed = allowedOrigins[env] || allowedOrigins.development
    
    if (allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`))
    }
  },
  
  credentials: true,    // REQUIRED if you use cookies for auth (httpOnly cookies)
  
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  
  maxAge: 86400    // cache preflight response for 24 hours (reduces preflight requests)
}

module.exports = cors(corsOptions)
javascript// app.js — apply CORS before ALL other middleware
const corsMiddleware = require('./config/cors')

app.use(corsMiddleware)         // must be FIRST
app.options('*', corsMiddleware) // handle preflight for all routes

app.use(express.json())
app.use('/api/v1', routes)
// ... rest of your app

The credentials: true Rule
If your frontend sends cookies (which it does when you use httpOnly cookies for auth), you must set credentials: true on the backend AND send credentials from the frontend.
Backend:
javascriptcorsOptions = {
  origin: 'https://writingplanner.com',  // must be specific URL, NOT *
  credentials: true                       // required for cookies
}
Frontend (fetch):
javascriptconst res = await fetch('https://api.writingplanner.com/projects', {
  credentials: 'include'   // send cookies with request
})
Frontend (axios):
javascriptconst api = axios.create({
  baseURL: 'https://api.writingplanner.com',
  withCredentials: true    // send cookies with every request
})
Critical rule: When credentials: true, the origin CANNOT be *. It must be an explicit domain. The browser rejects * + credentials as a security measure. If AI sets * and you use cookies, auth will silently stop working.

What Preflight Requests Are
For certain requests (POST with JSON body, custom headers, PUT, PATCH, DELETE), the browser sends an OPTIONS request first to ask the server "can I do this?" This is called a preflight check.
Your server must respond correctly to OPTIONS requests or the actual request never happens.
javascript// app.js — handle preflight explicitly before routes
app.options('*', corsMiddleware)   // respond to all OPTIONS requests
app.use(corsMiddleware)
If your API returns 404 for OPTIONS requests, you'll see CORS errors even though your CORS config looks correct — because the preflight is failing.

Environment-Based Origins
The cleanest approach: pull allowed origins from environment variables so you don't have to change code for different environments.
javascript// config/cors.js
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    
    // comma-separated list of allowed origins in env var
    // e.g. ALLOWED_ORIGINS=https://writingplanner.com,https://www.writingplanner.com
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
    
    if (allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
bash# .env (local)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# production environment variable
ALLOWED_ORIGINS=https://writingplanner.com,https://www.writingplanner.com
Now your CORS is controlled entirely by an environment variable — no code changes when you add a new frontend domain.

Common CORS Blunders AI Makes
Blunder 1: * with cookies
javascript// AI's broken version — cookies never work
app.use(cors({ origin: '*', credentials: true }))
// Browser ignores credentials: true when origin is *
// httpOnly cookies silently fail to send
// Users appear logged out on every request
Blunder 2: Missing OPTIONS handler
javascript// Missing this line means preflight requests get 404
app.options('*', corsMiddleware)  // AI forgets this constantly
Blunder 3: CORS applied after routes
javascript// Wrong — routes process before CORS headers are set
app.use('/api/v1', routes)
app.use(cors(options))   // too late, requests already processed

// Correct — CORS must be first
app.use(cors(options))
app.options('*', cors(options))
app.use('/api/v1', routes)
Blunder 4: Hardcoded origins in production
javascript// Wrong — localhost in production CORS means your API is inaccessible from real domains
origin: ['http://localhost:3000']  // this is your dev config accidentally shipped to prod
Blunder 5: Wrong origin for cookies
javascript// Wrong — subdomain doesn't inherit parent domain's cookies
// If cookies are set on api.writingplanner.com but origin is writingplanner.com, cookies might not send
// Configure carefully: the origin must match EXACTLY where the frontend runs
origin: 'https://writingplanner.com'  // fine if frontend is at this exact domain
// but NOT 'https://app.writingplanner.com' if that's where the frontend actually is

Debugging CORS Errors
When you see a CORS error in the browser console, follow this checklist:
Step 1: Read the exact error message
Access to fetch at 'https://api.yourapp.com' from origin 'https://yourapp.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
→ Backend is not returning CORS headers at all. Check that app.use(cors(options)) is before routes and that OPTIONS handler exists.
The value of 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' 
when the request's credentials mode is 'include'
→ You have origin: '*' but credentials: true. Change * to your specific frontend URL.
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status
→ Your server is returning non-200 for OPTIONS requests. Add app.options('*', corsMiddleware).
Step 2: Check with curl
bash# Simulate a preflight request
curl -X OPTIONS https://api.yourapp.com/projects \
  -H "Origin: https://yourapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -i "access-control"

# Should see in response:
# Access-Control-Allow-Origin: https://yourapp.com
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
If those headers aren't in the response, CORS is misconfigured on the backend.

The Complete Setup for Typical Indie App
javascript// config/cors.js — copy this, adjust your domains
const cors = require('cors')

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)  // allow Postman/curl
    
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map(o => o.trim())
    
    if (allowed.includes(origin)) {
      return callback(null, true)
    }
    
    console.warn(`CORS blocked: ${origin}`)
    callback(new Error(`CORS policy does not allow origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],  // headers frontend is allowed to read
  maxAge: 86400
}

module.exports = cors(corsOptions)

// app.js
const corsMiddleware = require('./config/cors')

app.use(corsMiddleware)
app.options('*', corsMiddleware)   // handle preflight
// ... rest of app
bash# .env.example
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# production .env (or platform env var)
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com

Starter Prompt for Cursor (CORS)
Paste before any backend setup work:
CORS configuration requirements:
- Never use origin: '*' — always specify exact allowed origins
- Load allowed origins from ALLOWED_ORIGINS environment variable (comma-separated list)
- Set credentials: true since we use httpOnly cookies for auth
- Handle OPTIONS preflight with app.options('*', corsMiddleware) before all routes
- Apply CORS middleware as the FIRST middleware in app.js, before routes
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization
- Set maxAge: 86400 to cache preflight for 24 hours
- Log blocked origins as warnings for debugging
- Local development: allow localhost:3000 and localhost:5173 by default