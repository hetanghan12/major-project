# CHAPTER 6: SCOPE (USER-WISE)

---

## 6.1 Overview of User Roles

CloudSpace defines three distinct user roles, each with specific capabilities and access levels:

1. **Guest User** (Unauthenticated)
2. **Registered User** (Free, Professional, or Pro plan)
3. **Administrator** (System admin role)

## 6.2 Guest User Scope

A guest user is any visitor who has not yet created an account or is not currently logged in.

### 6.2.1 Accessible Features

| Feature | Access Level |
|---|---|
| Login Page | Full Access |
| Registration Page | Full Access |
| Forgot Password Page | Full Access |
| Public Landing Page | Full Access |
| Plans & Pricing Page | View Only (before login redirects to plans page) |

### 6.2.2 Restrictions

- Cannot upload, view, or manage any documents
- Cannot access the dashboard or any authenticated features
- Cannot interact with the AI assistant
- Cannot view other users' data
- Automatically redirected to login page via `GuestGuard` when attempting to access protected routes

## 6.3 Registered User Scope

Registered users are authenticated individuals who have created an account. Their capabilities vary based on their subscription plan.

### 6.3.1 Free Plan User

**Storage & Upload:**
- 5 GB total storage
- 20 MB maximum file size per upload
- Support for PDF, DOCX, XLSX, TXT, PNG, JPG, JPEG, GIF formats
- Folder creation and hierarchical organization
- File renaming, moving, and copying

**Document Management:**
- View all uploaded documents in grid/list layout
- Star/unstar documents for quick access
- Move documents to trash and restore
- Permanently delete documents from trash
- Download documents
- View document previews (PDF, DOCX, XLSX, images)
- Search documents by filename

**AI Assistant:**
- 50 AI queries per month
- Ask questions about uploaded documents
- Receive AI-generated answers with source citations
- Chat conversations are NOT saved (session-only)
- No chat history persistence (lost on page refresh)

**Sharing:**
- Read-only sharing permissions
- Can receive shared documents from others
- Can view documents shared with them

**Settings:**
- View and edit basic profile information
- Change password
- Toggle light/dark theme

**Restrictions:**
- No MFA (multi-factor authentication)
- No chat history
- No edit/download share permissions
- Storage limited to 5 GB
- AI requests limited to 50/month

### 6.3.2 Professional Plan User

Includes all Free plan features, plus:

**Enhanced Storage & Upload:**
- 50 GB total storage
- 250 MB maximum file size per upload

**AI Assistant (Enhanced):**
- 300 AI queries per month
- ChatGPT-style conversation history
- Persistent chat sessions saved in Firestore
- View, continue, and delete past conversations
- Grouped history (Today, Yesterday, Previous Days)

**Full Sharing:**
- Read, Edit, and Download share permissions
- Full share management (create, revoke, accept, reject)
- Shared documents searchable via AI assistant

**Security:**
- Multi-Factor Authentication (Google Authenticator)
- TOTP-based 2FA setup with QR code

### 6.3.3 Pro Plan User

Includes all Professional plan features, plus:

**Maximum Storage & Upload:**
- 500 GB total storage
- Unlimited file size per upload

**AI Assistant (Maximum):**
- 1,000 AI queries per month
- Full conversation history
- Priority AI response processing

**Full Sharing:**
- Same as Professional plan

**Security:**
- Same as Professional plan (MFA enabled)

## 6.4 Administrator Scope

Administrators have access to a separate admin panel with system-wide management capabilities.

### 6.4.1 Admin Dashboard

| Feature | Description |
|---|---|
| Platform Overview | Total users, documents, storage used, AI requests |
| Growth Metrics | New users per day/week/month |
| System Health | Server status, API response times |
| Quick Stats Cards | Real-time platform KPIs |

### 6.4.2 User Management

| Feature | Description |
|---|---|
| View All Users | Paginated list of all registered users |
| Search Users | Search by email, name, or UID |
| Edit User Details | Modify user profile and plan |
| Lock/Unlock Account | Manually lock or unlock user accounts |
| Delete User | Remove user account and associated data |
| View User Storage | See per-user storage utilization |

