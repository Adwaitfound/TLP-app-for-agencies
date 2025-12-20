"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Vendor, PaymentStatus } from "@/types"
import { createPayment } from "@/app/actions/vendor-operations"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface AddPaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendors: Vendor[]
    onSuccess: () => void
}

interface Project {
    id: string
    name: string
}

export function AddPaymentDialog({ open, onOpenChange, vendors, onSuccess }: AddPaymentDialogProps) {
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [formData, setFormData] = useState({
        vendor_id: "",
        project_id: "",
        amount: "",
        payment_date: "",
        scheduled_date: "",
        status: "pending" as PaymentStatus,
        payment_method: "UPI",
        transaction_id: "",
        description: "",
        payment_reason: "",
        invoice_number: "",
    })

    useEffect(() => {
        if (open) {
            loadProjects()
        }
    }, [open])

    async function loadProjects() {
        const supabase = createClient()
        const { data } = await supabase
            .from('projects')
            .select('id, name')
            .order('name')

        if (data) setProjects(data)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const result = await createPayment({
            vendor_id: formData.vendor_id,
            project_id: formData.project_id || undefined,
            amount: parseFloat(formData.amount),
            payment_date: formData.payment_date || undefined,
            scheduled_date: formData.scheduled_date || undefined,
            status: formData.status,
            payment_method: formData.payment_method || undefined,
            transaction_id: formData.transaction_id || undefined,
            description: formData.description,
            payment_reason: formData.payment_reason || undefined,
            invoice_number: formData.invoice_number || undefined,
        })

        if (result.success) {
            onSuccess()
            onOpenChange(false)
            // Reset form
            setFormData({
                vendor_id: "",
                project_id: "",
                amount: "",
                payment_date: "",
                scheduled_date: "",
                status: "pending",
                payment_method: "UPI",
                transaction_id: "",
                description: "",
                payment_reason: "",
                invoice_number: "",
            })
        } else {
            alert(result.error || "Failed to create payment")
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Record a new payment to a vendor
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Vendor & Project */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="vendor_id">Vendor *</Label>
                            <Select
                                required
                                value={formData.vendor_id}
                                onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="project_id">Project (Optional)</Label>
                            <Select
                                value={formData.project_id}
                                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-project">No project (General)</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as PaymentStatus })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="payment_date">Payment Date</Label>
                            <Input
                                id="payment_date"
                                type="date"
                                value={formData.payment_date}
                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scheduled_date">Scheduled Date</Label>
                            <Input
                                id="scheduled_date"
                                type="date"
                                value={formData.scheduled_date}
                                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Payment Method & Transaction */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="payment_method">Payment Method</Label>
                            <Select
                                value={formData.payment_method}
                                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transaction_id">Transaction ID</Label>
                            <Input
                                id="transaction_id"
                                value={formData.transaction_id}
                                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                                placeholder="Transaction reference"
                            />
                        </div>
                    </div>

                    {/* Invoice Number */}
                    <div className="space-y-2">
                        <Label htmlFor="invoice_number">Invoice Number (Optional)</Label>
                        <Input
                            id="invoice_number"
                            value={formData.invoice_number}
                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                            placeholder="INV-001"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What is this payment for?"
                            rows={2}
                        />
                    </div>

                    {/* Payment Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_reason">Payment Reason (Optional)</Label>
                        <Input
                            id="payment_reason"
                            value={formData.payment_reason}
                            onChange={(e) => setFormData({ ...formData, payment_reason: e.target.value })}
                            placeholder="e.g., Video editing for Project X"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Payment
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
