# Backend Hosting Readiness Report - Cloud Space

This report analyzes the backend server's readiness for production hosting and identifies critical issues that may cause failures or security risks.

## 📊 Summary
The backend is **Mostly Ready** but requires configuration changes and environment adjustments before deployment to a production cloud provider (e.g., Render, AWS, Heroku).

---

## 🚩 Critical Issues (Must Fix Before Hosting)

### 1. Ephemeral Filesystem Risk (Multer Storage)
*   **Location**: `server.js` and `secure-document.routes.js`
*   **Issue**: `multer.diskStorage` is used to save files to the local `uploads/` and `storage/` directories before uploading them to S3.
*   **Impact**: On platforms like **Heroku**, **Render (Free/Starter)**, or **AWS Lambda**, the filesystem is ephemeral. If the server restarts or scales during an upload/processing phase, the file will be lost. More importantly, concurrent uploads could fill up the limited disk space of many cloud instances.
*   **Recommendation**: Use `multer.memoryStorage()` to keep files in a buffer during processing, or stream directly to S3.

### 2. Service Account File Reference
*   **Location**: `config/firebase.config.js`
*   **Issue**: The Firebase Admin SDK expects a physical JSON file on disk. 
*   *Impact**: Most production CI/CD pipelines (GitHub Actions, etc.) and Secret Managers (AWS Secret Manager, Render Env Vars) do not support uploading files easily.
*   **Recommendation**: Refactor `initializeFirebase` to accept the service account as a JSON string from an environment variable (`FIREBASE_SERVICE_ACCOUNT_JSON`).

### 3. Non-Portable Start Scripts
*   **Location**: `package.json` (Line 9: `"prod": "NODE_ENV=production node server.js"`)
*   **Issue**: Setting environment variables inline like this works on Linux/macOS but **fails on Windows**.
*   **Recommendation**: Use `cross-env` (e.g., `"cross-env NODE_ENV=production node server.js"`) or let the hosting provider handle the `NODE_ENV` variable.

---

## 🔒 Security & Optimization Issues

### 1. Permissive CORS Policy
*   **Location**: `server.js` (Line 499: `origin: '*'`)
*   **Issue**: Allowing all origins is safe for development but exposes your API to CSRF and unauthorized cross-origin requests in production.
*   **Recommendation**: Set `origin` to your actual frontend domain (e.g., `https://cloudspace-app.com`).

### 2. Hardcoded Default Links
*   **Location**: `services/email.service.js` (Line 50: `http://localhost:4200`)
*   **Issue**: Shared file emails will contain broken links pointing to `localhost` if the `FRONTEND_URL` environment variable is not set correctly.
*   **Recommendation**: Ensure `FRONTEND_URL` is a mandatory environment variable in production.

### 3. Local Binary Dependencies
*   **Risk**: `canvas`, `tesseract.js`, and `pdf-poppler`
*   **Issue**: These libraries require OS-level dependencies (like `libcairo` or `poppler-utils`).
*   **Impact**: Lightweight Linux images (like Alpine) or standard Serverless functions will fail to run these unless specific buildpacks or Docker images are used.
*   **Recommendation**: Use a **Docker-based deployment** to ensure the environment has all necessary binaries.

---

## ✅ Production Checklist
1. [ ] Set `NODE_ENV=production`.
2. [ ] Configure `FRONTEND_URL` to point to your live site.
3. [ ] Configure `AWS_S3_BUCKET_NAME` with a production-grade bucket.
4. [ ] Verify `PINECONE_INDEX_NAME` is initialized in the production region.
5. [ ] Replace `origin: '*'` with restricted domains.
6. [ ] **Recommended**: Use Docker to containerize the app for consistent behavior.
