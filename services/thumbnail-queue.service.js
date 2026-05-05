/**
 * THUMBNAIL WORKER QUEUE - Production Grade
 * ==========================================
 * 
 * Asynchronous job queue for thumbnail generation.
 * 
 * Features:
 * - Worker pool with configurable concurrency
 * - Retry logic with exponential backoff
 * - Priority scheduling (simpler files first)
 * - Job status tracking
 * - Dead letter queue for failed jobs
 * - Firestore status updates
 * 
 * For production: Replace with BullMQ + Redis
 * 
 * @author CloudAI Rendering Engine
 * @version 2.0.0
 */

const { renderThumbnail } = require('./render.service');
const { updateDocumentStatus, updateDocument } = require('./firestore.service');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    MAX_WORKERS: 3,
    MAX_RETRIES: 3,
    RETRY_BASE_DELAY: 2000,
    JOB_TIMEOUT: 30000, // Reduced from 60s to 30s
    CLEANUP_INTERVAL: 300000,
    MAX_COMPLETED_JOBS: 100
};

// Priority order (lower = higher priority)
const PRIORITY = {
    txt: 1,
    pdf: 2,
    docx: 3,
    xlsx: 4,
    pptx: 5,
    default: 10
};

// =============================================================================
// JOB QUEUE STATE
// =============================================================================

const jobQueue = [];
const processingJobs = new Map();
const completedJobs = new Map();
const failedJobs = new Map();
let activeWorkers = 0;
let isProcessing = false;
let totalProcessed = 0;
let totalFailed = 0;

// =============================================================================
// JOB MANAGEMENT
// =============================================================================

/**
 * Add a new thumbnail job to the queue
 * 
 * @param {Object} jobData
 * @param {string} jobData.filePath - Path to source file
 * @param {string} jobData.documentId - Document ID
 * @param {string} jobData.userId - User ID
 * @param {string} jobData.fileType - File MIME type
 * @param {string} jobData.fileName - Original file name
 * @returns {string} Job ID
 */
function queueThumbnailJob({
    filePath,
    documentId,
    userId,
    fileType,
    fileName,
    s3Key
}) {
    if (!documentId) {
        console.error('❌ Cannot queue thumbnail job: documentId is missing!');
        return null;
    }

    const jobId = `thumb_${documentId}_${Date.now()}`;
    const normalizedType = normalizeType(fileType, fileName);

    const job = {
        id: jobId,
        documentId,
        userId,
        filePath,
        fileType,
        fileName,
        s3Key,
        normalizedType,
        priority: PRIORITY[normalizedType] || PRIORITY.default,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
        lastAttempt: null,
        error: null,
        result: null
    };

    // Insert by priority
    const insertIndex = jobQueue.findIndex(j => j.priority > job.priority);
    if (insertIndex === -1) {
        jobQueue.push(job);
    } else {
        jobQueue.splice(insertIndex, 0, job);
    }

    console.log(`📋 Queued thumbnail job: ${jobId} (priority: ${job.priority})`);
    console.log(`   Queue size: ${jobQueue.length}, Active workers: ${activeWorkers}`);

    // Start processing if not already running
    processQueue();

    return jobId;
}

/**
 * Get job status
 */
function getJobStatus(jobId) {
    // Check all queues
    const pendingJob = jobQueue.find(j => j.id === jobId);
    if (pendingJob) return { ...pendingJob, status: 'pending' };

    const processingJob = processingJobs.get(jobId);
    if (processingJob) return { ...processingJob, status: 'processing' };

    const completedJob = completedJobs.get(jobId);
    if (completedJob) return completedJob;

    const failedJob = failedJobs.get(jobId);
    if (failedJob) return failedJob;

    return null;
}

/**
 * Get queue statistics
 */
function getQueueStats() {
    return {
        pending: jobQueue.length,
        processing: processingJobs.size,
        completed: completedJobs.size,
        failed: failedJobs.size,
        activeWorkers,
        maxWorkers: CONFIG.MAX_WORKERS,
        totalProcessed,
        totalFailed,
        isProcessing
    };
}

// =============================================================================
// WORKER POOL
// =============================================================================

