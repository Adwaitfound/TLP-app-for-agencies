"use client";

import { useEffect, useState } from "react";

export function VersionBadge() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    // Fetch version from package.json or environment variable
    const appVersion =
      process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version;
    if (appVersion) {
      setVersion(appVersion);
    }
  }, []);

  if (!version) return null;

  return (
    <div className="fixed top-0 right-0 m-2 z-50">
      <div className="text-xs font-mono bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 px-3 py-1.5 rounded-md border border-slate-700 shadow-lg">
        v{version}
      </div>
    </div>
  );
}
