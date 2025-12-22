"use client";

import { useAuth } from "@/contexts/auth-context";
import { EmployeeDashboardTabs } from "@/components/dashboard/employee-dashboard-tabs";

export default function EmployeeDashboardPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <EmployeeDashboardTabs />;
}
