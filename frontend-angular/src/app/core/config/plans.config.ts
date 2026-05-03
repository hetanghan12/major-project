export interface PlanConfig {
    storageLimitGB: number;
    uploadLimitMB: number;
    aiRequestsPerMonth: number;
    sharePermissions: string[];
    mfaEnabled: boolean;
}

export const PLANS: { [key: string]: PlanConfig } = {
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
        sharePermissions: ['read', 'edit', 'download'],
        mfaEnabled: true
    },
    pro: {
        storageLimitGB: 500,
        uploadLimitMB: Infinity,
        aiRequestsPerMonth: 1000,
        sharePermissions: ['read', 'edit', 'download'],
        mfaEnabled: true
    }
};
