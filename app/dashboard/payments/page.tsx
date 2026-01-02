"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Wallet,
  Users,
  TrendingUp,
  Clock,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  fetchVendors,
  fetchPayments,
  fetchVendorAnalytics,
  fetchVendorAssignments,
} from "@/app/actions/vendor-operations";
import { VendorList } from "@/components/payments/vendor-list";
import { PaymentList } from "@/components/payments/payment-list";
import { ProjectBudgetTracker } from "@/components/payments/project-budget-tracker";
import { AddVendorDialog } from "@/components/payments/add-vendor-dialog";
import { AddPaymentDialog } from "@/components/payments/add-payment-dialog";
import type {
  Vendor,
  VendorPayment,
  VendorProjectAssignment,
  ServiceType,
} from "@/types";
import { SERVICE_TYPES } from "@/types";
import { useAuth } from "@/contexts/auth-context";

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [assignments, setAssignments] = useState<VendorProjectAssignment[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [filterVertical, setFilterVertical] = useState<ServiceType | "all">(
    "all",
  );

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading]);

  async function loadData() {
    setPageLoading(true);
    try {
      const [vendorsRes, paymentsRes, analyticsRes, assignmentsRes] =
        await Promise.all([
          fetchVendors(),
          fetchPayments(),
          fetchVendorAnalytics(),
          fetchVendorAssignments(),
        ]);

      if (vendorsRes.vendors) setVendors(vendorsRes.vendors);
      if (paymentsRes.payments) setPayments(paymentsRes.payments);
      if (assignmentsRes.assignments)
        setAssignments(assignmentsRes.assignments);
      if (analyticsRes) setAnalytics(analyticsRes);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setPageLoading(false);
    }
  }

  const activeVendors = vendors.filter((v) => v.is_active).length;
  const totalPaid = analytics?.totalPaid || 0;
  const pendingPayments = analytics?.pendingPayments || 0;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payments & Vendors
          </h1>
          <p className="text-muted-foreground">
            Track vendor payments, budgets, and project expenses across all
            verticals
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => setShowAddVendor(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setShowAddPayment(true)}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeVendors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">All time payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pendingPayments)}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled & pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payments
                  .filter((p) => {
                    const date = new Date(p.payment_date || p.created_at);
                    const now = new Date();
                    return (
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear() &&
                      p.status === "completed"
                    );
                  })
                  .reduce((sum, p) => sum + p.amount, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">Payments made</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="budgets">Project Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Vertical Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Filter by Vertical</CardTitle>
              <CardDescription>
                View payments and vendors by service type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterVertical === "all" ? "default" : "outline"}
                  onClick={() => setFilterVertical("all")}
                  size="sm"
                >
                  All Verticals
                </Button>
                {Object.values(SERVICE_TYPES).map((service) => (
                  <Button
                    key={service.value}
                    variant={
                      filterVertical === service.value ? "default" : "outline"
                    }
                    onClick={() => setFilterVertical(service.value)}
                    size="sm"
                  >
                    {service.icon} {service.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Latest vendor payments across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentList
                payments={payments.slice(0, 10)}
                onRefresh={loadData}
                compact
              />
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Amount Paid</CardTitle>
              <CardDescription>
                Vendors with highest total payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendors
                  .sort((a, b) => b.total_amount_paid - a.total_amount_paid)
                  .slice(0, 5)
                  .map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {vendor.vendor_type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(vendor.total_amount_paid)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vendor.total_projects_worked} projects
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <VendorList
            vendors={vendors}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentList payments={payments} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <ProjectBudgetTracker payments={payments} assignments={assignments} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddVendorDialog
        open={showAddVendor}
        onOpenChange={setShowAddVendor}
        onSuccess={loadData}
      />

      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        vendors={vendors}
        onSuccess={loadData}
      />
    </div>
  );
}
