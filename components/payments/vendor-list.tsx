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
  Phone,
  Mail,
  Star,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VENDOR_TYPES } from "@/types";
import type { Vendor } from "@/types";
import { deleteVendor } from "@/app/actions/vendor-operations";

interface VendorListProps {
  vendors: Vendor[];
  onRefresh: () => void;
  onEditVendor?: (vendor: Vendor) => void;
  onViewDetails?: (vendor: Vendor) => void;
  onViewPaymentHistory?: (vendor: Vendor) => void;
}

export function VendorList({
  vendors,
  onRefresh,
  onEditVendor,
  onViewDetails,
  onViewPaymentHistory,
}: VendorListProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(search.toLowerCase()) ||
      vendor.phone?.includes(search);

    const matchesType =
      filterType === "all" || vendor.vendor_type === filterType;

    return matchesSearch && matchesType;
  });

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this vendor?")) return;

    const result = await deleteVendor(id);
    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || "Failed to delete vendor");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Vendors</CardTitle>
            <CardDescription>Manage your vendor database</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                className="pl-8 w-[250px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {Object.entries(VENDOR_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Total Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.preferred_vendor && (
                          <Badge variant="secondary" className="mt-1">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {VENDOR_TYPES[vendor.vendor_type]?.icon}{" "}
                      {VENDOR_TYPES[vendor.vendor_type]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.upi_id && (
                        <div className="text-muted-foreground">
                          UPI: {vendor.upi_id}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{vendor.total_projects_worked || 0}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(vendor.total_amount_paid || 0)}
                  </TableCell>
                  <TableCell>
                    {vendor.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
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
                          onClick={() => onEditVendor?.(vendor)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewDetails?.(vendor)}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewPaymentHistory?.(vendor)}
                        >
                          Payment History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(vendor.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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
