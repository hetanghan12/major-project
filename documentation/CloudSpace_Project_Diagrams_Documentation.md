# CLOUDSPACE — PROJECT DIAGRAMS DOCUMENTATION

## A Companion Document to the Main Project Report

### CloudSpace — Cloud-Based Document Storage & AI Assistant

**Academic Year: 2025–2026**

---

\newpage

# TABLE OF CONTENTS

| Sr. No. | Diagram Type | Page No. |
|---|---|---|
| 1 | Introduction to Project Diagrams | 3 |
| 2 | System Architecture Diagram | 5 |
| 3 | Data Flow Diagrams (DFD) | 8 |
| 4 | Use Case Diagram | 15 |
| 5 | Entity Relationship Diagram (ERD) | 20 |
| 6 | Sequence Diagrams | 24 |
| 7 | Activity Diagrams | 32 |
| 8 | Class Diagram | 38 |
| 9 | Component Diagram | 42 |
| 10 | Deployment Diagram | 45 |
| 11 | Navigation Flow Diagram | 48 |
| 12 | Hardware Architecture Diagram | 50 |

---

\newpage

# CHAPTER 1: INTRODUCTION TO PROJECT DIAGRAMS

---

## 1.1 Purpose of Diagrams

Diagrams are visual representations of a system's structure, behavior, and interactions. In software engineering, diagrams serve as a universal communication tool between developers, stakeholders, and end-users. For the CloudSpace project, diagrams are used to:

1. **Illustrate System Architecture**: Show how the frontend, backend, and cloud services interact.
2. **Model Data Flow**: Trace how data moves through the system from user input to storage and retrieval.
3. **Define User Interactions**: Map out how different user roles interact with system features.
4. **Document Database Structure**: Visualize relationships between database collections.
5. **Describe Workflows**: Detail step-by-step processes like document upload, AI querying, and authentication.
6. **Guide Development**: Provide blueprints for implementation and testing.

## 1.2 Types of Diagrams Used in CloudSpace

The following diagram types are used throughout the CloudSpace project documentation:

| Sr. No. | Diagram Type | UML Category | Purpose in CloudSpace |
|---|---|---|---|
| 1 | System Architecture Diagram | Structural | Shows the three-tier architecture (Frontend, Backend, Cloud Services) |
| 2 | Data Flow Diagram (DFD) | Behavioral | Traces data movement through upload, AI query, and auth processes |
| 3 | Use Case Diagram | Behavioral | Maps actor-system interactions for all user roles |
| 4 | Entity Relationship Diagram | Structural | Models Firestore collections and their relationships |
| 5 | Sequence Diagram | Behavioral | Shows time-ordered interactions for key workflows |
| 6 | Activity Diagram | Behavioral | Flowcharts for document upload, login, and AI query |
| 7 | Class Diagram | Structural | Models backend services, controllers, and frontend components |
| 8 | Component Diagram | Structural | Shows module dependencies in frontend and backend |
| 9 | Deployment Diagram | Structural | Maps software to physical/cloud infrastructure |
| 10 | Navigation Flow Diagram | Behavioral | Illustrates page-to-page navigation in the UI |
| 11 | Hardware Architecture Diagram | Structural | Shows client-server-cloud hardware topology |

## 1.3 Diagram Notation Standards

All diagrams in this documentation follow standard **UML 2.5 (Unified Modeling Language)** notation where applicable. Non-UML diagrams (such as architecture and DFD) follow industry-standard conventions:

- **Rectangles**: Represent entities, processes, or components
- **Arrows**: Indicate data flow or control flow direction
- **Diamonds**: Decision points in activity diagrams
- **Stick Figures**: Actors in use case diagrams
- **Dashed Lines**: Dependencies or optional interactions
- **Cylinders**: Data stores / databases

---

\newpage

# CHAPTER 2: SYSTEM ARCHITECTURE DIAGRAM

---

## 2.1 Diagram Type Description

**Name**: System Architecture Diagram (also called High-Level Architecture Diagram)

**Category**: Structural Diagram

**Purpose**: The System Architecture Diagram provides a bird's-eye view of the entire CloudSpace application, showing all major components and how they communicate with each other. It illustrates the three-tier architecture pattern used in the project.

## 2.2 What This Diagram Shows

- **Presentation Tier**: Angular 19 frontend running on the client's browser
- **Application Tier**: Node.js/Express.js backend server handling business logic
- **Data Tier**: Multiple cloud data stores (Firestore, AWS S3, Pinecone)
- **External Services**: Firebase Auth, OpenAI API, Razorpay Payment Gateway
- **Communication Protocols**: HTTP/HTTPS REST APIs, WebSocket (Socket.IO)