### 6.4.3 Storage Monitor

| Feature | Description |
|---|---|
| Platform Storage | Total storage used across all users |
| Per-User Breakdown | Storage consumption by individual users |
| File Type Distribution | Breakdown by file format (PDF, DOCX, etc.) |
| Storage Trends | Historical storage growth charts |

### 6.4.4 AI Usage Analytics

| Feature | Description |
|---|---|
| Total AI Requests | Platform-wide AI query count |
| Daily/Weekly Trends | AI usage patterns over time |
| Per-User AI Usage | Individual user AI consumption |
| Plan Distribution | AI usage by subscription tier |

### 6.4.5 Subscription Management

| Feature | Description |
|---|---|
| Plan Configuration | View and edit plan details (storage, limits, pricing) |
| Active Subscribers | List of users with paid subscriptions |
| Revenue Tracking | Subscription revenue metrics |
| Plan Upgrade/Downgrade | Manage user plan changes |

### 6.4.6 Security & Audit

| Feature | Description |
|---|---|
| Audit Logs | All security events (login, failure, lockout) |
| Failed Login Tracking | Monitor brute force attempts |
| Account Lockouts | View and manage locked accounts |
| IP Address Logging | Track login source IPs |

### 6.4.7 System Settings

| Feature | Description |
|---|---|
| Global Configuration | Site name, maintenance mode |
| Default Plan Settings | Default storage and usage limits |
| Email Configuration | Notification email settings |

### 6.4.8 Admin Notifications

| Feature | Description |
|---|---|
| New User Signups | Real-time alerts when users register |
| Security Events | Alerts for suspicious login activity |
| System Alerts | Infrastructure and quota warnings |
| Mark All as Read | Batch notification management |
| Polling | Auto-refresh every 60 seconds |

## 6.5 Feature Access Matrix

| Feature | Guest | Free | Professional | Pro | Admin |
|---|---|---|---|---|---|
| Login/Register | ✓ | – | – | – | – |
| Dashboard | ✗ | ✓ | ✓ | ✓ | ✓ (Admin) |
| File Upload | ✗ | ✓ (20MB) | ✓ (250MB) | ✓ (∞) | ✗ |
| File Management | ✗ | ✓ | ✓ | ✓ | ✗ |
| AI Assistant | ✗ | ✓ (50/mo) | ✓ (300/mo) | ✓ (1000/mo) | ✗ |
| Chat History | ✗ | ✗ | ✓ | ✓ | ✗ |
| Document Sharing | ✗ | Read | Full | Full | ✗ |
| MFA (2FA) | ✗ | ✗ | ✓ | ✓ | ✗ |
| Storage Insights | ✗ | ✓ | ✓ | ✓ | ✗ |
| Settings | ✗ | ✓ | ✓ | ✓ | ✗ |
| Plan Management | ✗ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✗ | ✗ | ✗ | ✗ | ✓ |
| Audit Logs | ✗ | ✗ | ✗ | ✗ | ✓ |
| Analytics | ✗ | ✗ | ✗ | ✗ | ✓ |
| Admin Notifications | ✗ | ✗ | ✗ | ✗ | ✓ |

## 6.6 User Interaction Flow

### 6.6.1 New User Journey

```
Visit Website → Register (Email/Password or Google) 
  → Email Verification → First Login 
  → Profile Sync → Dashboard (Empty State)
  → Upload First Document → AI Pipeline Processes Document
  → Ask First AI Question → Receive Answer
  → Explore Features (Star, Share, Search)
  → Consider Plan Upgrade → Choose Professional/Pro
  → Payment via Razorpay → Plan Activated
  → Unlock Chat History, MFA, Higher Limits
```

### 6.6.2 Returning User Journey

```
Visit Website → Login (Email/Password or Google)
  → MFA Check (if enabled) → Dashboard
  → View Recent Documents → Upload New Files
  → Use AI Assistant → Continue Previous Chat (Premium)
  → Manage Shared Documents → Check Storage
  → Adjust Settings → Logout
```

