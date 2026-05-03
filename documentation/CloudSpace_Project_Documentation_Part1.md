# CLOUDSPACE — CLOUD-BASED DOCUMENT STORAGE & AI ASSISTANT

## A Major Project Report

### Submitted in Partial Fulfillment of the Requirements for the Degree of Bachelor of Technology in Computer Science & Engineering

---

**Academic Year: 2025–2026**

---

| Field | Details |
|---|---|
| **Project Title** | CloudSpace — Cloud-Based Document Storage & AI Assistant |
| **University** | [University Name] |
| **Department** | Computer Science & Engineering |
| **Guide** | [Faculty Guide Name] |

---

\newpage

# TABLE OF CONTENTS

| Sr. No. | Topic | Page No. |
|---|---|---|
| 1 | Acknowledgment | 4 |
| 2 | Project Profile | 6 |
| 3 | Project Introduction | 10 |
| 4 | Hardware Requirements | 25 |
| 5 | Software Requirements | 30 |
| 6 | Scope (User-wise) | 40 |
| 7 | Use Cases (Level 0) | 50 |
| 8 | Database Design | 65 |
| 9 | Test Cases | 85 |
| 10 | Screen Layouts | 105 |

---

\newpage

# CHAPTER 1: ACKNOWLEDGMENT

---

## 1.1 Acknowledgment

We would like to express our sincere gratitude to all individuals who have contributed towards the successful completion of this project, **"CloudSpace — Cloud-Based Document Storage & AI Assistant."**

First and foremost, we extend our heartfelt thanks to **[Guide Name]**, our project guide and mentor, for their invaluable guidance, continuous encouragement, and constructive feedback throughout the entire development lifecycle of this project. Their expertise in software engineering and cloud technologies helped shape our vision into a functional, production-ready application.

We are deeply grateful to **[HOD Name]**, Head of the Department of Computer Science & Engineering, for providing us with an excellent academic environment and for approving this project as part of our curriculum requirements.

We sincerely thank **[Principal Name]**, the Principal of **[College Name]**, for providing all necessary infrastructure and institutional support that enabled us to work on a modern full-stack web application involving cloud services, artificial intelligence, and real-time data processing.

We also wish to acknowledge the contributions of the entire **faculty members** of the Department of Computer Science & Engineering, whose teachings in data structures, database management, software engineering, web technologies, and cloud computing provided the foundational knowledge necessary for this project.

Special thanks go to the **non-teaching staff** and **lab technicians** for ensuring that the computer laboratories were well-maintained and equipped with the necessary software tools and internet connectivity required for development and testing.

We extend our appreciation to the **open-source community** and the developers behind the technologies we used — Angular, Node.js, Express.js, Firebase, AWS S3, Pinecone, and OpenAI — whose documentation, community forums, and support channels were instrumental in resolving technical challenges during development.

We would like to thank our **families** for their unwavering support, patience, and motivation throughout this academic year. Their encouragement during challenging phases of the project was invaluable.

Finally, we thank our **classmates and peers** who participated in user testing sessions and provided constructive feedback, which helped us refine the user experience and identify edge cases in the application.

This project has been a tremendous learning experience, allowing us to apply theoretical knowledge to real-world problems, and we are grateful to everyone who made it possible.

---

**Project Team Members:**

| Sr. No. | Name | Enrollment No. |
|---|---|---|
| 1 | [Student Name 1] | [Enrollment No.] |
| 2 | [Student Name 2] | [Enrollment No.] |
| 3 | [Student Name 3] | [Enrollment No.] |
| 4 | [Student Name 4] | [Enrollment No.] |

**Date:** March 2026

**Place:** [City, State]

---

\newpage

# CHAPTER 2: PROJECT PROFILE

---

## 2.1 Project Title

**CloudSpace — Cloud-Based Document Storage & AI Assistant**

## 2.2 Project Category

Full-Stack Web Application (SaaS – Software as a Service)

## 2.3 Project Domain

Cloud Computing, Artificial Intelligence, Document Management Systems

## 2.4 Abstract

CloudSpace is a comprehensive, cloud-based document storage and intelligent retrieval platform that combines secure file management with AI-powered document analysis. Built using the MEAN stack variant (MongoDB-less, using Firebase Firestore as the primary database), the platform provides users with a Google Drive-like experience enhanced with an AI assistant that can understand, search, and answer questions about uploaded documents.

The system implements a multi-tier subscription model (Free, Professional, Pro) with enforced storage quotas, upload limits, and AI request throttling. It features a complete administrative control panel for user management, analytics, audit logging, and system monitoring.

Key differentiators include namespace-isolated vector search using Pinecone for AI-powered document retrieval, AWS S3 for scalable file storage, Firebase Authentication with optional MFA (Google Authenticator), real-time notifications, and a ChatGPT-style AI conversation interface with persistent chat history for premium users.