## 2.3 System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              Angular 19 (Standalone Components)                  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │   Auth   │ │ Dashboard │ │Documents │ │  AI Assistant   │  │  │
│  │  │  Pages   │ │   Page    │ │  Manager │ │  Chat Interface │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ Settings │ │  Storage  │ │  Plans & │ │   Admin Panel   │  │  │
│  │  │   Page   │ │ Insights  │ │ Payments │ │   (9 Screens)   │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │       Services Layer (HttpClient, Signals, RxJS)          │  │  │
│  │  │  AuthService | DocumentService | ChatService | AdminSvc   │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTP/HTTPS REST API (Port 5000)
                                │ + WebSocket (Socket.IO)
┌───────────────────────────────▼───────────────────────────────────────┐
│                       SERVER LAYER (Node.js)                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              Node.js + Express.js v5 Backend                    │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  Middleware: Auth | CORS | Helmet | Rate Limit | Upload  │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐    │  │
│  │  │ Controllers  │  │   Services    │  │  Configurations   │    │  │
│  │  │ (9 modules)  │  │ (21 modules)  │  │  (6 modules)      │    │  │
│  │  └──────────────┘  └───────────────┘  └───────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────┬──────────────────┬────────────────────────┘
             │              │                  │
    ┌────────▼──────┐  ┌────▼────────┐  ┌──────▼──────────────┐
    │  Firebase     │  │  AWS S3     │  │  Pinecone + OpenAI  │
    │  Firestore    │  │  Storage    │  │  Vector Search +    │
    │  + Auth       │  │  Bucket     │  │  GPT-4 LLM          │
    └───────────────┘  └─────────────┘  └─────────────────────┘
```

## 2.4 Key Observations

1. **Separation of Concerns**: Each tier has a distinct responsibility — presentation, business logic, and data storage.
2. **Multiple Data Stores**: The system uses three specialized databases (Firestore for metadata, S3 for files, Pinecone for AI vectors).
3. **Stateless Backend**: The Express server is stateless; all state is managed in external services.
4. **Security Layer**: Authentication middleware sits between the client and all protected routes.

---

\newpage

# CHAPTER 3: DATA FLOW DIAGRAMS (DFD)

---

## 3.1 Diagram Type Description

**Name**: Data Flow Diagram (DFD)

**Category**: Behavioral Diagram

**Purpose**: DFDs show how data moves through the CloudSpace system — from user input, through processing, to storage and output. DFDs are presented at multiple levels:

- **Level 0 (Context Diagram)**: Shows the system as a single process with external entities
- **Level 1**: Breaks the system into major sub-processes
- **Level 2**: Details individual sub-processes

## 3.2 Level 0 — Context Diagram

The Context Diagram shows CloudSpace as a single process interacting with all external entities.

```
                    ┌──────────────┐
     Login/         │              │         Auth Token
     Register ────▶ │              │ ◀──── Firebase Auth
                    │              │
     Upload File    │              │         Store File
     ─────────────▶ │  CLOUDSPACE  │ ──────▶ AWS S3
                    │   SYSTEM     │
     AI Question    │              │         Vector Search
     ─────────────▶ │   (P0)      │ ◀─────▶ Pinecone
                    │              │
     Payment ─────▶ │              │         AI Response
                    │              │ ──────▶ OpenAI GPT-4
  ┌──────┐          │              │
  │ User │─────────▶│              │         Payment
  └──────┘          │              │ ──────▶ Razorpay
                    └──────────────┘
  ┌──────┐                │
  │Admin │────────────────┘
  └──────┘
```

**External Entities**: User, Admin, Firebase Auth, AWS S3, Pinecone, OpenAI, Razorpay

## 3.3 Level 1 — Major Processes

```
┌──────┐                                              ┌──────────────┐
│ User │──── Credentials ────▶ P1: Authentication ───▶│ D1: Users    │
└──┬───┘                      │                       └──────────────┘
   │                          ▼ Token
   │                    ┌─────────────┐
   ├──── File ────────▶ │P2: Document │──── File ────▶ D2: AWS S3
   │                    │ Management  │──── Meta ────▶ D3: Documents
   │                    │             │──── Vectors ─▶ D4: Pinecone
   │                    └─────────────┘
   │                    ┌─────────────┐
   ├──── Question ────▶ │P3: AI       │──── Query ──▶ D4: Pinecone
   │                    │ Assistant   │──── Prompt ──▶ OpenAI API
   │                    └─────────────┘
   │                    ┌─────────────┐
   ├──── Share Req ───▶ │P4: Sharing  │──── Record ─▶ D5: Shares
   │                    └─────────────┘
   │                    ┌─────────────┐
   └──── Payment ────▶ │P5: Payments │──── Order ──▶ Razorpay
                        │& Subscript. │──── Sub ────▶ D6: Subscriptions
                        └─────────────┘

┌──────┐                ┌─────────────┐
│Admin │──── Manage ──▶ │P6: Admin    │──── Stats ─▶ D7: Dashboard
└──────┘                │ Management  │──── Logs ──▶ D8: Security Logs
                        └─────────────┘
