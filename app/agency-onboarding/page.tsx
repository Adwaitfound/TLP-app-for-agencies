"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function AgencyOnboardingPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [plan, setPlan] = useState("standard");
  const [notes, setNotes] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!agencyName.trim() || !adminEmail.trim()) {
      setError("Agency name and admin email are required.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("agencyName", agencyName.trim());
      formData.append("adminName", adminName.trim() || "");
      formData.append("adminEmail", adminEmail.trim());
      formData.append("website", website.trim() || "");
      formData.append("plan", plan);
      formData.append("notes", notes.trim() || "");
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await fetch("/api/agency/onboarding", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to submit onboarding request.");
      }

      setSuccess(true);
      setAgencyName("");
      setAdminName("");
      setAdminEmail("");
      setWebsite("");
      setPlan("standard");
      setNotes("");
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      setError(err?.message || "Unexpected error while submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
          <Button variant="ghost" className="gap-2 px-0" onClick={() => router.push("/")}>
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
            <div className="mb-8 space-y-3 text-center md:mb-10">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Agency Onboarding
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Spin up a workspace for your agency
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                We will provision a dedicated tenant, apply role-based access, and invite your admin. Share a few details to get started.
              </p>
            </div>

            <Card className="border bg-card/60 shadow-lg">
              <CardHeader className="space-y-2">
                <CardTitle>Tell us about your agency</CardTitle>
                <CardDescription>We use this to provision an isolated tenant and send the first admin invite.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={submit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Agency name *</Label>
                      <Input
                        id="agencyName"
                        placeholder="e.g. Your Agency Name"
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
                      <Label htmlFor="adminName">Primary admin name</Label>
                      <Input
                        id="adminName"
                        placeholder="Jane Doe"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Primary admin email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="jane@udm.example"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Agency logo</Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, SVG (max 5MB recommended)
                        </p>
                      </div>
                      {logoPreview && (
                        <div className="flex items-center justify-center h-12 w-12 bg-muted rounded-md border">
                          <img src={logoPreview} alt="Logo preview" className="max-h-10 max-w-10 object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan</Label>
                    <select
                      id="plan"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Team size, regions, integrations, or timelines."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <ShieldCheck className="h-4 w-4" />
                      Request received. We will provision your workspace and email the admin invite shortly.
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      We typically respond within one business day. For urgent requests, reply to the confirmation email.
                    </p>
                    <Button type="submit" className="gap-2" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Submit onboarding
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