## 2.5 Problem Statement

In the current digital landscape, organizations and individuals generate massive volumes of documents daily. Traditional cloud storage solutions like Google Drive and Dropbox provide excellent file storage but lack the ability to intelligently search within document contents or answer natural language questions about stored files.

Users often struggle with:
- **Information retrieval**: Finding specific information buried across hundreds of documents.
- **Cross-document analysis**: Understanding relationships between information in different files.
- **Content summarization**: Quickly grasping the essence of lengthy documents.
- **Secure sharing**: Sharing documents with granular permission controls.
- **Cost management**: Affordable storage with tiered plans.

CloudSpace addresses these problems by combining secure cloud storage with an AI-powered assistant that can read, understand, and respond to queries about uploaded documents, while maintaining strict data isolation and privacy between users.

## 2.6 Objectives

1. **Design and develop** a cloud-based document storage platform supporting multiple file formats (PDF, DOCX, XLSX, TXT, images).
2. **Implement AI-powered document analysis** using vector embeddings (OpenAI) and similarity search (Pinecone) for intelligent content retrieval.
3. **Build a tiered subscription system** (Free, Professional, Pro) with enforced storage, upload, and AI usage limits.
4. **Develop an administrative control panel** for user management, system monitoring, analytics, and audit logging.
5. **Implement security features** including Firebase Authentication, optional MFA via Google Authenticator, and role-based access control.
6. **Enable document sharing** with granular permissions (view, edit, download) and folder-level inheritance.
7. **Create a ChatGPT-style AI interface** with persistent conversation history for premium users.
8. **Deploy on cloud infrastructure** using AWS S3 for file storage and Firebase for authentication and database.

## 2.7 Technology Stack Overview

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Angular 19 (Standalone) | SPA with reactive signals |
| UI Styling | Vanilla CSS + Tailwind Utilities | Premium, responsive design |
| Backend Runtime | Node.js 18+ | Server-side JavaScript |
| Backend Framework | Express.js 5 | RESTful API server |
| Authentication | Firebase Auth | User identity management |
| Database | Firebase Firestore | NoSQL document database |
| File Storage | AWS S3 | Scalable object storage |
| Vector Database | Pinecone | AI similarity search |
| AI/LLM | OpenAI GPT-4 | Natural language processing |
| Embeddings | OpenAI text-embedding-3-small | Document vectorization |
| Payments | Razorpay | Subscription payments |
| Real-time | Socket.IO | WebSocket communication |
| MFA | Speakeasy + QR Code | TOTP-based 2FA |
| Text Extraction | pdf-parse, Mammoth, Tesseract.js | Document content extraction |

## 2.8 Project Duration

| Phase | Duration | Activities |
|---|---|---|
| Requirement Analysis | 2 Weeks | Gathering requirements, feasibility study |
| System Design | 3 Weeks | Architecture design, database schema, UI wireframes |
| Frontend Development | 6 Weeks | Angular components, routing, services, responsive UI |
| Backend Development | 6 Weeks | API endpoints, middleware, service layer, integrations |
| AI Integration | 3 Weeks | OpenAI, Pinecone, embedding pipeline |
| Testing & QA | 3 Weeks | Unit tests, integration tests, UAT |
| Documentation | 2 Weeks | Technical docs, user manual |
| **Total** | **~25 Weeks** | |

## 2.9 Development Methodology

The project follows the **Agile Development Methodology** with iterative sprints. Features were developed in modular increments, allowing continuous integration and feedback loops. Key Agile practices adopted:

- Sprint-based development (2-week sprints)
- Daily standup meetings for progress tracking
- Version control using Git with feature branching
- Continuous integration through automated builds
- User acceptance testing at the end of each sprint

---

\newpage

# CHAPTER 3: PROJECT INTRODUCTION

---

## 3.1 Introduction

CloudSpace is a next-generation cloud document storage platform that merges traditional file management capabilities with cutting-edge artificial intelligence. The platform is designed to serve as a complete document ecosystem where users can upload, organize, share, and intelligently query their documents using natural language.

Unlike conventional cloud storage services that treat files as opaque blobs, CloudSpace processes each uploaded document through an AI pipeline that extracts text content, generates vector embeddings, and stores them in a dedicated vector database. This enables users to ask questions like "What was the revenue figure mentioned in the Q3 report?" and receive precise answers derived from their own documents.

The platform operates on a Software-as-a-Service (SaaS) model with three subscription tiers, each offering progressively more storage, features, and AI capabilities. This tiered approach makes the platform accessible to individual users while providing enterprise-grade features for professionals.

## 3.2 System Architecture

The application follows a modern **three-tier architecture** with clear separation of concerns:

