"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";


export function SwUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);


  // Auto-refresh countdown timer
  useEffect(() => {
    if (!show || countdown === null) return;
    
    if (countdown === 0) {
      console.log("🔄 SW Update: auto-refreshing after countdown");
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [show, countdown, waitingWorker]);

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
      setCountdown(300); // Auto-refresh in 5 minutes (300 seconds)

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

        // Proactively check for updates every 60 seconds
        const updateInterval = setInterval(() => {
          console.log("🔄 SW Update: checking for updates...");
          registration?.update().catch((err) => console.warn("Update check failed:", err));
        }, 60000);

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
      setCountdown(null); // Cancel auto-refresh
    }
  };

  if (!show) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 px-4 w-full max-w-xl animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/10 backdrop-blur-sm shadow-2xl p-4 ring-2 ring-primary/20">
        <div className="flex-1">
          <p className="font-semibold text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            New version available!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please refresh to get the latest features and fixes. This ensures the best experience.
          </p>
          {countdown !== null && countdown > 0 && (
            <p className="text-xs text-primary font-medium mt-2">
              Auto-refreshing in {formatTime(countdown)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={activateUpdate} className="font-semibold">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh now
          </Button>
          <Button size="icon" variant="ghost" onClick={() => {
            setShow(false);
            setCountdown(null);
          }} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
