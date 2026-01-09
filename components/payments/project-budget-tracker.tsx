"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPES } from "@/types";
import type {
  VendorPayment,
  VendorProjectAssignment,
  ServiceType,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle } from "lucide-react";

interface ProjectBudgetTrackerProps {
  payments: VendorPayment[];
  assignments: VendorProjectAssignment[];
}

interface ProjectBudget {
  id: string;
  name: string;
  service_type: ServiceType;
  budget: number;
  totalPaid: number;
  pendingPayments: number;
  vendorCount: number;
}

export function ProjectBudgetTracker({
  payments,
  assignments,
}: ProjectBudgetTrackerProps) {
  const [projects, setProjects] = useState<ProjectBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjectBudgets = useCallback(async () => {
    const supabase = createClient();

    const { data: projectsData, error } = await supabase
      .from("projects")
      .select("id, name, service_type, budget")
      .not("budget", "is", null)
      .order("name");

    if (error || !projectsData) {
      setLoading(false);
      return;
    }

    const budgets: ProjectBudget[] = projectsData.map((project) => {
      const projectPayments = payments.filter(
        (p) => p.project_id === project.id,
      );
      const totalPaid = projectPayments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const pendingPayments = projectPayments
        .filter((p) => p.status === "pending" || p.status === "scheduled")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const vendorCount = new Set(
        assignments
          .filter((a) => a.project_id === project.id)
          .map((a) => a.vendor_id),
      ).size;

      return {
        id: project.id,
        name: project.name,
        service_type: project.service_type,
        budget: Number(project.budget) || 0,
        totalPaid,
        pendingPayments,
        vendorCount,
      };
    });

    setProjects(budgets);
    setLoading(false);
  }, [assignments, payments]);

  useEffect(() => {
    void loadProjectBudgets();
  }, [loadProjectBudgets]);

  if (loading) {
    return <div className="text-center py-8">Loading budget data...</div>;
  }

  // Group by vertical
  const videoProduction = projects.filter(
    (p) => p.service_type === "video_production",
  );
  const socialMedia = projects.filter((p) => p.service_type === "social_media");
  const designBranding = projects.filter(
    (p) => p.service_type === "design_branding",
  );

  const renderProjectGroup = (
    title: string,
    projectList: ProjectBudget[],
    serviceType: ServiceType,
  ) => {
    if (projectList.length === 0) return null;

    const totalBudget = projectList.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projectList.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalPending = projectList.reduce(
      (sum, p) => sum + p.pendingPayments,
      0,
    );

    return (
      <Card key={serviceType}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {SERVICE_TYPES[serviceType].icon} {title}
              </CardTitle>
              <CardDescription>{projectList.length} projects</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatCurrency(totalPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalPending / totalBudget) * 100).toFixed(1)}% of budget
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalBudget - totalSpent - totalPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(
                  ((totalBudget - totalSpent - totalPending) / totalBudget) *
                  100
                ).toFixed(1)}
                % available
              </p>
            </div>
          </div>

          {/* Individual Projects */}
          <div className="space-y-3">
            {projectList.map((project) => {
              const spent = project.totalPaid;
              const pending = project.pendingPayments;
              const remaining = project.budget - spent - pending;
              const percentSpent = (spent / project.budget) * 100;
              const percentPending = (pending / project.budget) * 100;
              const isOverBudget = spent + pending > project.budget;

              return (
                <div
                  key={project.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{project.name}</h4>
                        {isOverBudget && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Over Budget
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.vendorCount} vendor
                        {project.vendorCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-semibold">
                        {formatCurrency(project.budget)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Spent & Pending
                      </span>
                      <span className="font-medium">
                        {formatCurrency(spent + pending)} (
                        {(percentSpent + percentPending).toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={Math.min(percentSpent + percentPending, 100)}
                      className={isOverBudget ? "bg-red-100" : ""}
                    />
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-red-600">
                        {formatCurrency(spent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium text-yellow-600">
                        {formatCurrency(pending)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p
                        className={`font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderProjectGroup(
        "Video Production",
        videoProduction,
        "video_production",
      )}
      {renderProjectGroup("Social Media", socialMedia, "social_media")}
      {renderProjectGroup(
        "Design & Branding",
        designBranding,
        "design_branding",
      )}

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No projects with budgets found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