```

## 3.4 Level 2 — Document Upload Process (P2 Expanded)

```
User                    P2.1           P2.2            P2.3           P2.4
 │                   Validate        Upload to       Extract        Generate
 │── File ──────────▶ File ────────▶  AWS S3  ──────▶ Text  ────────▶ Vectors
 │                   (type,size)     (s3Key)         (content)      (embeddings)
 │                      │                                              │
 │                      │ Fail                                         │
 │ ◀── Error ───────────┘                                              │
 │                                                                     ▼
 │                    P2.6            P2.5                         D4: Pinecone
 │                  Generate        Save Meta                    (user namespace)
 │ ◀── Response ─── Thumbnail ◀──── to Firestore ◀───────────────────┘
                    (async)          (D3: Documents)
```

## 3.5 Level 2 — AI Query Process (P3 Expanded)

```
User                   P3.1           P3.2            P3.3           P3.4
 │                   Check          Vectorize       Search          Build
 │── Question ─────▶ Rate ────────▶ Question ──────▶Pinecone ─────▶Context
 │                   Limit         (OpenAI         (user           (top K
 │                     │            embedding)      namespace)      chunks)
 │                     │ Exceeded                                    │
 │ ◀── Limit Msg ──────┘                                             ▼
 │                                                               P3.5
 │                    P3.7           P3.6                        Generate
 │ ◀── Response ───── Save Chat ◀── Return  ◀─────────────────  Answer
                     (Premium)      Answer                     (GPT-4)
                     (D: Chats)    + Sources
```

## 3.6 Why DFDs Are Used

- **Requirement Validation**: Ensures all data paths from user input to storage are accounted for.
- **Process Decomposition**: Breaks complex features into manageable sub-processes.
- **Security Analysis**: Identifies where data crosses trust boundaries (e.g., token verification).
- **Performance Optimization**: Highlights data-intensive paths (e.g., vector embedding generation).

---

\newpage

# CHAPTER 4: USE CASE DIAGRAM

---

## 4.1 Diagram Type Description

**Name**: Use Case Diagram

**Category**: UML Behavioral Diagram

**Purpose**: Use Case Diagrams identify the actors (users/systems) and the functions (use cases) they can perform within CloudSpace. They define the functional boundary of the system.

## 4.2 Actors

| Actor | Type | Description |
|---|---|---|
| Guest User | Primary | Unauthenticated visitor |
| Free User | Primary | Registered user on Free plan |
| Premium User | Primary | User on Professional or Pro plan |
| Administrator | Primary | System admin |
| Firebase Auth | Secondary | Authentication service |
| AWS S3 | Secondary | File storage service |
| OpenAI API | Secondary | AI generation service |
| Pinecone | Secondary | Vector database service |
| Razorpay | Secondary | Payment gateway |

## 4.3 Use Case Diagram

```
                        ┌─────────────────────────────────────────────┐
                        │            CloudSpace System                │
                        │                                             │
   ┌────────┐           │  ┌───────────────────────────────┐          │
   │ Guest  │──────────▶│  │  UC-01: Register Account      │          │
   │ User   │──────────▶│  │  UC-02: Login                 │          │
   │        │──────────▶│  │  UC-03: Forgot Password       │          │
   └────────┘           │  └───────────────────────────────┘          │
                        │                                             │
   ┌────────┐           │  ┌───────────────────────────────┐          │
   │ Free   │──────────▶│  │  UC-08: Upload Document       │          │
   │ User   │──────────▶│  │  UC-10: View Documents        │          │     ┌──────────┐
   │        │──────────▶│  │  UC-11: Download Document     │──────────┼────▶│ AWS S3   │
   │        │──────────▶│  │  UC-12: Rename Document       │          │     └──────────┘
   │        │──────────▶│  │  UC-20: Search Documents      │          │
   │        │──────────▶│  │  UC-21: Ask AI Question       │──────────┼────▶┌──────────┐
   │        │──────────▶│  │  UC-27: Share Document        │          │     │ OpenAI   │
   │        │──────────▶│  │  UC-33: View Plans            │          │     └──────────┘
   └────────┘           │  └───────────────────────────────┘          │
                        │                                             │
   ┌────────┐           │  ┌───────────────────────────────┐          │     ┌──────────┐
   │Premium │──────────▶│  │  UC-05: Enable MFA            │          │     │ Pinecone │
   │ User   │──────────▶│  │  UC-23: New Chat Session      │──────────┼────▶│          │
   │        │──────────▶│  │  UC-24: View Chat History     │          │     └──────────┘
   │        │──────────▶│  │  UC-26: Delete Chat           │          │
   │        │──────────▶│  │  UC-34: Subscribe to Plan     │──────────┼────▶┌──────────┐
   └────────┘           │  └───────────────────────────────┘          │     │ Razorpay │
                        │                                             │     └──────────┘
   ┌────────┐           │  ┌───────────────────────────────┐          │
   │ Admin  │──────────▶│  │  UC-40: Admin Dashboard       │          │
   │        │──────────▶│  │  UC-41: Manage Users          │          │
   │        │──────────▶│  │  UC-42: Monitor Storage       │          │
   │        │──────────▶│  │  UC-45: View Audit Logs       │          │
   │        │──────────▶│  │  UC-48: View Notifications    │          │
   └────────┘           │  └───────────────────────────────┘          │
                        └─────────────────────────────────────────────┘
