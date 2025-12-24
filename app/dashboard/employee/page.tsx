"use client";

import { Suspense } from "react";
import { EmployeeDashboardTabs } from "@/components/dashboard/employee-dashboard-tabs";

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <EmployeeDashboardTabs />
    </Suspense>
  );
}