### 3.2.1 Presentation Tier (Frontend)

Built with **Angular 19** using the standalone component architecture, the frontend provides a single-page application (SPA) experience. Key architectural decisions include:

- **Signal-based state management**: Angular Signals for reactive UI updates without external state libraries.
- **Lazy-loaded routes**: Each page module is loaded on demand, optimizing initial bundle size.
- **Dual-layout system**: Separate layout components for user dashboard and admin panel.
- **Service-oriented architecture**: All API communication is abstracted into injectable services.

The frontend consists of two major interfaces:

1. **User Dashboard**: Document management, AI assistant, storage insights, settings, and plan management.
2. **Admin Panel**: System dashboard, user management, storage monitoring, AI usage analytics, audit logs, subscription management, and system settings.

### 3.2.2 Application Tier (Backend)

The backend is a **Node.js/Express.js** REST API server that handles all business logic, authentication, file processing, and third-party integrations. Key components:

- **Controllers** (9 modules): auth, ai, admin, analytics, mfa, n8n, payment, settings, user-dashboard
- **Services** (21 modules): firestore, chat, notification, share, storage-quota, embedding, s3, deletion, render, thumbnail, analytics, and more
- **Middleware** (4 modules): auth verification, error handling, share-access control, file upload processing
- **Configuration** (6 modules): Firebase, AWS, OpenAI, Pinecone, Plans, and environment management

### 3.2.3 Data Tier

The data layer consists of multiple specialized stores:

1. **Firebase Firestore**: Primary database for user profiles, document metadata, notifications, shares, audit logs, subscriptions, and chat history.
2. **AWS S3**: Object storage for uploaded files, thumbnails, and document previews.
3. **Pinecone**: Vector database for AI-powered document search and similarity matching.

## 3.3 Module Descriptions

### 3.3.1 Authentication Module

The authentication system leverages **Firebase Authentication** for secure user identity management. Features include:

- **Email/password authentication** with form validation
- **Google OAuth 2.0** single sign-on
- **Password reset** via email
- **Multi-Factor Authentication** (MFA) using Google Authenticator (TOTP-based)
- **Account lockout** after configurable failed login attempts
- **Security audit logging** for all authentication events
- **Session management** with Firebase ID tokens (JWT)

The auth flow: User logs in → Firebase verifies credentials → Server-side token verification → User profile synced to Firestore → Session established with JWT token.

### 3.3.2 Document Management Module

This is the core module that handles the complete document lifecycle:

- **Upload Pipeline**: File validation → S3 upload → Text extraction → Vector embedding → Firestore metadata → Thumbnail generation
- **Supported Formats**: PDF, DOCX, XLSX, TXT, PNG, JPG, JPEG, GIF
- **Folder System**: Hierarchical folder structure with parent-child relationships
- **Operations**: Upload, download, rename, move, copy, star, trash, restore, permanent delete
- **Thumbnail Generation**: Automatic preview generation for PDF and image files using Sharp and pdf-poppler
- **DOCX Preview**: Server-side rendering of Word documents using Mammoth.js
- **XLSX Preview**: Spreadsheet parsing and HTML preview using ExcelJS

### 3.3.3 AI Assistant Module

The AI assistant provides ChatGPT-style document intelligence:

- **Vector Search**: User questions are embedded and matched against document vectors in Pinecone
- **Context Building**: Top matching document chunks are assembled into a context window
- **Response Generation**: OpenAI GPT-4 generates answers based on the document context
- **Chat History**: Premium users get persistent conversation history stored in Firestore subcollections
- **Namespace Isolation**: Each user's vectors are stored in a separate Pinecone namespace, ensuring complete data privacy
- **n8n Integration**: Optional webhook integration for advanced AI workflows
- **Rate Limiting**: AI requests are throttled based on the user's subscription plan

### 3.3.4 Sharing Module

The sharing system enables collaborative document access:

- **Permission Levels**: View, Edit, Download
- **Share Types**: Individual email-based sharing
- **Folder Inheritance**: Permissions cascade to child documents up to 10 levels deep
- **Share Management**: Accept, reject, revoke shares
- **Pending Shares**: Shares created for unregistered emails are queued and activated upon signup
- **AI Cross-Search**: Shared documents appear in the AI assistant's search scope

### 3.3.5 Subscription & Payment Module

A tiered monetization system:

| Feature | Free | Professional | Pro |
|---|---|---|---|
| Storage | 5 GB | 50 GB | 500 GB |
| Upload Limit | 20 MB/file | 250 MB/file | Unlimited |
| AI Requests/Month | 50 | 300 | 1,000 |
| Chat History | ✗ | ✓ | ✓ |
| MFA | ✗ | ✓ | ✓ |
| Share Permissions | Read only | Full | Full |

