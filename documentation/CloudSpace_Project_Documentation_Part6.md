# CHAPTER 10: SCREEN LAYOUTS

---

## 10.1 Overview

CloudSpace features a modern, premium web interface built with Angular 19. The application uses two distinct layout systems:

1. **User Layout**: Sidebar navigation + Header bar + Content area (for regular users)
2. **Admin Layout**: Separate admin sidebar + Header + Admin content area (for administrators)

All screens implement responsive design, dark/light mode support, and smooth micro-animations.

## 10.2 Authentication Screens

### 10.2.1 Login Page

**URL**: `/login`

```
┌──────────────────────────────────────────────────┐
│                                                  │
│           ☁  CloudSpace                          │
│                                                  │
│    ┌────────────────────────────────────────┐     │
│    │                                        │     │
│    │     Welcome Back 👋                    │     │
│    │                                        │     │
│    │     Email                              │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ user@example.com             │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     Password                           │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ ••••••••••••            👁   │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     [Forgot Password?]                 │     │
│    │                                        │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │         Sign In              │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     ────── or continue with ──────     │     │
│    │                                        │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │   G  Sign in with Google     │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     Don't have account? [Register]     │     │
│    │                                        │     │
│    └────────────────────────────────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Key Elements**:
- Gradient background with glassmorphism card
- Email and password input fields with validation
- Toggle password visibility button
- Google OAuth sign-in button
- Link to registration and forgot password pages
- Animated entrance effects

### 10.2.2 Registration Page

**URL**: `/register`

```
┌──────────────────────────────────────────────────┐
│                                                  │
│           ☁  CloudSpace                          │
│                                                  │
│    ┌────────────────────────────────────────┐     │
│    │                                        │     │
│    │     Create Account 🚀                  │     │
│    │                                        │     │
│    │     Full Name                          │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ John Doe                     │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     Email                              │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ john@example.com             │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     Password                           │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ ••••••••••••                 │   │     │
│    │     └──────────────────────────────┘   │     │
│    │     ▓▓▓▓▓▓▓░░░ Strong                 │     │
│    │                                        │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │       Create Account         │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     ────── or continue with ──────     │     │
│    │                                        │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │   G  Sign up with Google     │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     Already have account? [Login]      │     │
│    └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 10.2.3 Forgot Password Page

**URL**: `/forgot-password`

