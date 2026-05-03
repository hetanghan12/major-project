# CHAPTER 4: HARDWARE REQUIREMENTS

---

## 4.1 Development Environment Hardware

The following hardware was used during the development of CloudSpace:

### 4.1.1 Development Workstation

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Processor** | Intel Core i5 (8th Gen) / AMD Ryzen 5 | Intel Core i7 (10th Gen+) / AMD Ryzen 7 |
| **RAM** | 8 GB DDR4 | 16 GB DDR4 or higher |
| **Storage** | 256 GB SSD | 512 GB NVMe SSD |
| **Display** | 14" Full HD (1920×1080) | 15.6"+ Full HD or 2K |
| **Network** | 10 Mbps broadband | 50+ Mbps broadband |
| **Operating System** | Windows 10 (64-bit) | Windows 11 (64-bit) |
| **GPU** | Integrated graphics | Dedicated GPU (for thumbnail rendering) |

### 4.1.2 Justification for Hardware Requirements

1. **Processor**: Angular development with TypeScript compilation, Node.js backend execution, and simultaneous browser testing require multi-core processing capabilities. The Angular compiler and Webpack bundler are CPU-intensive during build operations.

2. **RAM**: Running Angular development server, Node.js backend, browser with DevTools, code editor (VS Code), and Docker containers simultaneously requires at minimum 8 GB. 16 GB is recommended for smooth multitasking and to accommodate Node.js memory usage during document processing and thumbnail generation.

3. **Storage (SSD)**: Fast read/write speeds are essential for rapid file access during development. The `node_modules` directories for both frontend and backend contain thousands of small files, making SSD access patterns critical. NVMe SSDs provide 3-5x faster random read performance compared to SATA SSDs.

4. **Network**: Cloud service integration (Firebase, AWS S3, Pinecone, OpenAI) requires stable internet connectivity. Document uploads to S3 and API calls to OpenAI benefit from higher bandwidth.

## 4.2 Production Server Hardware

### 4.2.1 Cloud Server (Backend Hosting)

| Component | Specification | Justification |
|---|---|---|
| **Instance Type** | AWS EC2 t3.medium or equivalent | 2 vCPUs, 4 GB RAM for Node.js |
| **vCPUs** | 2 cores (burstable) | Handle concurrent API requests |
| **RAM** | 4 GB minimum | Node.js event loop + document processing |
| **Storage** | 30 GB EBS (gp3) | OS, application code, temp files |
| **Network** | Up to 5 Gbps | Low-latency API responses |
| **OS** | Ubuntu 22.04 LTS | Long-term support, Node.js compatible |

### 4.2.2 Cloud Storage (AWS S3)

| Parameter | Specification |
|---|---|
| **Storage Class** | S3 Standard |
| **Region** | ap-south-1 (Mumbai) |
| **Capacity** | Pay-as-you-go (scales automatically) |
| **Durability** | 99.999999999% (11 nines) |
| **Availability** | 99.99% |
| **Transfer** | Up to 100 Gbps |

### 4.2.3 Database (Firebase Firestore)

| Parameter | Specification |
|---|---|
| **Type** | Cloud Firestore (Native mode) |
| **Location** | asia-south1 (Mumbai) |
| **Read Operations** | 50,000/day (free tier) |
| **Write Operations** | 20,000/day (free tier) |
| **Delete Operations** | 20,000/day (free tier) |
| **Storage** | 1 GiB (free tier) |

### 4.2.4 Vector Database (Pinecone)

| Parameter | Specification |
|---|---|
| **Plan** | Starter (Free) / Standard |
| **Dimensions** | 1536 (OpenAI text-embedding-3-small) |
| **Pods** | 1 (p1.x1 for production) |
| **Vectors** | Up to 1M on free tier |
| **Read Units** | 100/second |
| **Write Units** | 50/second |

## 4.3 Client-Side Hardware Requirements

### 4.3.1 Desktop/Laptop

| Component | Minimum | Recommended |
|---|---|---|
| **Processor** | Intel Core i3 / AMD Ryzen 3 | Intel Core i5+ / AMD Ryzen 5+ |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 1 GB free space | 5 GB free space |
| **Display** | 1366×768 | 1920×1080 |
| **Browser** | Chrome 90+, Firefox 88+, Edge 90+ | Latest version of Chrome/Edge |

### 4.3.2 Mobile Devices

| Component | Minimum | Recommended |
|---|---|---|
| **OS** | Android 8.0 / iOS 14 | Android 12+ / iOS 16+ |
| **RAM** | 3 GB | 4 GB+ |
| **Screen** | 5.5" HD | 6"+ Full HD |
| **Browser** | Chrome Mobile / Safari | Latest version |
| **Network** | 4G LTE | 5G / Wi-Fi |

## 4.4 Network Requirements

