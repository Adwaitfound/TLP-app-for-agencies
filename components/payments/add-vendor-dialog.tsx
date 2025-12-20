"use client"

import { useState } from "react"
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
import { VENDOR_TYPES } from "@/types"
import type { VendorType, PaymentFrequency } from "@/types"
import { createVendor } from "@/app/actions/vendor-operations"
import { Loader2 } from "lucide-react"

interface AddVendorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AddVendorDialog({ open, onOpenChange, onSuccess }: AddVendorDialogProps) {
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
    const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        vendor_type: "videographer" as VendorType,
        phone: "",
        email: "",
        upi_id: "",
        bank_account_number: "",
        bank_ifsc_code: "",
        bank_account_name: "",
        address: "",
        notes: "",
        work_frequency: "per_project" as PaymentFrequency,
        is_active: true,
        preferred_vendor: false,
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const result = await createVendor(formData)

        if (result.success) {
            onSuccess()
            onOpenChange(false)
            // Reset form
            setFormData({
                name: "",
                vendor_type: "videographer",
                phone: "",
                email: "",
                upi_id: "",
                bank_account_number: "",
                bank_ifsc_code: "",
                bank_account_name: "",
                address: "",
                notes: "",
                work_frequency: "per_project",
                is_active: true,
                preferred_vendor: false,
            })
            // Show success toast
            if (toastTimer) clearTimeout(toastTimer)
            setToast({ message: "Vendor added successfully", type: "success" })
            const t = setTimeout(() => setToast(null), 3000)
            setToastTimer(t)
        } else {
            // Show error toast
            if (toastTimer) clearTimeout(toastTimer)
            setToast({ message: result.error || "Failed to create vendor", type: "error" })
            const t = setTimeout(() => setToast(null), 3000)
            setToastTimer(t)
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                    <DialogDescription>
                        Add a new vendor to your database
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Vendor name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vendor_type">Vendor Type *</Label>
                            <Select
                                value={formData.vendor_type}
                                onValueChange={(value) => setFormData({ ...formData, vendor_type: value as VendorType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(VENDOR_TYPES).map(([key, { label, icon }]) => (
                                        <SelectItem key={key} value={key}>
                                            {icon} {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+91 XXXXX XXXXX"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="vendor@example.com"
                            />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Payment Details</h3>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="upi_id">UPI ID</Label>
                                <Input
                                    id="upi_id"
                                    value={formData.upi_id}
                                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                                    placeholder="vendor@upi"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="work_frequency">Work Frequency</Label>
                                <Select
                                    value={formData.work_frequency}
                                    onValueChange={(value) => setFormData({ ...formData, work_frequency: value as PaymentFrequency })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one_time">One Time</SelectItem>
                                        <SelectItem value="per_project">Per Project</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="recurring">Recurring</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank_account_name">Bank Account Name</Label>
                            <Input
                                id="bank_account_name"
                                value={formData.bank_account_name}
                                onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                                placeholder="Account holder name"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="bank_account_number">Bank Account Number</Label>
                                <Input
                                    id="bank_account_number"
                                    value={formData.bank_account_number}
                                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                                    placeholder="Account number"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                                <Input
                                    id="bank_ifsc_code"
                                    value={formData.bank_ifsc_code}
                                    onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value })}
                                    placeholder="IFSC code"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address & Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Full address"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes about this vendor"
                            rows={3}
                        />
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded"
                            />
                            <span className="text-sm">Active vendor</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.preferred_vendor}
                                onChange={(e) => setFormData({ ...formData, preferred_vendor: e.target.checked })}
                                className="rounded"
                            />
                            <span className="text-sm">Mark as preferred</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Vendor
                        </Button>
                    </div>
                </form>
                {toast ? (
                    <div
                        className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg text-sm text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
                    >
                        {toast.message}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
