"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function removeUser(userId: string) {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return { error: "Unauthorized - must be logged in" };
    }

    // Check if current user is super_admin (only super_admin can remove users/admins)
    const { data: currentUserData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (roleError || !currentUserData || currentUserData.role !== "super_admin") {
      console.log(
        "[removeUser] ❌ Permission denied. Only super_admin can remove users. Current role:",
        currentUserData?.role,
      );
      return { error: "Only super_admin can remove users or admins" };
    }

    console.log("[removeUser] ✅ Super admin authenticated:", currentUser.id);

    // Use service client to delete the user
    const adminSupabase = createServiceClient();

    // First, get the user to verify they exist
    const { data: targetUser, error: fetchError } = await adminSupabase
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) {
      console.log("[removeUser] ❌ User not found:", userId);
      return { error: "User not found" };
    }

    console.log("[removeUser] Removing user:", {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
    });

    // Delete from users table
    const { error: deleteError } = await adminSupabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      console.error("[removeUser] ❌ Error deleting from users table:", deleteError);
      return { error: "Failed to delete user from database" };
    }

    // Delete from auth (if exists)
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.warn("[removeUser] ⚠️ Auth deletion error (continuing):", authDeleteError);
      // Continue - user deleted from DB, auth deletion is secondary
    }

    console.log("[removeUser] ✅ User removed successfully:", userId);
    return { success: true, message: `User ${targetUser.email} (${targetUser.role}) has been removed` };
  } catch (error: any) {
    console.error("[removeUser] ❌ Unexpected error:", error);
    return { error: error?.message || "An unexpected error occurred" };
  }
}
