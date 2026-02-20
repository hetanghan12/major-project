<<<<<<< HEAD
# major-projecct
=======
# DocVault - AI-Powered Document Storage

A secure, cloud-based document storage web application with private AI assistant capabilities.

## 🚀 Project Overview

DocVault allows users to:
- **Upload documents** (PDF, DOCX, TXT) with automatic text extraction
- **Secure cloud storage** using AWS S3
- **AI-powered search** - Ask questions and get answers from YOUR documents only
- **Complete user isolation** - No data leakage between users

## 📁 Project Structure

```
project 1/
├── backend/                        # Node.js + Express API (v2.0.0)
│   ├── config/                     # Configuration files
│   │   ├── aws.config.js           # AWS S3 client initialization
│   │   ├── firebase.config.js      # Firebase Admin SDK (Auth + Firestore)
│   │   ├── pinecone.config.js      # Pinecone vector database
│   │   ├── openai.config.js        # OpenAI embeddings & LLM
│   │   └── firebase-service-account.json
│   │
│   ├── controllers/                # Route controllers
│   │   ├── auth.controller.js      # Authentication logic
│   │   ├── document.controller.js  # Document CRUD operations
│   │   └── ai.controller.js        # AI query processing
│   │
│   ├── middlewares/                # Express middlewares
│   │   ├── auth.middleware.js      # Firebase token verification
│   │   ├── error.middleware.js     # Global error handling
│   │   └── upload.middleware.js    # Multer file upload config
│   │
│   ├── routes/                     # API route definitions
│   │   ├── auth.routes.js          # /api/auth/*
│   │   ├── document.routes.js      # /api/documents/*
│   │   ├── secure-document.routes.js # /api/secure/documents/* (authenticated)
│   │   └── ai.routes.js            # /api/ai/*
│   │
│   ├── services/                   # Business logic services
│   │   ├── s3.service.js           # AWS S3 upload/download
│   │   ├── textExtraction.service.js # PDF, DOCX, TXT parsing
│   │   ├── embedding.service.js    # Vector embedding generation
│   │   ├── firestore.service.js    # Firestore database operations
│   │   └── storage.service.js      # File storage utilities
│   │
│   ├── utils/                      # Utility functions
│   ├── storage/                    # Local file storage (temporary)
│   ├── uploads/                    # Upload staging directory
│   ├── server.js                   # Main entry point
│   ├── package.json
│   ├── .env                        # Environment variables (not in git)
│   └── .env.example                # Environment template
│
├── frontend-angular/               # Angular 18 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/               # Authentication pages
│   │   │   │   ├── login/          # Login component
│   │   │   │   └── register/       # Registration component
│   │   │   │
│   │   │   ├── dashboard/          # Dashboard component
│   │   │   ├── documents/          # Document management
│   │   │   ├── chat/               # AI chat interface
│   │   │   ├── simple-upload/      # Quick upload component
│   │   │   │
│   │   │   ├── core/               # Core module
│   │   │   │   ├── services/       # Angular services
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── document.service.ts
│   │   │   │   │   ├── chat.service.ts
│   │   │   │   │   └── upload.service.ts
│   │   │   │   ├── guards/         # Route guards
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── guest.guard.ts
│   │   │   │   └── interceptors/   # HTTP interceptors
│   │   │   │
│   │   │   ├── app.component.ts    # Root component
│   │   │   ├── app.config.ts       # App configuration
│   │   │   └── app.routes.ts       # Route definitions
│   │   │
│   │   ├── environments/           # Environment configs
│   │   │   ├── environment.ts      # Development
│   │   │   └── environment.prod.ts # Production
│   │   │
│   │   ├── styles.css              # Global styles (Tailwind)
│   │   └── index.html              # Entry HTML
│   │
│   ├── angular.json                # Angular CLI config
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── tsconfig.json               # TypeScript config
│   └── package.json
│
├── README.md                       # This file
├── QUICK_START.md                  # Quick setup guide
├── SECURITY_AND_SETUP.md           # Security documentation
└── S3_UPLOAD_FIX_REPORT.md         # S3 troubleshooting guide
```

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 18.2.0 | Framework |
| TypeScript | 5.5.2 | Type-safe JavaScript |
| Tailwind CSS | 3.4.0 | Utility-first styling |
| Firebase | 10.7.1 | Authentication client |
| RxJS | 7.8.0 | Reactive programming |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime |
| Express | 4.18.2 | Web framework |
| Firebase Admin | 12.0.0 | Server-side auth |
| AWS SDK | 3.679.0 | S3 file storage |
| OpenAI | 4.24.1 | Embeddings & Chat |
| Pinecone | 2.0.1 | Vector database |

