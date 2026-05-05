/**
 * Cloud Space - Document Storage Backend Server
 * ==============================================
 * Express.js backend with LOCAL storage + Pinecone vectors.
 * 
 * PRODUCTION-HARDENED Pinecone Integration:
 * - Index existence verification
 * - Dimension matching validation
 * - Post-insert verification
 * - Fail-loud error handling
 * 
 * @author College Project
 * @version 4.0.0 (Pinecone FIXED)
 */

require('dotenv').config();
const dns = require('dns');

// Fix for Pinecone/AWS connection timeouts in some Node.js environments
// Forces Node.js to prefer IPv4 over IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const crypto = require('crypto');
const { Pinecone } = require('@pinecone-database/pinecone');

// Text extraction libraries
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Firebase initialization (needed for auth and Firestore)
const { initializeFirebase } = require('./config/firebase.config');

// AWS S3 initialization (for file storage)
const { initializeAWS } = require('./config/aws.config');

// Auth Routes
const authRoutes = require('./routes/auth.routes');

// AI Routes
const aiRoutes = require('./routes/ai.routes');

// SECURE Document Routes (multi-tenant isolated)
const secureDocumentRoutes = require('./routes/secure-document.routes');

// Storage Routes - Real-time storage tracking and upload progress
const storageRoutes = require('./routes/storage.routes');

// XLSX Preview Routes - Spreadsheet preview serving
const xlsxPreviewRoutes = require('./routes/xlsx-preview.routes');

// MFA Routes - Two-Factor Authentication with Google Authenticator
const mfaRoutes = require('./routes/mfa.routes');

// Settings Routes
const settingsRoutes = require('./routes/settings.routes');

// Share Routes - File/folder sharing
const shareRoutes = require('./routes/share.routes');

// Subscription Plans Routes
const plansRoutes = require('./routes/plans.routes');

// Admin Routes
const adminRoutes = require('./routes/admin.routes');

// N8N AI Webhook Routes
const n8nRoutes = require('./routes/n8n.routes');

// Analytics & Tracking Routes
const analyticsRoutes = require('./routes/analytics.routes');

// Notification Routes
const notificationRoutes = require('./routes/notification.routes');
const {
  verifyFirebaseToken,
  isAdmin,
  isAdminUser
} = require('./middlewares/auth.middleware');


// Error handler middleware
const { errorHandler } = require('./middlewares/error.middleware');

// Initialize Firebase IMMEDIATELY (required for auth and Firestore)
try {
  initializeFirebase();
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('\n❌ FATAL: Firebase initialization failed');
  console.error(`   ${error.message}\n`);
  process.exit(1);
}

// Create Express app
const app = express();

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const isProduction = process.env.NODE_ENV === 'production';
let httpServer = null;
let trashCleanupInterval = null;
let trashCleanupTimeout = null;
let thumbnailRecoveryTimeout = null;
let isShuttingDown = false;

function parseAllowedOrigins() {
  const defaults = isProduction ? [] : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:5000'];
  const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  return [...defaults, ...envOrigins];
}

const allowedOrigins = parseAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) return true; // Allow non-browser requests (like status checks)
  
  // 1. Direct match from ALLOWED_ORIGINS env or defaults
  if (allowedOrigins.includes(origin)) return true;

  // 2. Allow Vercel preview and production domains
  if (origin.endsWith('.vercel.app') || origin.includes('vercel.app')) {
    console.log(`✅ CORS: Allowed Vercel origin: ${origin}`);
    return true;
  }

  return false;
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('✅ Created uploads directory:', UPLOADS_DIR);
}

// =============================================================================
// PINECONE SETUP - PRODUCTION HARDENED
// =============================================================================

let pineconeClient = null;
let pineconeIndex = null;
let indexDimension = null;
let pineconeReady = false;

/**
 * Initialize Pinecone with FULL VERIFICATION
 * - Checks API key
 * - Verifies index exists
 * - Validates index is ready
 * - Gets index dimension for validation
 */
