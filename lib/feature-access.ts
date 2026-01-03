/**
 * Feature Access Control
 * Middleware and utilities for controlling feature access by subscription tier
 */

import { createServiceClient } from '@/lib/supabase/server';
import { hasFeature, type SubscriptionTier } from '@/lib/tier-features';

/**
 * Check if a user has access to a feature based on their agency's tier
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<{ hasAccess: boolean; tier?: SubscriptionTier; reason?: string }> {
  try {
    const supabase = createServiceClient();

    // Get user's agency
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('agency_id')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return { hasAccess: false, reason: 'User not in any agency' };
    }

    // Get agency tier
    const { data: agency } = await supabase
      .from('agencies')
      .select('tier')
      .eq('id', membership.agency_id)
      .single();

    if (!agency) {
      return { hasAccess: false, reason: 'Agency not found' };
    }

    const tier = agency.tier as SubscriptionTier;
    const access = hasFeature(tier, feature);

    return {
      hasAccess: access,
      tier,
      reason: !access ? `Feature ${feature} not available in ${tier} tier` : undefined,
    };
  } catch (error: any) {
    console.error('Feature access check failed:', error);
    return { hasAccess: false, reason: 'Error checking access' };
  }
}

/**
 * Check if a feature should be shown in UI for a given tier
 */
export function shouldShowFeature(tier: SubscriptionTier, feature: string): boolean {
  return hasFeature(tier, feature);
}

/**
 * Get a list of unavailable features for a tier
 */
export function getUnavailableFeatures(tier: SubscriptionTier): string[] {
  const availableFeatures = new Set(tier === 'standard' ? 
    ['dashboard', 'projects', 'all_clients', 'team_members', 'all_files', 'invoices', 'settings'] :
    ['dashboard', 'projects', 'all_clients', 'team_members', 'all_files', 'invoices', 'settings', 'comments', 'payments_vendors', 'analytics']
  );
  
  const allFeatures = ['dashboard', 'projects', 'all_clients', 'team_members', 'all_files', 'invoices', 'settings', 'comments', 'payments_vendors', 'analytics'];
  
  return allFeatures.filter(f => !availableFeatures.has(f));
}