| Requirement | Specification |
|---|---|
| **Protocol** | HTTPS (TLS 1.2+) |
| **Minimum Bandwidth** | 5 Mbps download, 2 Mbps upload |
| **Recommended Bandwidth** | 25+ Mbps download, 10+ Mbps upload |
| **Latency** | < 200ms to cloud services |
| **Firewall** | Allow outbound HTTPS (port 443) |
| **DNS** | Public DNS resolution required |

## 4.5 Hardware Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICES                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Desktop  │  │  Laptop   │  │  Mobile  │  │    Tablet     │  │
│  │ Chrome/   │  │  Edge/    │  │ Chrome/  │  │   Safari/     │  │
│  │ Firefox   │  │  Chrome   │  │ Safari   │  │   Chrome      │  │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  └──────┬────────┘  │
└────────┼──────────────┼─────────────┼───────────────┼───────────┘
         │              │             │               │
         └──────────────┴──────┬──────┴───────────────┘
                               │ HTTPS (Port 443)
                    ┌──────────▼──────────┐
                    │   LOAD BALANCER /   │
                    │   REVERSE PROXY     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   APPLICATION       │
                    │   SERVER            │
                    │   (Node.js/Express) │
                    │   EC2 t3.medium     │
                    │   2 vCPU, 4GB RAM   │
                    └─────┬───┬───┬───────┘
                          │   │   │
              ┌───────────┘   │   └───────────┐
              │               │               │
   ┌──────────▼────┐  ┌──────▼──────┐  ┌─────▼──────────┐
   │   Firebase    │  │   AWS S3    │  │   Pinecone     │
   │   Firestore   │  │   Storage   │  │   Vector DB    │
   │   + Auth      │  │   Bucket    │  │   (AI Search)  │
   │               │  │             │  │                │
   │  User Data    │  │  Files      │  │  Embeddings    │
   │  Documents    │  │  Thumbnails │  │  1536-dim      │
   │  Chats        │  │  Previews   │  │  Namespace     │
   │  Shares       │  │             │  │  Isolation     │
   └───────────────┘  └─────────────┘  └────────────────┘
