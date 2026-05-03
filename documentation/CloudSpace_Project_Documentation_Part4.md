# CHAPTER 8: DATABASE DESIGN

---

## 8.1 Database Technology

CloudSpace uses **Firebase Cloud Firestore** as the primary database — a NoSQL document database that stores data in collections of JSON-like documents. This was chosen for:

- **Real-time capabilities**: Firestore supports real-time listeners for live updates.
- **Scalability**: Automatic scaling without manual sharding.
- **Serverless**: No database server management required.
- **Integration**: Native integration with Firebase Authentication.
- **Flexible schema**: Document-based storage allows schema evolution without migrations.

## 8.2 Collections Overview

| Collection | Purpose | Document Count (Approx.) |
|---|---|---|
| `users` | User profiles, plan info, MFA settings | 1 per registered user |
| `documents` | File/folder metadata, storage paths | Multiple per user |
| `notifications` | User and admin notifications | Multiple per user |
| `shares` | Document sharing records | Multiple per share action |
| `security_logs` | Authentication and audit events | Multiple per login |
| `subscription_plans` | Plan configurations (Free, Professional, Pro) | 3 (one per plan) |
| `subscriptions` | Active user subscriptions | 1 per paying user |
| `dashboard_stats` | Aggregated platform statistics | 1 global document |
| `login_locks` | Failed login tracking | 1 per locked email |
| `settings` | Global application settings | 1 global document |
| `users/{uid}/chats` | AI conversation sessions (subcollection) | Multiple per premium user |
| `users/{uid}/chats/{id}/messages` | Chat messages (sub-subcollection) | Multiple per chat |

## 8.3 Collection Schemas

### 8.3.1 Users Collection

