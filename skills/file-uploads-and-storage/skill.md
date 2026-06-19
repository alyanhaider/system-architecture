Use this skill whenever building or modifying any feature that accepts file uploads — images, avatars, PDFs, documents, exports, or any user-supplied binary data. Trigger on requests like "let users upload a profile picture," "add file attachments," "store generated PDFs," "users can export and download X," or any mention of Cloudinary, S3, Supabase Storage, or multer. File upload endpoints are one of the most commonly attacked surfaces on a web app, so trigger proactively any time an upload route is touched, even for what seems like a simple image picker.File Uploads & Storage
The rule everything else follows from
Never let an uploaded file sit on the server's own disk, even briefly as a permanent destination. Once that's the rule, almost every other piece of advice here is just a consequence of it: validate before the file leaves memory, use a storage service as the actual destination, store only a reference in the database, never run files through the web server when serving them back.
Why "just save it to disk" fails in production
It works locally and breaks in exactly four ways once deployed:

Disk fills up. A VPS has finite storage; a few thousand uploads and the app is out of space and goes down entirely.
Files don't survive deploys. A redeploy resets the server's filesystem — every previously uploaded file is gone.
Multiple servers can't share files. Scale to two instances and uploads to server A are invisible to server B.
It's a direct attack surface. A file renamed to disguise its real type can end up sitting on the same machine that runs the application's own code — and if it's ever executed, that's a full compromise.

The correct shape: the server receives the file into memory only, immediately forwards it to a dedicated storage service, and returns a URL. The server is a pass-through, never a permanent home for the file.
Choosing a storage service

Cloudinary — best for images/video specifically; handles resizing, compression, and format conversion automatically, with generous free tier limits for small projects.
AWS S3 — the general-purpose industry standard, any file type, cheap at scale, more setup than Cloudinary.
Supabase Storage — the natural choice if already on Supabase; S3-compatible, easiest integration in that stack.
Cloudflare R2 — S3-compatible with zero egress fees, a strong cost-conscious alternative to S3.

Images specifically → Cloudinary. Everything else or mixed file types → S3 or R2.
Two upload flows
Server-side upload — Browser → Server → Storage → URL back to client. Simpler, the server is fully in control, but the file's bytes pass through the server's memory and bandwidth.
Presigned-URL direct upload — Browser → Server (gets temporary permission) → Storage directly → Server (confirms). The server never touches the file's bytes at all; storage does the heavy lifting. More setup, but the right move once upload volume or performance becomes a real constraint.
Start with server-side for an indie/small project; move to presigned uploads when that becomes a bottleneck — there's no need to build the more complex flow before it's actually needed.
Server-side upload, implemented correctly
javascript// integrations/storage/storageService.js
const cloudinary = require('cloudinary').v2
cloudinary.config({ cloud_name: storage.cloudName, api_key: storage.apiKey, api_secret: storage.apiSecret })

async function uploadImage(fileBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: options.folder || 'uploads',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_bytes: 5 * 1024 * 1024,
      transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }]
    }, (error, result) => error ? reject(error) : resolve(result))
    stream.end(fileBuffer)
  })
}
The security failures specific to uploads
File upload endpoints are attacked more than most surfaces, precisely because they're the most direct way to get untrusted bytes into a system.
No real file-type validation. Checking the file extension or the mimetype field is checking something the client fully controls — a file renamed from malware.php to malware.jpg passes both checks trivially. Real file formats have a signature in their first few bytes (a JPEG always starts FFD8FF, a PNG with 89504E47); validate against that instead:
javascript// wrong — client-controlled, proves nothing
if (file.mimetype !== 'image/jpeg') return res.status(400).json({ error: 'JPEGs only' })

