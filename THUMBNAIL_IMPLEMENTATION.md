# 🖼️ CloudAI Thumbnail Rendering System

## Google Drive-Style Document Previews

This document describes the production-grade thumbnail rendering system for CloudAI Smart Storage.

---

## 📋 Overview

Every file uploaded to CloudAI now generates a **real first-page preview** (not placeholder icons) that is:
- Rendered server-side using Puppeteer/Canvas
- Stored in AWS S3 with CDN caching
- Displayed in the file grid like Google Drive

---

## 🎨 Supported File Types

| File Type | Rendering Method | Preview Quality |
|-----------|------------------|-----------------|
| **PDF** | pdf.js via Puppeteer → First page screenshot | ⭐⭐⭐⭐⭐ |
| **DOCX** | Mammoth → HTML → Puppeteer screenshot | ⭐⭐⭐⭐⭐ |
| **XLSX** | ExcelJS → HTML table → Puppeteer screenshot | ⭐⭐⭐⭐ |
| **PPTX** | Styled canvas placeholder | ⭐⭐⭐ |
| **TXT** | Monospace text → Puppeteer screenshot | ⭐⭐⭐⭐ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UPLOAD PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. File Upload → S3 Storage                                │
│         ↓                                                   │
│  2. Queue Thumbnail Job (async)                             │
│         ↓                                                   │
│  3. Worker Pool (3 concurrent workers)                      │
│         ↓                                                   │
│  4. Render First Page (Puppeteer/Canvas)                    │
│         ↓                                                   │
│  5. Upload preview.png to S3                                │
│         ↓                                                   │
│  6. Update Firestore with previewUrl                        │
│         ↓                                                   │
│  7. Frontend displays real preview                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
backend/
├── services/
│   ├── render.service.js         # Main rendering engine
│   ├── thumbnail-queue.service.js # Async job queue
│   └── thumbnail.service.js       # Legacy (fallback)
├── storage/
│   └── thumbnails/                # Local cache
└── package.json                   # Includes optional deps
```

---

## 🔧 S3 Storage Structure

```
s3://your-bucket/
├── users/{userId}/documents/{documentId}/{filename}  # Original files
└── thumbnails/{userId}/{documentId}.png              # Preview images
```

---

## ⚙️ Configuration

### Environment Variables

```env
# AWS S3 (Required)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=cloudai-storage

# Rendering (Optional - for high quality)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Thumbnail Dimensions

| Setting | Value |
|---------|-------|
| Thumbnail Width | 400px |
| Thumbnail Height | 280px |
| Render Width | 800px (2x for quality) |
| Cache Duration | 1 year |

---

## 🚀 API Endpoints

### Queue Stats
```http
GET /api/rendering/stats
```
Returns:
```json
{
  "success": true,
  "stats": {
    "pending": 5,
    "processing": 2,
    "completed": 150,
    "failed": 3,
    "activeWorkers": 2,
    "maxWorkers": 3
  }
}
```

### Job Status
```http
GET /api/rendering/job/:jobId
```

### Regenerate All Thumbnails
```http
POST /api/rendering/regenerate
```
Queues thumbnail jobs for all documents without previews.

---

## 📊 Database Schema

### Firestore Document
```javascript
{
  documentId: "doc_123",
  fileName: "report.pdf",
  fileType: "application/pdf",
  status: "ready",
  
  // Preview fields
  previewUrl: "https://bucket.s3.amazonaws.com/thumbnails/user/doc.png",
  previewPath: "thumbnails/user/doc.png",
  previewGenerated: true,
  previewGeneratedAt: "2024-01-11T14:00:00Z",
  previewMethod: "puppeteer-pdfjs",
  
  // Legacy
  thumbnailUrl: "/api/thumbnails/doc_123.png"
}
```

---

## 🔄 Worker Queue Features

| Feature | Implementation |
|---------|----------------|
| **Concurrency** | 3 parallel workers |
| **Retry Logic** | 3 attempts with exponential backoff |
| **Priority Queue** | TXT > PDF > DOCX > XLSX > PPTX |
| **Timeout** | 60 seconds per job |
| **Dead Letter Queue** | Failed jobs tracked separately |

---

## 💻 Frontend Integration

### Dashboard Component
```typescript
// Priority: S3 previewUrl > Legacy thumbnailUrl
getThumbnailUrl(doc: Document): string {
  const url = doc.previewUrl || doc.thumbnailUrl;
  if (url?.startsWith('/')) {
    return `${environment.apiUrl}${url}`;
  }
  return url || '';
}
```

### Template
```html
<div class="file-preview">
  @if (getThumbnailUrl(doc)) {
    <img [src]="getThumbnailUrl(doc)" 
         class="document-thumbnail"
         (error)="onThumbnailError($event, doc)" />
  } @else {
    <!-- Fallback SVG icon -->
  }
</div>
```

---

## 📦 Dependencies

### Required
- `canvas` - Canvas rendering
- `mammoth` - DOCX to HTML
- `pdf-parse` - PDF text extraction

### Optional (for high quality)
```bash
npm install puppeteer exceljs sharp
```

| Package | Purpose |
|---------|---------|
| `puppeteer` | High-quality HTML→image rendering |
| `exceljs` | XLSX parsing for spreadsheet previews |
| `sharp` | Image optimization (future) |

---

## 🧪 Testing

### Verify Rendering Queue
```bash
curl http://localhost:3000/api/rendering/stats
```

### Regenerate Thumbnails
```bash
curl -X POST http://localhost:3000/api/rendering/regenerate
```

### Check Specific Job
```bash
curl http://localhost:3000/api/rendering/job/thumb_doc123_1234567890
```

---

## 🔒 Security

1. **Thumbnails stored in S3** with long-term cache headers
2. **User isolation** - thumbnails stored under user's path
3. **Signed URLs** for private bucket access
4. **No sensitive content** - only first page preview

---

## 📈 Scaling

### Current (In-Memory Queue)
- Suitable for: < 1000 docs/day
- Workers: 3 concurrent

### Production (BullMQ + Redis)
```bash
npm install bullmq ioredis
```
- Suitable for: 100k+ docs/day
- Distributed workers
- Persistent job state
- Dashboard monitoring

---

## 🛠️ Troubleshooting

### Puppeteer Issues on Linux
```bash
# Install dependencies
apt-get install -y chromium-browser
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Canvas Build Issues
```bash
# Windows
npm install --global windows-build-tools

# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Linux
apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

---

## 🎯 Result

**Before:** Generic colored icons for all files  
**After:** Real first-page previews like Google Drive

| Before | After |
|--------|-------|
| 📄 PDF icon | First page of actual PDF |
| 📝 DOCX icon | First page with real text |
| 📊 XLSX icon | Spreadsheet grid with data |

---

## 📝 Changelog

### v3.0.0 (Current)
- Production-grade Puppeteer rendering
- S3 storage for thumbnails
- Async worker queue
- Priority scheduling
- Retry logic

### v2.0.0
- ExcelJS XLSX support
- PPTX placeholders
- Rendering queue

### v1.0.0
- Basic canvas placeholders
- Local storage