```
┌──────────────────────────────────────────────────┐
│           ☁  CloudSpace                          │
│    ┌────────────────────────────────────────┐     │
│    │     Reset Password 🔐                  │     │
│    │                                        │     │
│    │     Enter your email address and       │     │
│    │     we'll send you a reset link.       │     │
│    │                                        │     │
│    │     Email                              │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │ user@example.com             │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     ┌──────────────────────────────┐   │     │
│    │     │     Send Reset Link          │   │     │
│    │     └──────────────────────────────┘   │     │
│    │                                        │     │
│    │     [← Back to Login]                  │     │
│    └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

## 10.3 User Dashboard Screens

### 10.3.1 Main Dashboard

**URL**: `/dashboard`

```
┌─────────┬──────────────────────────────────────────────────┐
│ ☁ Cloud │  🔍 Search files, folders, or ask AI...    ⚡ 🔔 👤│
│  Space  ├──────────────────────────────────────────────────┤
│         │                                                  │
│ □ Dash  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│ 📁 Files│  │ Total    │ │ Storage  │ │ AI Req.  │ │Shared││
│ ⭐ Star │  │ Files    │ │ Used     │ │ Used     │ │Files ││
│ 👥 Shrd │  │   156    │ │ 2.4 GB   │ │ 23/1000  │ │  12  ││
│ 📤 ShBy │  └──────────┘ └──────────┘ └──────────┘ └──────┘│
│ 🗑 Trash│                                                  │
│─────────│  Recent Documents                                │
│ 💡 AI   │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│ 📊 Strg │  │ 📄    │ │ 📊    │ │ 📝    │ │ 🖼️    │        │
│ ⚙ Sett │  │Report │ │Budget │ │Notes  │ │Photo  │        │
│ 💳 Plan │  │.pdf   │ │.xlsx  │ │.docx  │ │.png   │        │
│─────────│  │ 2.1MB │ │ 540KB │ │ 128KB │ │ 3.5MB │        │
│         │  └───────┘ └───────┘ └───────┘ └───────┘        │
│ ⭐ Get  │                                                  │
│ Pro!    │  Storage Overview                                │
│ [Upgrd] │  ┌──────────────────────────────────────┐        │
│─────────│  │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 48% (2.4/5 GB) │        │
│ ▓▓ 48%  │  └──────────────────────────────────────┘        │
│ 2.4/5GB │                                                  │
│ [Logout]│  Quick Actions                                   │
│         │  [Upload File] [New Folder] [AI Assistant]       │
└─────────┴──────────────────────────────────────────────────┘
```

**Key Elements**:
- Left sidebar with navigation menu and storage indicator
- Stats cards (Total Files, Storage, AI Usage, Shared)
- Recent documents grid with thumbnails
- Storage progress bar
- Quick action buttons

### 10.3.2 Documents / My Files

**URL**: `/documents`

```
┌─────────┬──────────────────────────────────────────────────┐
│ ☁ Cloud │  🔍 Search...                            🔔 👤  │
│  Space  ├──────────────────────────────────────────────────┤
│         │                                                  │
│ □ Dash  │  My Files                                        │
│ 📁 Files│  ┌────┐  ┌────────┐  📁 Root / Projects         │
│ ⭐ Star │  │Grid│  │  List  │                              │
│ 👥 Shrd │  └────┘  └────────┘  [Upload] [New Folder]      │
│ 📤 ShBy │  ──────────────────────────────────────────      │
│ 🗑 Trash│                                                  │
│─────────│  ┌────────────────────────────────────────┐      │
│ 💡 AI   │  │ ☐  Name          Type   Size   Date   │      │
│ 📊 Strg │  │──────────────────────────────────────  │      │
│ ⚙ Sett │  │ ☐  📁 Projects   Folder  --   Mar 10  │      │
│ 💳 Plan │  │ ☐  📄 Report.pdf  PDF   2.1MB Mar 09  │      │
│         │  │ ☐  📊 Data.xlsx  XLSX   540KB Mar 08  │      │
│         │  │ ☐  📝 Notes.docx DOCX   128KB Mar 07  │      │
│         │  │ ☐  🖼️ Photo.png  Image  3.5MB Mar 06  │      │
│         │  └────────────────────────────────────────┘      │
│         │                                                  │
│         │  Right-click Context Menu:                       │
│         │  ┌──────────────────┐                            │
│         │  │ 📥 Download      │                            │
│         │  │ ✏️  Rename        │                            │
│         │  │ 📁 Move to...    │                            │
│         │  │ 📋 Copy to...    │                            │
│         │  │ ⭐ Star          │                            │
│         │  │ 🔗 Share         │                            │
│         │  │ 🗑️  Move to Trash│                            │
│         │  └──────────────────┘                            │
└─────────┴──────────────────────────────────────────────────┘
```

### 10.3.3 AI Assistant (Chat Page)

**URL**: `/chat`

```
┌─────────┬────────────┬─────────────────────────────────────┐
│ ☁ Cloud │ History    │ 💡 Smart AI Assistant               │
│  Space  │            │ ● Ready                   📑 🔄 ✕  │
│         │ [New Chat] ├─────────────────────────────────────┤
│ □ Dash  │            │                                     │
│ 📁 Files│ Today      │  ┌─────────────────────────────┐    │
│ ⭐ Star │ ├ Revenue Q3│  │ Welcome! I'm your Smart AI  │    │
│ 👥 Shrd │ ├ Budget    │  │ Assistant. I can help you:   │    │
│ 📤 ShBy │            │  │ 💾 Save & remember           │    │
│ 🗑 Trash│ Yesterday  │  │ 📄 Scan content              │    │
│─────────│ ├ Meeting   │  │ 🔍 Search your docs          │    │
│ 💡 AI   │ ├ Analysis  │  │ 💡 Answer questions          │    │
│ 📊 Strg │            │  │ 📊 Summarize documents       │    │
│ ⚙ Sett │ Previous   │  └─────────────────────────────┘    │
│ 💳 Plan │ ├ Project   │                                     │
│         │            │  ┌─────────────────────────────────┐│
│         │  🔒 Free   │  │ What was Q3 revenue?           ││
│         │  users see │  └─────────────────────╔══════════╗│
│         │  lock icon │                        ║   Send   ║│
│         │            │  [Scan] [Search] [My]  ╚══════════╝│
│         │            │  [Summary] [Export]                 │
└─────────┴────────────┴─────────────────────────────────────┘
```

**Key Elements**:
- Left: Chat history sidebar (Premium only, locked for Free users)
- Grouped history: Today, Yesterday, Previous Days
- New Chat button
- Delete chat button (appears on hover)
- Right: Main chat area with messages
- User messages (right-aligned, indigo gradient)
- AI responses (left-aligned, white card, markdown rendered)
- Source citations below AI responses
- Quick action pills (Scan, Search, Content, Summary, Export)
- Input bar with send button

### 10.3.4 Storage Insights

**URL**: `/storage-insights`

```
┌─────────┬──────────────────────────────────────────────────┐
│ ☁ Cloud │  Storage Insights                         🔔 👤  │
│  Space  ├──────────────────────────────────────────────────┤
│         │                                                  │
│ Sidebar │  Storage Usage: 2.4 GB / 5.0 GB                 │
│         │  ┌──────────────────────────────────────────┐    │
│         │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 48%     │    │
│         │  └──────────────────────────────────────────┘    │
│         │                                                  │
│         │  File Type Distribution                          │
│         │  ┌──────────┐                                    │
│         │  │  🟣 PDF      45% (1.08 GB)                   │
│         │  │  🔵 DOCX     25% (600 MB)                    │
│         │  │  🟢 Images   20% (480 MB)                    │
│         │  │  🟡 XLSX      7% (168 MB)                    │
│         │  │  ⚪ Other     3% (72 MB)                     │
│         │  └──────────┘                                    │
│         │                                                  │
│         │  Largest Files                                   │
│         │  ┌────────────────────────────────────────┐      │
│         │  │ 1. Annual_Report.pdf      45.2 MB     │      │
│         │  │ 2. Presentation.pptx      32.1 MB     │      │
│         │  │ 3. Database_Backup.xlsx   28.7 MB     │      │
│         │  └────────────────────────────────────────┘      │
└─────────┴──────────────────────────────────────────────────┘
```

### 10.3.5 Plans & Pricing

**URL**: `/plans`

```
┌─────────┬──────────────────────────────────────────────────┐
│ ☁ Cloud │  Subscription Plans                       🔔 👤  │
│  Space  ├──────────────────────────────────────────────────┤
│         │                                                  │
│ Sidebar │  Choose Your Plan                                │
│         │                                                  │
│         │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│         │  │   FREE   │  │   PRO    │  │PROFESNL  │       │
│         │  │          │  │ POPULAR  │  │          │       │
│         │  │  ₹0/mo   │  │ ₹499/mo  │  │ ₹999/mo  │       │
│         │  │          │  │          │  │          │       │
│         │  │ 5 GB     │  │ 500 GB   │  │ 50 GB    │       │
│         │  │ 20MB/file│  │ Unlimited│  │ 250MB/fl │       │
│         │  │ 50 AI/mo │  │ 1000 AI  │  │ 300 AI   │       │
│         │  │ No MFA   │  │ ✓ MFA    │  │ ✓ MFA    │       │
│         │  │ No Hist. │  │ ✓ History│  │ ✓ History│       │
│         │  │          │  │          │  │          │       │
│         │  │[Current] │  │[Upgrade] │  │[Upgrade] │       │
│         │  └──────────┘  └──────────┘  └──────────┘       │
└─────────┴──────────────────────────────────────────────────┘
```

### 10.3.6 Settings Page

**URL**: `/settings`

```
┌─────────┬──────────────────────────────────────────────────┐
│ ☁ Cloud │  Account Settings                         🔔 👤  │
│  Space  ├──────────────────────────────────────────────────┤
│         │                                                  │
│ Sidebar │  Profile Information                             │
│         │  ┌────────────────────────────────────────┐      │
│         │  │ Display Name: [John Doe          ]    │      │
│         │  │ Email:        user@example.com (locked)│      │
│         │  │ Plan:         Pro ✓                    │      │
│         │  │                                        │      │
│         │  │ [Save Changes]                         │      │
│         │  └────────────────────────────────────────┘      │
│         │                                                  │
│         │  Security                                        │
│         │  ┌────────────────────────────────────────┐      │
│         │  │ Password:     [Change Password →]      │      │
│         │  │ 2FA (MFA):    ● Enabled [Manage →]     │      │
│         │  └────────────────────────────────────────┘      │
│         │                                                  │
│         │  Appearance                                      │
│         │  ┌────────────────────────────────────────┐      │
│         │  │ Theme:  [☀ Light] / [🌙 Dark]          │      │
│         │  └────────────────────────────────────────┘      │
└─────────┴──────────────────────────────────────────────────┘
```

## 10.4 Admin Panel Screens

### 10.4.1 Admin Dashboard

**URL**: `/admin/dashboard`

```
┌──────────────┬─────────────────────────────────────────────┐
│ ☁ CloudSpace │  Admin Dashboard                  🔔(3) 👤  │
│   ADMIN      ├─────────────────────────────────────────────┤
│              │                                             │
│ □ Dashboard  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│ 👥 Users     │  │ Users  │ │ Docs   │ │Storage │ │  AI  │ │
│ 💾 Storage   │  │  245   │ │ 3,421  │ │ 45 GB  │ │ 892  │ │
│ 🤖 AI Usage  │  │ +12 ↑  │ │ +89 ↑  │ │ +5.2↑  │ │+156↑ │ │
│ 💳 Plans     │  └────────┘ └────────┘ └────────┘ └──────┘ │
│ 📋 Audit     │                                             │
│ 📊 Analytics │  User Growth (Last 30 Days)                 │
│ 🔔 Subs      │  ┌─────────────────────────────────┐        │
│ ⚙ Settings  │  │ 20│    ╱╲                        │        │
│              │  │ 15│   ╱  ╲    ╱╲                 │        │
│              │  │ 10│  ╱    ╲  ╱  ╲   ╱╲           │        │
│              │  │  5│ ╱      ╲╱    ╲ ╱  ╲          │        │
│              │  │  0├─────────────────────────      │        │
│              │  │   W1    W2    W3    W4            │        │
│              │  └─────────────────────────────────┘        │
│              │                                             │
│              │  Recent Users                               │
│              │  ┌─────────────────────────────────┐        │
│              │  │ john@ex.com    Pro    Mar 13    │        │
│              │  │ jane@ex.com    Free   Mar 12    │        │
│              │  │ bob@ex.com     Prof.  Mar 11    │        │
│              │  └─────────────────────────────────┘        │
└──────────────┴─────────────────────────────────────────────┘
```

### 10.4.2 Admin User Management

**URL**: `/admin/users`

```
┌──────────────┬─────────────────────────────────────────────┐
│ ☁ CloudSpace │  User Management                    🔔 👤   │
│   ADMIN      ├─────────────────────────────────────────────┤
│              │                                             │
│ Admin Nav    │  🔍 [Search users by email...        ]      │
│              │                                             │
│              │  ┌─────────────────────────────────────────┐│
│              │  │ Email         Plan  Storage  Status Act.││
│              │  │─────────────────────────────────────────││
│              │  │ john@ex.com   Pro   2.4GB   Active [🔒] ││
│              │  │ jane@ex.com   Free  120MB   Active [🔒] ││
│              │  │ bob@ex.com    Prof  8.2GB   Locked [🔓] ││
│              │  │ alice@ex.com  Free  50MB    Active [🔒] ││
│              │  └─────────────────────────────────────────┘│
│              │                                             │
│              │  [◀ Prev]  Page 1 of 12  [Next ▶]          │
└──────────────┴─────────────────────────────────────────────┘
```

### 10.4.3 Admin Notification Dropdown

```
┌──────────────────────────────────────────────────────────┐
│  Admin Header                        🔔(3) ▼             │
│                              ┌───────────────────────┐   │
│                              │ Notifications         │   │
│                              │ [Mark all as read]    │   │
│                              │─────────────────────  │   │
│                              │ 👤 New user signup    │   │
│                              │   user@ex.com         │   │
│                              │   2 min ago • USER    │   │
│                              │────────────────────── │   │
│                              │ 🔒 Security alert     │   │
│                              │   Failed login x5     │   │
│                              │   10 min ago • ALERT  │   │
│                              │─────────────────────  │   │
│                              │ ⚙ System update       │   │
│                              │   Storage 80% full    │   │
│                              │   1 hr ago • SYSTEM   │   │
│                              │─────────────────────  │   │
│                              │ [View All Activity]   │   │
│                              └───────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## 10.5 Responsive Design

