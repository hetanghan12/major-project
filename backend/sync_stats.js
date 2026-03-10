const { initializeFirebase } = require('./config/firebase.config');
const { seedDashboardStats } = require('./services/dashboard-stats.service');
require('dotenv').config();

async function run() {
    console.log('🚀 Starting Dashboard Stats Synchronization...');
    try {
        initializeFirebase();
        const results = await seedDashboardStats();
        console.log('✅ Synchronization Complete!');
        console.log('Results:', JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('❌ Synchronization Failed:', error);
        process.exit(1);
    }
}

run();