```

## 4.4 Use Case Relationships

| Relationship | From | To | Type |
|---|---|---|---|
| Include | UC-08 (Upload) | UC-Validate File | «include» |
| Include | UC-08 (Upload) | UC-Extract Text | «include» |
| Include | UC-21 (AI Query) | UC-Vector Search | «include» |
| Extend | UC-02 (Login) | UC-06 (Verify MFA) | «extend» |
| Generalization | Premium User | Free User | Inherits all Free use cases |

---

\newpage

# CHAPTER 5: ENTITY RELATIONSHIP DIAGRAM (ERD)

---

## 5.1 Diagram Type Description

**Name**: Entity Relationship Diagram (ERD)

**Category**: Structural Diagram

**Purpose**: The ERD models the logical structure of the Firestore database, showing all collections (entities), their attributes, and relationships between them.

## 5.2 ER Diagram

```
  ┌──────────────────┐        1:N        ┌────────────────────┐
  │     USERS        │──────────────────▶│    DOCUMENTS       │
  │──────────────────│                    │────────────────────│
  │ userId (PK)      │                    │ documentId (PK)    │
  │ email            │                    │ userId (FK)        │
  │ displayName      │                    │ fileName           │
  │ plan             │                    │ fileType           │
  │ role             │                    │ fileSize           │
  │ totalStorageUsed │                    │ s3Key              │
  │ aiRequestsUsed   │                    │ status             │
  │ mfaEnabled       │                    │ isFolder           │
  │ createdAt        │                    │ parentFolderId(FK) │
  └──────┬───────────┘                    │ isStarred          │
         │                                │ isTrashed          │
         │ 1:N                            │ uploadedAt         │
         ▼                                └────────┬───────────┘
  ┌──────────────────┐                             │ 1:N
  │  CHATS (sub)     │                             ▼
  │──────────────────│                    ┌────────────────────┐
  │ chatId (PK)      │                    │     SHARES         │
  │ title            │                    │────────────────────│
  │ lastMessage      │                    │ shareId (PK)       │
  │ updatedAt        │                    │ resourceId (FK)    │
  └──────┬───────────┘                    │ ownerUserId (FK)   │
         │ 1:N                            │ recipientEmail     │
         ▼                                │ permission         │
  ┌──────────────────┐                    │ status             │
  │ MESSAGES (sub)   │                    └────────────────────┘
  │──────────────────│
  │ role             │      ┌──────────────────┐    1:1    ┌──────────────────┐
  │ content          │      │     USERS        │──────────▶│  SUBSCRIPTIONS   │
  │ createdAt        │      │                  │           │──────────────────│
  └──────────────────┘      └──────────────────┘           │ userId (FK)      │
                                     │                     │ planId (FK)      │
                                     │ 1:N                 │ status           │
                                     ▼                     │ amount           │
                            ┌──────────────────┐           └──────────────────┘
                            │  NOTIFICATIONS   │
                            │──────────────────│     ┌──────────────────┐
                            │ id (PK)          │     │ SECURITY_LOGS    │
                            │ userId (FK)      │     │──────────────────│
                            │ type             │     │ eventType        │
                            │ message          │     │ userId           │
                            │ read             │     │ email            │
                            │ createdAt        │     │ ipAddress        │
                            └──────────────────┘     │ action           │
                                                     │ timestamp        │
                                                     └──────────────────┘
```

## 5.3 Relationship Summary

| Entity A | Entity B | Cardinality | Description |
|---|---|---|---|
| Users | Documents | 1:N | One user owns many documents |
| Users | Chats | 1:N | One user has many chat sessions (subcollection) |
| Chats | Messages | 1:N | One chat has many messages (sub-subcollection) |
| Documents | Shares | 1:N | One document can be shared with many users |
| Users | Notifications | 1:N | One user receives many notifications |
| Users | Subscriptions | 1:1 | One user has one active subscription |
| Documents | Documents | Self (1:N) | Folders contain documents (parentFolderId) |

---

\newpage

# CHAPTER 6: SEQUENCE DIAGRAMS

---

## 6.1 Diagram Type Description

**Name**: Sequence Diagram

**Category**: UML Behavioral Diagram

**Purpose**: Sequence diagrams show the time-ordered interaction between objects/components for a specific workflow. They illustrate the message-passing sequence for key CloudSpace operations.

## 6.2 Document Upload Sequence

```
 User        Frontend       Backend       Auth MW      S3 Service   Firestore    Pinecone
  │            │              │              │             │            │            │
  │─ Select ──▶│              │              │             │            │            │
  │   File     │              │              │             │            │            │
  │            │── POST ─────▶│              │             │            │            │
  │            │  /upload     │── Verify ──▶│             │            │            │
  │            │  + Token     │   Token      │             │            │            │
  │            │              │◀── Valid ────│             │            │            │
  │            │              │                            │            │            │
  │            │              │── Upload ──────────────────▶│            │            │
  │            │              │              File to S3     │            │            │
  │            │              │◀── s3Key ──────────────────│            │            │
  │            │              │                                         │            │
  │            │              │── Extract Text ──▶ (internal)          │            │
  │            │              │◀── chunks ───────                      │            │
  │            │              │                                         │            │
  │            │              │── Generate Embeddings ──▶ OpenAI       │            │
  │            │              │◀── vectors ─────────────                │            │
  │            │              │                                                      │
  │            │              │── Store Vectors ────────────────────────────────────▶│
  │            │              │◀── confirmed ──────────────────────────────────────│
  │            │              │                                         │            │
  │            │              │── Save Metadata ───────────────────────▶│            │
  │            │              │◀── docId ──────────────────────────────│            │
  │            │              │                                                      │
  │            │◀── 201 ──────│                                                      │
  │◀── Show ──│  Created                                                            │
  │   Success  │                                                                     │