**Path**: `users/{userId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `userId` | string | Yes | — | Firebase Auth UID (document ID) |
| `email` | string | Yes | — | User email address |
| `displayName` | string | No | null | Display name |
| `photoURL` | string | No | null | Profile photo URL |
| `plan` | string | Yes | "free" | Subscription plan (free/professional/pro) |
| `role` | string | No | "user" | User role (user/admin) |
| `totalStorageUsedBytes` | number | Yes | 0 | Current storage consumption in bytes |
| `totalFilesCount` | number | Yes | 0 | Total number of uploaded files |
| `aiRequestsUsed` | number | Yes | 0 | AI queries used this month |
| `aiRequestsResetDate` | string | Yes | ISO date | Last AI counter reset date |
| `mfaEnabled` | boolean | Yes | false | Whether MFA is enabled |
| `mfaSecret` | string | No | null | TOTP secret (encrypted) |
| `failedLoginAttempts` | number | No | 0 | Consecutive failed logins |
| `accountLockedUntil` | string | No | null | Lock expiry timestamp |
| `createdAt` | string | Yes | ISO date | Account creation timestamp |
| `updatedAt` | string | Yes | ISO date | Last profile update |

**Sample Document:**
```json
{
  "userId": "a2TZuD871OOp2r73HOS8ZBfp2ws2",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "plan": "pro",
  "role": "user",
  "totalStorageUsedBytes": 52428800,
  "totalFilesCount": 15,
  "aiRequestsUsed": 23,
  "aiRequestsResetDate": "2026-03-01T00:00:00.000Z",
  "mfaEnabled": true,
  "failedLoginAttempts": 0,
  "accountLockedUntil": null,
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-03-14T01:00:00.000Z"
}
```

### 8.3.2 Documents Collection

**Path**: `documents/{documentId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `documentId` | string | Yes | UUID | Unique document identifier |
| `userId` | string | Yes | — | Owner's Firebase UID |
| `fileName` | string | Yes | — | Original filename |
| `fileType` | string | Yes | — | MIME type |
| `fileSize` | number | Yes | 0 | File size in bytes |
| `s3Key` | string | No | null | AWS S3 object key |
| `s3Url` | string | No | null | S3 URL for file access |
| `storagePath` | string | No | null | Storage path reference |
| `publicUrl` | string | No | null | Public access URL |
| `pineconeNamespace` | string | No | userId | Pinecone namespace (= userId) |
| `chunkIds` | array | No | [] | Vector chunk IDs for deletion |
| `vectorCount` | number | No | 0 | Number of vector chunks |
| `thumbnailUrl` | string | No | null | Thumbnail image URL |
| `thumbnailStatus` | string | No | "processing" | Thumbnail state |
| `previewUrl` | string | No | null | Document preview URL |
| `status` | string | Yes | "processing" | Document status (processing/ready/failed/trash) |
| `isFolder` | boolean | Yes | false | Whether this is a folder |
| `parentFolderId` | string | No | null | Parent folder ID |
| `isStarred` | boolean | Yes | false | Starred by user |
| `isTrashed` | boolean | Yes | false | In trash |
| `uploadedAt` | string | Yes | ISO date | Upload timestamp |

**Sample Document:**
```json
{
  "documentId": "doc_abc123",
  "userId": "a2TZuD871OOp2r73HOS8ZBfp2ws2",
  "fileName": "Q3_Report_2025.pdf",
  "fileType": "application/pdf",
  "fileSize": 2097152,
  "s3Key": "users/a2TZuD871OOp2r73HOS8ZBfp2ws2/doc_abc123_Q3_Report.pdf",
  "s3Url": "https://bucket.s3.amazonaws.com/users/a2TZu.../doc_abc123.pdf",
  "pineconeNamespace": "a2TZuD871OOp2r73HOS8ZBfp2ws2",
  "chunkIds": ["chunk_1", "chunk_2", "chunk_3"],
  "vectorCount": 3,
  "thumbnailUrl": "https://bucket.s3.amazonaws.com/thumbs/doc_abc123.png",
  "thumbnailStatus": "ready",
  "status": "ready",
  "isFolder": false,
  "parentFolderId": "folder_xyz",
  "isStarred": true,
  "isTrashed": false,
  "uploadedAt": "2026-03-10T14:30:00.000Z"
}
```

### 8.3.3 Notifications Collection

**Path**: `notifications/{notificationId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | Yes | UUID | Notification identifier |
| `userId` | string | Yes | — | Target user ID or "ADMIN" |
| `type` | string | Yes | — | Type (upload/ai/share/USER_SIGNUP/SECURITY/SYSTEM_ALERT) |
| `message` | string | Yes | — | Notification text |
| `fileId` | string | No | null | Related document ID |
| `details` | object | No | {} | Additional context data |
| `read` | boolean | Yes | false | Read status |
| `createdAt` | string | Yes | ISO date | Creation timestamp |

### 8.3.4 Shares Collection

**Path**: `shares/{shareId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `shareId` | string | Yes | UUID | Share record identifier |
| `resourceId` | string | Yes | — | Shared document/folder ID |
| `resourceType` | string | Yes | — | "file" or "folder" |
| `resourceName` | string | Yes | — | File/folder name |
| `ownerUserId` | string | Yes | — | Owner's Firebase UID |
| `ownerEmail` | string | Yes | — | Owner's email |
| `recipientEmail` | string | Yes | — | Recipient's email |
| `recipientUserId` | string | No | null | Recipient's UID (if registered) |
| `permission` | string | Yes | "view" | Permission level (view/edit/download) |
| `status` | string | Yes | "pending" | Status (pending/accepted/rejected/revoked) |
| `message` | string | No | null | Optional share message |
| `createdAt` | string | Yes | ISO date | Share creation timestamp |
| `updatedAt` | string | No | ISO date | Last status change |

### 8.3.5 Security Logs Collection

**Path**: `security_logs/{logId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `eventType` | string | Yes | — | Event type (LOGIN_SUCCESS/LOGIN_FAILED/ACCOUNT_LOCKED) |
| `userId` | string | No | null | User's Firebase UID |
| `email` | string | Yes | — | User's email |
| `ipAddress` | string | No | null | Client IP address |
| `action` | string | Yes | — | Human-readable description |
| `status` | string | Yes | — | SUCCESS or FAILURE |
| `timestamp` | string | Yes | ISO date | Event timestamp |

### 8.3.6 Chat Sessions (Subcollection)

**Path**: `users/{userId}/chats/{chatId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `chatId` | string | Yes | Auto-ID | Chat session identifier |
| `title` | string | Yes | "New Chat" | Chat title (auto-generated from first message) |
| `lastMessage` | string | No | "" | Last message preview (100 chars) |
| `createdAt` | string | Yes | ISO date | Chat creation time |
| `updatedAt` | string | Yes | ISO date | Last activity time |

### 8.3.7 Chat Messages (Sub-subcollection)

**Path**: `users/{userId}/chats/{chatId}/messages/{messageId}`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `role` | string | Yes | — | Message sender ("user" or "assistant") |
| `content` | string | Yes | — | Message text content |
| `createdAt` | string | Yes | ISO date | Message timestamp |

### 8.3.8 Subscription Plans Collection

**Path**: `subscription_plans/{planId}`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Plan display name |
| `price` | number | Yes | Monthly price in INR |
| `storageLimitGB` | number | Yes | Storage limit in GB |
| `uploadLimitMB` | number | Yes | Max file size in MB |
| `aiRequestsPerMonth` | number | Yes | Monthly AI query limit |
| `features` | array | Yes | List of feature descriptions |
| `isPopular` | boolean | No | Highlighted plan flag |

### 8.3.9 Subscriptions Collection

**Path**: `subscriptions/{subscriptionId}`

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | Yes | Subscriber's Firebase UID |
| `planId` | string | Yes | Subscription plan ID |
| `planName` | string | Yes | Plan name |
| `status` | string | Yes | active/cancelled/expired |
| `razorpayOrderId` | string | No | Razorpay order reference |
| `razorpayPaymentId` | string | No | Razorpay payment reference |
| `amount` | number | Yes | Payment amount in paise |
| `startDate` | string | Yes | Subscription start date |
| `endDate` | string | Yes | Subscription end date |
| `createdAt` | string | Yes | Record creation timestamp |

## 8.4 Entity Relationship Diagram (Textual)

```
  ┌─────────────┐     1:N     ┌──────────────┐
  │   USERS     │────────────▶│  DOCUMENTS   │
  │             │             │              │
  │ userId (PK) │             │ documentId   │
  │ email       │             │ userId (FK)  │
  │ plan        │             │ fileName     │
  │ role        │             │ fileSize     │
  └──────┬──────┘             │ s3Key        │
         │                    │ status       │
         │ 1:N                └──────┬───────┘
         │                           │
         ▼                           │ 1:N
  ┌──────────────┐            ┌──────▼────────┐
  │ CHATS        │            │  SHARES       │
  │ (subcoll.)   │            │               │
  │ chatId       │            │ shareId       │
  │ title        │            │ resourceId(FK)│
  │ updatedAt    │            │ ownerUserId   │
  └──────┬───────┘            │ recipientEmail│
         │ 1:N                │ permission    │
         ▼                    │ status        │
  ┌──────────────┐            └───────────────┘
  │ MESSAGES     │
  │ (sub-subcoll)│
  │ role         │
  │ content      │
  │ createdAt    │
  └──────────────┘

  ┌─────────────┐     1:N     ┌──────────────┐
  │   USERS     │────────────▶│NOTIFICATIONS │
  │             │             │ id           │
  │             │             │ userId (FK)  │
  │             │             │ type         │
  │             │             │ message      │
  └─────────────┘             │ read         │
                              └──────────────┘

  ┌─────────────┐     1:1     ┌──────────────┐
  │   USERS     │────────────▶│SUBSCRIPTIONS │
  │             │             │ userId (FK)  │
  │             │             │ planId (FK)  │
  │             │             │ status       │
  └─────────────┘             │ amount       │
                              └──────────────┘
```

## 8.5 Indexing Strategy

### 8.5.1 Single-Field Indexes (Auto-created by Firestore)

| Collection | Field | Direction |
|---|---|---|
| `documents` | `userId` | Ascending |
| `notifications` | `userId` | Ascending |
| `shares` | `ownerUserId` | Ascending |
| `shares` | `recipientEmail` | Ascending |
| `security_logs` | `email` | Ascending |
| `subscriptions` | `userId` | Ascending |

### 8.5.2 Design Decision: In-Memory Sorting

To avoid composite index requirements (which can cause `FAILED_PRECONDITION` errors), the application uses **single-field queries with in-memory sorting**. For example:

- Documents are queried by `userId` only, then sorted by `uploadedAt` in JavaScript.
- Notifications are queried by `userId` only, then sorted by `createdAt` in JavaScript.

This approach trades slightly more memory usage for zero index management overhead.

## 8.6 Data Integrity & Security

### 8.6.1 Data Validation

- User IDs are always extracted from verified Firebase Auth tokens (never from client input).
- Document ownership is verified before any mutation operation.
- File sizes are validated against plan limits before upload.
- AI request counts are checked and incremented atomically.

### 8.6.2 Cascade Deletion

When a document is deleted:
1. Firestore metadata document is deleted.
2. S3 file object is deleted.
3. Pinecone vectors (by chunk IDs) are deleted from user namespace.
4. Thumbnail in S3 is deleted.
5. Related share records are updated.
6. User storage quota is recalculated.

When a user is deleted:
1. All user documents are cascade-deleted (S3 + Pinecone + Firestore).
2. All user chat sessions and messages are deleted.
3. All user notifications are deleted.
4. All outgoing shares are revoked.
5. User profile document is deleted.
6. Firebase Auth account is deleted.

### 8.6.3 Backup Strategy

- Firestore provides automatic daily backups (Blaze plan).
- S3 objects have 99.999999999% durability (11 nines).
- Pinecone maintains vector data persistence within the selected plan.

---

\newpage
