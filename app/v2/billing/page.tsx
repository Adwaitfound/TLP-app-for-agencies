'use client';

import { useOrg, withOrgProtection } from '@/lib/org-context';
import { EmptyStateGuard } from '../components/empty-state-guard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function BillingPage() {
  const { organization, isAdmin } = useOrg();

  return (
    <EmptyStateGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and payments</p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold capitalize">{organization?.plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{organization?.status}</p>
              </div>
            </div>
            {organization?.plan === 'free' && (
              <Button className="w-full">Upgrade to Pro</Button>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-center py-8">
              No payments yet
            </div>
          </CardContent>
        </Card>
      </div>
    </EmptyStateGuard>
  );
}

export default withOrgProtection(BillingPage);
