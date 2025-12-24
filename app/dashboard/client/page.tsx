"use client";

import { Suspense } from "react";
import ClientDashboard from "./client-view";

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ClientDashboard />
    </Suspense>
  );
}
