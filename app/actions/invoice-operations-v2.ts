"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * V2 Invoice Operations - Multi-tenant version
 * All operations require org_id for tenant isolation
 */

export async function fetchInvoicesDataV2(orgId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  try {
    // Fetch invoices with org_id filter
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("saas_invoices")
      .select("*, saas_clients(company_name), saas_projects(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (invoicesError) throw invoicesError;

    // Fetch clients for this org
    const { data: clientsData, error: clientsError } = await supabase
      .from("saas_clients")
      .select("*")
      .eq("org_id", orgId)
      .order("company_name");

    if (clientsError) throw clientsError;

    // Fetch projects for this org
    const { data: projectsData, error: projectsError } = await supabase
      .from("saas_projects")
      .select("*")
      .eq("org_id", orgId)
      .order("name");

    if (projectsError) throw projectsError;

    return {
      invoices: invoicesData || [],
      clients: clientsData || [],
      projects: projectsData || [],
    };
  } catch (error: any) {
    console.error("Fetch error:", error);
    return { error: error.message || "Failed to fetch data" };
  }
}

export async function createInvoiceV2(
  orgId: string,
  data: {
    invoice_number: string;
    client_id: string;
    project_id?: string;
    issue_date: string;
    due_date?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    invoice_file_url?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  try {
    const { data: invoice, error } = await supabase
      .from("saas_invoices")
      .insert({
        org_id: orgId,
        ...data,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return { invoice };
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return { error: error.message || "Failed to create invoice" };
  }
}

export async function updateInvoiceStatusV2(
  orgId: string,
  invoiceId: string,
  status: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  try {
    const { data, error } = await supabase
      .from("saas_invoices")
      .update({ status })
      .eq("org_id", orgId)
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) throw error;

    return { invoice: data };
  } catch (error: any) {
    console.error("Update status error:", error);
    return { error: error.message || "Failed to update status" };
  }
}

export async function deleteInvoiceV2(orgId: string, invoiceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("saas_invoices")
      .delete()
      .eq("org_id", orgId)
      .eq("id", invoiceId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Delete invoice error:", error);
    return { error: error.message || "Failed to delete invoice" };
  }
}

export async function updateInvoiceSharedStatusV2(
  orgId: string,
  invoiceId: string,
  shared: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  try {
    const { data, error } = await supabase
      .from("saas_invoices")
      .update({ shared_with_client: shared })
      .eq("org_id", orgId)
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) throw error;

    return { invoice: data };
  } catch (error: any) {
    console.error("Update shared status error:", error);
    return { error: error.message || "Failed to update shared status" };
  }
}
