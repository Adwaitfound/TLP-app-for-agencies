"use server";

import { createClient } from "@/lib/supabase/server";

type UpdateClientData = {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
};

type UpdateClientResult = {
  success: boolean;
  error?: string;
};

export async function updateClient(
  clientId: string,
  data: UpdateClientData,
): Promise<UpdateClientResult> {
  try {
    console.log("[SERVER] updateClient called for client:", clientId);

    const supabase = await createClient();

    // Validate required fields
    if (!data.company_name || !data.contact_person || !data.email) {
      return {
        success: false,
        error: "Company name, contact person, and email are required",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: "Invalid email format",
      };
    }

    // First, verify the client exists
    const { data: existingClient, error: checkError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single();

    if (checkError || !existingClient) {
      console.error("[SERVER] Client not found:", checkError);
      return { success: false, error: "Client not found or access denied" };
    }

    // Update the client record
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        company_name: data.company_name,
        contact_person: data.contact_person,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("[SERVER] Error updating client:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log("[SERVER] Client updated successfully:", clientId);
    return { success: true };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}
