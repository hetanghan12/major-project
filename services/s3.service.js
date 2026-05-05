/**
 * AWS S3 Service
 * ================
 * Handles file upload, download, and deletion in AWS S3.
 * 
 * @author College Project
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

let s3Client = null;
let bucketName = null;

/**
 * Initialize S3 Client
 */
function initS3Service() {
    if (s3Client) return;

    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'eu-north-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    bucketName = process.env.AWS_S3_BUCKET_NAME;
    console.log(`✅ S3 Service initialized - Bucket: ${bucketName}`);
}

/**
 * Upload a file or buffer to S3
 * @param {string|Buffer} fileSource - Path to local file OR a Buffer object
 * @param {string} s3Key - S3 object key (path in bucket)
 * @param {string} contentType - MIME type of the file
 * @returns {Object} Upload result with S3 URL
 */
async function uploadToS3(fileSource, s3Key, contentType) {
    initS3Service();

    console.log(`📤 Uploading to S3: ${s3Key}`);

    try {
        let fileContent;

        if (Buffer.isBuffer(fileSource)) {
            // It's already a buffer (e.g. from thumbnail generator)
            fileContent = fileSource;
        } else if (typeof fileSource === 'string') {
            // It's a file path
            fileContent = fs.readFileSync(fileSource);
        } else {
            throw new Error('Invalid file source. Must be a file path or Buffer.');
        }

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        });

        await s3Client.send(command);

        // Construct the S3 URL
        const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        console.log(`   ✅ Uploaded to S3: ${s3Url}`);

        return {
            success: true,
            s3Key: s3Key,
            s3Url: s3Url,
            bucket: bucketName
        };
    } catch (error) {
        console.error(`   ❌ S3 Upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Generate a presigned URL for downloading a file
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL validity in seconds (default: 1 hour)
 * @returns {string} Presigned download URL
 */
async function getDownloadUrl(s3Key, expiresIn = 3600, responseContentDisposition = null) {
    initS3Service();

    const params = {
        Bucket: bucketName,
        Key: s3Key
    };

    if (responseContentDisposition) {
        params.ResponseContentDisposition = responseContentDisposition;
    }

    const command = new GetObjectCommand(params);

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`   🔗 Generated presigned URL for: ${s3Key} (Disposition: ${responseContentDisposition || 'default'})`);

    return url;
}

/**
 * Get file content as Buffer from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Buffer>} File content buffer
 */
async function getFileBuffer(s3Key) {
    initS3Service();

    console.log(`📥 Fetching file buffer from S3: ${s3Key}`);

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        const response = await s3Client.send(command);

        // Convert stream to buffer
        const stream = response.Body;
        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        console.log(`   ✅ Fetched ${buffer.length} bytes from S3`);

        return buffer;
    } catch (error) {
        console.error(`   ❌ S3 Fetch failed: ${error.message}`);
        throw error;
    }
}

/**
 * Get a readable stream for a file in S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Object>} { stream, contentType, contentLength }
 */
async function getDownloadStream(s3Key) {
    initS3Service();

    console.log(`📥 Opening download stream from S3: ${s3Key}`);

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        const response = await s3Client.send(command);

        return {
            stream: response.Body,
            contentType: response.ContentType,
            contentLength: response.ContentLength
        };
    } catch (error) {
        console.error(`   ❌ S3 Stream failed: ${error.message}`);
        throw error;
    }
}

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 object key to delete
 */
async function deleteFromS3(s3Key) {
    initS3Service();

    console.log(`🗑️  Deleting from S3: ${s3Key}`);

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        await s3Client.send(command);
        console.log(`   ✅ Deleted from S3: ${s3Key}`);

        return { success: true };
    } catch (error) {
        console.error(`   ❌ S3 Delete failed: ${error.message}`);
        throw error;
    }
}

/**
 * Check if a file exists in S3
 * @param {string} s3Key - S3 object key
 * @returns {boolean} True if file exists
 */
async function fileExistsInS3(s3Key) {
    initS3Service();

    try {
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        await s3Client.send(command);
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error;
    }
}

async function copyS3Object(sourceKey, targetKey) {
    initS3Service();
    console.log(`📋 Copying in S3: ${sourceKey} -> ${targetKey}`);

    try {
        const command = new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${sourceKey}`,
            Key: targetKey
        });

        await s3Client.send(command);
        console.log(`   ✅ S3 Copy complete`);

        return {
            success: true,
            s3Key: targetKey,
            s3Url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${targetKey}`
        };
    } catch (error) {
        console.error(`   ❌ S3 Copy failed: ${error.message}`);
        throw error;
    }
}

/**
 * Generate S3 key for a user's document
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} fileName - Original file name
 * @returns {string} S3 key
 */
function generateS3Key(userId, documentId, fileName) {
    // Clean filename for S3
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `users/${userId}/documents/${documentId}/${safeFileName}`;
}

module.exports = {
    initS3Service,
    uploadToS3,
    getDownloadUrl,
    getFileBuffer,
    getDownloadStream,
    deleteFromS3,
    fileExistsInS3,
    generateS3Key,
    copyS3Object
};
