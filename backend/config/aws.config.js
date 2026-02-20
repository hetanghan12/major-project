/**
 * AWS S3 Configuration
 * =================================
 * Initializes AWS SDK for S3 storage operations.
 * 
 * This module provides:
 * - S3 bucket configuration for file storage
 * - AWS credentials management
 * - S3 client initialization
 * 
 * @author College Project
 */

const { S3Client } = require('@aws-sdk/client-s3');

let s3Client = null;

/**
 * Initialize AWS S3 Client
 * Uses AWS credentials from environment variables
 */
function initializeAWS() {
    if (s3Client) {
        console.log('⚠️  AWS S3 already initialized');
        return s3Client;
    }

    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_REGION',
            'AWS_S3_BUCKET_NAME'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}. Please add them to your .env file.`);
        }

        // Initialize S3 Client
        s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        console.log('✅ AWS S3 Client initialized successfully');
        console.log(`   Region: ${process.env.AWS_REGION}`);
        console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);

        return s3Client;
    } catch (error) {
        console.error('❌ Failed to initialize AWS S3 Client:', error.message);
        console.error('');
        console.error('   To fix this issue:');
        console.error('   1. Create an AWS account and set up an S3 bucket');
        console.error('   2. Create IAM user with S3 access permissions');
        console.error('   3. Add the following to your .env file:');
        console.error('      AWS_ACCESS_KEY_ID=your_access_key');
        console.error('      AWS_SECRET_ACCESS_KEY=your_secret_key');
        console.error('      AWS_REGION=your_region (e.g., us-east-1)');
        console.error('      AWS_S3_BUCKET_NAME=your_bucket_name');
        console.error('');
        throw error;
    }
}

/**
 * Get S3 Client instance
 */
function getS3Client() {
    if (!s3Client) {
        return initializeAWS();
    }
    return s3Client;
}

/**
 * Get S3 bucket name from environment
 */
function getBucketName() {
    return process.env.AWS_S3_BUCKET_NAME;
}

module.exports = {
    initializeAWS,
    getS3Client,
    getBucketName
};
