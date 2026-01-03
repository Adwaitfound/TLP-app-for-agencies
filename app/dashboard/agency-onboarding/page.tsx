"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequestRow {
  id: string;
  agency_name: string;
  admin_email: string;
  admin_name: string | null;
  website: string | null;
  plan: string;
  notes: string | null;
  status: string;
  created_at: string;
  metadata?: any;
}

interface ProvisioningStatus {
  requestId: string;
  status: string;
  agencyName: string;
  metadata: {
    step?: string;
    instanceUrl?: string;
    error?: string;
  };
}

export default function AgencyOnboardingAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<Record<string, ProvisioningStatus>>({});
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium'>('standard');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("You must be signed in to view this page.");
      setLoading(false);
      return;
    }
    if (user.email?.toLowerCase() !== "adwait@thelostproject.in") {
      setError("Access restricted to adwait@thelostproject.in.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/agency-onboarding", {
          headers: { "x-user-email": user.email },
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || "Failed to load onboarding requests");
        }
        const payload = await res.json();
        setRows(payload.requests || []);
      } catch (err: any) {
        setError(err?.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, authLoading]);

  const approve = async (requestId: string, plan?: string) => {
    // Open tier selection modal instead of directly approving
    setPendingRequestId(requestId);
    setSelectedTier('standard');
    setTierModalOpen(true);
  };

  const confirmApproval = async () => {
    if (!pendingRequestId) return;
    
    setActingId(pendingRequestId);
    setTierModalOpen(false);
    try {
      const res = await fetch("/api/admin/agency-onboarding/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({ requestId: pendingRequestId, tier: selectedTier }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to approve request");
      }
      
      // Start polling for status
      pollProvisioningStatus(pendingRequestId);
      
      // Refresh list
      const refreshed = await fetch("/api/admin/agency-onboarding", {
        headers: { "x-user-email": user?.email || "" },
      });
      const payload = await refreshed.json();
      setRows(payload.requests || []);
    } catch (err: any) {
      setError(err?.message || "Unexpected error while approving");
    } finally {
      setActingId(null);
      setPendingRequestId(null);
    }
  };

  const pollProvisioningStatus = async (requestId: string, attempts = 0) => {
    if (attempts > 120) { // Stop after 10 minutes (120 * 5s = 600s)
      setProvisioningStatus(prev => ({
        ...prev,
        [requestId]: {
          ...prev[requestId],
          status: 'timeout',
          metadata: { error: 'Provisioning timed out. Check logs.' }
        }
      }));
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/agency-onboarding/status?requestId=${requestId}`,
        {
          headers: { "x-user-email": user?.email || "" },
        }
      );

      if (res.ok) {
        const status: ProvisioningStatus = await res.json();
        setProvisioningStatus(prev => ({ ...prev, [requestId]: status }));

        // Continue polling if still provisioning
        if (status.status === 'provisioning') {
          setTimeout(() => pollProvisioningStatus(requestId, attempts + 1), 5000);
        } else if (status.status === 'approved' || status.status === 'failed') {
          // Refresh the full list
          const refreshed = await fetch("/api/admin/agency-onboarding", {
            headers: { "x-user-email": user?.email || "" },
          });
          const payload = await refreshed.json();
          setRows(payload.requests || []);
        }
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
      // Continue polling even on error
      setTimeout(() => pollProvisioningStatus(requestId, attempts + 1), 5000);
    }
  };

  const resendInvite = async (requestId: string, email: string) => {
    setActingId(requestId);
    try {
      const res = await fetch("/api/admin/agency-onboarding/resend-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to resend invite");
      }
      const payload = await res.json();
      if (payload.sent) {
        setError(null);
        let message = "";
        if (payload.emailSent) {
          message = `Login credentials have been emailed to ${email}`;
        } else {
          message = `Login credentials have been set!\n\nEmail: ${email}\nTemporary Password: ${payload.tempPassword}\nLogin URL: ${payload.loginUrl}\n\n⚠️ Email service not configured - please share these credentials manually`;
        }
        alert(message);
      } else {
        throw new Error("Failed to send invite");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error while resending invite");
    } finally {
      setActingId(null);
    }
  };

  const resetRequest = async (requestId: string) => {
    if (!confirm("Reset this request back to pending status?")) return;
    setActingId(requestId);
    try {
      const res = await fetch("/api/admin/agency-onboarding/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to reset request");
      }
      
      // Refresh list
      const refreshed = await fetch("/api/admin/agency-onboarding", {
        headers: { "x-user-email": user?.email || "" },
      });
      const payload = await refreshed.json();
      setRows(payload.requests || []);
    } catch (err: any) {
      setError(err?.message || "Unexpected error while resetting");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agency Onboarding</h1>
          <p className="text-sm text-muted-foreground">Latest onboarding submissions (up to 200).</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading submissions...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No submissions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Agency</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Website</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{row.agency_name}</td>
                        <td className="px-4 py-3">{row.admin_name || "—"}</td>
                        <td className="px-4 py-3">{row.admin_email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {row.plan}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]">{row.website || "—"}</td>
                        <td className="px-4 py-3 max-w-[240px] whitespace-pre-line">{row.notes || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => approve(row.id, row.plan)}
                              disabled={actingId === row.id}
                            >
                              {actingId === row.id ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Starting...
                                </span>
                              ) : (
                                "Approve & Provision"
                              )}
                            </Button>
                          ) : row.status === "provisioning" ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                <span className="font-medium">Provisioning...</span>
                              </div>
                              {provisioningStatus[row.id]?.metadata?.step && (
                                <span className="text-xs text-muted-foreground">
                                  {provisioningStatus[row.id].metadata.step}
                                </span>
                              )}
                            </div>
                          ) : row.status === "approved" ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="font-medium">Deployed</span>
                                </div>
                                {row.metadata?.instanceUrl && (
                                  <a 
                                    href={row.metadata.instanceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    {row.metadata.instanceUrl}
                                  </a>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resetRequest(row.id)}
                                disabled={actingId === row.id}
                              >
                                {actingId === row.id ? "Resetting..." : "Reset"}
                              </Button>
                            </div>
                          ) : row.status === "failed" ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  <span className="font-medium">Failed</span>
                                </div>
                                {row.metadata?.error && (
                                  <span className="text-xs text-red-500">
                                    {row.metadata.error}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resetRequest(row.id)}
                                disabled={actingId === row.id}
                              >
                                {actingId === row.id ? "Resetting..." : "Retry"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier Selection Modal */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Subscription Tier</DialogTitle>
            <DialogDescription>
              Choose the plan for this agency
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Standard Tier */}
            <div 
              onClick={() => setSelectedTier('standard')}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedTier === 'standard' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">Standard</h3>
                  <p className="text-sm text-gray-600">For small agencies</p>
                </div>
                <input 
                  type="radio" 
                  checked={selectedTier === 'standard'}
                  onChange={() => setSelectedTier('standard')}
                  className="mt-1"
                />
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✓ 1 Admin</p>
                <p>✓ 2 Employees</p>
                <p>✓ 2 Clients</p>
                <p>✓ Dashboard, Projects, All Clients, Team Members, All Files, Invoices, Settings</p>
                <p className="text-xs text-gray-500 pt-2">Extra employees/clients available as paid add-ons</p>
              </div>
            </div>

            {/* Premium Tier */}
            <div 
              onClick={() => setSelectedTier('premium')}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedTier === 'premium' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">Premium</h3>
                  <p className="text-sm text-gray-600">For growing agencies</p>
                </div>
                <input 
                  type="radio" 
                  checked={selectedTier === 'premium'}
                  onChange={() => setSelectedTier('premium')}
                  className="mt-1"
                />
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✓ 2 Admins</p>
                <p>✓ 4 Employees</p>
                <p>✓ 4 Clients</p>
                <p>✓ All Standard features</p>
                <p>✓ Plus: Comments, Payments & Vendors, Analytics</p>
                <p className="text-xs text-gray-500 pt-2">Extra employees/clients available as paid add-ons</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setTierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={!pendingRequestId || actingId === pendingRequestId}
            >
              {actingId === pendingRequestId ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting...
                </span>
              ) : (
                'Approve & Provision'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>    </div>
  );
}