### 6.6.3 Admin Journey

```
Login with Admin Credentials → Redirect to Admin Panel
  → View Dashboard Overview → Check New User Signups
  → Monitor Storage Utilization → Review AI Usage
  → Manage Users (Lock/Unlock) → Review Audit Logs
  → Check Admin Notifications → Update System Settings
  → Manage Subscription Plans → Logout
```

---

\newpage

# CHAPTER 7: USE CASES (LEVEL 0)

---

## 7.1 System Overview (Level 0 DFD)

The Level 0 Data Flow Diagram identifies the major processes, data stores, and external entities in the CloudSpace system.

### 7.1.1 External Entities

| Entity | Description |
|---|---|
| **User** | Registered user interacting with the platform |
| **Admin** | System administrator managing the platform |
| **Firebase Auth** | External authentication service |
| **AWS S3** | External file storage service |
| **Pinecone** | External vector database service |
| **OpenAI** | External AI/LLM service |
| **Razorpay** | External payment gateway |

### 7.1.2 Major Processes

| Process | Description |
|---|---|
| P1: Authentication | User login, registration, MFA verification |
| P2: Document Management | Upload, download, organize, share documents |
| P3: AI Assistant | Process queries, search vectors, generate responses |
| P4: Storage Management | Track usage, enforce quotas |
| P5: Subscription Management | Plan selection, payment processing |
| P6: Admin Management | User admin, system monitoring, notifications |
| P7: Notification System | Create and deliver system notifications |

### 7.1.3 Data Stores

| Store | Description |
|---|---|
| D1: Users | User profiles, plan info, MFA settings |
| D2: Documents | Document metadata, file references |
| D3: Chats | AI conversation sessions and messages |
| D4: Shares | Document sharing records |
| D5: Notifications | User and admin notifications |
| D6: Security Logs | Authentication and audit events |
| D7: Subscriptions | Active subscription records |
| D8: Dashboard Stats | Aggregated platform statistics |

## 7.2 Use Case Actors

### 7.2.1 Primary Actors

1. **Free User**: A registered user on the free plan with basic document management and limited AI capabilities.
2. **Premium User**: A registered user on Professional or Pro plan with full feature access.
3. **Administrator**: A system-level user with access to the admin panel for platform management.

### 7.2.2 Secondary Actors

1. **Firebase Authentication Service**: Handles user identity verification.
2. **AWS S3 Service**: Manages file storage operations.
3. **OpenAI API**: Provides AI text generation and embedding capabilities.
4. **Pinecone Service**: Manages vector similarity search.
5. **Razorpay Payment Gateway**: Processes subscription payments.

## 7.3 Use Case Listing

### 7.3.1 Authentication Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-01 | Register Account | Guest | Create a new user account using email/password or Google OAuth |
| UC-02 | Login | Guest | Authenticate with existing credentials |
| UC-03 | Forgot Password | Guest | Reset password via email link |
| UC-04 | Logout | User | End current session |
| UC-05 | Enable MFA | Premium User | Set up Google Authenticator 2FA |
| UC-06 | Verify MFA | Premium User | Enter TOTP code during login |
| UC-07 | Disable MFA | Premium User | Remove 2FA from account |

### 7.3.2 Document Management Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-08 | Upload Document | User | Upload a file to cloud storage |
| UC-09 | Create Folder | User | Create a new folder for organizing files |
| UC-10 | View Documents | User | Browse documents in grid/list view |
| UC-11 | Download Document | User | Download a file from cloud storage |
| UC-12 | Rename Document | User | Change the name of a file or folder |
| UC-13 | Move Document | User | Move a file to a different folder |
| UC-14 | Copy Document | User | Duplicate a file to another location |
| UC-15 | Star Document | User | Mark a document as favorite |
| UC-16 | Trash Document | User | Soft-delete a document to trash |
| UC-17 | Restore Document | User | Restore a document from trash |
| UC-18 | Permanent Delete | User | Permanently remove a document |
| UC-19 | Preview Document | User | View in-app preview of supported file types |
| UC-20 | Search Documents | User | Search by filename or content |

