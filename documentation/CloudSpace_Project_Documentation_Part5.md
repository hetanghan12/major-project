# CHAPTER 9: TEST CASES

---

## 9.1 Testing Methodology

CloudSpace follows a comprehensive testing approach covering:
- **Unit Testing**: Individual function and component testing
- **Integration Testing**: API endpoint testing with real services
- **User Acceptance Testing (UAT)**: End-to-end user workflow validation
- **Security Testing**: Authentication, authorization, and data isolation verification
- **Performance Testing**: Load handling, response times, and resource utilization

## 9.2 Authentication Module Test Cases

### TC-AUTH: Authentication Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-A01 | Register with valid email/password | Guest user, valid email not registered | 1. Navigate to /register 2. Enter valid name, email, password 3. Click Register | Account created, redirect to dashboard, profile synced to Firestore | ✓ Pass |
| TC-A02 | Register with existing email | Email already registered | 1. Navigate to /register 2. Enter existing email 3. Click Register | Error: "Email already in use" displayed | ✓ Pass |
| TC-A03 | Register with weak password | Guest user | 1. Navigate to /register 2. Enter password < 6 chars 3. Click Register | Error: "Password should be at least 6 characters" | ✓ Pass |
| TC-A04 | Register with empty fields | Guest user | 1. Navigate to /register 2. Leave fields empty 3. Click Register | Validation errors shown for all required fields | ✓ Pass |
| TC-A05 | Login with valid credentials | Registered user | 1. Navigate to /login 2. Enter correct email/password 3. Click Login | Redirect to dashboard, user synced | ✓ Pass |
| TC-A06 | Login with wrong password | Registered user | 1. Navigate to /login 2. Enter wrong password 3. Click Login | Error: "Invalid email or password" | ✓ Pass |
| TC-A07 | Login with non-existent email | No account for email | 1. Navigate to /login 2. Enter non-registered email 3. Click Login | Error: "User not found" | ✓ Pass |
| TC-A08 | Google OAuth login | Google account available | 1. Navigate to /login 2. Click "Sign in with Google" 3. Select Google account | Redirect to dashboard, profile synced | ✓ Pass |
| TC-A09 | Forgot password flow | Registered user | 1. Navigate to /forgot-password 2. Enter registered email 3. Click Reset | Success: "Password reset email sent" | ✓ Pass |
| TC-A10 | Account lockout after failures | Registered user | 1. Attempt login with wrong password 5 times | Account locked, lockout message displayed | ✓ Pass |
| TC-A11 | Logout functionality | Logged-in user | 1. Click user menu 2. Click "Sign out" | Session cleared, redirect to /login | ✓ Pass |
| TC-A12 | Auth guard protection | Not logged in | 1. Navigate to /dashboard directly | Redirect to /login | ✓ Pass |
| TC-A13 | Guest guard protection | Logged-in user | 1. Navigate to /login directly | Redirect to /dashboard | ✓ Pass |
| TC-A14 | Admin guard protection | Non-admin user | 1. Navigate to /admin | Redirect to /dashboard | ✓ Pass |

## 9.3 MFA Module Test Cases

### TC-MFA: Multi-Factor Authentication Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-M01 | Enable MFA (Pro user) | Pro/Professional user, MFA disabled | 1. Go to Settings > Security 2. Click "Enable 2FA" 3. Scan QR code 4. Enter TOTP code 5. Click Verify | MFA enabled, backup codes shown | ✓ Pass |
| TC-M02 | Login with MFA enabled | MFA enabled user | 1. Login with email/password 2. MFA prompt shown 3. Enter valid TOTP code | Login successful, redirect to dashboard | ✓ Pass |
| TC-M03 | Login with invalid TOTP | MFA enabled user | 1. Login with email/password 2. Enter wrong TOTP code | Error: "Invalid verification code" | ✓ Pass |
| TC-M04 | Disable MFA | MFA enabled user | 1. Go to Settings > Security 2. Click "Disable 2FA" 3. Enter current TOTP code | MFA disabled successfully | ✓ Pass |
| TC-M05 | MFA blocked for Free plan | Free plan user | 1. Go to Settings > Security | MFA option not available, upgrade prompt shown | ✓ Pass |

## 9.4 Document Management Test Cases

