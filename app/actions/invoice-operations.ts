"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

async function ensureAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await (await supabase)
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) return { error: "Failed to verify role" } as const;
  if (!data || data.role !== "admin") return { error: "Access restricted to admins" } as const;
  return { ok: true } as const;
}

function extractStoragePath(fileUrl: string) {
  const marker = "project-files/";
  const idx = fileUrl.indexOf(marker);
  const raw = idx >= 0 ? fileUrl.slice(idx + marker.length) : fileUrl;
  return raw.replace(/^public\//, "").replace(/^\//, "");
}

export async function fetchInvoicesData() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify user is admin
  {
    const check = await ensureAdmin(supabase, user.id);
    if ((check as any).error) return check as any;
  }

  try {
    // Fetch invoices with related data
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("invoices")
      .select("*, clients(company_name), projects(name)")
      .order("created_at", { ascending: false });

    if (invoicesError) throw invoicesError;

    // Fetch clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("company_name");

    if (clientsError) throw clientsError;

    // Fetch projects
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
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

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify user is admin
  {
    const check = await ensureAdmin(supabase, user.id);
    if ((check as any).error) return check as any;
  }

  try {
    const { data, error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId)
      .select("*, clients(company_name), projects(name)")
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error("Update error:", error);
    return { error: error.message || "Failed to update invoice" };
  }
}

export async function updateInvoiceSharedStatus(invoiceId: string, shared_with_client: boolean) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify user is admin
  {
    const check = await ensureAdmin(supabase, user.id);
    if ((check as any).error) return check as any;
  }

  try {
    const { data, error } = await supabase
      .from("invoices")
      .update({ shared_with_client })
      .eq("id", invoiceId)
      .select("*, clients(company_name), projects(name)")
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error("Update error:", error);
    return { error: error.message || "Failed to update invoice" };
  }
}

export async function deleteInvoice(invoiceId: string, fileUrl: string) {
  const supabase = await createClient();
  const service = createServiceClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify user is admin
  {
    const check = await ensureAdmin(supabase, user.id);
    if ((check as any).error) return check as any;
  }

  try {
    // Delete file from storage
    const path = extractStoragePath(fileUrl);
    await service.storage.from("project-files").remove([path]);

    // Delete from database
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Delete error:", error);
    return { error: error.message || "Failed to delete invoice" };
  }
}

export async function getSignedInvoiceUrl(fileUrl: string) {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized" };
  {
    const check = await ensureAdmin(supabase, user.id);
    if ((check as any).error) return check as any;
  }

  try {
    const path = extractStoragePath(fileUrl);
    const { data, error } = await service.storage
      .from("project-files")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return { signedUrl: data?.signedUrl };
  } catch (error: any) {
    console.error("Signed URL error:", error);
    return { error: error.message || "Failed to generate signed URL" };
  }
}
