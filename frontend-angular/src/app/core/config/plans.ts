/**
 * Plan Configuration
 * ==================
 * Defines limits and features for each subscription tier.
 */

export interface PlanLimits {
  storageLimit: number; // in GB
  uploadLimit: number; // in MB
  aiRequestsPerMonth: number;
  sharePermissions: string[];
  mfaEnabled: boolean;
}

export const PLANS: Record<string, PlanLimits> = {
  FREE: {
    storageLimit: 5,
    uploadLimit: 20,
    aiRequestsPerMonth: 50,
    sharePermissions: ['read'],
    mfaEnabled: false
  },
  PROFESSIONAL: {
    storageLimit: 50,
    uploadLimit: 250,
    aiRequestsPerMonth: 300,
    sharePermissions: ['read', 'edit', 'download'],
    mfaEnabled: true
  },
  PRO: {
    storageLimit: 500,
    uploadLimit: Infinity,
    aiRequestsPerMonth: 1000,
    sharePermissions: ['read', 'edit', 'download'],
    mfaEnabled: true
  }
};
