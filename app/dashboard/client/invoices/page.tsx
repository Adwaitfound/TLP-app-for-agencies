"use client";

import { useState, useEffect } from "react";
import { fetchClientSharedInvoices } from "@/app/actions/invoice-operations";
import { getSignedInvoiceUrl } from "@/app/actions/invoice-operations";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  client_name: string;
  project_name: string;
  issue_date: string;
  due_date: string;
  created_at: string;
  invoice_file_url: string;
  shared_with_client: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-200 text-gray-700" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN");
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchClientSharedInvoices();
        if ((result as any).error) {
          setError((result as any).error);
        } else if ((result as any).success && (result as any).data) {
          setInvoices((result as any).data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const handleDownload = async (invoice: Invoice) => {
    try {
      if (!invoice.invoice_file_url) {
        alert("No invoice file available");
        return;
      }

      setDownloadingId(invoice.id);
      const result = await getSignedInvoiceUrl(invoice.invoice_file_url);

      if ((result as any).error) {
        alert("Failed to download invoice: " + (result as any).error);
        return;
      }

      if ((result as any).signedUrl) {
        // Create a temporary link and click it
        const a = document.createElement("a");
        a.href = (result as any).signedUrl;
        a.download = `Invoice-${invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert("Failed to download: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-gray-500 mt-2">
          View and download invoices shared with you
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No invoices available yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b">
                <TableHead>Invoice Number</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} className="border-b hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>{invoice.project_name}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(invoice.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${statusConfig[invoice.status]?.color || "bg-gray-100"}`}
                    >
                      {statusConfig[invoice.status]?.label || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(invoice)}
                      disabled={!invoice.invoice_file_url || downloadingId === invoice.id}
                      className="gap-2"
                    >
                      {downloadingId === invoice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
