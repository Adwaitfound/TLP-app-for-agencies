"use server";

import { createClient } from "@supabase/supabase-js";

type ResetPasswordResult = {
  success: boolean;
  password?: string;
  error?: string;
};

export async function resetClientPassword(
  email: string,
): Promise<ResetPasswordResult> {
  try {
    console.log("[SERVER] resetClientPassword called with:", { email });

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

    console.log("[SERVER] Creating admin client...");
    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find user by email
    console.log("[SERVER] Finding user by email...");
    const { data: { users }, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("[SERVER] Failed to list users:", listError);
      return {
        success: false,
        error: "Failed to find user",
      };
    }

    const user = users?.find((u) => u.email === email);
    if (!user) {
      console.error("[SERVER] User not found:", email);
      return {
        success: false,
        error: "User not found",
      };
    }

    // Generate a new temporary password
    const newPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10).toUpperCase();

    console.log("[SERVER] Updating password for user:", user.id);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      },
    );

    if (updateError) {
      console.error("[SERVER] Password update error:", updateError);
      return {
        success: false,
        error: `Password update failed: ${updateError.message}`,
      };
    }

    console.log("[SERVER] Password reset successfully for:", email);
    return {
      success: true,
      password: newPassword,
    };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error in resetClientPassword:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}
