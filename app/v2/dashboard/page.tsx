/**
 * /app/v2/dashboard - Multi-tenant SaaS dashboard
 * Main entry point after setup - now with admin layout
 */

'use client';

import { useOrg, usePlanFeatures, withOrgProtection } from '@/lib/org-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyStateGuard } from '../components/empty-state-guard';
import Link from 'next/link';
import { TrendingUp, Users, FolderOpen } from 'lucide-react';

const menuItems = [
  {
    href: '/app/v2/projects',
    label: 'Projects',
    icon: FolderOpen,
    available: true,
  },
  {
    href: '/app/v2/members',
    label: 'Team Members',
    icon: Users,
    available: true,
  },
  {
    href: '/app/v2/clients',
    label: 'Clients',
    icon: Users,
    available: true,
  },
];

function DashboardPage() {
  const { organization, member, user } = useOrg();
  const features = usePlanFeatures();

  if (!organization || !member) {
    return null;
  }

  // Get brand color from org settings
  const brandColor = organization?.settings?.brand_color || 'blue';
  const colorGradients = {
    blue: { from: 'rgb(240, 249, 255)', to: 'rgb(224, 242, 254)' },
    indigo: { from: 'rgb(238, 242, 255)', to: 'rgb(224, 231, 255)' },
    purple: { from: 'rgb(250, 245, 255)', to: 'rgb(243, 232, 255)' },
    pink: { from: 'rgb(253, 242, 248)', to: 'rgb(252, 231, 243)' },
    red: { from: 'rgb(254, 242, 242)', to: 'rgb(254, 226, 226)' },
    orange: { from: 'rgb(255, 247, 237)', to: 'rgb(255, 237, 213)' },
    amber: { from: 'rgb(255, 251, 235)', to: 'rgb(254, 243, 199)' },
    green: { from: 'rgb(240, 253, 244)', to: 'rgb(220, 252, 231)' },
    emerald: { from: 'rgb(240, 253, 250)', to: 'rgb(209, 250, 229)' },
    cyan: { from: 'rgb(240, 249, 250)', to: 'rgb(207, 250, 254)' },
  };

  const gradientStyle = colorGradients[brandColor] || colorGradients.blue;

  return (
    <div className="space-y-8">
        {/* Welcome Section */}
        <div 
          className="p-6 rounded-lg border"
          style={{
            background: `linear-gradient(to right, ${gradientStyle.from}, ${gradientStyle.to})`
          }}
        >
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Just you for now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Get started by creating one</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Invite your first client</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 MB</div>
              <p className="text-xs text-muted-foreground">
                {organization.plan === 'premium'
                  ? 'Of 500 GB'
                  : organization.plan === 'standard'
                  ? 'Of 50 GB'
                  : 'Of 5 GB'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6 mt-8 md:grid-cols-3">
          {/* Navigation Menu */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {menuItems
                  .filter((item) => item.available)
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
              </CardContent>
            </Card>

            {/* Locked Features */}
            {!features.payments && (
              <Card className="mt-4 border-amber-200 bg-amber-50 dark:bg-slate-800 dark:border-amber-900">
                <CardHeader>
                  <CardTitle className="text-sm">Upgrade to Premium</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Unlock payments, invoices, and vendors modules.
                  </p>
                  <Button className="w-full" size="sm">
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Your Workspace! 🎉</CardTitle>
                <CardDescription>
                  Get started by inviting team members or creating your first project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild>
                    <Link href="/app/v2/members">Invite Team Member</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/app/v2/projects">Create Project</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Workspace Name</p>
                    <p className="font-medium">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{organization.plan}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{organization.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your Role</p>
                    <p className="font-medium capitalize">{member.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Available Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(features).map(([feature, available]) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          available ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={available ? '' : 'text-muted-foreground line-through'}>
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

export default withOrgProtection(() => (
  <EmptyStateGuard>
    <DashboardPage />
  </EmptyStateGuard>
));
