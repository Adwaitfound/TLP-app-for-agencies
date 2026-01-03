/**
 * Subscription Tier Feature Gating
 * 
 * Define features available for each subscription tier
 */

export type SubscriptionTier = 'standard' | 'premium';

export interface TierFeatures {
  maxEmployees: number;
  maxClients: number;
  maxAdmins: number;
  features: string[];
}

export const TIER_CONFIG: Record<SubscriptionTier, TierFeatures> = {
  standard: {
    maxEmployees: 2,
    maxClients: 2,
    maxAdmins: 1,
    features: [
      'dashboard',
      'projects',
      'all_clients',
      'team_members',
      'all_files',
      'invoices',
      'settings',
    ],
  },
  premium: {
    maxEmployees: 4,
    maxClients: 4,
    maxAdmins: 2,
    features: [
      'dashboard',
      'projects',
      'all_clients',
      'team_members',
      'all_files',
      'invoices',
      'settings',
      'comments',
      'payments_vendors',
      'analytics',
    ],
  },
};

/**
 * Check if a feature is available for a given tier
 */
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
  return TIER_CONFIG[tier].features.includes(feature);
}

/**
 * Get the feature difference between two tiers
 */
export function getFeatureDifference(tier1: SubscriptionTier, tier2: SubscriptionTier): string[] {
  const set1 = new Set(TIER_CONFIG[tier1].features);
  const set2 = new Set(TIER_CONFIG[tier2].features);
  return Array.from(set2).filter(f => !set1.has(f));
}

/**
 * Check seat availability for a tier
 */
export interface SeatAvailability {
  availableEmployeeSeats: number;
  availableClientSeats: number;
  availableAdminSeats: number;
  canAddEmployee: boolean;
  canAddClient: boolean;
  canAddAdmin: boolean;
}

export function checkSeatAvailability(
  tier: SubscriptionTier,
  currentEmployees: number,
  currentClients: number,
  currentAdmins: number,
  additionalEmployees: number = 0,
  additionalClients: number = 0
): SeatAvailability {
  const config = TIER_CONFIG[tier];
  const totalEmployeeSeats = config.maxEmployees + additionalEmployees;
  const totalClientSeats = config.maxClients + additionalClients;

  return {
    availableEmployeeSeats: Math.max(0, totalEmployeeSeats - currentEmployees),
    availableClientSeats: Math.max(0, totalClientSeats - currentClients),
    availableAdminSeats: Math.max(0, config.maxAdmins - currentAdmins),
    canAddEmployee: currentEmployees < totalEmployeeSeats,
    canAddClient: currentClients < totalClientSeats,
    canAddAdmin: currentAdmins < config.maxAdmins,
  };
}

/**
 * Feature availability descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<string, Record<SubscriptionTier, string>> = {
  comments: {
    standard: '❌ Not available',
    premium: '✅ Included',
  },
  payments_vendors: {
    standard: '❌ Not available',
    premium: '✅ Included',
  },
  analytics: {
    standard: '❌ Not available',
    premium: '✅ Included',
  },
};

/**
 * Display friendly feature names
 */
export const FEATURE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  all_clients: 'All Clients',
  team_members: 'Team Members',
  all_files: 'All Files',
  invoices: 'Invoices',
  settings: 'Settings',
  comments: 'Comments',
  payments_vendors: 'Payments & Vendors',
  analytics: 'Analytics',
};
