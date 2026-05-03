# 🚀 Project Dependencies Documentation

Welcome to the CloudSpace technical documentation. This guide explains all the external libraries (dependencies) that power your application.

---

## 🧠 Backend Ecosystem (Node.js)
Located in `/backend`, these tools handle the logic, security, and AI features.

### Core Frameworks
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `express` | **API Engine** | The backbone of the backend. It routes user requests to the correct functions. |
| `firebase-admin` | **Identity/DB** | The official tool to communicate with Google Firebase for Authentication and Firestore. |
| `socket.io` | **Live Sync** | Powers real-time features like live upload progress and notifications. |

### AI & Search
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `openai` | **AI Brain** | Connects to GPT models to provide the "Ask AI" assistant functionality. |
| `@pinecone-database` | **Memory Retrieval** | Stores "vectors" of your documents so the AI can search through them semantically. |
| `tesseract.js` | **Image Reader** | Optical Character Recognition (OCR) to read text inside uploaded images. |

### File Processing & Storage
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `@aws-sdk/client-s3` | **Cloud Storage** | Securely uploads and streams files to Amazon S3 buckets. |
| `pdf-parse` | **PDF Reader** | Extracts text from PDF files for AI analysis. |
| `mammoth` | **Word Reader** | High-fidelity text extraction from `.docx` files. |
| `multer` | **File Reception** | Handles incoming file uploads from the website. |

### Security & Fintech
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `razorpay` | **Payments** | Integrates the payment gateway for subscription upgrades. |
| `speakeasy` | **2FA Logic** | Generates the secret keys for Two-Factor Authentication. |
| `qrcode` | **2FA QR Codes** | Generates the scanable QR codes for Google Authenticator setup. |
| `helmet` | **Shield** | Automatically configures secure HTTP headers to protect against hackers. |
| `express-rate-limit`| **Flood Gate** | Prevents bots from attacking the server by limiting request frequency. |

---

## 🎨 Frontend Ecosystem (Angular)
Located in `/frontend-angular`, these tools create the user experience.

### Core Framework
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `@angular/*` | **The Engine** | The complete suite of Angular libraries for building a modern web app. |
| `@angular/fire` | **Firebase Bridge**| Connects the website to Firebase for real-time login and state sync. |

### UI & Visualization
| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| `chart.js` | **Charts** | The library used to draw the Storage Usage donut charts. |
| `ng2-charts` | **Angular Charts** | A wrapper that makes Chart.js work seamlessly with Angular. |
| `tailwindcss` | **Styles** | Used for the modern, premium look and mobile responsiveness. |
| `marked` | **Markdown** | Makes AI responses look beautiful (adds bold, lists, and code blocks). |
| `xlsx` | **Excel Preview** | Parses spreadsheet data so users can view Excel files on the site. |

---

## 🛠️ Development Tools
Used during the building phase to keep things organized.

*   `nodemon`: Restarts the server automatically on code changes.
*   `typescript`: Adds "typing" to JavaScript to prevent coding mistakes.
*   `dotenv`: Safely loads your API keys from the `.env` file.

---

### 📘 Summary
Your project is built with **Modern Industry Standards**. By using these verified libraries, the application remains fast, secure, and highly scalable for thousands of users.
