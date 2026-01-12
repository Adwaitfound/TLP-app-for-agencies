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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';

function MembersPage() {
  const { organization, isAdmin } = useOrg();
  const [activeTab, setActiveTab] = useState('active');

  return (
    <EmptyStateGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage your team and permissions</p>
          </div>
          {isAdmin && (
            <Button>+ Invite Member</Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Active
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pending
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="removed" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Removed
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Members</CardTitle>
                <CardDescription>Team members with access to your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-center py-8">
                  Only you in this organization for now
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invitations waiting to be accepted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-center py-8">
                  No pending invitations
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="removed">
              <Card>
                <CardHeader>
                  <CardTitle>Removed Members</CardTitle>
                  <CardDescription>Previously removed team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground text-center py-8">
                    No removed members
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </EmptyStateGuard>
  );
}

export default withOrgProtection(MembersPage);
