# Multi-Factor Authentication (MFA) Guide

## 1. Is MFA already implemented?
**YES.** Your project already has full support for Multi-Factor Authentication using **TOTP (Time-based One-Time Password)**. This means users can secure their accounts using apps like **Google Authenticator** or **Microsoft Authenticator**.

### Implemented Features:
- **Frontend Code:** `AuthService` handles TOTP enrollment (QR code generation) and verification.
- **Login UI:** `LoginComponent` detects when MFA is required and shows a specific verification screen.
- **Backend:** Routes exist to manage MFA status (`/api/auth/mfa/status`).

---

## 2. Is it Free?
**YES, it is free for most use cases.**

- **Cost:** $0.00 / month (Free Tier)
- **Limit:** Up to **50,000 Monthly Active Users (MAUs)** for free.
- **Service:** This uses **Firebase Identity Platform**.
- **Note:** Unlike SMS-based MFA (which costs money per text message), **Authenticator App (TOTP)** MFA is free because it doesn't utilize phone networks.

---

## 3. How to Enable MFA in Firebase Console (REQUIRED)
Even though the code is written, **you must enable MFA in your Firebase Console** for it to work.

### Step 1: Upgrade to Identity Platform
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication**.
3. If you see a banner saying "Upgrade to Identity Platform", click **Upgrade**. (It is still free for the first 50k users).
   - *Note: You might need to link a billing account (credit card) to enable Identity Platform, even if you never exceed the free tier.*

### Step 2: Enable TOTP (Authenticator App)
1. In **Authentication**, go to the **Sign-in method** tab.
2. Click on **Add new provider** (or looking for "Multi-factor authentication" settings).
3. Select **TOTP (Authenticator App)**.
4. **Enable** it and save.

---

## 4. How Users Use It (User Flow)
1. **Registration:** A user registers/logs in normally.
2. **Profile Settings:** The user goes to their Profile/Settings page (you may need to ensure this button exists in your UI).
3. **Enable 2FA:** The user clicks "Enable Two-Factor Authentication".
4. **Scan QR:** The app shows a QR code. The user scans it with their phone app.
5. **Verify:** The user enters the 6-digit code to confirm.
6. **Login:** Next time they log in on a new device, they will be asked for the code.