```

## 6.3 AI Query Sequence

```
 User        Frontend       Backend       Pinecone      OpenAI       Firestore
  │            │              │              │              │            │
  │─ Question ▶│              │              │              │            │
  │            │── POST ─────▶│              │              │            │
  │            │  /ai/query   │              │              │            │
  │            │              │── Check ──────────────────────────────▶│
  │            │              │   Rate Limit                           │
  │            │              │◀── Allowed ───────────────────────────│
  │            │              │                                        │
  │            │              │── Embed ──────────────────▶│           │
  │            │              │   Question                  │           │
  │            │              │◀── Vector ────────────────│           │
  │            │              │                                        │
  │            │              │── Search ────▶│                        │
  │            │              │   Namespace   │                        │
  │            │              │◀── Matches ──│                        │
  │            │              │                                        │
  │            │              │── GPT-4 ─────────────────▶│           │
  │            │              │   + Context                 │           │
  │            │              │◀── Answer ───────────────│           │
  │            │              │                                        │
  │            │              │── Save Chat ──────────────────────────▶│
  │            │              │   (Premium)                            │
  │            │              │                                        │
  │            │◀── Response─│                                        │
  │◀── Display│   + Sources                                           │
```

## 6.4 User Login Sequence (with MFA)

```
 User        Frontend      Firebase Auth    Backend       Firestore
  │            │              │                │              │
  │─ Email ──▶│              │                │              │
  │  Password  │              │                │              │
  │            │── signIn ──▶│                │              │
  │            │              │                │              │
  │            │◀── Token ──│                │              │
  │            │              │                │              │
  │            │── POST ──────────────────────▶│              │
  │            │  /auth/sync + Token           │── Verify ──▶│
  │            │              │                │   MFA Status │
  │            │              │                │◀── mfa:true─│
  │            │              │                │              │
  │            │◀── MFA Required ─────────────│              │
  │            │                                              │
  │◀── Show ──│                                              │
  │  MFA Prompt│                                              │
  │            │                                              │
  │─ TOTP ───▶│── POST ──────────────────────▶│              │
  │   Code     │  /mfa/verify                  │── Validate ─▶
  │            │              │                │   TOTP       │
  │            │◀── Success ──────────────────│              │
  │            │                                              │
  │◀── Dash ──│                                              │
  │   Redirect │                                              │
```

## 6.5 Why Sequence Diagrams Are Used

- **Workflow Clarity**: Show exact order of operations for complex multi-service flows
- **Error Identification**: Reveal potential failure points (e.g., token verification, S3 timeout)
- **API Contract**: Define request/response contracts between frontend and backend
- **Integration Testing**: Guide test scenario creation for end-to-end workflows

---

\newpage

# CHAPTER 7: ACTIVITY DIAGRAMS

---

## 7.1 Diagram Type Description

**Name**: Activity Diagram

**Category**: UML Behavioral Diagram

**Purpose**: Activity diagrams show the step-by-step workflow of a process with decision points, parallel activities, and branching logic. They are like enhanced flowcharts.

## 7.2 Document Upload Activity Diagram

```
                    ┌─────────┐
                    │  START  │
                    └────┬────┘
                         ▼
                ┌────────────────┐
                │ User clicks    │
                │ Upload button  │
                └────────┬───────┘
                         ▼
                ┌────────────────┐
                │ Select file(s) │
                │ from device    │
                └────────┬───────┘
                         ▼
                 ◆ Valid file type?
                / \
              Yes   No
              │      │
              │      ▼
              │  ┌──────────────┐
              │  │ Show error:  │
              │  │ "Unsupported"│──────────▶ END
              │  └──────────────┘
              ▼
         ◆ Within size limit?
        / \
      Yes   No
      │      │
      │      ▼
      │  ┌──────────────┐
      │  │ Show error:  │
      │  │ "Exceeds     │──────────▶ END
      │  │  plan limit" │
      │  └──────────────┘
      ▼
  ◆ Storage quota OK?
  / \
