"use server";

import { createServiceClient } from "@/lib/supabase/server";

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

    const supabaseAdmin = createServiceClient();

    // Use listUsers to find the user by email
    console.log("[SERVER] Fetching user by email via admin API...");
    
    try {
      // Get all users and find by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error("[SERVER] Error listing users:", listError);
        return {
          success: false,
          error: "Failed to find user",
        };
      }

      const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.error("[SERVER] User not found for email:", email);
        return {
          success: false,
          error: "User not found",
        };
      }

      console.log("[SERVER] Found user:", user.id);

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
    } catch (apiError: any) {
      console.error("[SERVER] Admin API error:", apiError);
      return {
        success: false,
        error: apiError?.message || "Failed to reset password",
      };
    }
  } catch (error: any) {
    console.error("[SERVER] Unexpected error in resetClientPassword:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}