```

---

\newpage

# CHAPTER 5: SOFTWARE REQUIREMENTS

---

## 5.1 Development Software

### 5.1.1 Code Editor & IDE

| Software | Version | Purpose |
|---|---|---|
| Visual Studio Code | 1.85+ | Primary code editor |
| VS Code Extensions | Latest | Angular Language Service, ESLint, Prettier, GitLens |

### 5.1.2 Runtime & Package Managers

| Software | Version | Purpose |
|---|---|---|
| Node.js | 18.0.0+ | JavaScript runtime for backend and Angular CLI |
| npm | 9.0+ | Package manager for dependency management |
| Angular CLI | 19.x | Angular project scaffolding and build tools |
| Nodemon | 3.1.13 | Auto-restart server during development |

### 5.1.3 Version Control

| Software | Version | Purpose |
|---|---|---|
| Git | 2.40+ | Source code version control |
| GitHub | N/A | Remote repository hosting |

### 5.1.4 Browser & Testing Tools

| Software | Version | Purpose |
|---|---|---|
| Google Chrome | 120+ | Primary development browser |
| Chrome DevTools | Built-in | Debugging, network monitoring, performance profiling |
| Postman | 10.0+ | API testing and documentation |

## 5.2 Frontend Software Stack

### 5.2.1 Framework & Libraries

| Package | Version | Purpose |
|---|---|---|
| @angular/core | 19.x | Core Angular framework |
| @angular/common | 19.x | Common directives and services |
| @angular/router | 19.x | Client-side routing |
| @angular/forms | 19.x | Template-driven and reactive forms |
| @angular/platform-browser | 19.x | Browser platform support |
| rxjs | 7.x | Reactive Extensions for async operations |
| firebase | 10.x | Firebase client SDK (Auth) |
| marked | 12.x | Markdown to HTML parsing (AI responses) |
| zone.js | 0.14.x | Angular change detection |

### 5.2.2 Angular Architecture Features Used

| Feature | Description |
|---|---|
| Standalone Components | No NgModules; self-contained components |
| Signals | Reactive state management without third-party libs |
| Computed Signals | Derived reactive values for template binding |
| Effects | Side-effect execution on signal changes |
| Lazy Loading | Route-level code splitting for performance |
| Guards | Route protection (AuthGuard, GuestGuard, AdminGuard) |
| Interceptors | HTTP request/response middleware |

## 5.3 Backend Software Stack

### 5.3.1 Core Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | 5.2.1 | HTTP server framework |
| cors | 2.8.5 | Cross-origin resource sharing |
| helmet | 7.2.0 | HTTP security headers |
| dotenv | 16.6.1 | Environment variable management |
| express-rate-limit | 7.5.1 | API rate limiting |
| multer | 1.4.5 | Multipart file upload handling |
| uuid | 9.0.0 | Unique identifier generation |
| socket.io | 4.8.3 | Real-time WebSocket communication |

### 5.3.2 Cloud Service SDKs

| Package | Version | Purpose |
|---|---|---|
| firebase-admin | 12.0.0 | Firebase server-side SDK (Auth + Firestore) |
| @aws-sdk/client-s3 | 3.994.0 | AWS S3 file operations |
| @aws-sdk/s3-request-presigner | 3.994.0 | Pre-signed URL generation |
| @pinecone-database/pinecone | 2.0.1 | Pinecone vector database client |
| openai | 4.24.1 | OpenAI API client (GPT-4 + embeddings) |
| razorpay | 2.9.6 | Payment gateway integration |

### 5.3.3 Document Processing

| Package | Version | Purpose |
|---|---|---|
| pdf-parse | 1.1.1 | PDF text extraction |
| mammoth | 1.6.0 | DOCX to HTML conversion |
| officeparser | 6.0.4 | Office document parsing |
| tesseract.js | 7.0.0 | OCR for image text extraction |
| exceljs | 4.4.0 | XLSX spreadsheet parsing |
| sharp | 0.33.2 | Image processing and thumbnails |
| canvas | 3.2.0 | Server-side canvas rendering |
| pdf-poppler | 0.2.3 | PDF to image conversion |
| puppeteer | 24.37.5 | Headless browser rendering |

### 5.3.4 Security & Authentication

| Package | Version | Purpose |
|---|---|---|
| speakeasy | 2.0.0 | TOTP generation for MFA |
| qrcode | 1.5.4 | QR code generation for authenticator setup |
| busboy | 1.6.0 | Streaming multipart parser |
| ajv | 8.18.0 | JSON schema validation |

## 5.4 Cloud Services

### 5.4.1 Firebase Services

| Service | Tier | Purpose |
|---|---|---|
| Firebase Authentication | Spark (Free) | User auth with email/password and Google OAuth |
| Cloud Firestore | Spark (Free) | NoSQL document database |
| Firebase Admin SDK | N/A | Server-side Firebase operations |

### 5.4.2 AWS Services

| Service | Tier | Purpose |
|---|---|---|
| Amazon S3 | Free Tier / Pay-as-you-go | Scalable file object storage |
| S3 Pre-signed URLs | Included | Secure, time-limited file access |

### 5.4.3 AI & ML Services

| Service | Tier | Purpose |
|---|---|---|
| OpenAI API | Pay-as-you-go | GPT-4 responses, text-embedding-3-small |
| Pinecone | Starter (Free) | Vector similarity search |

### 5.4.4 Payment Services

| Service | Tier | Purpose |
|---|---|---|
| Razorpay | Standard | Indian payment gateway (UPI, cards, wallets) |

## 5.5 Operating System Compatibility

### 5.5.1 Server

| OS | Version | Status |
|---|---|---|
| Ubuntu | 22.04 LTS | Recommended |
| Windows Server | 2019+ | Compatible |
| macOS | 13+ | Development only |

### 5.5.2 Client (Browser)

| Browser | Minimum Version | Status |
|---|---|---|
| Google Chrome | 90+ | Fully Supported |
| Microsoft Edge | 90+ | Fully Supported |
| Mozilla Firefox | 88+ | Supported |
| Safari | 14+ | Supported |
| Opera | 76+ | Supported |

## 5.6 Software Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Angular 19 (Standalone Components)              │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │   Auth   │ │ Dashboard │ │Documents │ │AI Assistant  │  │  │
│  │  │  Module  │ │  Module   │ │  Module  │ │   Module     │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Settings │ │  Storage  │ │  Plans   │ │ Admin Panel  │  │  │
│  │  │  Module  │ │ Insights  │ │  Module  │ │   Module     │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │           Services Layer (HttpClient, Signals)        │  │  │
│  │  │  AuthService | ChatService | DocumentService | ...    │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP/HTTPS REST API
┌───────────────────────────▼───────────────────────────────────────┐
│                    APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Node.js + Express.js v5 Backend                 │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Middleware: Auth | CORS | Helmet | Rate Limit | Error │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ │  │
│  │  │ Controllers │ │   Services   │ │   Configurations     │ │  │
│  │  │ (9 modules) │ │ (21 modules) │ │   (6 modules)        │ │  │
│  │  └─────────────┘ └──────────────┘ └──────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────┬───────────────┬───────────────────┬──────────────────┘
            │               │                   │
┌───────────▼────┐  ┌───────▼───────┐  ┌────────▼───────────────┐
│  Firestore DB  │  │  AWS S3       │  │  Pinecone + OpenAI     │
│  (Metadata)    │  │  (Files)      │  │  (AI Vectors)          │
└────────────────┘  └───────────────┘  └────────────────────────┘
```

---

\newpage