/**
 * Process the job queue
 */
async function processQueue() {
    // Fill available workers
    while (jobQueue.length > 0 && activeWorkers < CONFIG.MAX_WORKERS) {
        const job = jobQueue.shift();
        if (!job) continue;

        activeWorkers++;
        processingJobs.set(job.id, { ...job, status: 'processing', startedAt: new Date().toISOString() });

        console.log(`🚀 Worker starting job: ${job.id} (Active: ${activeWorkers}/${CONFIG.MAX_WORKERS})`);

        // Process in background - don't await so we can start more workers
        processJob(job).catch(err => {
            console.error(`❌ Worker error for job ${job.id}:`, err.message);
        });
    }
}

/**
 * Process a single job
 */
async function processJob(job) {
    console.log(`\n🔧 Worker processing: ${job.id}`);
    console.log(`   File: ${job.fileName}`);
    console.log(`   Type: ${job.normalizedType}`);
    console.log(`   Attempt: ${job.attempts + 1}/${CONFIG.MAX_RETRIES}`);

    job.attempts++;
    job.lastAttempt = new Date().toISOString();

    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), CONFIG.JOB_TIMEOUT);
    });

    try {
        // Race against timeout
        const result = await Promise.race([
            renderThumbnail({
                filePath: job.filePath,
                documentId: job.documentId,
                userId: job.userId,
                fileType: job.fileType,
                fileName: job.fileName,
                s3Key: job.s3Key
            }),
            timeout
        ]);

        // Success!
        await handleJobSuccess(job, result);

    } catch (error) {
        console.error(`   ❌ Job failed: ${error.message}`);

        if (job.attempts < CONFIG.MAX_RETRIES) {
            // Retry with exponential backoff
            await retryJob(job, error);
        } else {
            // Max retries reached - move to failed queue
            await handleJobFailure(job, error);
        }
    } finally {
        activeWorkers--;
        processingJobs.delete(job.id);

        // Continue processing
        processQueue();
    }
}

/**
 * Handle successful job completion
 */
async function handleJobSuccess(job, result) {
    console.log(`   ✅ Job completed: ${job.id}`);
    console.log(`   Preview URL: ${result.previewUrl}`);

    const completedJob = {
        ...job,
        status: 'completed',
        completedAt: new Date().toISOString(),
        result: {
            previewUrl: result.previewUrl,
            previewPath: result.previewPath,
            method: result.method,
            duration: result.duration
        }
    };

    completedJobs.set(job.id, completedJob);
    totalProcessed++;

    // Update document in Firestore
    try {
        await updateDocument(job.documentId, {
            previewUrl: result.previewUrl,
            previewPath: result.previewPath,
            previewGenerated: true,
            previewGeneratedAt: new Date().toISOString(),
            previewMethod: result.method,
            thumbnailUrl: `/api/thumbnails/${job.documentId}.png`,
            thumbnailStatus: 'ready',
            status: 'completed' // Alignment with frontend expected status
        });
        console.log(`   📝 Firestore updated with preview URL`);
    } catch (dbError) {
        console.error(`   ⚠️ Failed to update Firestore: ${dbError.message}`);
    }

    // Cleanup old completed jobs
    if (completedJobs.size > CONFIG.MAX_COMPLETED_JOBS) {
        const oldest = Array.from(completedJobs.keys())[0];
        completedJobs.delete(oldest);
    }
}

/**
 * Retry a failed job
 */
async function retryJob(job, error) {
    const delay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, job.attempts - 1);
    console.log(`   🔄 Retrying in ${delay}ms...`);

    job.error = error.message;
    job.status = 'retry';

    // Re-queue with higher priority for retry
    await new Promise(resolve => setTimeout(resolve, delay));

    job.priority = Math.max(1, job.priority - 1);
    jobQueue.unshift(job);
}

/**
 * Handle job failure (after max retries)
 */