All screens are fully responsive:

- **Desktop (1200px+)**: Full sidebar + full content
- **Tablet (768px–1199px)**: Collapsible sidebar + full content
- **Mobile (<768px)**: Hidden sidebar (hamburger toggle) + full-width content

## 10.6 Theme Support

The application supports two themes:

| Element | Light Theme | Dark Theme |
|---|---|---|
| Background | #f8fafc (slate-50) | #0f172a (slate-900) |
| Card Background | #ffffff | #1e293b (slate-800) |
| Text Primary | #0f172a | #f1f5f9 |
| Text Secondary | #64748b | #94a3b8 |
| Accent Color | #6366f1 (indigo-500) | #818cf8 (indigo-400) |
| Sidebar | #ffffff with border | #1e293b with border |
| Input Background | #f8fafc | #0f172a |

## 10.7 Navigation Flow Diagram

```
                    ┌────────┐
                    │ Login  │
                    └───┬────┘
                        │
            ┌───────────┴───────────┐
            │                       │
       ┌────▼─────┐          ┌─────▼──────┐
       │Dashboard │          │Admin Panel │
       │(User)    │          │(Admin Only)│
       └────┬─────┘          └─────┬──────┘
            │                      │
    ┌───────┼───────────┐    ┌─────┼────────┐
    │       │           │    │     │        │
┌───▼──┐ ┌──▼───┐ ┌────▼┐  ┌▼───┐ ┌▼────┐ ┌▼────┐
│Files │ │ AI   │ │Plans│  │User│ │Stor.│ │Audit│
│Mgmt  │ │Chat  │ │&Pay │  │Mgmt│ │Mon. │ │Logs │
└──────┘ └──────┘ └─────┘  └────┘ └─────┘ └─────┘
```

