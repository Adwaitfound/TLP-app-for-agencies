"use server";

import { createClient } from "@supabase/supabase-js";

type AssignTeamMemberData = {
  project_id: string;
  user_id: string;
  role?: string | null;
  assigned_by?: string;
};

type AssignTeamMemberResult = {
  success: boolean;
  error?: string;
};

export async function assignTeamMember(
  data: AssignTeamMemberData,
): Promise<AssignTeamMemberResult> {
  try {
    console.log("[SERVER] assignTeamMember called with:", data);

    // Validate environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return {
        success: false,
        error: "Server configuration error",
      };
    }

    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if already assigned
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("project_team")
      .select("id")
      .eq("project_id", data.project_id)
      .eq("user_id", data.user_id);

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[SERVER] Error checking existing assignment:", checkError);
      return { success: false, error: checkError.message };
    }

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: "This team member is already assigned to this project",
      };
    }

    // Insert team member
    const { error: insertError } = await supabaseAdmin
      .from("project_team")
      .insert({
        project_id: data.project_id,
        user_id: data.user_id,
        role: data.role || null,
        assigned_by: data.assigned_by || null,
      });

    if (insertError) {
      console.error("[SERVER] Error assigning team member:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("[SERVER] Team member assigned successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}

export async function removeTeamMember(
  projectId: string,
  userId: string,
): Promise<AssignTeamMemberResult> {
  try {
    console.log("[SERVER] removeTeamMember called:", { projectId, userId });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return {
        success: false,
        error: "Server configuration error",
      };
    }

    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabaseAdmin
      .from("project_team")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      console.error("[SERVER] Error removing team member:", error);
      return { success: false, error: error.message };
    }

    console.log("[SERVER] Team member removed successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
    };
  }
}

export async function getProjectTeamMembers(projectId: string) {
  try {
    console.log("[SERVER] getProjectTeamMembers called for:", projectId);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Server configuration error");
    }

    const supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch project_team assignments
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from("project_team")
      .select("*")
      .eq("project_id", projectId);

    if (teamError) {
      console.error("[SERVER] Error fetching team members:", teamError);
      throw teamError;
    }

    // If no team members, return empty
    if (!teamData || teamData.length === 0) {
      console.log("[SERVER] No team members found");
      return {
        success: true,
        data: [],
      };
    }

    // Get user IDs and fetch user data
    const userIds = teamData.map((t: any) => t.user_id).filter(Boolean);
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, avatar_url, role")
      .in("id", userIds);

    if (usersError) {
      console.error("[SERVER] Error fetching users:", usersError);
      throw usersError;
    }

    // Merge team data with user data
    const usersMap = (usersData || []).reduce((acc: any, user: any) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const mergedData = teamData.map((assignment: any) => ({
      ...assignment,
      user: usersMap[assignment.user_id] || null,
    }));

    console.log("[SERVER] Team members fetched:", mergedData?.length);
    return {
      success: true,
      data: mergedData || [],
    };
  } catch (error: any) {
    console.error("[SERVER] Unexpected error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
      data: [],
    };
  }
}
