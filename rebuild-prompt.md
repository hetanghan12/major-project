# Master Rebuild Prompt — Cloud Space Backend (Admin Portal)

Use this prompt to recreate the entire project from scratch with an AI coding assistant (Cursor, Claude, ChatGPT, etc.).

---

## PROMPT

Build a **Node.js/Express.js backend** for a cloud document storage platform called **"Cloud Space"**. This is the **Central Admin Portal backend only** (v2.0.0). It uses Firebase (Auth + Firestore) as the core database, AWS S3 for file storage, Pinecone as a vector database, and OpenAI for AI embeddings.

---

### Tech Stack

- **Runtime:** Node.js ≥ 18.0.0
- **Framework:** Express.js v5
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication (Admin SDK)
- **File Storage:** AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Vector DB:** Pinecone (`@pinecone-database/pinecone`)
- **AI:** OpenAI (`openai` SDK, model: `text-embedding-3-large`, 3072 dimensions)
- **Other deps:** `cors`, `dotenv`, `helmet`, `express-rate-limit`, `multer`, `busboy`, `uuid`, `pdf-parse`, `pdf-poppler`, `mammoth`, `canvas`
- **Optional deps:** `sharp`, `exceljs`, `puppeteer`
- **Dev deps:** `nodemon`

---

### Project Folder Structure

```
backend/
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── config/
│   ├── firebase.config.js
│   └── firebase-service-account.json   ← downloaded from Firebase Console
├── controllers/
│   ├── auth.controller.js
│   └── admin.controller.js
├── middlewares/
│   ├── auth.middleware.js
│   └── admin.middleware.js
│   └── error.middleware.js
├── routes/
│   ├── auth.routes.js
│   └── admin.routes.js
├── services/
│   ├── firestore.service.js
│   ├── admin.service.js
│   └── logging.service.js
└── scripts/
    └── regenerate-thumbnails.js
```

---

### Environment Variables (`.env`)

```env
PORT=3000
NODE_ENV=development

PINECONE_API_KEY=<your_key>
PINECONE_INDEX_NAME=cloud-space
PINECONE_HOST=https://cloud-space-hbixkmf.svc.aped-4627-b74a.pinecone.io
PINECONE_ENVIRONMENT=us-east-1

OPENAI_API_KEY=<your_key>

AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=docvault-dev-docs

FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_STORAGE_BUCKET=<project_id>.appspot.com

ADMIN_EMAIL=admin@cloudspace.com

N8N_WEBHOOK_URL=   # optional
```

---

### Firestore Database Collections & Schema

#### `users` collection
Document ID = Firebase Auth UID
```json
{
  "userId": "string (Firebase UID)",
  "email": "string",
  "displayName": "string | null",
  "photoURL": "string | null",
  "role": "User | Admin | Editor",
  "status": "Active | Suspended",
  "storageUsed": "number (bytes)",
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

#### `documents` collection
Document ID = UUID
```json
{
  "documentId": "string (UUID)",
  "userId": "string (Firebase UID)",
  "fileName": "string",
  "fileType": "string (MIME type)",
  "fileSize": "number (bytes)",
  "storagePath": "string (local path)",
  "publicUrl": "string",
  "s3Key": "string | null",
  "s3Url": "string | null",
  "pineconeNamespace": "string (= userId)",
  "chunkIds": ["string array of vector IDs"],
  "vectorCount": "number",
  "thumbnailUrl": "string | null",
  "previewUrl": "string | null (S3 URL)",
  "previewPath": "string | null (S3 key)",
  "previewGenerated": "boolean",
  "isPublic": "boolean",
  "status": "processing | ready | failed",
  "uploadedAt": "ISO string",
  "updatedAt": "ISO string"
}
```

#### `audit_logs` collection
Auto-generated document ID
```json
{
  "event": "LOGIN_SUCCESS | USER_UPDATE | USER_DELETE | USER_UNLOCK | SETTINGS_UPDATE | FILE_UPLOAD | FILE_DELETE",
  "user": "string (display name or email)",
  "userId": "string (Firebase UID) | null",
  "ipAddress": "string",
  "timestamp": "ISO string",
  "status": "Success | Failed",
  "details": "object (arbitrary extra data)"
}
```

#### `system_settings` collection
Single document with ID = `global`
```json
{
  "systemName": "Cloud Space",
  "adminEmail": "admin@cloudspace.com",
  "maxFileSizeMB": 500,
  "registrationOpen": true,
  "maintenanceMode": false,
  "sessionTimeout": 60,
  "maxLoginAttempts": 5,
  "require2FA": false,
  "emailOnNewUser": true,
  "emailOnFileUpload": false,
  "emailOnError": true,
  "weeklyReport": true,
  "updatedAt": "ISO string"
}
```

#### `login_locks` collection
Document ID = user email
```json
{
  "email": "string",
  "failures": "number",
  "lastFailure": "ISO string",
  "ip": "string",
  "lockedUntil": "ISO string | undefined"
}
```

#### `subscription_plans` collection
Document ID = `starter | pro | enterprise`
```json
{
  "name": "string",
  "description": "string",
  "price": "number (USD/month)",
  "features": ["string array"],
  "limits": { "storage": "number (bytes, -1 = unlimited)" },
  "isPopular": "boolean",
  "updatedAt": "ISO string"
}
```

#### `ai_usage` collection
Auto-generated document ID
```json
{
  "userId": "string",
  "model": "string (e.g. gpt-4o)",
  "type": "CHAT | EMBEDDING",
  "usage": {
    "prompt_tokens": "number",
    "completion_tokens": "number",
    "total_tokens": "number"
  },
  "cost": "number (USD)",
  "timestamp": "ISO string",
  "createdAt": "Firestore Timestamp"
}
```

---

### API Routes

#### Public / Auth Routes — `/api/auth`

| Method | Path | Middleware | Description |
|--------|------|------------|-------------|
| POST | `/verify` | verifyFirebaseToken | Verify Firebase ID token, create/update user in Firestore |
| GET | `/profile` | verifyFirebaseToken | Get current user's Firestore profile |
| POST | `/sync` | verifyFirebaseToken | Sync user after login, reset lockout, log LOGIN_SUCCESS |
| POST | `/create-test-user` | none | Create test user in Firebase Auth + Firestore (dev only) |
| POST | `/fail` | none | Record failed login attempt, lock if maxAttempts reached |
| GET | `/lockout-status/:email` | none | Return lock status for a given email |

#### Admin Routes — `/api/admin` (all require `verifyFirebaseToken` + `isAdmin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Aggregate stats: users, docs, storage, active users (24h), recent activity |
| GET | `/analytics` | 7-day charts: user growth, file activity, type distribution, DAU |
| GET | `/users` | List all users merged from Firebase Auth + Firestore (supports `?role=` and `?status=` filters) |
| PUT | `/users/:userId` | Update user role/status/displayName |
| DELETE | `/users/:userId` | Delete user from Firebase Auth + Firestore |
| POST | `/users/:userId/unlock` | Clear login_locks for a user |
| GET | `/audit-logs` | Return last 50 audit logs sorted by timestamp desc |
| GET | `/settings` | Return system settings (merges DB with defaults) |
| PUT | `/settings` | Update system settings |
| GET | `/subscriptions` | Return subscription plans (returns defaults if none in DB) |
| PUT | `/subscriptions/:planId` | Create or update a subscription plan |
| GET | `/ai-usage/metrics` | Return AI usage breakdown, model stats, 7-day trend |

