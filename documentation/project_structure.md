# Project Structure: Cloud Space

This document outlines the directory and file structure for the Cloud Space application, including the Angular frontend and Node.js/Express backend.

## 📂 Root Directory
The root directory acts as the workspace for both the frontend and backend.

```text
/end last
├── backend/                # Node.js/Express backend service
├── frontend-angular/       # Angular 18+ standalone frontend
├── documentation/          # Project documentation and reports
├── README.md               # Main project documentation
├── package.json            # Root workspace configuration
└── .vercel/                # Vercel deployment configuration
```

---

## 🚀 Backend (`/backend`)
The backend handles authentication, file storage, AI processing (OpenAI + Pinecone), and database interactions.

```text
backend/
├── config/                 # Service configurations (AWS, Firebase, OpenAI, Pinecone)
├── controllers/            # Request logic handlers
├── middlewares/            # Auth verification, error handling, rate limiting
├── routes/                 # API endpoint definitions
│   ├── auth.routes.js      # User auth & profile
│   ├── ai.routes.js        # AI chat & query
│   ├── secure-document.routes.js # File operations with user isolation
│   └── ...
├── services/               # Core business logic (S3, Pinecone, AI, Thumbnails)
├── storage/                # Local cache and temporary file processing
├── uploads/                # Local uploads directory (if enabled)
├── server.js               # Main entry point
├── .env                    # Environment variables (Port, Keys, URLs)
└── package.json            # Backend dependencies
```

---

## 🎨 Frontend (`/frontend-angular`)
The frontend is built with Angular 18 using Standalone Components and a modern, premium design system.

```text
frontend-angular/src/app/
├── admin/                  # Admin-only management views
├── auth/                   # Login, Register, MFA, and Password Recovery
├── chat/                   # AI assistant chat interface
├── core/                   # Singleton services, models, and interceptors
│   ├── interceptors/       # Auth token injection (auth.interceptor.ts)
│   ├── services/           # API communication (auth, document, chat services)
│   └── models/             # TypeScript interfaces
├── dashboard/              # User overview and recent activity
├── documents/              # File management (upload, list, delete)
├── landing/                # Public marketing landing page
├── layouts/                # Main app wrappers (Sidebar, Navbar)
├── shared/                 # Reusable components (File Preview, Modals)
├── environments/           # Environment-specific API URLs
│   ├── environment.ts      # Development/Production config
│   └── environment.prod.ts # Production-specific config (Render URL)
├── app.routes.ts           # Frontend routing configuration
└── app.component.ts        # Root component
```

---

## 🛠️ Key Files to Note

| File | Purpose |
| :--- | :--- |
| `backend/server.js` | The heart of the backend; configures Express, CORS, and Routes. |
| `frontend-angular/src/environments/environment.prod.ts` | Contains the production Render backend URL. |
| `frontend-angular/src/app/app.routes.ts` | Defines how the user navigates through the application. |
| `backend/.env` | Critical file containing API secrets and configuration. |
| `DEPLOYMENT.md` | Step-by-step instructions for Vercel and Render deployment. |
