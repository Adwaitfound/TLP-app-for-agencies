"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Status = "checking" | "ok" | "warning" | "error";

interface Check {
  name: string;
  status: Status;
  message: string;
  details?: string;
}

export function NotificationDiagnostics() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: Check[] = [];

    // Check 1: Browser support
    results.push({
      name: "Browser Support",
      status: "serviceWorker" in navigator && "PushManager" in window ? "ok" : "error",
      message:
        "serviceWorker" in navigator && "PushManager" in window
          ? "✅ Service Worker & Push API supported"
          : "❌ Browser doesn't support notifications",
    });

    // Check 2: Service Worker registration
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        results.push({
          name: "Service Worker",
          status: registration ? "ok" : "warning",
          message: registration
            ? `✅ Registered (${registration.scope})`
            : "⚠️ Not registered yet (will register on next navigation)",
          details: registration ? `State: ${registration.active ? "active" : "inactive"}` : undefined,
        });
      }
    } catch (err: any) {
      results.push({
        name: "Service Worker",
        status: "error",
        message: `❌ Error: ${err?.message || String(err)}`,
      });
    }

    // Check 3: Notification permission
    results.push({
      name: "Notification Permission",
      status: Notification.permission === "granted" ? "ok" : Notification.permission === "default" ? "warning" : "error",
      message:
        Notification.permission === "granted"
          ? "✅ Permission granted"
          : Notification.permission === "default"
            ? "⚠️ Not requested yet (will request on user action)"
            : "❌ Permission denied",
      details: `Current: ${Notification.permission}`,
    });

    // Check 4: Push subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      results.push({
        name: "Push Subscription",
        status: subscription ? "ok" : "warning",
        message: subscription ? "✅ Subscribed to push notifications" : "⚠️ Not subscribed yet (will subscribe on login)",
        details: subscription
          ? `Endpoint: ${subscription.endpoint.substring(0, 50)}...`
          : undefined,
      });
    } catch (err: any) {
      results.push({
        name: "Push Subscription",
        status: "error",
        message: `❌ Error: ${err?.message || String(err)}`,
      });
    }

    // Check 5: VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    results.push({
      name: "VAPID Configuration",
      status: vapidKey ? "ok" : "error",
      message: vapidKey
        ? "✅ Public key configured"
        : "❌ Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      details: vapidKey ? `Key: ${vapidKey.substring(0, 30)}...` : "Check .env.local",
    });

    // Check 6: App URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    results.push({
      name: "App URL Configuration",
      status: appUrl ? "ok" : "warning",
      message: appUrl
        ? "✅ App URL configured"
        : "⚠️ NEXT_PUBLIC_APP_URL not set (will use default)",
      details: appUrl || "Will default to current origin",
    });

    setChecks(results);
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: Status) => {
    switch (status) {
      case "ok":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const allOk = checks.every((c) => c.status === "ok");
  const hasErrors = checks.some((c) => c.status === "error");

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-40 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors opacity-50 hover:opacity-100"
        title="Notification diagnostics"
        aria-label="Show notification diagnostics"
      >
        🔍
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 max-h-[600px] overflow-y-auto shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Notification Status</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2">
              {getStatusIcon(check.status)}
              <span className="font-medium text-sm">{check.name}</span>
              <Badge className={`text-xs ${getStatusBadgeColor(check.status)}`}>
                {check.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground ml-7">{check.message}</p>
            {check.details && (
              <p className="text-xs text-muted-foreground ml-7 font-mono bg-muted p-1 rounded">
                {check.details}
              </p>
            )}
          </div>
        ))}

        <div className="pt-3 mt-3 border-t">
          <div className="text-xs font-medium mb-2">
            Overall Status:{" "}
            {allOk ? (
              <span className="text-green-600">✅ Ready</span>
            ) : hasErrors ? (
              <span className="text-red-600">❌ Issues Found</span>
            ) : (
              <span className="text-yellow-600">⚠️ Warnings</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            className="w-full text-xs"
          >
            🔄 Recheck
          </Button>
        </div>

        {hasErrors && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
            <p className="font-medium mb-1">Fix Issues:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Generate VAPID keys with: <code>npx web-push generate-vapid-keys</code></li>
              <li>Add to .env.local: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY</li>
              <li>Restart dev server</li>
              <li>Grant notification permission when prompted</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
