# Production Deployment Checklist

## Backend

- Copy `backend/.env.example` to `backend/.env` and fill all required secrets.
- Set `NODE_ENV=production`.
- Set `ALLOWED_ORIGINS` to the exact frontend domains.
- Set `STATUS_ENDPOINT_TOKEN` and `N8N_WEBHOOK_SECRET` to strong random values.
- Set real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- Ensure the Firebase service account file exists at the configured path.
- Verify S3, Pinecone, and OpenAI credentials before startup.

## Frontend

- Update [environment.prod.ts](E:/end%20last/frontend-angular/src/environments/environment.prod.ts:1) with the real production API URL.
- Build with `npm run build`.
- Serve only the contents of `frontend-angular/dist/frontend-angular/browser` behind HTTPS.

## Verification

- Test login, registration, MFA, upload, download, share, preview, admin, and payment flows.
- Verify webhook requests include `X-Webhook-Secret`.
- Verify `/api/status` is inaccessible without `X-Status-Token` in production.
- Confirm browser requests from non-allowed origins are blocked.
- Confirm rate limiting triggers under repeated requests.

## Cleanup

- Delete any legacy demo/test users that were created previously.
- Rotate any credentials that were ever exposed in development or commits.
- Keep `.env`, service-account JSON, and build artifacts out of version control.
