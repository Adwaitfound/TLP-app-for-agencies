"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { sendCommentNotification } from "@/lib/provisioning/email-service";

async function notifyUsers(
  userIds: string[],
  payload: { type: string; message: string; metadata?: Record<string, any> },
) {
  if (!userIds.length) return;
  const supabase = createServiceClient();

  // Filter out clients to avoid sending them notifications
  const { data: allowedUsers, error: fetchErr } = await supabase
    .from("users")
    .select("id, role")
    .in("id", userIds)
    .neq("role", "client");

  if (fetchErr) {
    console.warn("notifyUsers fetch users failed", fetchErr.message);
    return;
  }

  const allowedIds = (allowedUsers || []).map((u: any) => u.id);
  if (!allowedIds.length) return;

  const { error } = await supabase
    .from("notifications")
    .insert(
      allowedIds.map((uid) => ({
        user_id: uid,
        type: payload.type,
        message: payload.message,
        metadata: payload.metadata,
      })),
    );
  if (error) console.warn("notifyUsers insert failed", error.message);
}

export async function createProjectComment(params: {
  projectId: string;
  authorUserId: string;
  text: string;
}) {
  const { projectId, authorUserId, text } = params;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_comments")
      .insert({
        project_id: projectId,
        user_id: authorUserId,
        comment_text: text,
      })
      .select(
        `id, project_id, user_id, comment_text, status, created_at, assigned_user_id`,
      )
      .single();

    if (error) return { success: false, error: error.message };

    // Fire-and-forget audit log for admins/PMs visibility
    logAuditEvent("create", "project_comment", data.id, authorUserId, {
      project_id: projectId,
      comment_text: text,
    });

    // Notify only adwait@thelostproject.in (in-app notification)
    const { data: adwaitUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", "adwait@thelostproject.in")
      .single();

    if (adwaitUser) {
      await notifyUsers([adwaitUser.id], {
        type: "comment_created",
        message: `New comment on a project: ${text.slice(0, 80)}`,
        metadata: { project_id: projectId, comment_id: data.id },
      });
    }
    return { success: true, comment: data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error creating comment",
    };
  }
}

export async function listProjectComments(projectId: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_comments")
      .select(
        `
                id,
                project_id,
                user_id,
                comment_text,
                status,
                created_at,
                assigned_user_id,
                author:user_id(full_name, email),
                assignee:assigned_user_id(full_name, email)
            `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, comments: data || [] };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error listing comments",
    };
  }
}

export async function assignCommentToEmployee(params: {
  commentId: string;
  userId: string;
}) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_comments")
      .update({ assigned_user_id: params.userId })
      .eq("id", params.commentId)
      .select(
        `id, assigned_user_id, assignee:assigned_user_id(full_name, email)`,
      )
      .single();
    if (error) return { success: false, error: error.message };

    logAuditEvent(
      "assign",
      "project_comment",
      params.commentId,
      params.userId,
      { assigned_user_id: params.userId },
    );

    // Notify admins/PMs and the assigned employee
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "project_manager"]);
    const targetIds = new Set<string>((admins || []).map((a: any) => a.id));
    if (params.userId) targetIds.add(params.userId);
    await notifyUsers(Array.from(targetIds), {
      type: "comment_assigned",
      message: "A comment was assigned",
      metadata: {
        comment_id: params.commentId,
        assigned_user_id: params.userId,
      },
    });
    return { success: true, comment: data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error assigning comment",
    };
  }
}

export async function clientApproveProject(params: { projectId: string }) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("projects")
      .update({
        client_approved: true,
        client_approved_at: new Date().toISOString(),
      })
      .eq("id", params.projectId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error approving project",
    };
  }
}

// Add a reply to a project comment using service-role client to satisfy RLS
export async function addCommentReply(params: {
  commentId: string;
  userId: string;
  replyText: string;
}) {
  const { commentId, userId, replyText } = params;
  try {
    const supabase = createServiceClient();

    // Insert reply
    const { data: inserted, error } = await supabase
      .from("comment_replies")
      .insert({
        comment_id: commentId,
        user_id: userId,
        reply_text: replyText,
      })
      .select("id, comment_id, user_id, reply_text, created_at")
      .single();

    if (error) return { success: false, error: error.message };

    // Fetch author data (role needed to decide if client replied)
    const { data: author } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", userId)
      .single();

    // Optional: notify admins/PMs about reply (in-app notification)
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "project_manager"]);

    const notifyIds = (admins || []).map((u: any) => u.id);
    if (notifyIds.length) {
      await notifyUsers(notifyIds, {
        type: "comment_replied",
        message: "A comment received a reply",
        metadata: { comment_id: commentId, reply_id: inserted.id },
      });
    }

    // If the replier is a client, send an email to superadmin
    if (author?.role === "client") {
      try {
        // Find base comment to get project id
        const { data: baseComment } = await supabase
          .from("project_comments")
          .select("id, project_id")
          .eq("id", commentId)
          .single();

        if (baseComment?.project_id) {
          // Fetch project + client info
          const { data: projectData } = await supabase
            .from("projects")
            .select("name, clients(company_name, users(full_name, email))")
            .eq("id", baseComment.project_id)
            .single();

          const clientsRel: any = Array.isArray(projectData?.clients)
            ? projectData?.clients?.[0]
            : (projectData as any)?.clients;
          const clientUserRel: any = Array.isArray(clientsRel?.users)
            ? clientsRel?.users?.[0]
            : clientsRel?.users;

          const clientName =
            author?.full_name ||
            clientUserRel?.full_name ||
            clientsRel?.company_name ||
            "Client";
          const projectName = projectData?.name || "a project";

          // Superadmin recipients
          const { data: supers } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("role", "super_admin");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const commentUrl = `${appUrl}/dashboard/comments`;

          for (const sa of supers || []) {
            if (sa?.email) {
              await sendCommentNotification({
                recipientEmail: sa.email,
                recipientName: sa.full_name || "Super Admin",
                clientName,
                projectName,
                commentText: replyText,
                commentUrl,
              }).catch((err) => {
                console.error(`Failed to email superadmin ${sa.email}:`, err);
              });
            }
          }
        }
      } catch (emailErr) {
        console.error("Failed to send superadmin email for client reply:", emailErr);
      }
    }

    return {
      success: true,
      reply: {
        ...inserted,
        author: author || null,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error adding reply",
    };
  }
}

export async function adminApproveProject(params: { projectId: string }) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("projects")
      .update({
        client_approved: true,
        client_approved_at: new Date().toISOString(),
      })
      .eq("id", params.projectId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error approving project (admin)",
    };
  }
}