Yes   No
│      │
│      ▼
│  ┌──────────────┐
│  │ Show error:  │
│  │ "Quota full" │──────────▶ END
│  └──────────────┘
│
▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Upload to S3   │────▶│ Extract text   │────▶│ Generate       │
│                │     │ content        │     │ embeddings     │
└────────────────┘     └────────────────┘     └───────┬────────┘
                                                      │
                                                      ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Send notif.    │◀────│ Save metadata  │◀────│ Store vectors  │
│ to user        │     │ to Firestore   │     │ in Pinecone    │
└───────┬────────┘     └────────────────┘     └────────────────┘
        │
        │     ║ Parallel (async)
        │     ╠══════════════════╗
        │     ║                  ║
        ▼     ▼                  ▼
┌──────────────┐     ┌────────────────┐
│ Return       │     │ Generate       │
│ response     │     │ thumbnail      │
└──────┬───────┘     └────────────────┘
       ▼
   ┌───────┐
   │  END  │
   └───────┘
```

## 7.3 User Login Activity Diagram

```
                ┌─────────┐
                │  START  │
                └────┬────┘
                     ▼
            ┌────────────────┐
            │ Enter email    │
            │ and password   │
            └────────┬───────┘
                     ▼
             ◆ Valid credentials?
            / \
          Yes   No
          │      │
          │      ▼
          │  ◆ Attempts ≥ 5?
          │  / \
          │Yes   No
          │ │     │
          │ ▼     ▼
          │┌────────┐ ┌─────────────┐
          ││ Lock   │ │ Show error  │
          ││Account │ │ message     │──▶ END
          │└───┬────┘ └─────────────┘
          │    ▼
          │  ┌──────────┐
          │  │Log event │──▶ END
          │  └──────────┘
          ▼
     ◆ MFA Enabled?
    / \
  Yes   No
  │      │
  ▼      │
┌──────────┐  │
│Show MFA  │  │
│ prompt   │  │
└────┬─────┘  │
     ▼        │
◆ Valid TOTP? │
/ \           │
Yes  No       │
│    │        │
│    ▼        │
│ ┌────────┐  │
│ │Error:  │  │
│ │Invalid │──▶ END
│ │code    │  │
│ └────────┘  │
│             │
▼◀────────────┘
┌────────────────┐
│ Sync profile   │
│ to Firestore   │
└────────┬───────┘
         ▼
┌────────────────┐
│ Redirect to    │
│ Dashboard      │
└────────┬───────┘
         ▼
     ┌───────┐
     │  END  │
     └───────┘
```

---

\newpage

# CHAPTER 8: CLASS DIAGRAM

---

## 8.1 Diagram Type Description

**Name**: Class Diagram

**Category**: UML Structural Diagram

**Purpose**: The Class Diagram models the major classes/services in the CloudSpace backend and frontend, showing their attributes, methods, and relationships.

## 8.2 Backend Services Class Diagram

```
┌─────────────────────────┐       ┌──────────────────────────┐
│   AuthController        │       │   DocumentController     │
│─────────────────────────│       │──────────────────────────│
│ + verifyToken()         │       │ + upload()               │
│ + syncProfile()         │       │ + listDocuments()        │
│ + getProfile()          │       │ + download()             │
│ + createTestUser()      │       │ + rename()               │
└────────┬────────────────┘       │ + move()                 │
         │ uses                   │ + copy()                 │
         ▼                        │ + star()                 │
┌─────────────────────────┐       │ + trash()                │
│   FirestoreService      │       │ + delete()               │
│─────────────────────────│       └────────┬─────────────────┘
│ + getUser()             │                │ uses
│ + createUser()          │                ▼
│ + updateUser()          │       ┌──────────────────────────┐
│ + getDocuments()        │       │   S3Service              │
│ + saveDocument()        │       │──────────────────────────│
│ + deleteDocument()      │       │ + uploadFile()           │
│ + getNotifications()    │       │ + deleteFile()           │
│ + createNotification()  │       │ + getSignedUrl()         │
└─────────────────────────┘       └──────────────────────────┘

┌─────────────────────────┐       ┌──────────────────────────┐
│   AIController          │       │   EmbeddingService       │
│─────────────────────────│       │──────────────────────────│
│ + query()               │──────▶│ + generateEmbeddings()   │
│ + getHistory()          │       │ + storeVectors()         │
│ + getMessages()         │       │ + searchSimilar()        │
│ + deleteChat()          │       │ + deleteVectors()        │
└─────────────────────────┘       └──────────────────────────┘

┌─────────────────────────┐       ┌──────────────────────────┐
│   AuthMiddleware        │       │   TextExtractionService  │
│─────────────────────────│       │──────────────────────────│
│ + verifyFirebaseToken() │       │ + extractFromPDF()       │
│ + checkAdminRole()      │       │ + extractFromDOCX()      │
│ + extractUserId()       │       │ + extractFromTXT()       │
└─────────────────────────┘       │ + extractFromImage()     │
                                  └──────────────────────────┘
