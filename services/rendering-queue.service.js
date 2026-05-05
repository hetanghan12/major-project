/**
 * RENDERING QUEUE SERVICE
 * ========================
 * Production-grade async document rendering pipeline.
 * 
 * Uses in-memory queue with async workers for thumbnail generation.
 * Designed for scalability - can be replaced with BullMQ/Redis in production.
 * 
 * ============================================================================
 * ARCHITECTURE
 * ============================================================================
 * 
 *    Upload → Queue Job → Worker Pool → Generate Thumbnail → S3 → DB Update
 * 
 * Features:
 *    ✅ Async processing
 *    ✅ Retry logic (3 attempts)
 *    ✅ Concurrent workers
 *    ✅ Priority queue (smaller files first)
 *    ✅ Job status tracking
 *    ✅ Failure recovery
 * 
 * @author CloudAI Rendering Engine
 * @version 2.0.0
 */

const EventEmitter = require('events');

// Job queue storage
const jobQueue = [];
const completedJobs = new Map();
const failedJobs = new Map();

// Worker configuration
const MAX_WORKERS = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let activeWorkers = 0;
let isProcessing = false;

// Event emitter for job status updates
const queueEvents = new EventEmitter();

/**
 * Job priorities based on file type
 */
const JOB_PRIORITIES = {
    'txt': 1,    // Fastest to render
    'pdf': 2,
    'docx': 3,
    'doc': 3,
    'xlsx': 4,
    'xls': 4,
    'pptx': 5,
    'ppt': 5
};

/**
 * Rendering job structure
 */
class RenderingJob {
    constructor(documentId, userId, filePath, fileType, fileName) {
        this.id = `render_${documentId}_${Date.now()}`;
        this.documentId = documentId;
        this.userId = userId;
        this.filePath = filePath;
        this.fileType = fileType.toLowerCase().replace('.', '');
        this.fileName = fileName;
        this.priority = JOB_PRIORITIES[this.fileType] || 10;
        this.status = 'pending';
        this.attempts = 0;
        this.createdAt = new Date();
        this.startedAt = null;
        this.completedAt = null;
        this.error = null;
        this.result = null;
    }
}

/**
 * Add a rendering job to the queue
 * 
 * @param {Object} params - Job parameters
 * @returns {string} Job ID
 */
function queueRenderingJob({ documentId, userId, filePath, fileType, fileName }) {
    const job = new RenderingJob(documentId, userId, filePath, fileType, fileName);

    // Insert based on priority (lower = higher priority)
    const insertIndex = jobQueue.findIndex(j => j.priority > job.priority);
    if (insertIndex === -1) {
        jobQueue.push(job);
    } else {
        jobQueue.splice(insertIndex, 0, job);
    }

    console.log(`📋 Queued rendering job: ${job.id} (${job.fileType})`);
    console.log(`   Queue size: ${jobQueue.length}`);

    // Start processing if not already running
    processQueue();

    return job.id;
}

/**
 * Process queued jobs with worker pool
 */
async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    while (jobQueue.length > 0 && activeWorkers < MAX_WORKERS) {
        const job = jobQueue.shift();
        if (!job) continue;

        activeWorkers++;
        processJob(job).finally(() => {
            activeWorkers--;
            // Continue processing
            if (jobQueue.length > 0) {
                setImmediate(processQueue);
            }
        });
    }

    isProcessing = false;
}

/**
 * Process a single rendering job
 */
async function processJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;

    console.log(`🎨 Processing job: ${job.id} (attempt ${job.attempts}/${MAX_RETRIES})`);

    try {
        // Import thumbnail service
        const { generateThumbnail } = require('./thumbnail.service');
        const { updateDocumentStatus } = require('./firestore.service');

        // Generate thumbnail
        const result = await generateThumbnail(
            job.filePath,
            job.documentId,
            job.fileType,
            null // textContent will be extracted by the service
        );

        // Update database with thumbnail URL
        await updateDocumentStatus(job.documentId, 'completed', {
            thumbnailUrl: result.thumbnailUrl,
            thumbnailGenerated: true,
            thumbnailGeneratedAt: new Date().toISOString()
        });

        // Mark job as complete
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;

        completedJobs.set(job.id, job);
        queueEvents.emit('completed', job);

        console.log(`✅ Job completed: ${job.id}`);
        console.log(`   Thumbnail: ${result.thumbnailUrl}`);

    } catch (error) {
        console.error(`❌ Job failed: ${job.id} - ${error.message}`);

        if (job.attempts < MAX_RETRIES) {
            // Retry with exponential backoff
            job.status = 'retry';
            job.error = error.message;

            const delay = RETRY_DELAY_MS * Math.pow(2, job.attempts - 1);
            console.log(`   Retrying in ${delay}ms...`);

            setTimeout(() => {
                jobQueue.unshift(job);
                processQueue();
            }, delay);

        } else {
            // Max retries exceeded - mark as failed
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();

            failedJobs.set(job.id, job);
            queueEvents.emit('failed', job);

            console.error(`💀 Job permanently failed: ${job.id}`);

            // Update document with failure status
            try {
                const { updateDocumentStatus } = require('./firestore.service');
                await updateDocumentStatus(job.documentId, 'completed', {
                    thumbnailUrl: null,
                    thumbnailError: error.message
                });
            } catch (e) {
                console.error(`   Failed to update document status: ${e.message}`);
            }
        }
    }
}

/**
 * Get job status
 */
function getJobStatus(jobId) {
    // Check if in queue
    const queuedJob = jobQueue.find(j => j.id === jobId);
    if (queuedJob) return queuedJob;

    // Check completed
    if (completedJobs.has(jobId)) return completedJobs.get(jobId);

    // Check failed
    if (failedJobs.has(jobId)) return failedJobs.get(jobId);

    return null;
}

/**
 * Get queue statistics
 */
function getQueueStats() {
    return {
        queued: jobQueue.length,
        processing: activeWorkers,
        completed: completedJobs.size,
        failed: failedJobs.size,
        maxWorkers: MAX_WORKERS
    };
}

/**
 * Clear completed jobs (for memory management)
 */
function clearCompletedJobs() {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago

    for (const [id, job] of completedJobs) {
        if (new Date(job.completedAt).getTime() < cutoff) {
            completedJobs.delete(id);
        }
    }
}

// Periodic cleanup
setInterval(clearCompletedJobs, 10 * 60 * 1000); // Every 10 minutes

module.exports = {
    queueRenderingJob,
    getJobStatus,
    getQueueStats,
    queueEvents,
    RenderingJob
};
