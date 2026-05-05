# Cloud Space - Deployment Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Account with: Firebase, Pinecone, OpenAI, AWS S3

---

## Part 1: Backend Deployment

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/hetanghan12/doc-vault-backend.git
cd doc-vault-backend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# CORS - Add your frontend domain
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Generate secure tokens:
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
STATUS_ENDPOINT_TOKEN=your-generated-token-here
N8N_WEBHOOK_SECRET=your-generated-token-here

# Rate Limiting
RATE_LIMIT_MAX=300

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ENABLE_TEST_USER_ENDPOINT=false

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# OpenAI (REQUIRED for AI features)
OPENAI_API_KEY=sk-...

# Pinecone (REQUIRED for vector search)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=your-index-name

# AWS S3 (REQUIRED for file storage)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Razorpay (Optional - for payments)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

### 3. Add Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Generate new private key
4. Save as `backend/config/firebase-service-account.json`

### 4. Start Backend

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Backend on Render.com (Free)

1. Push code to GitHub
2. Go to [Render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: Add all from `.env`

---

## Part 2: Frontend Deployment

### 1. Clone & Install

```bash
git clone https://github.com/hetanghan12/major-projecct.git
cd frontend-angular
npm install
```

### 2. Configure Environment

Edit `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-domain.com/api',
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  }
};
```

### 3. Build

```bash
npm run build
```

Output: `dist/frontend-angular/`

### 4. Deploy Frontend

#### Option A: Vercel (Recommended - Free)

```bash
npm i -g vercel
vercel
```

#### Option B: Netlify

1. Go to [Netlify](https://netlify.com)
2. Drag & drop `dist/frontend-angular` folder
3. Or connect GitHub repo

#### Option C: Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/dist/frontend-angular;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Part 3: Required Service Setup

### Firebase

1. Create project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password, Google)
3. Enable Firestore Database
4. Enable Storage
5. Get API keys from Project Settings

### Pinecone

1. Sign up at [pinecone.io](https://pinecone.io)
2. Create index:
   - Name: `cloud-space`
   - Dimension: `3072`
   - Metric: `cosine`

### OpenAI

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Ensure funds in account

### AWS S3

1. Create bucket in AWS Console
2. Create IAM user with S3 access
3. Get Access Key ID and Secret

---

## Part 4: Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate and set `STATUS_ENDPOINT_TOKEN`
- [ ] Generate and set `N8N_WEBHOOK_SECRET`
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain
- [ ] Set `ENABLE_TEST_USER_ENDPOINT=false`
- [ ] Restrict Firebase API key in Console
- [ ] Use HTTPS in production

---

## Quick Deploy Summary

| Component | Platform | Command |
|-----------|----------|---------|
| Backend | Render.com | `npm start` |
| Frontend | Vercel | `vercel` |
| Database | Firebase Firestore | (managed) |
| Storage | AWS S3 | (managed) |
| Vectors | Pinecone | (managed) |

---

## Troubleshooting

### CORS Errors
- Check `ALLOWED_ORIGINS` in backend `.env`
- Include protocol (https://)

### 500 Errors
- Check backend logs: `npm run dev` shows console errors
- Verify all env vars are set

### Auth Issues
- Verify Firebase config in frontend
- Check Firebase Console authentication is enabled