async function initializePinecone() {
  console.log('\n🔄 Initializing Pinecone...');

  // Check 1: API Key exists
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    console.error('   Add to .env: PINECONE_API_KEY=your_key_here');
    return false;
  }
  console.log('✅ API Key: Found');

  // Check 2: Index name exists
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    console.error('❌ PINECONE_INDEX_NAME not found in environment variables');
    console.error('   Add to .env: PINECONE_INDEX_NAME=your_index_name');
    return false;
  }
  console.log(`✅ Index Name: ${indexName}`);

  try {
    // Initialize Pinecone client
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    console.log('✅ Pinecone client created');

    // Check 3: List indexes to verify connection and find our index
    const indexList = await pineconeClient.listIndexes();
    console.log(`✅ Connected to Pinecone. Found ${indexList.indexes?.length || 0} indexes`);

    // Check if our index exists
    const ourIndex = indexList.indexes?.find(idx => idx.name === indexName);
    if (!ourIndex) {
      console.error(`❌ Index "${indexName}" NOT FOUND in your Pinecone account`);
      console.error('   Available indexes:', indexList.indexes?.map(i => i.name).join(', ') || 'none');
      console.error('   Please create the index in Pinecone dashboard first!');
      return false;
    }
    console.log(`✅ Index "${indexName}" exists`);

    // Check 4: Get index details
    const indexDescription = await pineconeClient.describeIndex(indexName);
    console.log(`✅ Index status: ${indexDescription.status?.state || 'unknown'}`);

    // Check 5: Verify index is ready
    if (indexDescription.status?.state !== 'Ready') {
      console.error(`❌ Index is not ready. Current state: ${indexDescription.status?.state}`);
      console.error('   Wait for index to be fully initialized');
      return false;
    }

    // Check 6: Get dimension
    indexDimension = indexDescription.dimension;
    console.log(`✅ Index dimension: ${indexDimension}`);

    // Get the index reference
    pineconeIndex = pineconeClient.index(indexName);

    // Check 7: Get current vector count
    const stats = await pineconeIndex.describeIndexStats();
    console.log(`✅ Current vectors in index: ${stats.totalVectorCount || 0}`);

    pineconeReady = true;
    console.log('✅ Pinecone initialization COMPLETE\n');
    return true;

  } catch (error) {
    console.error('❌ Pinecone initialization FAILED:', error.message);
    console.error('   Full error:', error);
    pineconeReady = false;
    return false;
  }
}

// =============================================================================
// OPENAI EMBEDDINGS (REQUIRED FOR REAL SEMANTIC SEARCH)
// =============================================================================

const OpenAI = require('openai');
let openaiClient = null;

function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not found - using simple embeddings (less accurate)');
    return false;
  }

  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI initialized for embeddings');
  return true;
}

/**
 * Generate embedding using OpenAI text-embedding-3-large (3072 dims)
 * CRITICAL: Must match Pinecone index dimension!
 */
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EXPECTED_EMBEDDING_DIM = 3072;