async function handleJobFailure(job, error) {
    console.log(`   💀 Job failed permanently: ${job.id}`);

    const failedJob = {
        ...job,
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error.message
    };

    failedJobs.set(job.id, failedJob);
    totalFailed++;

    // Update document with failure status - MANDATORY
    try {
        await updateDocument(job.documentId, {
            previewUrl: null,
            thumbnailUrl: null, // Clear any broken URL
            previewError: error.message,
            previewFailed: true,
            previewFailedAt: new Date().toISOString(),
            thumbnailStatus: 'failed',
            status: 'completed' // Ensure it's not stuck in 'processing' badge
        });
        console.log(`   📝 Updated Firestore status to 'failed' for ${job.documentId}`);
    } catch (dbError) {
        console.error(`   ⚠️ Failed to update failure status in Firestore: ${dbError.message}`);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function normalizeType(fileType, fileName) {
    if (!fileType) {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return ext;
    }

    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('docx')) return 'docx';
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xlsx')) return 'xlsx';
    if (type.includes('powerpoint') || type.includes('presentation') || type.includes('pptx')) return 'pptx';
    if (type.includes('text/plain')) return 'txt';

    return fileName.split('.').pop()?.toLowerCase() || 'unknown';
}

// =============================================================================
// CLEANUP TIMER
// =============================================================================

let cleanupInterval = setInterval(() => {
    const now = Date.now();

    // Clean old completed jobs
    for (const [id, job] of completedJobs) {
        const completedTime = new Date(job.completedAt).getTime();
        if (now - completedTime > 3600000) { // 1 hour
            completedJobs.delete(id);
        }
    }

    // Clean old failed jobs
    for (const [id, job] of failedJobs) {
        const failedTime = new Date(job.failedAt).getTime();
        if (now - failedTime > 86400000) { // 24 hours
            failedJobs.delete(id);
        }
    }

}, CONFIG.CLEANUP_INTERVAL);

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * RECOVERY: Scan Firestore for stuck thumbnail jobs and re-queue them
 * This handles jobs that were 'processing' when the server restarted or crashed.
 */
async function recoverOrphanedJobs() {
    console.log('🧹 [Thumbnail Recovery] Starting scan for stuck jobs...');
    try {
        const { getFirestore } = require('../config/firebase.config');
        const db = getFirestore();

        // 1. Find docs in 'processing' state
        // Check both collections (legacy support)
        const [filesSnap, docsSnap] = await Promise.all([
            db.collection('files').where('thumbnailStatus', '==', 'processing').get(),
            db.collection('documents').where('thumbnailStatus', '==', 'processing').get()
        ]);

        const orphanedDocs = [];
        const seenIds = new Set();

        const addDocs = (snap) => {
            snap.forEach(doc => {
                const data = doc.data();
                if (!seenIds.has(doc.id)) {
                    orphanedDocs.push({ id: doc.id, ...data });
                    seenIds.add(doc.id);
                }
            });
        };

        addDocs(filesSnap);
        addDocs(docsSnap);

        if (orphanedDocs.length === 0) {
            console.log('   ✅ No orphaned thumbnail jobs found.');
            return;
        }

        console.log(`   🚨 [Thumbnail Recovery] Found ${orphanedDocs.length} orphaned jobs. Re-queueing...`);

        for (const doc of orphanedDocs) {
            console.log(`      - Re-queueing: ${doc.fileName || doc.name || doc.id}`);
            queueThumbnailJob({
                filePath: doc.storagePath,
                documentId: doc.documentId || doc.id,
                userId: doc.userId,
                fileType: doc.fileType,
                fileName: doc.fileName || doc.name,
                s3Key: doc.s3Key
            });
        }

        console.log(`   ✨ [Thumbnail Recovery] Successfully re-queued ${orphanedDocs.length} jobs.`);
    } catch (error) {
        console.error('   ❌ [Thumbnail Recovery] Failed:', error.message);
    }
}

function shutdownThumbnailQueue() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }

    jobQueue.length = 0;
    processingJobs.clear();
    completedJobs.clear();
    failedJobs.clear();
    activeWorkers = 0;
    isProcessing = false;
}

module.exports = {
    queueThumbnailJob,
    getJobStatus,
    getQueueStats,
    processQueue,
    recoverOrphanedJobs,
    shutdownThumbnailQueue
};
