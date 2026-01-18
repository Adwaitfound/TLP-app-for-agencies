/**
 * /agency-onboarding (Updated)
 * Agency onboarding form with Razorpay payment integration
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck, ArrowLeft, Check } from 'lucide-react';
import Script from 'next/script';

type Step = 'form' | 'plan-select' | 'payment' | 'processing' | 'success' | 'error';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function AgencyOnboardingPage() {
  const router = useRouter();

  // Form state
  const [agencyName, setAgencyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium'>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Payment
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agencyName.trim() || !adminEmail.trim()) {
      setError('Agency name and admin email are required');
      return;
    }

    // All plans go through payment (₹1 for free tier in test mode)
    setStep('plan-select');
  };

  const submitFreeOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('agencyName', agencyName.trim());
      formData.append('adminName', adminName.trim() || '');
      formData.append('adminEmail', adminEmail.trim());
      formData.append('website', website.trim() || '');
      formData.append('plan', 'free');
      formData.append('notes', notes.trim() || '');
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await fetch('/api/agency/onboarding', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setStep('success');
      setTimeout(() => {
        router.push('/agency/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Setup failed');
      setLoading(false);
    }
  };

  const createPaymentOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v2/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: agencyName.trim(),
          adminEmail: adminEmail.trim(),
          plan: selectedPlan,
          billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment order');
      }

      setOrderId(data.order.id);
      setStep('payment');
      setLoading(false);

      // Trigger payment UI
      setTimeout(() => {
        handlePayment(data.order);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const handleTestModePayment = async (order: any) => {
    try {
      setStep('processing');
      setLoading(true);

      // Simulate a small delay for realism
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In test mode, we skip payment verification and go straight to org creation
      const res = await fetch('/api/v2/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: agencyName.trim(),
          slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          adminEmail: adminEmail.trim(),
          adminName: adminName.trim(),
          plan: selectedPlan,
          billingCycle,
          orderId: order.id,
          testMode: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete setup');
      }

      setStep('success');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Setup failed');
      setStep('plan-select');
      setLoading(false);
    }
  };

  const handlePayment = (order: any) => {
    // Check if we're in test mode based on explicit flag from backend
    const isTestMode = order.testMode === true;
    
    if (isTestMode) {
      // Test mode: Skip Razorpay and simulate successful payment
      console.log('[TEST MODE] Skipping Razorpay checkout, simulating payment success');
      handleTestModePayment(order);
      return;
    }

    // Production mode: Use real Razorpay checkout
    if (!window.Razorpay) {
      setError('Payment gateway not loaded');
      return;
    }

    const options = {
      key: order.keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      description: `${order.plan.charAt(0).toUpperCase() + order.plan.slice(1)} Plan - ${order.billingCycle}`,
      image: '/logo.png',
      handler: async (response: RazorpayResponse) => {
        try {
          setStep('processing');
          setLoading(true);

          // Verify payment with backend
          const verifyRes = await fetch('/api/v2/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok) {
            throw new Error(verifyData.error || 'Payment verification failed');
          }

          // Show success message
          setStep('success');
          setLoading(false);
          
          // Note: Organization will be created by webhook
          // Magic link will be sent via email once webhook processes the payment
        } catch (err: any) {
          setError(err.message || 'Payment verification failed');
          setStep('form');
          setLoading(false);
        }
      },
      prefill: {
        name: adminName,
        email: adminEmail,
      },
      theme: {
        color: '#0066cc',
      },
      modal: {
        ondismiss: () => {
          setStep('plan-select');
          setLoading(false);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Check className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Payment successful! ✅
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Check your email at <strong>{adminEmail}</strong> for the setup link.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                The link will arrive within 1-2 minutes. Check your spam folder if you don't see it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">{error}</p>
            <Button
              onClick={() => {
                setStep('form');
                setError(null);
              }}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
          <Button variant="ghost" className="gap-2 px-0" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Multi-tenant ready
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full bg-gradient-to-b from-background via-background to-muted/20 py-12 md:py-20">
          <div className="container max-w-4xl px-4 md:px-6">
            {step === 'form' && (
              <>
                <div className="mb-8 space-y-3 text-center md:mb-10">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Agency Onboarding
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                    Spin up a workspace for your agency
                  </h1>
                  <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                    We will provision a dedicated tenant and send you a setup link.
                  </p>
                </div>

                <Card className="border bg-card/60 shadow-lg">
                  <CardHeader className="space-y-2">
                    <CardTitle>Tell us about your agency</CardTitle>
                    <CardDescription>We use this info to set up your isolated workspace.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-6" onSubmit={handleFormSubmit}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="agencyName">Agency name *</Label>
                          <Input
                            id="agencyName"
                            placeholder="Your Agency Name"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            placeholder="https://yourwebsite.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adminName">Admin name</Label>
                          <Input
                            id="adminName"
                            placeholder="Jane Doe"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adminEmail">Admin email *</Label>
                          <Input
                            id="adminEmail"
                            type="email"
                            placeholder="jane@agency.com"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          placeholder="Team size, regions, features you need..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {error && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Next: Select Plan'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {step === 'plan-select' && (
              <>
                <div className="mb-8 space-y-3 text-center md:mb-10">
                  <h2 className="text-2xl font-semibold tracking-tight">Choose Your Plan</h2>
                  <p className="text-muted-foreground">
                    Select a plan to get started. You can upgrade or downgrade anytime.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3 mb-8">
                  {/* Free Plan */}
                  <Card
                    className={`cursor-pointer transition ${
                      selectedPlan === 'free'
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan('free')}
                  >
                    <CardHeader>
                      <CardTitle>Free</CardTitle>
                    <CardDescription>Test with ₹1 payment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold">₹1</p>
                      <p className="text-sm text-muted-foreground">/month (test mode)</p>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Dashboard & Projects</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>2 Team Members</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>2 Clients</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Standard Plan */}
                  <Card
                    className={`cursor-pointer transition ${
                      selectedPlan === 'standard'
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan('standard')}
                  >
                    <CardHeader>
                      <CardTitle>Standard</CardTitle>
                      <CardDescription>For growing teams</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-2xl font-bold">₹999</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Everything in Free</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>5 Team Members</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>10 Clients</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Comments & Files</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Premium Plan */}
                  <Card
                    className={`cursor-pointer transition ${
                      selectedPlan === 'premium'
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan('premium')}
                  >
                    <CardHeader>
                      <CardTitle>Premium</CardTitle>
                      <CardDescription>For enterprises</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-2xl font-bold">₹2999</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Everything in Standard</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>20 Team Members</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>100 Clients</span>
                        </li>
                        <li className="flex gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Payments, Invoices & Vendors</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setStep('form')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  {selectedPlan === 'free' ? (
                    <Button
                      onClick={createPaymentOrder}
                      disabled={loading}
                      className="gap-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Pay ₹1 & Continue
                    </Button>
                  ) : (
                    <>
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly (Save 17%)</option>
                      </select>
                      <Button
                        onClick={createPaymentOrder}
                        disabled={loading}
                        className="gap-2"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Proceed to Payment
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}

            {step === 'processing' && (
              <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-8 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="text-muted-foreground">Processing your payment...</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