#### System Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | HTML health ping page |
| GET | `/api/status` | JSON diagnostics (Firebase connectivity, uptime) |
| GET | `/api/health` | Redirects to `/api/status` |

---

### Key Business Logic

**Authentication flow:**
1. Frontend logs in via Firebase Auth (client SDK)
2. Frontend calls `POST /api/auth/sync` with the Firebase ID token in the `Authorization: Bearer <token>` header
3. Backend verifies token with Firebase Admin SDK, upserts user profile in Firestore, resets login failures, logs `LOGIN_SUCCESS`
4. If login fails on the frontend, it calls `POST /api/auth/fail` with the email
5. After `maxLoginAttempts` failures, the account is locked for `sessionTimeout` minutes

**Admin role check (`isAdmin` middleware):**
- If `req.user.email === ADMIN_EMAIL` (from `.env`) → allow immediately
- Otherwise, look up Firestore `users/{uid}` and check `role === 'Admin'`

**Dashboard stats (`getDashboardStats`):**
- Total users from `Firebase Auth.listUsers()` (not Firestore count)
- Auto-syncs any Firebase Auth users missing from Firestore
- Documents counted by unique `{userId}_{fileName}_{fileSize}` key to avoid duplicates
- Active users = Firebase Auth users whose `lastSignInTime` is within 24 hours
- Storage capped at 10 GB for percentage calculation

**User list (`getAllUsers`):**
- Source of truth = Firebase Auth `listUsers(1000)`
- Merges with Firestore user profiles
- Merges with `login_locks` collection for lockout status
- Falls back gracefully if either source is unavailable

**AI usage logging (`logAIUsage`):**
- Fire-and-forget (errors are swallowed so they don't fail main request)
- `calculateEstimatedCost(model, usage)` calculates USD cost based on per-token rates

---

### `config/firebase.config.js` behaviour

- Singleton pattern — only initializes once (`firebaseApp` guard)
- Reads `firebase-service-account.json` from path in `FIREBASE_SERVICE_ACCOUNT_PATH` env var (defaults to `./config/firebase-service-account.json`)
- Validates JSON has `project_id`, `private_key`, `client_email`
- Storage bucket = `FIREBASE_STORAGE_BUCKET` env var OR `<project_id>.appspot.com`
- Exports: `initializeFirebase()`, `getAuth()`, `getFirestore()`, `getStorage()`, `admin`

---

### Error Handling

- All async route handlers wrapped with `asyncHandler(fn)` to catch promise rejections
- Custom `ApiError` class with `statusCode`, `message`, `details`, `isOperational`
- Global `errorHandler` middleware — never exposes stack traces in production
- Handles: Multer file errors, Firebase Auth error codes, CORS, JSON parse errors, payload too large

---

### Default Subscription Plans (returned when DB collection is empty)

| ID | Name | Price | Storage |
|----|------|-------|---------|
| starter | Starter | $0/mo | 5 GB |
| pro | Professional | $19/mo | 100 GB |
| enterprise | Enterprise | $99/mo | Unlimited |

---

### Notes

- All Firestore queries avoid `orderBy` to prevent composite index requirements — sorting is done in-memory after fetching
- `CORS` is set to `origin: '*'` in development — tighten for production
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` env vars control the test user endpoint (disable in production)
- The `scripts/regenerate-thumbnails.js` script regenerates document thumbnails stored in `backend/storage/thumbnails/` and previews in `backend/storage/previews/`
- The `logging.service.js` stores AI usage in the `ai_usage` Firestore collection with cost estimation per model

---

### Setup Instructions (for the AI to include in README)

```bash
cd backend
npm install

# Add your firebase-service-account.json to backend/config/
# Copy .env.example to .env and fill in all values

npm run dev    # development with nodemon
npm start      # production
```
