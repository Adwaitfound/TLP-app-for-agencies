"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function SwUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("🔄 SW Update: serviceWorker not available");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let controllerChangeListener: (() => void) | null = null;

    const onControllerChange = () => {
      console.log("🔄 SW Update: controller changed, reloading...");
      // When the new SW takes control, reload to get fresh assets
      window.location.reload();
    };

    const handleInstalled = (worker: ServiceWorker | null) => {
      if (!worker) return;
      console.log("🔄 SW Update: new version detected, showing banner");
      setWaitingWorker(worker);
      setShow(true);
    };

    const monitorRegistration = async () => {
      try {
        registration = await navigator.serviceWorker.ready;
        console.log("🔄 SW Update: service worker ready", registration);

        // Check if there's already a waiting worker (e.g., after tab restore)
        if (registration.waiting) {
          console.log("🔄 SW Update: existing waiting worker found");
          handleInstalled(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          console.log("🔄 SW Update: update found, new worker installing...");
          const newWorker = registration?.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            console.log("🔄 SW Update: new worker state:", newWorker.state);
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("🔄 SW Update: new worker installed and controller exists");
              handleInstalled(newWorker);
            }
          });
        });

        // Proactively check for updates every 5 seconds
        const updateInterval = setInterval(() => {
          console.log("🔄 SW Update: checking for updates...");
          registration?.update().catch((err) => console.warn("Update check failed:", err));
        }, 5000);

        controllerChangeListener = onControllerChange;
        navigator.serviceWorker.addEventListener("controllerchange", controllerChangeListener);
      } catch (err) {
        console.warn("🔄 SW Update: monitor failed", err);
      }
    };

    monitorRegistration();

    return () => {
      if (controllerChangeListener) {
        navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeListener);
      }
    };
  }, []);

  const activateUpdate = () => {
    if (waitingWorker) {
      console.log("🔄 SW Update: posting SKIP_WAITING to service worker");
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-4 w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-lg border bg-background shadow-xl p-3">
        <div className="flex-1">
          <p className="font-medium text-sm">New version available</p>
          <p className="text-xs text-muted-foreground">Refresh to load the latest build.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={activateUpdate}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh now
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShow(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
