"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { VendorPayment, Vendor } from "@/types";

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

interface PaymentChartsProps {
  payments: VendorPayment[];
  vendors: Vendor[];
}

export function PaymentCharts({ payments, vendors }: PaymentChartsProps) {
  // Calculate key metrics
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.is_active).length;
  
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const pendingPayments = payments
    .filter((p) => p.status === "pending" || p.status === "scheduled")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const thisMonth = payments
    .filter((p) => {
      if (p.status !== "completed" || !p.payment_date) return false;
      const date = new Date(p.payment_date);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const keyMetricsData = [
    { name: "Total Paid", value: totalPaid, color: "#10b981" },
    { name: "Pending", value: pendingPayments, color: "#f59e0b" },
    { name: "This Month", value: thisMonth, color: "#3b82f6" },
  ];

  console.log("Payment Charts Data:", { totalPaid, pendingPayments, thisMonth, paymentsCount: payments.length });

  // Calculate vendor spending
  const vendorSpending = vendors
    .map((vendor) => {
      const totalPaid = payments
        .filter((p) => p.vendor_id === vendor.id && p.status === "completed")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      return {
        name: vendor.name,
        amount: totalPaid,
      };
    })
    .filter((v) => v.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Calculate payment status breakdown
  const statusBreakdown = {
    completed: payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    pending: payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    scheduled: payments
      .filter((p) => p.status === "scheduled")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    cancelled: payments
      .filter((p) => p.status === "cancelled")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  };

  const statusData = [
    { name: "Completed", value: statusBreakdown.completed, status: "completed" },
    { name: "Pending", value: statusBreakdown.pending, status: "pending" },
    { name: "Scheduled", value: statusBreakdown.scheduled, status: "scheduled" },
    { name: "Cancelled", value: statusBreakdown.cancelled, status: "cancelled" },
  ].filter((s) => s.value > 0);

  // Calculate monthly payments
  const monthlyData: Record<string, number> = {};
  payments
    .filter((p) => p.status === "completed" && p.payment_date)
    .forEach((p) => {
      if (!p.payment_date) return;
      const date = new Date(p.payment_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (Number(p.amount) || 0);
    });

  const monthlyChartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 months
    .map(([month, amount]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      amount,
    }));

  // Status badge colors
  const statusColors: Record<string, string> = {
    completed: "#10b981",
    pending: "#f59e0b",
    scheduled: "#3b82f6",
    cancelled: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview Chart - Always show */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Analytics Overview</CardTitle>
          <CardDescription>Visual comparison of payment amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={keyMetricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {keyMetricsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor Spending Chart */}
      {vendorSpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Spending Distribution</CardTitle>
            <CardDescription>Top vendors by total paid amount</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vendorSpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payment Status Pie Chart */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Breakdown</CardTitle>
            <CardDescription>Distribution of payments by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ${formatCurrency(value as number)}`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={statusColors[entry.status] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusData.map((item) => (
                  <div key={item.status} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: statusColors[item.status],
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.value as number)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Payment Trend */}
      {monthlyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payment Trend</CardTitle>
            <CardDescription>Completed payments over time (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  dot={{ fill: "#3b82f6" }}
                  activeDot={{ r: 6 }}
                  name="Amount Paid"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