### Cloud Services
| Service | Provider | Purpose |
|---------|----------|---------|
| File Storage | AWS S3 | Document storage |
| Authentication | Firebase Auth | User authentication |
| Database | Firestore | Document metadata |
| Vector DB | Pinecone | AI embeddings |
| AI | OpenAI | Embeddings & LLM |

## ☁️ Cloud Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER REQUEST                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   ANGULAR FRONTEND                           │
│                   (localhost:4200)                           │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐    │
│  │  Login  │ │Dashboard │ │ Upload │ │    AI Chat       │    │
│  └─────────┘ └──────────┘ └────────┘ └──────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP + Firebase Auth Token
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND                             │
│                  (localhost:3000)                            │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐   │
│  │ Auth Middleware│→ │ Route Handlers │→ │  Controllers  │   │
│  │ (Token Verify) │  │ (Secure Routes)│  │ (AI, Docs)    │   │
│  └────────────────┘  └────────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   AWS S3        │  │   Firestore     │  │   Pinecone      │
│   (Files)       │  │   (Metadata)    │  │   (Vectors)     │
│                 │  │                 │  │                 │
│ Bucket:         │  │ Collections:    │  │ Index:          │
│ docvault-dev-   │  │ - users         │  │ cloud-space     │
│ docs            │  │ - documents     │  │                 │
│                 │  │                 │  │ Dimension: 3072 │
│ Region:         │  │                 │  │                 │
│ eu-north-1      │  │                 │  │ Namespace:      │
│ (Stockholm)     │  │                 │  │ per-user        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    OpenAI       │
                    │   (AI Engine)   │
                    │                 │
                    │ Embeddings:     │
                    │ text-embedding- │
                    │ 3-large         │
                    │                 │
                    │ Chat:           │
                    │ GPT-4           │
                    └─────────────────┘
```

## 🔐 Security Features

### 1. User Namespace Isolation (Pinecone)

Each user gets their own **isolated namespace** in Pinecone:

```
┌─────────────────────────────────────────────────────────────┐
│                    PINECONE INDEX                           │
├─────────────────────────────────────────────────────────────┤
│  Namespace: "user_abc123"  │  Namespace: "user_xyz789"     │
│  ├── doc1_chunk_0          │  ├── doc1_chunk_0             │
│  ├── doc1_chunk_1          │  ├── doc1_chunk_1             │
│  └── doc2_chunk_0          │  └── doc2_chunk_0             │
│  (User A's vectors)        │  (User B's vectors)           │
│                            │  ❌ User A cannot access      │
└─────────────────────────────────────────────────────────────┘
```

**Security enforcement:**
- `namespace = userId` (from verified Firebase token)
- Namespace derived **server-side only** from `req.user.uid`
- **NEVER** accepted from frontend input
- Verified on every API request

### 2. Token Verification
- Firebase ID token verified on every protected request
- Token auto-refresh on frontend
- Middleware rejects invalid/expired tokens

### 3. File Security
- Allowed types: PDF, DOCX, TXT only
- Max file size: 10MB
- MIME type verification
- Secure S3 presigned URLs for downloads

### 4. S3 Bucket Security
- Private bucket (no public access)
- User-isolated folder structure: `users/{userId}/documents/`
- IAM permissions limited to specific bucket

## 👤 Test User

For demonstration and testing:

| Field | Value |
|-------|-------|
| Email | `testuser@collegeproject.com` |
| Password | `Test@12345` |

⚠️ **WARNING**: This user is for TESTING/DEMO purposes only!

## 📋 Quick Start

### Prerequisites
- Node.js 18+ 
- npm package manager
- AWS Account with S3 bucket
- Firebase project (Auth + Firestore)
- Pinecone account
- OpenAI API key

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend-angular
npm install
```

