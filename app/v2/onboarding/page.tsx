'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Onboarding Page - Example
 * 
 * This page is shown when a user has no SaaS organization
 * It allows them to create their first organization
 */

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Create organization via API
      const response = await fetch('/api/v2/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create organization');
        return;
      }

      // Redirect to dashboard
      router.push('/v2/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">Welcome!</CardTitle>
          <CardDescription className="text-slate-400">
            Let's create your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-slate-200">
                Organization Name
              </Label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="My Agency"
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">
                This is the name of your agency or company
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                You can add team members and customize settings later
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
