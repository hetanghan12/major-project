# 🔐 Firebase Console Setup for MFA (Two-Factor Authentication)

This guide walks you through enabling TOTP MFA (Google Authenticator) in Firebase Console.

---

## Prerequisites

1. **Firebase Blaze Plan** - MFA requires the pay-as-you-go Blaze plan
2. **Existing Firebase project** - Your CloudAI/DocVault project

---

## Step-by-Step Setup

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `cloudai-docvault` or similar)

### Step 2: Navigate to Authentication

1. In the left sidebar, click **Build**
2. Click **Authentication**

![Firebase Auth](https://firebase.google.com/static/images/auth-console.png)

### Step 3: Go to Sign-in Method Tab

1. Click the **Sign-in method** tab at the top
2. Scroll down to find the **Multi-factor authentication** section

### Step 4: Enable TOTP MFA

1. In the **Multi-factor authentication** section, you'll see:
   - SMS (Phone)
   - TOTP (Time-based one-time password)

2. **Click the toggle** next to **TOTP** to enable it

3. A dialog may appear asking you to confirm - click **Enable**

### Step 5: Verify Blaze Plan

If you see a message about upgrading to Blaze:

1. Click **Upgrade** or **Modify plan**
2. Follow the steps to upgrade to Blaze (pay-as-you-go)
3. MFA has minimal cost - typically free within generous limits

### Step 6: (Optional) Configure Enforcement

You can choose to:
- **Disable** - No MFA required
- **Optional** - Users can choose to enable MFA (RECOMMENDED)
- **Mandatory** - All users MUST have MFA

For most apps, **Optional** is recommended so users can choose.

---

## Verification

After enabling, you should see:

```
✅ TOTP - Enabled
```

In the Multi-factor authentication section.

---

## What This Enables

Once enabled in Firebase Console, your app can:

1. **Enroll users in TOTP** - Generate QR codes for authenticator apps
2. **Verify TOTP codes** - Validate 6-digit codes during login
3. **Manage MFA factors** - Allow users to add/remove authenticators

---

## Testing

1. Start your app: `npm run dev` (frontend) and `npm start` (backend)
2. Login to your account
3. Navigate to **Settings → Security** (`/settings/security`)
4. Click **Enable Two-Factor Authentication**
5. Scan the QR code with Google Authenticator
6. Enter the 6-digit code to complete setup

---

## Troubleshooting

### Error: "MFA is not enabled"
- Make sure you've enabled TOTP in Firebase Console
- Verify you're on the Blaze plan

### Error: "multi-factor-auth-required"
- This is NOT an error! It means MFA is working
- The login component should show the code entry screen

### Error: "Invalid verification code"
- Make sure the code hasn't expired (30 seconds)
- Verify the device time is correct (TOTP is time-sensitive)

### Error: "Dimension mismatch" (Pinecone)
- This is unrelated to MFA, but you may see it
- Relates to vector database - check Pinecone setup

---

## Code Changes Summary

The following files were created/modified:

### Backend
- ✅ `backend/controllers/mfa.controller.js` - NEW
- ✅ `backend/routes/mfa.routes.js` - NEW  
- ✅ `backend/server.js` - MODIFIED (added MFA routes)

### Frontend
- ✅ `frontend-angular/src/app/core/services/auth.service.ts` - MODIFIED (added MFA methods)
- ✅ `frontend-angular/src/app/auth/login/login.component.ts` - MODIFIED (MFA verification flow)
- ✅ `frontend-angular/src/app/settings/mfa-setup/mfa-setup.component.ts` - NEW
- ✅ `frontend-angular/src/app/app.routes.ts` - MODIFIED (added /settings/security route)

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/mfa/status` | GET | Get MFA enrollment status |
| `/api/auth/mfa/unenroll/:factorUid` | DELETE | Remove MFA factor |
| `/api/auth/mfa/recovery-status` | GET | Get recovery options |

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENABLING 2FA                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. User goes to /settings/security                            │
│   2. Clicks "Enable Two-Factor Authentication"                  │
│   3. QR Code is displayed                                       │
│   4. User scans with Google Authenticator                       │
│   5. User enters 6-digit code                                   │
│   6. 2FA is enabled! ✅                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     LOGGING IN WITH 2FA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. User enters email + password                               │
│   2. Firebase returns "MFA Required"                            │
│   3. App shows code input screen                                │
│   4. User enters code from authenticator                        │
│   5. Login complete! ✅                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Notes

1. **Never expose TOTP secrets** - They are handled securely by Firebase
2. **Recovery codes** - Consider implementing backup codes for account recovery
3. **Email verification** - Recommended before enabling MFA
4. **Session management** - MFA status is per-session

---

*Created: January 30, 2026*
*For: CloudAI Document Vault*