// correct — inspects actual file content
const fileType = require('file-type')
async function validateFile(buffer) {
  const type = await fileType.fromBuffer(buffer)
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!type || !allowed.includes(type.mime)) throw new Error('Invalid file type')
  return type
}
No size limit. Without one, an oversized file (a multi-GB video on an image endpoint) can exhaust server memory and crash the app for every other user at the same time:
javascriptconst upload = multer({
  storage: multer.memoryStorage(),   // memory, never disk
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'), false)
    cb(null, true)   // this fileFilter check is preliminary; the real check is the magic-byte one above
  }
})
Storing the original filename. A filename like ../../etc/passwd taken at face value is a path-traversal risk depending on how files get served later. Generate a new name instead of trusting anything the client sent:
javascriptfunction generateSafeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase()
  return `${crypto.randomBytes(16).toString('hex')}${ext}`
}
// or simply rely on Cloudinary's auto-generated public_id, which is always safe
No auth on the upload route. Without requireAuth, anyone on the internet can upload unlimited files straight to the storage account, and a storage bill can spike overnight from a single unauthenticated endpoint:
javascriptrouter.post('/upload/avatar', requireAuth, checkLimit('uploads'), upload.single('file'), uploadController.avatar)
Serving files back through the web server. Routing file retrieval through the backend (res.sendFile(...)) means every image on a page becomes a request that consumes the server's own bandwidth — exactly what a storage CDN exists to avoid. Files should be served directly from Cloudinary's or S3's CDN, never proxied through the application server.
Presigned URLs — for files that must stay private
A public S3/Cloudinary URL is accessible to anyone with the link, which is wrong for personal documents, private exports, or anything sensitive. A presigned URL keeps the file private on storage and issues a temporary, time-limited signed link only when the legitimate owner requests it:
javascript// integrations/storage/s3Service.js
async function uploadPrivateFile(buffer, key, mimeType) {
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }))
  return key   // store this key, never a public ACL
}

async function getPrivateFileUrl(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })   // expires in 5 minutes
}
javascriptasync function downloadExport(req, res) {
  const export_ = await exportService.findById(req.params.id)
  if (export_.userId !== req.user.id) return fail(res, 403, 'FORBIDDEN', 'Access denied')  // ownership check first
  const url = await s3Service.getPrivateFileUrl(export_.s3Key)
  return res.redirect(url)
}
The ownership check happens before a signed URL is ever generated — generating the URL itself doesn't enforce who's allowed to ask for it.
What goes in the database vs. what goes in storage
Binary data goes to storage; metadata about it goes in the database. The file itself is never a database column:
sqlfiles
  id            UUID PRIMARY KEY
  user_id       UUID REFERENCES users(id)
  filename      VARCHAR        -- original name, display only — never used as a real path
  storage_key   VARCHAR         -- the key/public_id in S3 or Cloudinary
  storage_url   VARCHAR          -- public URL, null if private
  mime_type     VARCHAR
  size_bytes    INTEGER
  is_private    BOOLEAN DEFAULT FALSE
Image optimization without extra storage cost
Storing one original and requesting transforms on the fly avoids serving a multi-MB original on every page load just because that's what was uploaded:
javascriptcloudinary.url(publicId, { width: 100, height: 100, crop: 'fill', quality: 'auto', fetch_format: 'auto' })  // thumbnail
cloudinary.url(publicId, { width: 800, quality: 'auto', fetch_format: 'auto' })                               // full size
One upload, any number of size variants generated by the CDN as needed — no extra storage consumed per variant.
Folder structure
src/
  integrations/
    storage/
      cloudinaryClient.js   ← initialize once
      s3Client.js
      storageService.js      ← uploadFile, deleteFile, getUrl
      imageService.js         ← resize/optimize/validate helpers
  middleware/
    upload.js                ← multer config + file validation
  controllers/
    uploadController.js
  routes/
    uploads.js
javascript// the complete flow, put together
// middleware/upload.js
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

async function validateImageBuffer(req, res, next) {
  if (!req.file) return fail(res, 400, 'NO_FILE', 'No file provided')
  const type = await fileType.fromBuffer(req.file.buffer)
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!type || !allowed.includes(type.mime)) return fail(res, 400, 'INVALID_FILE', 'Only JPEG, PNG, and WebP allowed')
  next()
}

// routes/uploads.js
router.post('/upload/avatar', requireAuth, upload.single('file'), validateImageBuffer, uploadController.uploadAvatar)
The same controller should delete the old file from storage when an avatar (or similar single-slot upload) is replaced — otherwise every re-upload silently accumulates orphaned files in the storage account.
The one-paragraph brief for an AI coding agent

"Never save files to server disk — upload to Cloudinary or S3 immediately and store only the URL and storage key in the database. Use multer with memoryStorage, never diskStorage. Validate actual file content with the file-type package, never just the mimetype header. Set hard file size limits (5MB for images). Never use the original filename — generate a random one or use the storage provider's auto-generated ID. All upload routes require auth middleware. Private files use presigned URLs expiring in a few minutes, with an ownership check before the URL is generated. Store file metadata (user_id, storage_key, storage_url, mime_type, size_bytes) in a files table, never the file itself. Delete the old file from storage when one is replaced."

Where this skill stops
For where storageService.js sits in the backend's overall integration pattern, see backend-architecture. For checking that the requesting user actually owns the resource being downloaded/deleted, see database-design-security's broken-access-control guidance — it applies to files exactly as it does to any other resource.