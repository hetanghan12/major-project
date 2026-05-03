/**
 * Plan Configuration (Backend)
 * ===========================
 * Defines limits for each subscription tier.
 */

const PLANS = {
    free: {
        storageLimitGB: 5,
        uploadLimitMB: 20,
        aiRequestsPerMonth: 50,
        sharePermissions: ['read'],
        mfaEnabled: false
    },
    professional: {
        storageLimitGB: 50,
        uploadLimitMB: 250,
        aiRequestsPerMonth: 300,
        sharePermissions: ['read', 'download'],
        mfaEnabled: true
    },
    pro: {
        storageLimitGB: 500,
        uploadLimitMB: Infinity,
        aiRequestsPerMonth: 1000,
        sharePermissions: ['read', 'download'],
        mfaEnabled: true
    }
};

module.exports = { PLANS };
