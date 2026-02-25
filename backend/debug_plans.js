const express = require('express');
const app = express();
const adminService = require('./services/admin.service');
const { initializeFirebase } = require('./config/firebase.config');

async function start() {
    try {
        console.log('Initializing Firebase...');
        await initializeFirebase();
        
        console.log('Fetching plans...');
        const plans = await adminService.getSubscriptionPlans();
        console.log('PLANS DATA:', JSON.stringify(plans, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

start();