async function generateEmbedding(text) {
  if (openaiClient) {
    try {
      // Truncate text to avoid token limits
      const truncatedText = text.substring(0, 25000);

      const response = await openaiClient.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedText
      });

      const embedding = response.data[0].embedding;

      // CRITICAL: Verify dimension
      if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
        throw new Error(`DIMENSION MISMATCH: Got ${embedding.length}, expected ${EXPECTED_EMBEDDING_DIM}`);
      }

      console.log(`   ✅ Embedding generated: ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      console.error('❌ OpenAI embedding error:', error.message);
      throw error; // Don't fallback - fail loudly!
    }
  }

  // No OpenAI client - throw error instead of using fallback
  throw new Error('OpenAI API key not configured - cannot generate embeddings');
}

/**
 * Generate a simple hash-based embedding
 * WARNING: This is NOT semantic - only for testing without OpenAI
 */
function generateSimpleEmbedding(text, dimensions) {
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalizedText.split(/\s+/).filter(w => w.length > 0);

  const embedding = new Array(dimensions).fill(0);

  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const position = (charCode * (i + 1) * (wordIndex + 1)) % dimensions;
      embedding[position] += 1 / (words.length || 1);
    }
  });

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
  return embedding.map(val => val / magnitude);
}

// =============================================================================
// TEXT EXTRACTION
// =============================================================================

async function extractText(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text.trim();
    }

    if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    }

    if (mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }

    return '';
  } catch (error) {
    console.error('❌ Text extraction error:', error.message);
    return '';
  }
}

/**
 * Chunk text into smaller pieces
 */
function chunkText(text, chunkSize = 500) {
  if (!text || text.length === 0) return [];

  const chunks = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';

  sentences.forEach(sentence => {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.substring(0, chunkSize)];
}

// =============================================================================
// PINECONE OPERATIONS - WITH FULL VERIFICATION
// =============================================================================

/**
 * Store document vectors in Pinecone with VERIFICATION
 */
async function storeInPinecone(documentId, fileName, text) {
  console.log(`\n📊 PINECONE UPSERT: Starting for "${fileName}"`);

  // Pre-flight checks
  if (!pineconeReady) {
    console.error('❌ ABORT: Pinecone not ready');
    return { success: false, vectorCount: 0, error: 'Pinecone not initialized' };
  }

  if (!text || text.trim().length === 0) {
    console.error('❌ ABORT: No text to vectorize');
    return { success: false, vectorCount: 0, error: 'No text content' };
  }

  if (!indexDimension) {
    console.error('❌ ABORT: Index dimension unknown');
    return { success: false, vectorCount: 0, error: 'Index dimension not set' };
  }

  try {
    // Get stats BEFORE insert
    const statsBefore = await pineconeIndex.describeIndexStats();
    const vectorsBefore = statsBefore.totalVectorCount || 0;
    console.log(`📈 Vectors BEFORE insert: ${vectorsBefore}`);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`📄 Created ${chunks.length} text chunks`);

    if (chunks.length === 0) {
      console.error('❌ ABORT: No chunks created');
      return { success: false, vectorCount: 0, error: 'No chunks created' };
    }

    // Generate vectors
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      // CRITICAL: Verify dimension matches
      if (embedding.length !== indexDimension) {
        console.error(`❌ DIMENSION MISMATCH! Embedding: ${embedding.length}, Index: ${indexDimension}`);
        throw new Error(`Dimension mismatch: embedding=${embedding.length}, index=${indexDimension}`);
      }

      // Create unique ID
      const vectorId = `doc_${documentId}_chunk_${i}_${Date.now()}`;

      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          documentId: String(documentId),
          fileName: String(fileName),
          chunkIndex: i,
          text: chunk.substring(0, 1000),
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`🧮 Generated ${vectors.length} vectors (dimension: ${indexDimension})`);

    if (vectors.length === 0) {
      console.error('❌ ABORT: No vectors generated');
      return { success: false, vectorCount: 0, error: 'No vectors generated' };
    }

    // Upsert in batches
    const batchSize = 100;
    let upsertedCount = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`📤 Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} (${batch.length} vectors)`);

      const upsertResponse = await pineconeIndex.upsert(batch);
      console.log(`   Response:`, JSON.stringify(upsertResponse || 'no response'));
      upsertedCount += batch.length;
    }

    // CRITICAL: Wait for eventual consistency
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get stats AFTER insert
    const statsAfter = await pineconeIndex.describeIndexStats();
    const vectorsAfter = statsAfter.totalVectorCount || 0;
    console.log(`📈 Vectors AFTER insert: ${vectorsAfter}`);

    // VERIFICATION: Check if vectors actually increased
    const actuallyInserted = vectorsAfter - vectorsBefore;
    console.log(`✅ VERIFICATION: ${actuallyInserted} new vectors in index`);

    if (actuallyInserted === 0 && vectorsBefore === vectorsAfter) {
      console.error('⚠️  WARNING: Vector count did not increase. Possible issues:');
      console.error('   - Vectors may be queued (check again in 30 seconds)');
      console.error('   - IDs may be duplicates (overwriting existing)');
      console.error('   - Index may be in read-only mode');
    }

    console.log(`✅ PINECONE UPSERT COMPLETE: ${upsertedCount} vectors stored\n`);

    return {
      success: true,
      vectorCount: upsertedCount,
      vectorsBefore,
      vectorsAfter,
      actuallyInserted
    };

  } catch (error) {
    console.error('❌ PINECONE UPSERT FAILED:', error.message);
    console.error('   Stack:', error.stack);
    return {
      success: false,
      vectorCount: 0,
      error: error.message
    };
  }
}

/**
 * Search Pinecone for similar documents
 */
async function searchPinecone(query, topK = 5) {
  if (!pineconeReady) {
    console.error('❌ Search failed: Pinecone not ready');
    return [];
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    if (queryEmbedding.length !== indexDimension) {
      throw new Error(`Query dimension mismatch: ${queryEmbedding.length} vs ${indexDimension}`);
    }

    const results = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });

    console.log(`🔍 Search found ${results.matches?.length || 0} results`);
    return results.matches || [];

  } catch (error) {
    console.error('❌ Pinecone search error:', error.message);
    return [];
  }
}

/**
 * Delete document vectors from Pinecone
 */
async function deleteFromPinecone(documentId) {
  if (!pineconeReady) return;

  try {
    await pineconeIndex.deleteMany({
      filter: { documentId: { $eq: String(documentId) } }
    });
    console.log(`🗑️ Deleted vectors for document: ${documentId}`);
  } catch (error) {
    console.error('❌ Pinecone delete error:', error.message);
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Request Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Response Compression
app.use(compression());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept', 'X-Webhook-Secret', 'X-Status-Token'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Files served via authenticated routes in secure-document.routes.js
// Static uploads directory disabled for security

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Root Route - Easy Browser Check
 */
app.get('/', (req, res) => {
  res.send('<h1>✅ Cloud Space Server is RUNNING</h1><p>Go to <a href="/api/status">/api/status</a> for diagnostics.</p>');
});

/**
 * Comprehensive System Diagnostics
 */
app.get('/api/status', async (req, res) => {
  const statusToken = process.env.STATUS_ENDPOINT_TOKEN;
  const providedToken = req.headers['x-status-token'];

  if (isProduction && (!statusToken || !providedToken)) {
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  if (isProduction && statusToken) {
    try {
      const a = Buffer.from(String(providedToken), 'utf-8');
      const b = Buffer.from(String(statusToken), 'utf-8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(404).json({
          success: false,
          message: 'Not found'
        });
      }
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
  }

  const report = {
    success: true,
    timestamp: new Date().toISOString(),
    server: {
      status: 'online',
      port: PORT,
      uptime: process.uptime()
    },
    cors: isProduction ? 'restricted' : 'development-open',
    services: {}
  };

  // 1. Firebase Check
  try {
    const { getAuth } = require('./config/firebase.config');
    const auth = getAuth();
    // Just check if auth object exists and has verifyIdToken
    if (auth && typeof auth.verifyIdToken === 'function') {
      report.services.firebase = { status: 'connected', verified: true };
    } else {
      report.services.firebase = { status: 'error', error: 'Auth object invalid' };
    }
  } catch (e) {
    report.services.firebase = { status: 'error', error: e.message };
  }

  // 2. AWS S3 Check
  try {
    const { getS3Client, getBucketName } = require('./config/aws.config');
    const { HeadBucketCommand } = require('@aws-sdk/client-s3');
    const s3 = getS3Client();
    const bucketName = getBucketName();

    // Check specific bucket access instead of listing all buckets
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));

    report.services.aws_s3 = {
      status: 'connected',
      verified: true,
      bucket: bucketName
    };
  } catch (e) {
    report.services.aws_s3 = { status: 'error', error: e.message };
  }

  // 3. Pinecone Check
  try {
    let vectorCount = 0;
    if (pineconeReady) {
      const stats = await pineconeIndex.describeIndexStats();
      vectorCount = stats.totalVectorCount || 0;
    }
    report.services.pinecone = {
      ready: pineconeReady,
      index: process.env.PINECONE_INDEX_NAME,
      dimension: indexDimension,
      vectorCount
    };
  } catch (e) {
    report.services.pinecone = { status: 'error', error: e.message };
  }

  // 4. OpenAI Check
  report.services.openai = {
    configured: !!openaiClient,
    model: EMBEDDING_MODEL
  };

  // 5. DOCUMENT THUMBNAIL DIAGNOSTIC
  try {
      const { getDownloadUrl } = require('./services/s3.service');
      const testSign = await getDownloadUrl('test/diagnostic.png', 60);
      report.services.thumbnail_signing = {
          status: 'working',
          test_url: testSign.substring(0, 50) + '...'
      };
  } catch (e) {
      report.services.thumbnail_signing = { status: 'error', error: e.message };
  }

  res.json(report);
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// =============================================================================
// ❌❌❌ INSECURE ROUTES - DISABLED FOR SECURITY ❌❌❌
// =============================================================================
// 
// The following routes have been DISABLED because they:
// 1. Have NO authentication
// 2. Store all files in a SHARED directory (no user isolation)
// 3. Allow ANY user to see ALL documents (cross-user data leakage)
// 4. Store vectors in default namespace (no AI isolation)
// 
// USE SECURE ROUTES INSTEAD: /api/secure/documents/*
// 
// =============================================================================

// ❌ DISABLED: app.post('/upload', ...)
// ❌ DISABLED: app.post('/api/documents/upload', ...)
// ❌ DISABLED: app.get('/api/documents', ...)
// ❌ DISABLED: app.delete('/api/documents/:filename', ...)

// SECURITY: Redirect insecure endpoints to error response
app.post('/upload', (req, res) => {
  console.error('🚨 SECURITY: Blocked access to insecure /upload endpoint');
  res.status(403).json({
    success: false,
    message: 'This endpoint is disabled for security. Use /api/secure/documents/upload instead.',
    secureEndpoint: '/api/secure/documents/upload'
  });
});

app.post('/api/documents/upload', (req, res) => {
  console.error('🚨 SECURITY: Blocked access to insecure /api/documents/upload endpoint');
  res.status(403).json({
    success: false,
    message: 'This endpoint is disabled for security. Use /api/secure/documents/upload instead.',
    secureEndpoint: '/api/secure/documents/upload'
  });
});

app.get('/api/documents', (req, res) => {
  console.error('🚨 SECURITY: Blocked access to insecure /api/documents endpoint');
  res.status(403).json({
    success: false,
    message: 'This endpoint is disabled for security. Use /api/secure/documents instead.',
    secureEndpoint: '/api/secure/documents'
  });
});

app.delete('/api/documents/:filename', (req, res) => {
  console.error('🚨 SECURITY: Blocked access to insecure DELETE endpoint');
  res.status(403).json({
    success: false,
    message: 'This endpoint is disabled for security. Use /api/secure/documents/:id instead.',
    secureEndpoint: '/api/secure/documents/:id'
  });
});

// SECURITY: Disable insecure search that doesn't filter by user
app.post('/api/search', (req, res) => {
  console.error('🚨 SECURITY: Blocked access to insecure /api/search endpoint');
  res.status(403).json({
    success: false,
    message: 'This endpoint is disabled for security. Use /api/ai/query instead for user-scoped AI search.',
    secureEndpoint: '/api/ai/query'
  });
});

// Pinecone stats endpoint - shows all namespaces (user isolation proof)
app.get('/api/pinecone/stats', verifyFirebaseToken, isAdmin, async (req, res) => {
  if (!pineconeReady) {
    return res.status(503).json({ success: false, message: 'Pinecone not ready' });
  }
  try {
    const stats = await pineconeIndex.describeIndexStats();

    // Extract namespace information to show user isolation
    const namespaces = Object.entries(stats.namespaces || {}).map(([name, data]) => ({
      namespace: name,
      vectorCount: data.vectorCount || 0
    }));

    res.json({
      success: true,
      stats: {
        totalVectorCount: stats.totalVectorCount || 0,
        dimension: stats.dimension,
        namespaceCount: namespaces.length,
        namespaces: namespaces
      },
      message: 'Each namespace represents an isolated user - no cross-user data access possible'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Auth Routes - user authentication, token verification, sync
app.use('/api/auth', authRoutes);

// AI Routes - for AI-powered document querying
app.use('/api/ai', aiRoutes);

// =============================================================================
// SECURE DOCUMENT ROUTES (PRODUCTION - USE THESE)
// =============================================================================
// 
// ✅ These routes enforce:
//    - Firebase token authentication on ALL requests
//    - User isolation (userId from verified token only)
//    - User-scoped file storage (storage/users/{userId}/documents/)
//    - Pinecone namespace isolation (namespace = userId)
//    - Ownership verification on get/delete operations
//
// Endpoints:
//    POST   /api/secure/documents/upload     - Upload with auth
//    GET    /api/secure/documents            - List user's documents only
//    GET    /api/secure/documents/:id        - Get document (ownership verified)
//    GET    /api/secure/documents/:id/download - Download (ownership verified)
//    DELETE /api/secure/documents/:id        - Delete (ownership verified)
//
app.use('/api/secure/documents', secureDocumentRoutes);

// =============================================================================
// SHARE ROUTES (FILE/FOLDER SHARING)
// =============================================================================
//
// Endpoints:
//    POST   /api/secure/shares              - Create share(s)
//    GET    /api/secure/shares/with-me      - Files shared with user
//    GET    /api/secure/shares/by-me        - Files user shared
//    GET    /api/secure/shares/resource/:id - All shares for a resource
//    PATCH  /api/secure/shares/:id/permission - Change permission
//    PATCH  /api/secure/shares/:id/revoke   - Revoke a share
//    DELETE /api/secure/shares/resource/:id - Stop sharing (revoke all)
//
app.use('/api/secure/shares', shareRoutes);

// =============================================================================
// STORAGE & UPLOAD PROGRESS ROUTES
// =============================================================================
//
// Endpoints:
//    GET  /api/storage/stats          - Get user's storage statistics (REAL from DB)
//    GET  /api/storage/breakdown      - Get storage breakdown by file type
//    GET  /api/storage/quota/check    - Check if user can upload a file
//    POST /api/storage/initialize     - Initialize user storage on login
//    GET  /api/upload/progress/:id    - SSE endpoint for real-time upload progress
//    GET  /api/upload/active          - Get all active uploads for user
//
app.use('/api', storageRoutes);

// =============================================================================
// XLSX PREVIEW ROUTES (SPREADSHEET VIEWER)
// =============================================================================
//
// Endpoints:
//    GET  /api/xlsx/preview/:documentId    - Serve interactive HTML preview
//    GET  /api/xlsx/sheets/:documentId     - Get sheet data as JSON
//    GET  /api/xlsx/sheet/:documentId/:idx - Get single sheet (lazy loading)
//    POST /api/xlsx/regenerate/:documentId - Regenerate preview
//    GET  /api/xlsx/status/:documentId     - Check preview status
//
app.use('/api/xlsx', xlsxPreviewRoutes);

// =============================================================================
// MFA ROUTES (TWO-FACTOR AUTHENTICATION)
// =============================================================================
//
// Endpoints:
//    GET    /api/auth/mfa/status           - Get MFA enrollment status
//    DELETE /api/auth/mfa/unenroll/:factorUid - Unenroll a specific MFA factor
//    GET    /api/auth/mfa/recovery-status  - Get recovery options status
//
// NOTE: Actual TOTP enrollment/verification happens on frontend via Firebase SDK
//
app.use('/api/auth/mfa', mfaRoutes);

// =============================================================================
// SETTINGS ROUTES
// =============================================================================
// Manage user settings like AI preferences, Storage settings, and account deletion
app.use('/api/settings', settingsRoutes);



// =============================================================================
// ADMIN ROUTES
// =============================================================================
app.use('/api/admin', adminRoutes);

// =============================================================================
// PAYMENT ROUTES (RAZORPAY)
// =============================================================================
const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payment', paymentRoutes);

// =============================================================================
// N8N WEBHOOKS
// =============================================================================
app.use('/webhook', n8nRoutes);

// =============================================================================
// PLANS ROUTES
// =============================================================================
// Fetch subscription plans
app.use('/api/plans', plansRoutes);

// =============================================================================
// ANALYTICS & MONITORING ROUTES
// =============================================================================
app.use('/api/analytics', analyticsRoutes);

// NOTIFICATION ROUTES
app.use('/api/notifications', notificationRoutes);

// =============================================================================
// THUMBNAIL ROUTE - Google Drive-style document previews
// =============================================================================
const { getThumbnailPath, hasThumbnail } = require('./services/thumbnail.service');
const { resolveDoc } = require('./services/firestore.service');

app.get('/api/thumbnails/:filename', verifyFirebaseToken, async (req, res) => {
  const filename = req.params.filename;
  const documentId = path.basename(filename, '.png');

  try {
    const { exists, data } = await resolveDoc(documentId);

    if (!exists || !data) {
      return res.status(404).json({ success: false, message: 'Thumbnail not found' });
    }

    const ownerUserId = data.ownerUserId || data.userId;
    if (ownerUserId !== req.user.uid && !(await isAdminUser(req.user))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!hasThumbnail(documentId)) {
      return res.status(404).json({ success: false, message: 'Thumbnail not found' });
    }

    const thumbnailPath = getThumbnailPath(documentId);
    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ success: false, message: 'Thumbnail not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(thumbnailPath);
  } catch (error) {
    console.error('Thumbnail access failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load thumbnail' });
  }
});

// =============================================================================
// RENDERING QUEUE STATS - Monitor thumbnail generation
// =============================================================================
const { getQueueStats, getJobStatus } = require('./services/thumbnail-queue.service');

app.get('/api/rendering/stats', verifyFirebaseToken, isAdmin, (req, res) => {
  const stats = getQueueStats();
  res.json({
    success: true,
    stats
  });
});

app.get('/api/rendering/job/:jobId', verifyFirebaseToken, isAdmin, (req, res) => {
  const job = getJobStatus(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  res.json({
    success: true,
    job: {
      id: job.id,
      documentId: job.documentId,
      status: job.status,
      attempts: job.attempts,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    }
  });
});

// Regenerate thumbnails for all existing documents (queues jobs)
app.get('/api/rendering/regenerate', verifyFirebaseToken, isAdmin, async (req, res) => {
  console.log('🖼️ Starting thumbnail regeneration for existing documents...');

  const { getFirestore } = require('./config/firebase.config');
  const { queueThumbnailJob } = require('./services/thumbnail-queue.service');
  const fs = require('fs');

  try {
    const db = getFirestore();

    // Fetch from both collections for full coverage
    const [filesSnap, docsSnap] = await Promise.all([
      db.collection('files').get(),
      db.collection('documents').get()
    ]);

    const allDocs = [...filesSnap.docs, ...docsSnap.docs];

    if (allDocs.length === 0) {
      return res.json({ success: true, message: 'No documents found', queued: 0 });
    }

    let processed = 0;
    let queued = 0;
    let skipped = 0;
    let noFile = 0;

    const STORAGE_DIR = path.join(__dirname, 'storage');
    // Using Map to deduplicate if doc exists in both collections (using documentId as key)
    const uniqueDocs = new Map();
    allDocs.forEach(doc => uniqueDocs.set(doc.id, doc.data()));

    const force = req.query.force === 'true';

    for (const [id, data] of uniqueDocs) {
      processed++;

      // Skip only if it's explicitly 'ready' and has a thumbnail URL
      // (Unless force is true)
      if (!force && data.thumbnailStatus === 'ready' && (data.previewUrl || data.thumbnailUrl)) {
        skipped++;
        continue;
      }

      // Find the local file
      const userId = data.userId;
      const documentId = data.documentId || id;
      const storagePath = data.storagePath;
      const s3Key = data.s3Key;

      let filePath = null;

      if (storagePath && fs.existsSync(storagePath)) {
        filePath = storagePath;
      } else {
        const userDir = path.join(STORAGE_DIR, 'users', userId, 'documents');
        if (fs.existsSync(userDir)) {
          const files = fs.readdirSync(userDir);
          const matchingFile = files.find(f => f.includes(documentId));
          if (matchingFile) {
            filePath = path.join(userDir, matchingFile);
          }
        }
      }

      // If neither local path nor S3 key exists, we can't render
      if (!filePath && !s3Key) {
        console.log(`   ⚠️ No file source found for ${documentId}`);
        noFile++;
        continue;
      }

      // Queue the job
      try {
        const isXlsx = data.fileType === 'xlsx' ||
            data.fileType === 'xls' ||
            data.fileType === 'csv' ||
            data.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            data.fileType === 'application/vnd.ms-excel' ||
            data.fileType === 'text/csv' ||
            data.fileName.toLowerCase().endsWith('.xlsx') ||
            data.fileName.toLowerCase().endsWith('.xls') ||
            data.fileName.toLowerCase().endsWith('.csv');
        queueThumbnailJob({
          filePath,
          documentId,
          userId,
          fileType: data.fileType,
          fileName: data.fileName,
          s3Key: data.s3Key
        });
        queued++;
        console.log(`   📋 Queued: ${data.fileName}`);
      } catch (error) {
        console.error(`   ❌ Failed to queue ${data.fileName}: ${error.message}`);
      }
    }

    console.log(`\n📊 Regeneration queued: ${queued} jobs, ${skipped} skipped, ${noFile} no file`);

    res.json({
      success: true,
      message: 'Thumbnail regeneration jobs queued',
      stats: { total: uniqueDocs.size, processed, queued, skipped, noFile }
    });

  } catch (error) {
    console.error('Regeneration error:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// =============================================================================
// ⚠️  DEPRECATED INSECURE ROUTES (ABOVE)
// =============================================================================
// 
// WARNING: The routes at /api/documents/* (defined above in this file) are
// INSECURE and should be DISABLED in production. They lack:
//    ❌ Authentication
//    ❌ User isolation
//    ❌ Ownership verification
//
// TODO: Remove or disable the insecure /api/documents/* routes
// Use /api/secure/documents/* instead
//

// =============================================================================
// ERROR HANDLING
// =============================================================================

// =============================================================================
// GLOBAL ERROR HANDLING
// =============================================================================

// Always use the centralized errorHandler to ensure consistent JSON responses
// and proper HTTP status codes (40x, 50x)
app.use(errorHandler);

// =============================================================================
// SERVE ANGULAR FRONTEND (production)
// =============================================================================
const frontendPath = path.join(__dirname, '..', 'frontend-angular', 'dist', 'frontend-angular', 'browser');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath, {
    maxAge: isProduction ? '1d' : '0',
    index: false
  }));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), {
      maxAge: '0'
    });
  });
  console.log('✅ Serving Angular frontend from:', frontendPath);
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
  });
}

// =============================================================================
// STARTUP - ASYNC INITIALIZATION WITH PORT CONFLICT HANDLING
// =============================================================================

/**
 * Attempt to start server on a specific port
 * Returns a Promise that resolves with the server instance or rejects with error
 */
function tryListenOnPort(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        // Initialize WebSockets upon HTTP server start
        const { initWebSocket } = require('./services/websocket.service');
        initWebSocket(server);

        resolve({ server, port });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function logServerStarted(port) {
  console.log('='.repeat(60));
  console.log(`✅ Server running on: http://localhost:${port}`);
  console.log(`✅ Uploads: ${UPLOADS_DIR}`);
  console.log(`✅ Pinecone: ${pineconeReady ? 'READY' : 'DISABLED'}`);
  console.log(`✅ OpenAI: ${openaiClient ? 'READY' : 'DISABLED'}`);
  console.log('='.repeat(60));
  console.log('📌 Endpoints:');
  console.log(`   POST /api/secure/documents/upload - Upload + vectorize`);
  console.log(`   GET  /api/secure/documents - List all`);
  console.log(`   POST /api/ai/query - AI chat query`);
  console.log(`   GET  /api/pinecone/stats - Check Pinecone`);
  console.log(`   GET  /api/health - Health check`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Start server with automatic port retry on EADDRINUSE
 * Tries ports sequentially: 3000 → 3001 → 3002 ... up to maxRetries
 */
async function startServerWithPortRetry(startPort, maxRetries = 10) {
  let currentPort = startPort;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const { server, port } = await tryListenOnPort(currentPort);

      // Success! Server started
      console.log('='.repeat(60));
      console.log(`✅ Server running on: http://localhost:${port}`);
      console.log(`✅ Uploads: ${UPLOADS_DIR}`);
      console.log(`✅ Pinecone: ${pineconeReady ? 'READY' : 'DISABLED'}`);
      console.log(`✅ OpenAI: ${openaiClient ? 'READY' : 'DISABLED'}`);
      console.log('='.repeat(60));
      console.log('📌 Endpoints:');
      console.log(`   POST /api/secure/documents/upload - Upload + vectorize`);
      console.log(`   GET  /api/secure/documents - List all`);
      console.log(`   POST /api/ai/query - AI chat query`);
      console.log(`   GET  /api/pinecone/stats - Check Pinecone`);
      console.log(`   GET  /api/health - Health check`);
      console.log('='.repeat(60) + '\n');

      return server;

    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${currentPort} is already in use`);

        if (attempts === 0) {
          // First attempt failed - show detailed diagnostics
          console.log('\n' + '='.repeat(60));
          console.log('🔍 PORT CONFLICT DETECTED');
          console.log('='.repeat(60));
          console.log(`\n❌ Port ${currentPort} is already in use by another process.\n`);
          console.log('📋 To find and kill the process on Windows:\n');
          console.log('   1. Find the process:');
          console.log(`      netstat -ano | findstr :${currentPort}`);
          console.log('\n   2. Kill the process (replace PID with actual number):');
          console.log('      taskkill /F /PID <PID>\n');
          console.log('🔄 Attempting to use next available port...\n');
          console.log('='.repeat(60) + '\n');
        }

        attempts++;
        currentPort++;

        if (attempts >= maxRetries) {
          throw new Error(
            `Failed to start server: All ports from ${startPort} to ${currentPort - 1} are in use. ` +
            `Please free up a port or kill existing processes.`
          );
        }

        // Try next port
        continue;
      } else {
        // Different error - throw immediately
        throw error;
      }
    }
  }
}

async function startHttpServer() {
  if (isProduction) {
    return startServerWithPortRetry(PORT, 10);
  }

  try {
    const { server, port } = await tryListenOnPort(PORT);
    logServerStarted(port);
    return server;
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      throw new Error(
        `Port ${PORT} is already in use. Development mode does not auto-switch ports; free the port or set a different PORT.`
      );
    }

    throw error;
  }
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('⚠️ Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref?.();

  try {
    if (trashCleanupInterval) {
      clearInterval(trashCleanupInterval);
      trashCleanupInterval = null;
    }

    if (trashCleanupTimeout) {
      clearTimeout(trashCleanupTimeout);
      trashCleanupTimeout = null;
    }

    if (thumbnailRecoveryTimeout) {
      clearTimeout(thumbnailRecoveryTimeout);
      thumbnailRecoveryTimeout = null;
    }

    try {
      const { shutdownUsageResetScheduler } = require('./services/usage-reset.service');
      shutdownUsageResetScheduler();
    } catch (error) {
      console.warn('Usage reset shutdown failed:', error.message);
    }

    try {
      const { shutdownThumbnailQueue } = require('./services/thumbnail-queue.service');
      shutdownThumbnailQueue();
    } catch (error) {
      console.warn('Thumbnail queue shutdown failed:', error.message);
    }

    try {
      const { shutdownWebSocket } = require('./services/websocket.service');
      await shutdownWebSocket();
    } catch (error) {
      console.warn('WebSocket shutdown failed:', error.message);
    }

    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            return reject(error);
          }
          return resolve();
        });
      });
      httpServer = null;
    }

    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error('❌ Graceful shutdown failed:', error.message);
    process.exit(1);
  }
}

async function startServer() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CLOUD SPACE BACKEND - STARTING');
  console.log('='.repeat(60) + '\n');


  // Initialize AWS S3 for file storage
  try {
    initializeAWS();
    console.log('✅ AWS S3 initialized (File Storage)');
  } catch (error) {
    console.error('⚠️  AWS S3 initialization failed:', error.message);
    console.log('   File uploads will fail');
  }

  // Initialize OpenAI
  initializeOpenAI();

  // Initialize Pinecone with verification
  let pineconeOk = false;
  try {
    pineconeOk = await initializePinecone();
  } catch (err) {
    console.error('❌ Critical error during Pinecone initialization:', err.message);
  }

  if (!pineconeOk) {
    console.log('\n⚠️  Server starting WITHOUT Pinecone (vector search disabled)');
    console.log('   Files will still be stored locally\n');
  }

  // Start server (port retry is production-only)
  try {
    httpServer = await startHttpServer();

    // Schedule 30-day trash cleanup to run once a day (every 24 hours)
    const { autoDeleteTrash } = require('./services/deletion.service');
    trashCleanupInterval = setInterval(() => {
      autoDeleteTrash();
    }, 24 * 60 * 60 * 1000);

    // Also run it once immediately on startup
    trashCleanupTimeout = setTimeout(autoDeleteTrash, 5000); // Wait 5 seconds after startup

    // Initialize AI Usage Reset Scheduler (Every 24 hours)
    const { initializeUsageResetScheduler } = require('./services/usage-reset.service');
    initializeUsageResetScheduler();

    // ============================================================
    // RECOVERY: Cleanup orphaned thumbnail jobs
    // ============================================================
    const { recoverOrphanedJobs } = require('./services/thumbnail-queue.service');
    console.log('🔄 Checking for orphaned thumbnail processing jobs...');
    // Run recovery after a short delay to allow background processes to stabilize
    setTimeout(() => {
      recoverOrphanedJobs().catch(e => console.error('⚠️  Thumbnail recovery failed:', e.message));
    }, 15000);

  } catch (error) {
    console.error('\n❌ FATAL: Could not start server');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

// Start with proper async handling
startServer().catch(err => {
  console.error('❌ FATAL: Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown on SIGTERM/SIGINT
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