### 7.3.3 AI Assistant Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-21 | Ask AI Question | User | Submit a natural language query about documents |
| UC-22 | View AI Response | User | Read AI-generated answer with source citations |
| UC-23 | New Chat Session | Premium User | Start a fresh AI conversation |
| UC-24 | View Chat History | Premium User | Browse past AI conversations |
| UC-25 | Load Chat Messages | Premium User | Open a previous conversation to review or continue |
| UC-26 | Delete Chat | Premium User | Remove a saved conversation |

### 7.3.4 Sharing Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-27 | Share Document | User | Share a document with another user via email |
| UC-28 | Accept Share | User | Accept an incoming share invitation |
| UC-29 | Reject Share | User | Decline an incoming share invitation |
| UC-30 | Revoke Share | User | Remove sharing access for a specific user |
| UC-31 | View Shared With Me | User | Browse documents shared by others |
| UC-32 | View Shared By Me | User | Browse documents shared with others |

### 7.3.5 Subscription Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-33 | View Plans | User | Browse available subscription plans |
| UC-34 | Subscribe to Plan | User | Purchase a subscription via Razorpay |
| UC-35 | View Current Plan | User | Check active subscription status |

### 7.3.6 Settings Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-36 | Update Profile | User | Edit display name and profile picture |
| UC-37 | Change Password | User | Update account password |
| UC-38 | Toggle Theme | User | Switch between light and dark mode |
| UC-39 | View Storage Insights | User | Analyze storage usage by file type |

### 7.3.7 Admin Use Cases

| UC-ID | Use Case Name | Actor(s) | Description |
|---|---|---|---|
| UC-40 | View Admin Dashboard | Admin | View platform-wide metrics and KPIs |
| UC-41 | Manage Users | Admin | View, edit, lock/unlock, delete user accounts |
| UC-42 | Monitor Storage | Admin | View platform storage utilization |
| UC-43 | View AI Usage | Admin | Monitor AI assistant usage metrics |
| UC-44 | Manage Plans | Admin | Configure subscription plan details |
| UC-45 | View Audit Logs | Admin | Review security and authentication events |
| UC-46 | View Analytics | Admin | Access platform analytics and reports |
| UC-47 | Update Settings | Admin | Modify global system configuration |
| UC-48 | View Notifications | Admin | Review admin-level system alerts |
| UC-49 | Manage Subscribers | Admin | View and manage active subscriptions |

## 7.4 Detailed Use Case Descriptions

### UC-01: Register Account

| Field | Description |
|---|---|
| **Use Case ID** | UC-01 |
| **Name** | Register Account |
| **Actor** | Guest User |
| **Pre-condition** | User is not logged in; user does not have an existing account |
| **Post-condition** | User account is created; user is redirected to dashboard |
| **Primary Flow** | 1. Guest navigates to /register 2. Enters name, email, password 3. Clicks "Register" 4. System validates input 5. Firebase Auth creates account 6. Backend syncs user profile to Firestore 7. Platform stats updated 8. Admin notification created 9. User redirected to dashboard |
| **Alternate Flow** | 1a. User clicks "Sign up with Google" → Google OAuth flow → Account created |
| **Exception Flow** | 4a. Email already registered → Error message displayed 4b. Weak password → Validation error shown |

### UC-08: Upload Document

| Field | Description |
|---|---|
| **Use Case ID** | UC-08 |
| **Name** | Upload Document |
| **Actor** | Registered User |
| **Pre-condition** | User is authenticated; storage quota not exceeded; file type is supported |
| **Post-condition** | Document is stored in S3; metadata saved in Firestore; vectors indexed in Pinecone |
| **Primary Flow** | 1. User clicks "Upload" button 2. Selects file(s) from device 3. Frontend validates file size against plan limits 4. File uploaded to backend via multipart POST 5. Auth middleware verifies user token 6. Upload middleware validates file type and size 7. File uploaded to AWS S3 8. Text extraction service processes file content 9. Embedding service generates vector embeddings 10. Vectors stored in Pinecone (user namespace) 11. Document metadata saved in Firestore 12. Thumbnail generation queued (async) 13. Upload notification created 14. User storage quota updated 15. Success response with document info returned |
| **Exception Flow** | 3a. File exceeds plan size limit → Error displayed 6a. Unsupported file type → 415 error returned 7a. S3 upload fails → Error notification created |