```

---

\newpage

# CHAPTER 9: COMPONENT DIAGRAM

---

## 9.1 Diagram Type Description

**Name**: Component Diagram

**Category**: UML Structural Diagram

**Purpose**: Shows how the software is divided into components (modules) and the dependencies between them.

## 9.2 Frontend Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Angular 19 Frontend                        │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth    │  │ Dashboard │  │Documents │  │AI Chat   │  │
│  │ Component │  │ Component │  │Component │  │Component │  │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘  │
│        │              │             │              │        │
│        └──────────────┴──────┬──────┴──────────────┘        │
│                              │                              │
│                    ┌─────────▼──────────┐                   │
│                    │   Services Layer   │                   │
│                    │  ┌──────────────┐  │                   │
│                    │  │ AuthService  │  │                   │
│                    │  │ DocService   │  │                   │
│                    │  │ ChatService  │  │                   │
│                    │  │ AdminService │  │                   │
│                    │  │ PlanService  │  │                   │
│                    │  └──────────────┘  │                   │
│                    └─────────┬──────────┘                   │
│                              │                              │
│                    ┌─────────▼──────────┐                   │
│                    │  Guards & Intercpt │                   │
│                    │  AuthGuard         │                   │
│                    │  GuestGuard        │                   │
│                    │  AdminGuard        │                   │
│                    │  AuthInterceptor   │                   │
│                    └────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 9.3 Backend Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 Node.js + Express Backend                     │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Middleware Layer                           │  │
│  │  Auth MW │ CORS │ Helmet │ Rate Limit │ Upload MW     │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────┐  ┌────────▼───┐  ┌──────────────────────────┐  │
│  │ Routes   │──│Controllers │──│      Services            │  │
│  │ (auth)   │  │ (auth)     │  │  ┌──────────────────┐    │  │
│  │ (docs)   │  │ (document) │  │  │ FirestoreService │    │  │
│  │ (ai)     │  │ (ai)       │  │  │ S3Service        │    │  │
│  │ (admin)  │  │ (admin)    │  │  │ EmbeddingService │    │  │
│  │ (mfa)    │  │ (mfa)      │  │  │ ChatService      │    │  │
│  │ (shares) │  │ (payment)  │  │  │ NotificationSvc  │    │  │
│  │ (plans)  │  │            │  │  │ ThumbnailService │    │  │
│  │ (payment)│  │            │  │  │ ShareService     │    │  │
│  └──────────┘  └────────────┘  │  │ DeletionService  │    │  │
│                                │  └──────────────────┘    │  │
│                                └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

\newpage

# CHAPTER 10: DEPLOYMENT DIAGRAM

---

## 10.1 Diagram Type Description

**Name**: Deployment Diagram

**Category**: UML Structural Diagram

**Purpose**: Maps software components to physical/cloud infrastructure, showing where each part of the system runs.

## 10.2 Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICES                                │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Desktop  │  │  Laptop   │  │  Mobile  │  │     Tablet        │   │
│  │ Browser  │  │  Browser  │  │ Browser  │  │    Browser        │   │
│  │(Chrome)  │  │ (Edge)    │  │(Safari)  │  │   (Chrome)        │   │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────────┬──────────┘   │
└───────┼──────────────┼─────────────┼──────────────────┼──────────────┘
        └──────────────┴─────┬───────┴──────────────────┘
                             │ HTTPS (Port 443)
                  ┌──────────▼──────────┐
                  │  APPLICATION SERVER │
                  │  (Node.js/Express)  │
                  │  ─────────────────  │
                  │  OS: Ubuntu 22.04   │
                  │  RAM: 4 GB          │
                  │  CPU: 2 vCPU        │
                  │  ─────────────────  │
                  │  «artifact»         │
                  │  server.js          │
                  │  Angular dist/      │
                  └───┬────┬────┬───────┘
                      │    │    │
          ┌───────────┘    │    └────────────┐
          │                │                 │
┌─────────▼──────┐  ┌─────▼───────┐  ┌──────▼───────────┐
│ «cloud»        │  │ «cloud»     │  │ «cloud»          │
│ Firebase       │  │ AWS S3      │  │ Pinecone         │
│ ────────────── │  │ ──────────  │  │ ──────────────── │
│ Region:        │  │ Region:     │  │ Cloud: AWS       │
│ asia-south1    │  │ ap-south-1  │  │ Dimension: 1536  │
│ ────────────── │  │ ──────────  │  │ ──────────────── │
│ Auth Service   │  │ Bucket:     │  │ Index:           │
│ Firestore DB   │  │ cloudspace- │  │ cloudspace-docs  │
│                │  │ storage     │  │                  │
└────────────────┘  └─────────────┘  └──────────────────┘
                                            │
                                     ┌──────▼───────────┐
                                     │ «cloud»          │
                                     │ OpenAI API       │
                                     │ ──────────────── │
                                     │ GPT-4            │
                                     │ text-embedding-  │
                                     │ 3-small          │
                                     └──────────────────┘
```