### TC-DOC: Document Management Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-D01 | Upload PDF file | Logged-in, storage available | 1. Click Upload 2. Select PDF file (<20MB) 3. Wait for upload | File appears in list, thumbnail generated, status "ready" | ✓ Pass |
| TC-D02 | Upload DOCX file | Logged-in, storage available | 1. Click Upload 2. Select DOCX file | File uploaded, text extracted, vectors created | ✓ Pass |
| TC-D03 | Upload oversized file (Free plan) | Free plan user | 1. Click Upload 2. Select file >20MB | Error: "File exceeds plan limit (20 MB)" | ✓ Pass |
| TC-D04 | Upload unsupported file type | Logged-in user | 1. Click Upload 2. Select .exe file | Error: "File type not supported" | ✓ Pass |
| TC-D05 | Upload when storage full | Storage quota exceeded | 1. Click Upload 2. Select any file | Error: "Storage quota exceeded" | ✓ Pass |
| TC-D06 | Create folder | Logged-in user | 1. Click "New Folder" 2. Enter folder name 3. Confirm | Folder created, appears in document list | ✓ Pass |
| TC-D07 | Rename document | Document exists | 1. Right-click document 2. Select Rename 3. Enter new name 4. Confirm | Document name updated in UI and Firestore | ✓ Pass |
| TC-D08 | Star document | Document exists | 1. Click star icon on document | Document marked as starred, appears in Starred view | ✓ Pass |
| TC-D09 | Move to trash | Document exists | 1. Right-click document 2. Select "Move to Trash" | Document moved to trash, not visible in main view | ✓ Pass |
| TC-D10 | Restore from trash | Trashed document | 1. Go to Trash 2. Click Restore on document | Document restored to original location | ✓ Pass |
| TC-D11 | Permanent delete | Trashed document | 1. Go to Trash 2. Click Delete Permanently | Document removed from Firestore, S3, and Pinecone | ✓ Pass |
| TC-D12 | Download document | Document with status "ready" | 1. Click download icon | File downloaded via pre-signed S3 URL | ✓ Pass |
| TC-D13 | Preview PDF | PDF document uploaded | 1. Click on PDF document | PDF preview rendered in viewer | ✓ Pass |
| TC-D14 | Move document to folder | Document and folder exist | 1. Select document 2. Click Move 3. Select destination folder | Document moved, parentFolderId updated | ✓ Pass |
| TC-D15 | Copy document | Document exists | 1. Select document 2. Click Copy 3. Select destination | Document copied to new location with new ID | ✓ Pass |
| TC-D16 | Search documents | Documents uploaded | 1. Type filename in search bar 2. Press Enter | Matching documents displayed | ✓ Pass |

## 9.5 AI Assistant Test Cases

### TC-AI: AI Assistant Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-I01 | Ask question with documents | Documents uploaded and indexed | 1. Open AI Assistant 2. Type question 3. Press Enter | AI response with relevant answer and source citations | ✓ Pass |
| TC-I02 | Ask question with no documents | No documents uploaded | 1. Open AI Assistant 2. Type question | Warning: "No documents uploaded" shown, input disabled | ✓ Pass |
| TC-I03 | AI rate limit exceeded | Monthly AI limit reached | 1. Type question after limit reached | Friendly message: "You've reached your monthly AI limit" | ✓ Pass |
| TC-I04 | View chat history (Pro) | Pro user with past chats | 1. Open AI Assistant 2. Check sidebar | Past conversations listed with titles and dates | ✓ Pass |
| TC-I05 | Chat history hidden (Free) | Free plan user | 1. Open AI Assistant 2. Check sidebar | Locked sidebar with upgrade prompt | ✓ Pass |
| TC-I06 | Open previous chat | Pro user with chat history | 1. Click on chat in sidebar | Messages loaded from Firestore, displayed in order | ✓ Pass |
| TC-I07 | Start new chat | Premium user | 1. Click "New Chat" button | Chat cleared, new session started, welcome message shown | ✓ Pass |
| TC-I08 | Delete chat | Premium user with chats | 1. Hover over chat 2. Click delete icon 3. Confirm | Chat and messages deleted from Firestore | ✓ Pass |
| TC-I09 | AI response with markdown | Documents uploaded | 1. Ask complex question | Response rendered with proper markdown formatting | ✓ Pass |
| TC-I10 | AI searches shared docs | Documents shared with user | 1. Ask about shared document content | AI finds and cites shared document as source | ✓ Pass |

## 9.6 Sharing Module Test Cases

### TC-SHR: Sharing Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-S01 | Share file with valid email | Document owned by user | 1. Click Share 2. Enter recipient email 3. Set permission 4. Click Share | Share created, notification sent to recipient | ✓ Pass |
| TC-S02 | Share with self | Own document | 1. Click Share 2. Enter own email | Error: "Cannot share with yourself" | ✓ Pass |
| TC-S03 | Accept share invitation | Pending share exists | 1. Open shared-with-me 2. Click Accept | Share status → accepted, document accessible | ✓ Pass |
| TC-S04 | Reject share invitation | Pending share exists | 1. Open shared-with-me 2. Click Reject | Share status → rejected, document not accessible | ✓ Pass |
| TC-S05 | Revoke share | Active share exists | 1. Open shared-by-me 2. Click Revoke | Share status → revoked, recipient loses access | ✓ Pass |
| TC-S06 | View shared documents | Accepted shares exist | 1. Navigate to "Shared With Me" | Shared documents listed with permissions | ✓ Pass |

