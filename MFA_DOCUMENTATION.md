# Custom Multi-Factor Authentication (MFA) Implementation

## Overview
This document explains the custom Two-Factor Authentication (2FA/MFA) system implemented for the **CloudAI Smart Storage** project. 

By default, Firebase puts their robust Multi-Factor Authentication feature (Firebase Identity Platform) behind a paid tier (Blaze plan) and requires complex Google Cloud Console setup. To avoid billing issues and keep the project independent, we built a **100% free, custom Time-Based One-Time Password (TOTP) system from scratch** using Node.js and Firestore.

---

## How It Works

The custom MFA flow relies on an industry-standard cryptographic algorithm called **TOTP (Time-Based One-Time Password)**. This is the exact same underlying technology used by major services like Google, GitHub, and banks.

### 1. The Setup Phase (Generating the Secret)
When a user clicks **"Enable Two-Factor Authentication"** in their Settings, the following happens:
1. The Angular frontend makes a secure `POST` request to the backend (`/api/auth/mfa/setup`).
2. The Node.js server uses the `speakeasy` library to generate a mathematically unique, secure "secret key" for that specific user.
3. The server uses the `qrcode` library to encode this secret key into a scannable QR image.
4. The QR image and the raw secret are returned to the frontend.

### 2. The Verification Phase (Enabling MFA)
Before we permanently lock the user's account with MFA, we must prove they successfully scanned the code:
1. The user opens an Authenticator App (see list below) and scans the QR code. The app begins generating a new 6-digit number every 30 seconds.
2. The user types the current 6-digit number into the website.
3. The frontend sends this number, along with the secret key, back to the server (`/api/auth/mfa/verify-setup`).
4. `speakeasy` on the backend checks if the 6-digit number mathematically matches the secret key at the current exact timestamp.
5. If it matches, the backend updates the user's Firestore document in the `users` table:
   ```json
   {
     "settings": {
       "mfaEnabled": true,
       "mfaSecret": "BASE32_ENCODED_SECRET"
     }
   }
   ```

### 3. The Login Intercept Flow 
When a user attempts to log in in the future:
1. The user enters their Email and Password. Firebase validates these credentials.
2. **The Intercept**: Before the Angular app actually logs the user into the dashboard, it forcefully pauses the login flow (`_mfaPending = true`).
3. The frontend asks the backend (`/api/auth/mfa/status`): "Does this user have `mfaEnabled` set to true in Firestore?"
4. If yes, the UI shifts to the 2FA Verification Screen, demanding the 6-digit code.
5. The user types the code from their phone.
6. The frontend sends it to `/api/auth/mfa/verify-login`.
7. The backend retrieves the `mfaSecret` from Firestore, runs the math against the provided 6-digit code, and returns `success: true`.
8. The frontend officially unlocks the dashboard and grants the user access to their secure files.

---

## What Apps Can Users Use?

Because this system complies with the open standard **RFC 6238** for TOTP algorithms, users are not forced into a specific ecosystem. They can use *any* authenticator app available on iOS, Android, macOS, or Windows.

**Highly Recommended Apps:**
* **Google Authenticator** (iOS / Android) - The industry standard, simple and reliable.
* **Microsoft Authenticator** (iOS / Android) - Excellent enterprise-grade app with cloud backups.
* **Authy** (iOS / Android / Desktop) - Great for users who want their 2FA codes synced across multiple devices securely.
* **Bitwarden / 1Password** - Many modern password managers have built-in TOTP authenticators, meaning the user doesn't even need to pick up their phone to log in.

*Note: This system does NOT rely on SMS text messages, which are highly susceptible to SIM-swapping attacks. App-based TOTP is significantly more secure.*

---

## Technical Stack Used
* **Backend Framework:** Node.js (Express)
* **Database:** Firebase Firestore (NoSQL)
* **Auth Core:** Firebase Authentication (Email/Password layer)
* **MFA Cryptography:** `speakeasy` (npm package)
* **QR Generation:** `qrcode` (npm package)
* **Frontend:** Angular 18 with Reactive Signals