- **Payment Gateway**: Razorpay integration for Indian payment methods
- **Subscription Tracking**: Active subscriptions are stored in Firestore with status tracking
- **Plan Enforcement**: Storage quotas, upload limits, and AI rate limits are enforced server-side

### 3.3.6 Admin Panel Module

A comprehensive administrative control center:

- **Dashboard**: Real-time platform metrics (total users, documents, storage, AI usage)
- **User Management**: View, edit, lock/unlock, delete user accounts
- **Storage Monitor**: Platform-wide storage utilization metrics
- **AI Usage Analytics**: AI request trends, usage patterns, and cost tracking
- **Subscription Plans**: Manage plan configurations and pricing
- **Subscriber Management**: View active subscriptions and revenue
- **Security Audit Logs**: Track login attempts, security events, and suspicious activity
- **Analytics & Reports**: Platform growth, user engagement, and system health
- **System Settings**: Global application configuration
- **Admin Notifications**: Real-time alerts for user signups, security events, and system alerts

### 3.3.7 Notification Module

Real-time notification system:

- **Notification Types**: Upload completion, AI response ready, share invitations, admin alerts
- **Delivery**: In-app notification bell with unread count badge
- **Polling**: Optimized background polling with visibility-aware pause/resume
- **Caching**: localStorage caching for instant UI load
- **Admin Notifications**: Separate notification stream for administrators (user signups, security alerts)

### 3.3.8 Settings Module

User profile and security settings:

- **Profile Management**: Display name, email, photo URL
- **Password Change**: Secure password update with re-authentication
- **MFA Setup**: Enable/disable Google Authenticator 2FA with QR code enrollment
- **Theme Toggle**: Light/dark mode preference persistence

## 3.4 Security Architecture

Security is a core design principle of CloudSpace:

1. **Authentication**: Firebase Auth with JWT token verification on every API request
2. **Authorization**: Role-based access control (User, Admin) enforced by middleware
3. **Data Isolation**: Pinecone namespace isolation ensures users cannot access other users' document vectors
4. **Input Validation**: Server-side request validation to prevent injection attacks
5. **Rate Limiting**: Express Rate Limit middleware to prevent brute force and DDoS attacks
6. **CORS**: Configured Cross-Origin Resource Sharing for frontend-backend communication
7. **Helmet.js**: HTTP security headers (XSS protection, content type sniffing prevention)
8. **Audit Logging**: All security-relevant events are logged to Firestore
9. **Account Lockout**: Automatic lockout after excessive failed login attempts
10. **MFA**: Optional TOTP-based two-factor authentication

## 3.5 Data Flow Architecture

### 3.5.1 Document Upload Flow

```
User selects file → Frontend validates (type, size, plan limits)
  → HTTP POST to /api/documents/upload
  → Auth middleware verifies token
  → Upload middleware processes multipart form
  → S3 service uploads file to user's bucket path
  → Text extraction service processes content
  → Embedding service generates OpenAI vectors
  → Pinecone stores vectors in user's namespace
  → Firestore saves document metadata
  → Thumbnail service generates preview (async)
  → Notification service creates upload notification
  → Response sent to frontend with document data
```

### 3.5.2 AI Query Flow

```
User asks question → Frontend sends POST to /api/ai/query
  → Auth middleware verifies token
  → Plan-based rate limit check
  → Premium: Create/reuse chat session
  → Embedding service vectorizes the question
  → Pinecone searches user's namespace + shared namespaces
  → Context builder assembles relevant document chunks
  → OpenAI GPT-4 generates response with context
  → Premium: Save messages to chat history
  → Notification service creates AI notification
  → Response sent with answer, sources, and metadata
```

## 3.6 API Architecture

The backend exposes RESTful APIs organized by domain:

| Route Prefix | Module | Endpoints |
|---|---|---|
| `/api/auth` | Authentication | verify, profile, sync, test-user |
| `/api/ai` | AI Assistant | query, history, messages, delete |
| `/api/documents` | Document Management | upload, list, download, rename, move, copy, star, trash, delete |
| `/api/storage` | Storage Tracking | usage, quota, insights |
| `/api/shares` | File Sharing | create, accept, reject, revoke, list |
| `/api/plans` | Subscription Plans | list, details |
| `/api/mfa` | Multi-Factor Auth | generate-secret, verify, status, disable |
| `/api/notifications` | Notifications | list, mark-read, mark-all-read |
| `/api/admin` | Admin Panel | dashboard, users, storage, ai-usage, audit, settings, notifications |
| `/api/analytics` | Analytics | dashboard, storage-activity |
| `/api/settings` | User Settings | get, update |
| `/api/payments` | Payments | create-order, verify, webhook |

---

\newpage