## 9.7 Admin Panel Test Cases

### TC-ADM: Admin Panel Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-AD01 | Access admin dashboard | Admin user logged in | 1. Navigate to /admin/dashboard | Dashboard metrics displayed (users, docs, storage) | ✓ Pass |
| TC-AD02 | View all users | Admin user | 1. Navigate to /admin/users | Paginated user list with email, plan, storage | ✓ Pass |
| TC-AD03 | Lock user account | Admin, target user exists | 1. Go to Users 2. Click Lock on user | User account locked, cannot login | ✓ Pass |
| TC-AD04 | Unlock user account | Admin, locked user | 1. Go to Users 2. Click Unlock | User account unlocked, can login | ✓ Pass |
| TC-AD05 | View audit logs | Admin user | 1. Navigate to /admin/audit | Security events listed (logins, failures, lockouts) | ✓ Pass |
| TC-AD06 | View AI usage metrics | Admin user | 1. Navigate to /admin/ai-usage | AI request stats, per-plan breakdown, trends | ✓ Pass |
| TC-AD07 | Admin notifications | Admin, new user signed up | 1. Check notification bell | Badge shows unread count, dropdown lists notifications | ✓ Pass |
| TC-AD08 | Mark all notifications read | Admin with unread notifications | 1. Click "Mark all as read" | All notifications marked read, badge cleared | ✓ Pass |

## 9.8 Subscription & Payment Test Cases

### TC-PAY: Payment Test Suite

| TC-ID | Test Case Name | Pre-conditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-P01 | View subscription plans | Logged-in user | 1. Navigate to /plans | Three plans displayed with features and pricing | ✓ Pass |
| TC-P02 | Subscribe to Pro plan | Free user, Razorpay configured | 1. Click Subscribe on Pro 2. Complete Razorpay payment | Plan upgraded, limits updated, subscription recorded | ✓ Pass |
| TC-P03 | Verify plan limits update | After subscription | 1. Check storage limit 2. Check AI limit | Limits reflect new plan (500GB, 1000 AI requests) | ✓ Pass |

## 9.9 Performance Test Cases

### TC-PERF: Performance Test Suite

| TC-ID | Test Case Name | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| TC-PF01 | Dashboard load time | < 3 seconds | ~1.5 seconds (with cache) | ✓ Pass |
| TC-PF02 | Document list load (50 docs) | < 2 seconds | ~1.2 seconds | ✓ Pass |
| TC-PF03 | AI query response time | < 15 seconds | ~5-10 seconds | ✓ Pass |
| TC-PF04 | File upload (5MB) | < 10 seconds | ~3-5 seconds | ✓ Pass |
| TC-PF05 | Chat history load | < 2 seconds | ~1 second (with cache) | ✓ Pass |
| TC-PF06 | Notification polling | No duplicate requests within 60s | Verified: 60s cooldown | ✓ Pass |
| TC-PF07 | History cache effectiveness | Reduce Firestore reads by 80%+ | 90% reduction confirmed | ✓ Pass |

## 9.10 Security Test Cases

### TC-SEC: Security Test Suite

| TC-ID | Test Case Name | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-SE01 | Cross-user data access | 1. Authenticate as User A 2. Attempt to fetch User B's documents via API | 403 Forbidden — namespace isolation enforced | ✓ Pass |
| TC-SE02 | Token expiry handling | 1. Use expired Firebase token 2. Make API request | 401 Unauthorized — token rejected | ✓ Pass |
| TC-SE03 | SQL/NoSQL injection | 1. Send malicious queries in document names, search | Queries sanitized, no data leakage | ✓ Pass |
| TC-SE04 | CORS enforcement | 1. Make API request from unauthorized origin | Request blocked by CORS policy | ✓ Pass |
| TC-SE05 | Rate limiting | 1. Send 100+ requests in 1 minute | 429 Too Many Requests after threshold | ✓ Pass |
| TC-SE06 | Pinecone namespace isolation | 1. Query Pinecone with User A's namespace 2. Verify no User B vectors returned | Complete isolation — 0 cross-user vectors | ✓ Pass |
| TC-SE07 | Admin route protection | 1. Non-admin user navigates to /admin | Redirect to /dashboard by AdminGuard | ✓ Pass |

---

\newpage