---

\newpage

# CHAPTER 11: NAVIGATION FLOW DIAGRAM

---

## 11.1 Diagram Type Description

**Name**: Navigation Flow Diagram (Screen Transition Diagram)

**Category**: Behavioral Diagram

**Purpose**: Shows how users navigate between different pages/screens of the application.

## 11.2 Navigation Flow

```
                        ┌──────────┐
                        │  Login   │◀────────────────────────┐
                        └────┬─────┘                         │
                             │                               │
                 ┌───────────┴───────────┐                   │
                 │                       │                   │
           ┌─────▼──────┐         ┌─────▼───────┐           │
           │ Dashboard  │         │ Admin Panel │           │
           │ (User)     │         │ (Admin)     │           │
           └─────┬──────┘         └──────┬──────┘           │
                 │                       │                   │
     ┌───────┬───┼────────┬──────┐  ┌────┼─────┬──────┐     │
     │       │   │        │      │  │    │     │      │     │
  ┌──▼──┐ ┌──▼──┐│   ┌────▼┐ ┌──▼─┐│ ┌──▼──┐┌─▼───┐┌─▼──┐  │
  │Files│ │Star ││   │Plans│ │Strg││ │Users││Stor.││Audi│  │
  │Mgmt │ │red  ││   │&Pay │ │Ins.││ │Mgmt ││Mon. ││Logs│  │
  └──┬──┘ └─────┘│   └─────┘ └────┘│ └─────┘└─────┘└────┘  │
     │           │                  │                        │
     │      ┌────▼────┐        ┌───▼────┐                   │
     │      │AI Chat  │        │Settings│                   │
     │      └─────────┘        └────┬───┘                   │
     │                              │ Logout                │
     │                              └───────────────────────┘
     ▼
  ┌──────────┐
  │ Shared   │
  │ With Me  │
  │ By Me    │
  │ Trash    │
  └──────────┘
```

---

\newpage

# CHAPTER 12: SUMMARY — DIAGRAM TYPES REFERENCE

---

## 12.1 Complete Diagram Inventory

| # | Diagram Type | UML? | Category | Located In (Main Doc) | Purpose |
|---|---|---|---|---|---|
| 1 | System Architecture | No | Structural | Ch. 3 (Part 1) & Ch. 5 (Part 2) | Overall system design |
| 2 | Context Diagram (DFD L0) | No | Behavioral | Ch. 7 (Part 3) | System boundary with external entities |
| 3 | Level 1 DFD | No | Behavioral | This Document | Major process decomposition |
| 4 | Level 2 DFD (Upload) | No | Behavioral | Ch. 3 (Part 1) | Upload process data flow |
| 5 | Level 2 DFD (AI Query) | No | Behavioral | Ch. 3 (Part 1) | AI query data flow |
| 6 | Use Case Diagram | Yes | Behavioral | Ch. 7 (Part 3) | Actor-system interactions |
| 7 | Entity Relationship Diagram | Yes | Structural | Ch. 8 (Part 4) | Database design |
| 8 | Sequence Diagram (Upload) | Yes | Behavioral | This Document | Upload message flow |
| 9 | Sequence Diagram (AI Query) | Yes | Behavioral | This Document | AI query message flow |
| 10 | Sequence Diagram (Login) | Yes | Behavioral | This Document | Login with MFA flow |
| 11 | Activity Diagram (Upload) | Yes | Behavioral | This Document | Upload workflow with decisions |
| 12 | Activity Diagram (Login) | Yes | Behavioral | This Document | Login workflow with MFA |
| 13 | Class Diagram | Yes | Structural | This Document | Backend service architecture |
| 14 | Component Diagram (FE) | Yes | Structural | This Document | Frontend module dependencies |
| 15 | Component Diagram (BE) | Yes | Structural | This Document | Backend module dependencies |
| 16 | Deployment Diagram | Yes | Structural | This Document | Infrastructure mapping |
| 17 | Navigation Flow Diagram | No | Behavioral | Ch. 10 (Part 6) | UI screen transitions |
| 18 | Hardware Architecture | No | Structural | Ch. 4 (Part 2) | Hardware topology |

## 12.2 Diagram Tools Recommended

| Tool | Type | Best For |
|---|---|---|
| Draw.io (diagrams.net) | Free, Web-based | All diagram types, UML, architecture |
| Lucidchart | Freemium, Web | Professional UML, flowcharts |
| PlantUML | Free, Code-based | Sequence, class, use case diagrams |
| Mermaid.js | Free, Code-based | Flowcharts, sequence, ER diagrams |
| Microsoft Visio | Paid | Enterprise diagrams |
| Figma | Freemium | UI wireframes, navigation flows |

---

**END OF DIAGRAMS DOCUMENTATION**

**CloudSpace — Cloud-Based Document Storage & AI Assistant**
**Version 2.0.0 | March 2026**

---