### 2. Configure Backend

Copy `.env.example` to `.env` and fill in:

```env
# Server
PORT=3000
NODE_ENV=development

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=docvault-dev-docs

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Pinecone (Vector Database)
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=cloud-space

# OpenAI (Embeddings & Chat)
OPENAI_API_KEY=your_openai_key
```

### 3. Configure Frontend

Edit `frontend-angular/src/environments/environment.ts`:

```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api',
    firebase: {
        apiKey: "your_firebase_api_key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "your_sender_id",
        appId: "your_app_id"
    }
};
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend-angular
npm start
```
App runs on: http://localhost:4200

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verify` | Verify Firebase token |
| GET | `/profile` | Get user profile |
| POST | `/sync` | Sync user with backend |
| POST | `/create-test-user` | Create demo user |

### Secure Documents (`/api/secure/documents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload document (multipart) |
| GET | `/` | List user's documents |
| GET | `/:id` | Get document details |
| GET | `/:id/download` | Get download URL |
| DELETE | `/:id` | Delete document |

### AI (`/api/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Query AI assistant |
| GET | `/health` | Check AI service status |

### Utilities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/pinecone/stats` | Pinecone index stats |

## 🗃 Database Schema

### Firestore Collections

**users**
```javascript
{
    userId: string,          // Firebase UID
    email: string,
    displayName: string | null,
    createdAt: timestamp,
    updatedAt: timestamp
}
```

**documents**
```javascript
{
    documentId: string,      // UUID
    userId: string,          // Owner's Firebase UID
    fileName: string,
    fileType: string,        // 'pdf', 'docx', 'txt'
    fileSize: number,        // bytes
    storagePath: string,     // Local path
    s3Key: string,           // S3 object key
    s3Url: string,           // S3 URL
    vectorCount: number,     // Pinecone vectors
    status: string,          // 'processing', 'ready', 'failed'
    uploadedAt: timestamp
}
```

### Pinecone Vector Metadata
```javascript
{
    userId: string,
    documentId: string,
    fileName: string,
    chunkIndex: number,
    text: string            // Truncated chunk text
}
```

## 📱 Frontend Features

### Pages
1. **Login** - Email/password authentication
2. **Register** - New user registration  
3. **Dashboard** - Overview with stats and quick actions
4. **Documents** - Upload, view, download, delete files
5. **AI Chat** - Interactive chat with document-based AI

### UI Features
- 🌙 Dark mode with glassmorphism design
- ✨ Smooth animations and transitions
- 📱 Fully responsive layout
- 🎨 Premium gradient accents
- 📤 Drag-and-drop file upload
- 💬 Real-time chat interface

## 🧪 Testing the Application

1. **Login** with test credentials
2. **Upload** a document (PDF, DOCX, or TXT)
3. Wait for processing (status changes to "ready")
4. Go to **AI Chat**
5. Ask questions about your document
6. AI responds using ONLY your uploaded documents

## 🔧 Troubleshooting

### S3 Upload Fails
- Check AWS credentials in `.env`
- Verify bucket name and region match
- Ensure IAM user has S3 permissions
- See `S3_UPLOAD_FIX_REPORT.md`

### Port Already in Use
- Server auto-retries ports 3000-3009
- Or manually kill: `taskkill /F /PID <pid>`

### Firebase Auth Errors
- Verify service account JSON path
- Check Firebase project configuration
- Ensure Firestore is enabled

## ⚠️ Important Notes

- This is a **college project** - not production-ready
- Always keep API keys secret
- The test user is for demo purposes only
- Pinecone free tier has limitations
- Monitor OpenAI API usage for costs

## 📄 License

This project is for educational purposes. Created as a college project.

---

**Author:** DocVault Team  
**Version:** 2.0.0  
**Last Updated:** December 2024
>>>>>>> c65e60d (Initial commit)
