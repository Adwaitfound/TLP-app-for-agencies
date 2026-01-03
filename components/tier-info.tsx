/**
 * Tier Info Display Component
 * Shows subscription tier, seat limits, and available features
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TIER_CONFIG,
  FEATURE_NAMES,
  checkSeatAvailability,
  type SubscriptionTier,
} from '@/lib/tier-features';

interface TierInfoProps {
  tier: SubscriptionTier;
  currentEmployees: number;
  currentClients: number;
  currentAdmins: number;
  additionalEmployees?: number;
  additionalClients?: number;
}

export function TierInfo({
  tier,
  currentEmployees,
  currentClients,
  currentAdmins,
  additionalEmployees = 0,
  additionalClients = 0,
}: TierInfoProps) {
  const config = TIER_CONFIG[tier];
  const seats = checkSeatAvailability(
    tier,
    currentEmployees,
    currentClients,
    currentAdmins,
    additionalEmployees,
    additionalClients
  );

  const employeePercentage = (currentEmployees / (config.maxEmployees + additionalEmployees)) * 100;
  const clientPercentage = (currentClients / (config.maxClients + additionalClients)) * 100;
  const adminPercentage = (currentAdmins / config.maxAdmins) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="capitalize">{tier} Tier</CardTitle>
            <CardDescription>
              {tier === 'premium' ? 'Growing agencies' : 'Small agencies'}
            </CardDescription>
          </div>
          <Badge variant={tier === 'premium' ? 'default' : 'secondary'} className="capitalize">
            {tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seat Usage */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Seat Usage</h4>

          {/* Employees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Employees: {currentEmployees}/{config.maxEmployees + additionalEmployees}</span>
              {!seats.canAddEmployee && (
                <Badge variant="destructive" className="text-xs">
                  Full
                </Badge>
              )}
            </div>
            <Progress value={Math.min(employeePercentage, 100)} className="h-2" />
            {seats.availableEmployeeSeats > 0 && (
              <p className="text-xs text-muted-foreground">
                {seats.availableEmployeeSeats} seats available
              </p>
            )}
          </div>

          {/* Clients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Clients: {currentClients}/{config.maxClients + additionalClients}</span>
              {!seats.canAddClient && (
                <Badge variant="destructive" className="text-xs">
                  Full
                </Badge>
              )}
            </div>
            <Progress value={Math.min(clientPercentage, 100)} className="h-2" />
            {seats.availableClientSeats > 0 && (
              <p className="text-xs text-muted-foreground">
                {seats.availableClientSeats} seats available
              </p>
            )}
          </div>

          {/* Admins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Admins: {currentAdmins}/{config.maxAdmins}</span>
              {!seats.canAddAdmin && (
                <Badge variant="destructive" className="text-xs">
                  Full
                </Badge>
              )}
            </div>
            <Progress value={Math.min(adminPercentage, 100)} className="h-2" />
            {seats.availableAdminSeats > 0 && (
              <p className="text-xs text-muted-foreground">
                {seats.availableAdminSeats} seats available
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Available Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {config.features.map(feature => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>{FEATURE_NAMES[feature] || feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Info for Standard Tier */}
        {tier === 'standard' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-900 mb-2">Upgrade to Premium</p>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>• 2 more employee seats (total 4)</li>
              <li>• 2 more client seats (total 4)</li>
              <li>• 1 more admin (total 2)</li>
              <li>• Comments on projects</li>
              <li>• Payments & Vendors management</li>
              <li>• Advanced Analytics</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