### UC-21: Ask AI Question

| Field | Description |
|---|---|
| **Use Case ID** | UC-21 |
| **Name** | Ask AI Question |
| **Actor** | Registered User |
| **Pre-condition** | User is authenticated; at least one document uploaded; AI request quota not exceeded |
| **Post-condition** | AI response displayed with source citations; usage count incremented |
| **Primary Flow** | 1. User types question in chat input 2. Presses Enter or clicks Send 3. Frontend sends POST /api/ai/query with question 4. Backend verifies auth token 5. AI rate limit checked against user plan 6. (Premium) Chat session created/reused 7. Question vectorized via OpenAI embeddings 8. Pinecone searched across user namespace + shared namespaces 9. Top matching document chunks assembled as context 10. OpenAI GPT-4 generates response using context 11. (Premium) User message and AI response saved to chat history 12. AI notification created 13. Response returned with answer, sources, metadata 14. Frontend displays formatted Markdown response |
| **Exception Flow** | 5a. Rate limit exceeded → Friendly limit message returned as answer 8a. No matching documents → "Information not found" message returned |

### UC-40: View Admin Dashboard

| Field | Description |
|---|---|
| **Use Case ID** | UC-40 |
| **Name** | View Admin Dashboard |
| **Actor** | Administrator |
| **Pre-condition** | User is authenticated with admin role |
| **Post-condition** | Admin dashboard displayed with platform metrics |
| **Primary Flow** | 1. Admin logs in with admin credentials 2. AdminGuard verifies admin role 3. Admin layout component loads 4. Dashboard component fetches unified dashboard data 5. Platform statistics displayed (users, documents, storage, AI usage) 6. Admin notifications polled every 60 seconds 7. Notification bell shows unread count |

## 7.5 Use Case Diagram (Textual Representation)

```
                    ┌─────────────────────────────────────┐
                    │         CloudSpace System           │
                    │                                     │
   ┌──────┐         │  ┌─────────────────────────┐        │
   │Guest │─────────┼─▶│  Register Account (UC-01)│       │
   │ User │─────────┼─▶│  Login (UC-02)           │       │
   │      │─────────┼─▶│  Forgot Password (UC-03) │       │
   └──────┘         │  └─────────────────────────┘        │
                    │                                     │
   ┌──────┐         │  ┌─────────────────────────┐        │
   │Free  │─────────┼─▶│  Upload Document (UC-08) │       │
   │ User │─────────┼─▶│  View Documents (UC-10)  │       │
   │      │─────────┼─▶│  Download (UC-11)        │       │
   │      │─────────┼─▶│  Ask AI Question (UC-21) │       │
   │      │─────────┼─▶│  Share Document (UC-27)  │       │
   │      │─────────┼─▶│  View Plans (UC-33)      │       │
   └──────┘         │  └─────────────────────────┘        │
                    │                                     │
   ┌──────┐         │  ┌─────────────────────────┐        │
   │Prem. │─────────┼─▶│  View Chat History(UC-24)│       │
   │ User │─────────┼─▶│  Enable MFA (UC-05)      │       │
   │      │─────────┼─▶│  New Chat (UC-23)        │       │
   │      │─────────┼─▶│  Delete Chat (UC-26)     │       │
   └──────┘         │  └─────────────────────────┘        │
                    │                                     │
   ┌──────┐         │  ┌─────────────────────────┐        │
   │Admin │─────────┼─▶│  Admin Dashboard (UC-40) │       │
   │      │─────────┼─▶│  Manage Users (UC-41)    │       │
   │      │─────────┼─▶│  View Audit Logs (UC-45) │       │
   │      │─────────┼─▶│  View Notifs (UC-48)     │       │
   └──────┘         │  └─────────────────────────┘        │
                    └─────────────────────────────────────┘
```

---

\newpage
