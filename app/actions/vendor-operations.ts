"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Vendor, VendorPayment, VendorProjectAssignment } from "@/types";

// ===== VENDOR OPERATIONS =====

export async function fetchVendors() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name");

  if (error) return { error: error.message };
  return { vendors: data as Vendor[] };
}

export async function fetchVendorById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { vendor: data as Vendor };
}

export async function createVendor(vendor: Partial<Vendor>) {
  const supabase = await createClient();

  // Get current user (from cookie session)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Use service role client to bypass RLS for inserts while tagging creator
  const service = createServiceClient();

  // Enforce admins-only creation
  const { data: userRow, error: userFetchError } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userFetchError) {
    return { error: userFetchError.message };
  }
  if (!userRow || userRow.role !== "admin") {
    return { error: "Admins only" };
  }

  const { data, error } = await service
    .from("vendors")
    .insert({
      ...vendor,
      created_by: user.id,
      // Ensure visibility defaults
      is_active: vendor.is_active ?? true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { vendor: data as Vendor, success: true };
}

export async function updateVendor(id: string, updates: Partial<Vendor>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { vendor: data as Vendor, success: true };
}

export async function deleteVendor(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("vendors").delete().eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ===== PAYMENT OPERATIONS =====

export async function fetchPayments(filters?: {
  vendorId?: string;
  projectId?: string;
  status?: string;
}) {
  const supabase = await createClient();

  // Get current user to check role
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let query;

  // Use service role client if user is admin to bypass RLS
  if (user) {
    const service = createServiceClient();
    const { data: userRow } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userRow?.role === "admin";
    const client = isAdmin ? service : supabase;

    query = client
      .from("vendor_payments")
      .select(
        `
        *,
        vendors (
          id,
          name,
          vendor_type
        ),
        projects (
          id,
          name,
          service_type
        )
      `,
      )
      .order("created_at", { ascending: false });
  } else {
    query = supabase
      .from("vendor_payments")
      .select(
        `
        *,
        vendors (
          id,
          name,
          vendor_type
        ),
        projects (
          id,
          name,
          service_type
        )
      `,
      )
      .order("created_at", { ascending: false });
  }

  if (filters?.vendorId) {
    query = query.eq("vendor_id", filters.vendorId);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch payments error:", error);
    return { error: error.message };
  }
  
  console.log("Fetched payments:", data?.length || 0);
  return { payments: (data || []) as VendorPayment[] };
}

export async function createPayment(payment: Partial<VendorPayment>) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Admins-only enforcement and RLS bypass for insert
  const service = createServiceClient();
  const { data: userRow, error: userFetchError } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userFetchError) {
    return { error: userFetchError.message };
  }
  if (!userRow || userRow.role !== "admin") {
    return { error: "Admins only" };
  }

  const { data, error } = await service
    .from("vendor_payments")
    .insert({
      ...payment,
      paid_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { payment: data as VendorPayment, success: true };
}

export async function updatePayment(
  id: string,
  updates: Partial<VendorPayment>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_payments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { payment: data as VendorPayment, success: true };
}

export async function deletePayment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_payments")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ===== ASSIGNMENT OPERATIONS =====

export async function fetchVendorAssignments(filters?: {
  vendorId?: string;
  projectId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("vendor_project_assignments")
    .select(
      `
      *,
      vendors (
        id,
        name,
        vendor_type
      ),
      projects (
        id,
        name,
        service_type
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (filters?.vendorId) {
    query = query.eq("vendor_id", filters.vendorId);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };
  return { assignments: data as VendorProjectAssignment[] };
}

export async function createAssignment(
  assignment: Partial<VendorProjectAssignment>,
) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Admins-only enforcement and RLS bypass for insert
  const service = createServiceClient();
  const { data: userRow, error: userFetchError } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userFetchError) {
    return { error: userFetchError.message };
  }
  if (!userRow || userRow.role !== "admin") {
    return { error: "Admins only" };
  }

  const { data, error } = await service
    .from("vendor_project_assignments")
    .insert({
      ...assignment,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { assignment: data as VendorProjectAssignment, success: true };
}

export async function updateAssignment(
  id: string,
  updates: Partial<VendorProjectAssignment>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_project_assignments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { assignment: data as VendorProjectAssignment, success: true };
}

export async function deleteAssignment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_project_assignments")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ===== ANALYTICS =====

export async function fetchVendorAnalytics() {
  const supabase = await createClient();

  // Get total vendors
  const { count: totalVendors } = await supabase
    .from("vendors")
    .select("*", { count: "exact", head: true });

  // Get active vendors
  const { count: activeVendors } = await supabase
    .from("vendors")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Get total payments
  const { data: paymentsData } = await supabase
    .from("vendor_payments")
    .select("amount, status");

  const totalPaid =
    paymentsData
      ?.filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const pendingPayments =
    paymentsData
      ?.filter((p) => p.status === "pending" || p.status === "scheduled")
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Get vendors by type
  const { data: vendorsByType } = await supabase
    .from("vendors")
    .select("vendor_type");

  const typeCount: Record<string, number> = {};
  vendorsByType?.forEach((v) => {
    typeCount[v.vendor_type] = (typeCount[v.vendor_type] || 0) + 1;
  });

  return {
    totalVendors: totalVendors || 0,
    activeVendors: activeVendors || 0,
    totalPaid,
    pendingPayments,
    vendorsByType: typeCount,
  };
}

export async function fetchProjectBudgetSummary(projectId: string) {
  const supabase = await createClient();

  // Get project budget
  const { data: project } = await supabase
    .from("projects")
    .select("budget, name")
    .eq("id", projectId)
    .single();

  // Get total vendor payments for this project
  const { data: payments } = await supabase
    .from("vendor_payments")
    .select("amount, status")
    .eq("project_id", projectId);

  const totalPaid =
    payments
      ?.filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const pendingPayments =
    payments
      ?.filter((p) => p.status === "pending" || p.status === "scheduled")
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Get vendor count for this project
  const { count: vendorCount } = await supabase
    .from("vendor_project_assignments")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  return {
    projectName: project?.name,
    budget: project?.budget || 0,
    totalPaid,
    pendingPayments,
    remaining: (project?.budget || 0) - totalPaid - pendingPayments,
    vendorCount: vendorCount || 0,
  };
}
