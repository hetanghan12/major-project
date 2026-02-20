/**
 * Storage Service
 * =================
 * Handles AWS S3 Storage operations.
 * 
 * File storage path: users/{userId}/documents/{documentId}/{fileName}
 * 
 * @author College Project
 */

const { getS3Client, getBucketName } = require('../config/aws.config');
const {
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

/**
 * Upload file to AWS S3
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} localFilePath - Path to local file
 * @param {string} originalFileName - Original file name
 * @returns {Object} Upload result with storage path and download URL
 */
async function uploadFile(userId, documentId, localFilePath, originalFileName) {
    console.log(`☁️  Uploading file to AWS S3: ${originalFileName}`);

    try {
        const s3Client = getS3Client();
        const bucketName = getBucketName();
        const storagePath = `users/${userId}/documents/${documentId}/${originalFileName}`;

        // Read file content
        const fileContent = fs.readFileSync(localFilePath);

        // Upload file to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: storagePath,
            Body: fileContent,
            ContentType: getContentType(originalFileName),
            Metadata: {
                userId: userId,
                documentId: documentId,
                originalFileName: originalFileName,
                uploadedAt: new Date().toISOString()
            }
        });

        await s3Client.send(uploadCommand);

        // Generate public URL (if bucket is public) or signed URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${storagePath}`;

        console.log(`   ✅ File uploaded to S3: ${storagePath}`);

        return {
            success: true,
            storagePath,
            publicUrl,
            fileName: originalFileName
        };

    } catch (error) {
        console.error('❌ File upload failed:', error.message);

        // Provide more specific error messages
        if (error.name === 'NoSuchBucket') {
            error.message = 'S3 bucket does not exist. Please verify AWS_S3_BUCKET_NAME in .env file.';
        } else if (error.name === 'AccessDenied' || error.name === 'InvalidAccessKeyId') {
            error.message = 'Access denied. Please check your AWS credentials and S3 bucket permissions.';
        } else if (error.name === 'ServiceUnavailable') {
            error.message = 'AWS S3 service temporarily unavailable. Please try again.';
        }

        throw error;
    }
}

/**
 * Generate signed download URL for a file
 * @param {string} storagePath - Path in S3
 * @param {number} expiresInMinutes - URL expiration time
 */
async function getSignedDownloadUrl(storagePath, expiresInMinutes = 60) {
    try {
        const s3Client = getS3Client();
        const bucketName = getBucketName();

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: storagePath
        });

        // Generate signed URL that expires in specified minutes
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: expiresInMinutes * 60 // Convert to seconds
        });

        return signedUrl;

    } catch (error) {
        console.error('❌ Failed to generate signed URL:', error.message);
        throw error;
    }
}

/**
 * Delete file from AWS S3
 * @param {string} storagePath - Path in S3
 */
async function deleteFile(storagePath) {
    console.log(`🗑️  Deleting file from AWS S3: ${storagePath}`);

    try {
        const s3Client = getS3Client();
        const bucketName = getBucketName();

        const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: storagePath
        });

        await s3Client.send(deleteCommand);
        console.log(`   ✅ File deleted: ${storagePath}`);

        return { success: true };

    } catch (error) {
        // S3 delete doesn't throw error if file doesn't exist
        console.log(`   ⚠️  File deletion completed (may not have existed): ${storagePath}`);
        return { success: true };
    }
}

/**
 * Delete all files for a user
 * @param {string} userId - User ID
 */
async function deleteUserFiles(userId) {
    console.log(`🗑️  Deleting all files for user: ${userId}`);

    try {
        const s3Client = getS3Client();
        const bucketName = getBucketName();
        const prefix = `users/${userId}/`;

        // List all objects with the user's prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix
        });

        const listResponse = await s3Client.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log(`   ℹ️  No files found for user: ${userId}`);
            return { success: true };
        }

        // Delete each file
        const deletePromises = listResponse.Contents.map(object => {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: object.Key
            });
            return s3Client.send(deleteCommand);
        });

        await Promise.all(deletePromises);
        console.log(`   ✅ Deleted ${listResponse.Contents.length} files for user: ${userId}`);

        return { success: true };

    } catch (error) {
        console.error('❌ Failed to delete user files:', error.message);
        throw error;
    }
}

/**
 * Get content type based on file extension
 */
function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain'
    };

    return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file exists in storage
 * @param {string} storagePath - Path in S3
 */
async function fileExists(storagePath) {
    try {
        const s3Client = getS3Client();
        const bucketName = getBucketName();

        const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: storagePath
        });

        await s3Client.send(headCommand);
        return true;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        throw error;
    }
}

module.exports = {
    uploadFile,
    getSignedDownloadUrl,
    deleteFile,
    deleteUserFiles,
    getContentType,
    fileExists
};
