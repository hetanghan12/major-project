/**
 * Fix Dashboard Data Script — Final
 */

// Initialize Firebase first
const { initializeFirebase, getFirestore } = require('./config/firebase.config');
initializeFirebase(); // IMPORTANT: This must be called first

const { seedDashboardStats } = require('./services/dashboard-stats.service');

async function runFix() {
    try {
        console.log('🚀 Starting Dashboard data fix...');
        const result = await seedDashboardStats();
        console.log('✅ Success! Dashboard data re-calibrated.');
        console.log('Result Summary:', {
            totalUsers: result.totalUsers,
            totalDocs: result.totalDocs,
            totalStorage: result.totalStorage
        });
        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error.stack || error.message);
        process.exit(1);
    }
}

runFix();
