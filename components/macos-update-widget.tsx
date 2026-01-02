"use client";

import { useEffect, useState } from "react";
import { Check, Download, AlertCircle } from "lucide-react";

export function MacOSUpdateWidget() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in Tauri desktop environment
    if (typeof window === "undefined" || !("__TAURI__" in window)) {
      return;
    }

    checkForUpdates();
    // Check every hour
    const interval = setInterval(checkForUpdates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch("/api/check-updates", {
        headers: { "X-Client": "tauri-dmg" },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.updateAvailable && data.downloadUrl) {
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.warn("Update check failed", err);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateAvailable) return;

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/get-update-info", {
        headers: { "X-Client": "tauri-dmg" },
      });

      if (!response.ok) throw new Error("Failed to get update info");

      const { downloadUrl, version } = await response.json();

      if (typeof window !== "undefined" && "__TAURI__" in window) {
        // Use Tauri shell command to download and open DMG
        const { invoke } = (window as any).__TAURI__.core;
        try {
          await invoke("download_and_open_dmg", {
            url: downloadUrl,
            version,
          });
        } catch (tauriErr) {
          console.error("Tauri invoke failed, falling back to direct download", tauriErr);
          window.open(downloadUrl, "_blank");
        }
      }

      setUpdateAvailable(false);
      setIsDownloading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      setIsDownloading(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isDownloading ? (
            <div className="animate-spin">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          ) : error ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {error ? "Update Failed" : isDownloading ? "Downloading Update" : "Update Available"}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {error
              ? error
              : isDownloading
              ? `${downloadProgress}% complete`
              : "A newer version is ready. Click below to update now."}
          </p>

          {isDownloading && (
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {!isDownloading && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={downloadAndInstall}
            disabled={isDownloading}
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50"
          >
            Update Now
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white text-xs font-medium rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}