---

\newpage

# APPENDICES

---

## Appendix A: Environment Variables

| Variable | Description | Example |
|---|---|---|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| FIREBASE_SERVICE_ACCOUNT | Firebase credentials path | ./config/firebase-sa.json |
| AWS_REGION | AWS region | ap-south-1 |
| AWS_ACCESS_KEY_ID | AWS access key | AKIA... |
| AWS_SECRET_ACCESS_KEY | AWS secret key | wJalr... |
| AWS_S3_BUCKET_NAME | S3 bucket name | cloudspace-storage |
| OPENAI_API_KEY | OpenAI API key | sk-... |
| PINECONE_API_KEY | Pinecone API key | pc-... |
| PINECONE_INDEX_NAME | Pinecone index | cloudspace-docs |
| RAZORPAY_KEY_ID | Razorpay key | rzp_live_... |
| RAZORPAY_KEY_SECRET | Razorpay secret | ... |
| N8N_WEBHOOK_URL | n8n webhook (optional) | https://n8n.example.com/webhook/... |

## Appendix B: API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/verify | Verify Firebase token |
| POST | /api/auth/sync | Sync user profile |
| POST | /api/ai/query | Submit AI question |
| GET | /api/ai/history | Get chat history |
| GET | /api/ai/history/:id | Get chat messages |
| DELETE | /api/ai/history/:id | Delete chat |
| POST | /api/documents/upload | Upload file |
| GET | /api/documents | List documents |
| GET | /api/documents/:id/download | Download file |
| PUT | /api/documents/:id/rename | Rename document |
| PUT | /api/documents/:id/move | Move document |
| POST | /api/documents/:id/copy | Copy document |
| PUT | /api/documents/:id/star | Toggle star |
| DELETE | /api/documents/:id | Delete document |
| GET | /api/storage/usage | Get storage usage |
| POST | /api/shares | Create share |
| GET | /api/shares | List shares |
| POST | /api/mfa/generate-secret | Generate MFA secret |
| POST | /api/mfa/verify | Verify MFA code |
| GET | /api/plans | List plans |
| POST | /api/payments/create-order | Create payment order |
| GET | /api/admin/dashboard | Admin dashboard stats |
| GET | /api/admin/users | List all users |
| GET | /api/admin/notifications | Admin notifications |

## Appendix C: References

1. Angular Official Documentation — https://angular.dev
2. Node.js Documentation — https://nodejs.org/docs
3. Express.js Documentation — https://expressjs.com
4. Firebase Documentation — https://firebase.google.com/docs
5. AWS S3 Documentation — https://docs.aws.amazon.com/s3
6. Pinecone Documentation — https://docs.pinecone.io
7. OpenAI API Reference — https://platform.openai.com/docs
8. Razorpay Documentation — https://razorpay.com/docs
9. Helmet.js — https://helmetjs.github.io
10. Socket.IO — https://socket.io/docs

---

**END OF DOCUMENTATION**

**CloudSpace — Cloud-Based Document Storage & AI Assistant**
**Version 2.0.0 | March 2026**

---
