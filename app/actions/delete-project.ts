"use server";

import { createClient } from "@supabase/supabase-js";

type DeleteProjectResult = {
  success: boolean;
  error?: string;
};

export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  try {
    console.log("[SERVER] deleteProject called for project:", projectId);

    // Validate environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      console.error("[SERVER] Missing NEXT_PUBLIC_SUPABASE_URL");
      return {
        success: false,
        error: "NEXT_PUBLIC_SUPABASE_URL is not configured",
      };
    }

    if (!key) {
      console.error("[SERVER] Missing SUPABASE_SERVICE_ROLE_KEY");
      return {
        success: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured",
      };
    }

    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete the project record (this will cascade delete related data due to FK constraints)
    // Related data includes: project_files, milestones, project_team, invoices, etc.
    const { error: deleteProjectError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteProjectError) {
      console.error("[SERVER] Error deleting project:", deleteProjectError);
      return { success: false, error: deleteProjectError.message };
    }

    console.log("[SERVER] Project deleted successfully:", projectId);
    return { success: true };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}
