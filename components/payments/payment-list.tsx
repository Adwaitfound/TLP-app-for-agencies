"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { VendorPayment } from "@/types";
import { updatePayment, deletePayment } from "@/app/actions/vendor-operations";

interface PaymentListProps {
  payments: VendorPayment[];
  onRefresh: () => void;
  onEditPayment?: (payment: VendorPayment) => void;
  compact?: boolean;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  scheduled: {
    label: "Scheduled",
    variant: "outline" as const,
    icon: Calendar,
  },
  processing: { label: "Processing", variant: "default" as const, icon: Clock },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle,
  },
  failed: { label: "Failed", variant: "destructive" as const, icon: XCircle },
  cancelled: {
    label: "Cancelled",
    variant: "secondary" as const,
    icon: XCircle,
  },
};

export function PaymentList({
  payments,
  onRefresh,
  onEditPayment,
  compact = false,
}: PaymentListProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  console.log("PaymentList received:", payments.length, "payments", compact ? "(compact)" : "(full)");
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.description.toLowerCase().includes(search.toLowerCase()) ||
      payment.vendors?.name.toLowerCase().includes(search.toLowerCase()) ||
      payment.projects?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  async function handleStatusChange(id: string, status: string) {
    const result = await updatePayment(id, { status: status as any });
    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || "Failed to update payment");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    const result = await deletePayment(id);
    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || "Failed to delete payment");
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payments found
          </p>
        ) : (
          filteredPayments.map((payment) => {
            const StatusIcon = statusConfig[payment.status]?.icon || Clock;
            return (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <StatusIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{payment.vendors?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(payment.amount)}
                  </p>
                  <Badge variant={statusConfig[payment.status]?.variant}>
                    {statusConfig[payment.status]?.label}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Track all vendor payments</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                className="pl-8 w-[250px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground"
                >
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.payment_date
                      ? formatDate(payment.payment_date)
                      : payment.scheduled_date
                        ? `Scheduled: ${formatDate(payment.scheduled_date)}`
                        : "Not set"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.vendors?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{payment.projects?.name || "General"}</TableCell>
                  <TableCell>
                    <div>
                      <p>{payment.description}</p>
                      {payment.payment_reason && (
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_reason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{payment.payment_method || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[payment.status]?.variant}>
                      {statusConfig[payment.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onEditPayment?.(payment)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(payment.id, "completed")
                          }
                        >
                          Mark as Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(payment.id, "pending")
                          }
                        >
                          Mark as Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(payment.id, "cancelled")
                          }
                        >
                          Cancel Payment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(payment.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
