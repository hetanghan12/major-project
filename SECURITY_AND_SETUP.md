# Security and Setup Documentation

## Cloud Space - Production-Hardened Backend

This document describes the security measures, setup procedures, and architecture of the Cloud Space backend.

---

## Table of Contents

1. [Port Architecture](#port-architecture)
2. [Security Libraries](#security-libraries)
3. [Security Features](#security-features)
4. [Upload Security](#upload-security)
5. [Environment Variables](#environment-variables)
6. [Health Check](#health-check)
7. [Error Handling](#error-handling)
8. [Setup Instructions](#setup-instructions)

---

## Port Architecture

| Service | Port | Description |
|---------|------|-------------|
| Angular Frontend | 4200 | Development server (`ng serve`) |
| Node.js Backend | 5000 | Express API server |

### Why Separate Ports?

- **No conflicts**: Frontend and backend can run simultaneously
- **Clear separation**: API calls clearly go to a different origin
- **Production-ready**: Mirrors production deployment patterns
- **CORS practice**: Proper CORS handling between origins

---

## Security Libraries

### 1. Helmet (`helmet`)

**Purpose**: Sets various HTTP headers to protect against well-known vulnerabilities.

**Threats Mitigated**:
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME sniffing attacks
- Cross-Origin Resource Policy issues
- DNS prefetch attacks

**Configuration**:
```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disabled for API-only backend
}));
```

### 2. Express Rate Limit (`express-rate-limit`)

**Purpose**: Limits repeated requests to public APIs.

**Threats Mitigated**:
- Brute-force attacks
- DDoS attacks
- API abuse
- Resource exhaustion

**Configuration**:
```javascript
// General: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Auth: 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

// Uploads: 50 per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50
});
```

### 3. CORS (`cors`)

**Purpose**: Controls which origins can access the API.

**Threats Mitigated**:
- Cross-site request forgery (CSRF)
- Unauthorized API access
- Data theft from other origins

**Configuration**:
```javascript
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200'
];
// No wildcards (*) - explicit whitelist only
```

### 4. Multer (`multer`)

**Purpose**: Handles multipart/form-data for file uploads.

**Security Features**:
- File size limits (10MB)
- File type validation (extension + MIME)
- Filename sanitization
- Single file restriction

---

## Security Features

### HTTP Security Headers

| Header | Purpose |
|--------|---------|
| X-Content-Type-Options | Prevents MIME sniffing |
| X-Frame-Options | Prevents clickjacking |
| X-XSS-Protection | XSS filter |
| Strict-Transport-Security | Forces HTTPS |
| X-DNS-Prefetch-Control | Controls DNS prefetching |

### Disabled: x-powered-by

```javascript
app.disable('x-powered-by');
```

**Why**: Prevents attackers from knowing the server technology (Express).

### Body Size Limits

```javascript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));
```

**Threats Mitigated**:
- Payload size attacks
- Memory exhaustion
- Denial of service

### Directory Traversal Protection

```javascript
if (req.path.includes('..')) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

**Threats Mitigated**:
- Path traversal attacks
- Unauthorized file access

---

## Upload Security

### File Validation Rules

| Rule | Value |
|------|-------|
| Max file size | 10 MB |
| Allowed extensions | .pdf, .docx, .doc, .txt |
| Allowed MIME types | application/pdf, application/vnd.openxmlformats-..., text/plain |
| Files per request | 1 |
| Form field name | `file` |

### Filename Sanitization

```javascript
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // Remove dangerous chars
    .replace(/\.{2,}/g, '.')             // No multiple dots
    .replace(/^\.+/, '')                 // No leading dots
    .substring(0, 255);                  // Limit length
}
```

### Secure Filename Generation

```javascript
function generateSecureFilename(originalFilename) {
  const uuid = uuidv4();
  const timestamp = Date.now();
  return `${uuid}_${timestamp}${ext}`;
}
```

**Benefits**:
- Prevents filename collisions
- Hides original filenames
- Makes guessing impossible

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `FIREBASE_PROJECT_ID` | Firebase project | `cloud-space-7802f` |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket | `cloud-space-7802f.appspot.com` |
| `PINECONE_API_KEY` | Pinecone API key | `pk-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

### Security Notes

- **Never commit `.env` to version control**
- Use different values for development vs production
- Rotate API keys regularly
- Keep service account JSON files secure

---

## Health Check

### Endpoint

```
GET /api/health
```

### Response

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-12-14T10:00:00.000Z",
  "service": "Cloud Space Backend",
  "version": "2.0.0",
  "environment": "development"
}
```

### Purpose

1. **Load balancer checks**: Verify server is responding
2. **Monitoring**: Quick status verification
3. **Diagnostics**: First endpoint to test
4. **Deployment verification**: Confirm new deployments are working

---

## Error Handling

### Principles

1. **Never expose stack traces** in production
2. **Return JSON only** - no HTML error pages
3. **Proper HTTP status codes**:
   - 400: Bad Request (client error)
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 413: Payload Too Large
   - 429: Too Many Requests (rate limited)
   - 500: Internal Server Error (only for real server failures)

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "timestamp": "2024-12-14T10:00:00.000Z"
}
```

### Multer Error Handling

All file upload errors return 400 with specific messages:

| Error Code | Message |
|------------|---------|
| `LIMIT_FILE_SIZE` | File too large. Maximum allowed size is 10MB. |
| `LIMIT_FILE_COUNT` | Too many files. Only one file allowed per upload. |
| `LIMIT_UNEXPECTED_FILE` | Unexpected field name. Use "file" as the field name. |

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Verify Firebase Service Account

Ensure `config/firebase-service-account.json` exists and is valid.

### 4. Start Backend

```bash
# Development
npm run dev

# Production
npm run prod
```

### 5. Verify Health

```bash
curl http://localhost:5000/api/health
```

### 6. Start Frontend

```bash
cd frontend-angular
npm start
```

---

## Troubleshooting

### EADDRINUSE Error

**Cause**: Port 5000 is already in use.

**Solution**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### 500 Internal Server Error

**Causes**:
1. Missing environment variables
2. Invalid Firebase service account
3. Network issues with Pinecone/OpenAI

**Debug**:
- Check server console logs
- Verify all `.env` values
- Test `/api/health` endpoint first

### 0% Upload Progress

**Causes**:
1. CORS blocking the request
2. Wrong form field name (must be `file`)
3. File too large
4. Rate limit exceeded

**Fix**:
- Verify `FormData.append('file', file)`
- Check browser network tab for errors
- Verify CORS allows Angular origin

---

## Security Checklist

- [x] Helmet enabled
- [x] Rate limiting active
- [x] CORS with explicit origins
- [x] x-powered-by disabled
- [x] Body size limits set
- [x] File upload validation
- [x] Filename sanitization
- [x] Directory traversal protection
- [x] Graceful error handling
- [x] No stack traces in production
- [x] Environment variables for secrets

---

## Contact

For security issues, contact the development team immediately.

**Version**: 2.0.0 (Security Hardened)  
**Last Updated**: December 2024
