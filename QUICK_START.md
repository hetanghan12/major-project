# Quick Reference: AWS S3 Migration

## What Changed?
**File Storage:** Firebase Cloud Storage → AWS S3 ✅
**Everything Else:** No Changes ✅

---

## Files Modified

### New Files
- `backend/config/aws.config.js` - AWS S3 setup
- `AWS_S3_MIGRATION_GUIDE.md` - Full documentation
- `MIGRATION_SUMMARY.md` - Change log

### Updated Files
- `backend/services/storage.service.js` - Now uses AWS S3
- `backend/package.json` - Added AWS SDK
- `backend/server.js` - Initialize AWS on startup
- `backend/.env.example` - Added AWS config
- `README.md` - Updated documentation

---

## Setup (3 Steps)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create AWS S3 Bucket
1. Login: https://console.aws.amazon.com
2. Go to S3 → Create bucket
3. Name: `your-app-documents`
4. Region: `us-east-1`
5. Create

### 3. Get AWS Credentials
1. Go to IAM → Users → Add user
2. Name: `s3-user`
3. Attach policy: `AmazonS3FullAccess`
4. Copy Access Key ID and Secret Key

### 4. Update .env
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-app-documents

# Keep these (unchanged):
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
PINECONE_API_KEY=...
OPENAI_API_KEY=...
```

---

## Test It

```bash
# Start backend
cd backend
npm start

# Should see:
✅ AWS S3 Client initialized successfully
   Region: us-east-1
   Bucket: your-app-documents
✅ Firebase initialized (Auth + Firestore)
✅ Pinecone initialization COMPLETE
```

---

## What's Still Using Firebase?

✅ **Authentication** - Login/signup
✅ **Firestore** - Document metadata
✅ **Auth Tokens** - User verification

## What's Using AWS S3?

⚡ **File Storage** - Actual document files
⚡ **File Downloads** - Signed URLs
⚡ **File Uploads** - Direct to S3

## What's Using Pinecone?

🔍 **Vector Search** - AI embeddings
🔍 **AI Queries** - Document search

---

## Troubleshooting

### "AWS credentials not found"
→ Check `.env` file has all 4 AWS variables

### "Bucket does not exist"
→ Verify bucket name and create it in AWS Console

### "Access Denied"
→ Check IAM user has S3 permissions

### "Module not found: @aws-sdk"
→ Run `npm install` in backend folder

---

## Cost

**Example (100 users, 100GB):**
- Storage: $2.30/month
- Uploads: $0.05/month
- Downloads: $0.02/month
**Total: ~$2.50/month** 💰

---

## Need Help?

📖 **Full Guide:** [AWS_S3_MIGRATION_GUIDE.md](./AWS_S3_MIGRATION_GUIDE.md)
📋 **All Changes:** [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
📚 **AWS Docs:** https://docs.aws.amazon.com/s3/

---

**Status:** ✅ Migration Complete
**Frontend Changes:** ❌ None Required
**API Changes:** ❌ None Required
**Breaking Changes:** ❌ None
