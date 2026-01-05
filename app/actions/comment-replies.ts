"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

/**
 * Create a reply to a project comment
 * Only admin and project_manager can create replies
 */
export async function createCommentReply(params: {
  commentId: string;
  replyText: string;
  userId: string;
}) {
  const { commentId, replyText, userId } = params;
  try {
    const supabase = createServiceClient();

    // Verify the user is admin or project_manager
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    if (!["admin", "project_manager"].includes(userData.role)) {
      return { success: false, error: "Unauthorized: Only admins can reply" };
    }

    // Create the reply
    const { data, error } = await supabase
      .from("comment_replies")
      .insert({
        comment_id: commentId,
        user_id: userId,
        reply_text: replyText,
      })
      .select(
        `
        id,
        comment_id,
        user_id,
        reply_text,
        created_at,
        updated_at,
        user:user_id(id, full_name, email, role)
      `,
      )
      .single();

    if (error) return { success: false, error: error.message };

    // Log audit event
    logAuditEvent("create", "comment_reply", data.id, userId, {
      comment_id: commentId,
      reply_text: replyText,
    });

    return { success: true, reply: data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error creating reply",
    };
  }
}

/**
 * Get all replies for a comment
 */
export async function getCommentReplies(commentId: string) {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("comment_replies")
      .select(
        `
        id,
        comment_id,
        user_id,
        reply_text,
        created_at,
        updated_at,
        user:user_id(id, full_name, email, role)
      `,
      )
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });

    if (error) return { success: false, error: error.message };

    return { success: true, replies: data || [] };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error fetching replies",
    };
  }
}

/**
 * Update a comment reply (only by the author or admin)
 */
export async function updateCommentReply(params: {
  replyId: string;
  replyText: string;
  userId: string;
}) {
  const { replyId, replyText, userId } = params;
  try {
    const supabase = createServiceClient();

    // Fetch the reply to check ownership
    const { data: reply, error: fetchError } = await supabase
      .from("comment_replies")
      .select("user_id")
      .eq("id", replyId)
      .single();

    if (fetchError || !reply) {
      return { success: false, error: "Reply not found" };
    }

    // Check if user is author or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (reply.user_id !== userId && userData?.role !== "admin") {
      return { success: false, error: "Unauthorized: Can only edit own replies" };
    }

    // Update the reply
    const { data, error } = await supabase
      .from("comment_replies")
      .update({
        reply_text: replyText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", replyId)
      .select(
        `
        id,
        comment_id,
        user_id,
        reply_text,
        created_at,
        updated_at,
        user:user_id(id, full_name, email, role)
      `,
      )
      .single();

    if (error) return { success: false, error: error.message };

    logAuditEvent("update", "comment_reply", replyId, userId, {
      reply_text: replyText,
    });

    return { success: true, reply: data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error updating reply",
    };
  }
}

/**
 * Delete a comment reply (only by the author or admin)
 */
export async function deleteCommentReply(params: {
  replyId: string;
  userId: string;
}) {
  const { replyId, userId } = params;
  try {
    const supabase = createServiceClient();

    // Fetch the reply to check ownership
    const { data: reply, error: fetchError } = await supabase
      .from("comment_replies")
      .select("user_id")
      .eq("id", replyId)
      .single();

    if (fetchError || !reply) {
      return { success: false, error: "Reply not found" };
    }

    // Check if user is author or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (reply.user_id !== userId && userData?.role !== "admin") {
      return { success: false, error: "Unauthorized: Can only delete own replies" };
    }

    // Delete the reply
    const { error } = await supabase
      .from("comment_replies")
      .delete()
      .eq("id", replyId);

    if (error) return { success: false, error: error.message };

    logAuditEvent("delete", "comment_reply", replyId, userId, {});

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error deleting reply",
    };
  }
}

/**
 * Get comment with all its replies
 */
export async function getCommentWithReplies(commentId: string) {
  try {
    const supabase = createServiceClient();

    // Get the comment
    const { data: comment, error: commentError } = await supabase
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
        author:user_id(id, full_name, email, role),
        assignee:assigned_user_id(id, full_name, email, role)
      `,
      )
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return { success: false, error: "Comment not found" };
    }

    // Get all replies
    const { data: replies, error: repliesError } = await supabase
      .from("comment_replies")
      .select(
        `
        id,
        comment_id,
        user_id,
        reply_text,
        created_at,
        updated_at,
        user:user_id(id, full_name, email, role)
      `,
      )
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });

    if (repliesError) {
      return { success: false, error: repliesError.message };
    }

    return {
      success: true,
      data: {
        comment,
        replies: replies || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected error fetching comment with replies",
    };
  }
}
