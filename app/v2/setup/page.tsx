/**
 * /app/v2/setup - Magic Link Setup Page
 * Where admin sets password and creates first account after paying
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Step = 'loading' | 'verify' | 'setup' | 'success' | 'error';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setError('No setup token provided. Invalid or expired link.');
      setStep('error');
      return;
    }

    verifyMagicLink();
  }, [token]);

  const verifyMagicLink = async () => {
    try {
      setStep('loading');
      
      const response = await fetch('/api/v2/setup/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid or expired setup link');
        setStep('error');
        return;
      }

      setEmail(data.email);
      setOrgName(data.orgName);
      setFullName('');
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to verify link');
      setStep('error');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!fullName.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Call setup endpoint
      const response = await fetch('/api/v2/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          fullName: fullName.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Setup failed');
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      setStep('success');
      setTimeout(() => {
        router.push('/v2/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying setup link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Setup Link Invalid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button asChild className="w-full">
              <a href="/">Return Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
            <CardTitle>Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Your workspace is ready. Redirecting to dashboard...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
          <CardDescription>
            Welcome to <span className="font-semibold text-foreground">{orgName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This is the email address we'll use for your account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-sm">Confirm Password *</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Confirm your password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This link was sent to {email}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
