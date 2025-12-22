// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProjectFile, Milestone } from "@/types";

async function ensureMembership(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Unauthorized" as const };

  // Check if the user created the project or is on the project_team
  const [{ data: project }, { data: team }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, created_by")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_team")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isOwner = project?.created_by === user.id;
  const isMember = !!team;
  if (!isOwner && !isMember) return { error: "Unauthorized" as const };

  return { supabase, user } as const;
}

export async function getProjectDetailForEmployee(
  projectId: string,
): Promise<
  | { error: string }
  | {
      project: any;
      tasks: any[];
      milestones: Milestone[];
      files: ProjectFile[];
    }
> {
  const membership = await ensureMembership(projectId);
  if ("error" in membership) return membership;
  const { supabase, user } = membership;

  const [projectRes, tasksRes, milestonesRes, filesRes] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,name,status,description,deadline,progress_percentage,start_date,clients(company_name)",
      )
      .eq("id", projectId)
      .single(),
    supabase
      .from("employee_tasks")
      .select("id,title,description,status,priority,due_date,project_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("milestones")
      .select("id,title,status,due_date,description")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true }),
    supabase
      .from("project_files")
      .select(
        "id,file_name,file_type,file_category,file_url,description,created_at,storage_type,uploaded_by",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  if (projectRes.error) return { error: projectRes.error.message };
  if (tasksRes.error) return { error: tasksRes.error.message };
  if (milestonesRes.error) return { error: milestonesRes.error.message };
  if (filesRes.error) return { error: filesRes.error.message };

  return {
    project: projectRes.data as any,
    tasks: tasksRes.data || [],
    milestones: (milestonesRes.data || []) as Milestone[],
    files: (filesRes.data || []) as ProjectFile[],
  };
}

export async function updateMilestoneStatusForEmployee(
  milestoneId: string,
  status: Milestone["status"],
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized" } as const;

  const { error } = await supabase
    .from("milestones")
    .update({ status })
    .eq("id", milestoneId)
    .maybeSingle();

  if (error) return { error: error.message } as const;
  revalidatePath("/dashboard/employee");
  return { success: true } as const;
}

export async function addProjectFileForEmployee(payload: {
  project_id: string;
  file_name: string;
  file_url: string;
  file_type?: ProjectFile["file_type"];
  file_category?: ProjectFile["file_category"];
  description?: string;
  storage_type?: ProjectFile["storage_type"];
}) {
  const membership = await ensureMembership(payload.project_id);
  if ("error" in membership) return membership;
  const { supabase, user } = membership;

  const insertPayload = {
    project_id: payload.project_id,
    file_name: payload.file_name,
    file_url: payload.file_url,
    file_type: payload.file_type || "other",
    file_category: payload.file_category || "other",
    description: payload.description || null,
    storage_type: payload.storage_type || "supabase",
    uploaded_by: user.email,
  };

  const { error, data } = await supabase
    .from("project_files")
    .insert(insertPayload)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/employee/projects/${payload.project_id}`);
  return { data };
}

export async function updateTaskStatusForEmployee(
  taskId: string,
  status: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized" } as const;

  const { error } = await supabase
    .from("employee_tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message } as const;
  revalidatePath("/dashboard/employee");
  return { success: true } as const;
}
