import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendCommentNotification } from "@/lib/provisioning/email-service";

async function requireClientAndProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured on the server (required to bypass RLS for this endpoint).",
        },
        { status: 500 },
      ),
    };
  }

  const admin = createServiceClient();

  const { data: clientRow, error: clientError } = await admin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientError || !clientRow?.id) {
    return { error: NextResponse.json({ error: "Client record not found" }, { status: 404 }) };
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("client_id", clientRow.id)
    .single();

  if (projectError || !project?.id) {
    return {
      error: NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      ),
    };
  }

  return { admin, user, clientId: clientRow.id } as const;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = (await Promise.resolve((context as any).params)) as { id: string };
  const projectId = params?.id;

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing project id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await requireClientAndProject(projectId);
    if ((result as any).error) {
      const res = (result as any).error as NextResponse;
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const { admin } = result as any;

    const { data, error } = await admin
      .from("project_comments")
      .select("*, user:users!user_id(full_name, email)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { comments: data ?? [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    console.error("[api/client/projects/[id]/comments] GET error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = (await Promise.resolve((context as any).params)) as { id: string };
  const projectId = params?.id;

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing project id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      comment_text?: string;
      file_id?: string | null;
      timestamp_seconds?: number | null;
    };

    const commentText = (body.comment_text || "").trim();
    if (!commentText) {
      return NextResponse.json(
        { error: "comment_text is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await requireClientAndProject(projectId);
    if ((result as any).error) {
      const res = (result as any).error as NextResponse;
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const { admin, user } = result as any;

    const { data, error } = await admin
      .from("project_comments")
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_id: body.file_id ?? null,
        timestamp_seconds: body.timestamp_seconds ?? null,
        comment_text: commentText,
        status: "pending",
      })
      .select("*, user:users!user_id(full_name, email)")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Send email notifications to admins and project team
    try {
      // Get project details with client info
      const { data: projectData } = await admin
        .from("projects")
        .select("name, clients(company_name, users(full_name, email))")
        .eq("id", projectId)
        .single();

      // Get all admins (including super_admin)
      const { data: admins } = await admin
        .from("users")
        .select("email, full_name")
        .in("role", ["super_admin", "admin", "agency_admin", "project_manager"]);

      // Get project team members
      const { data: teamMembers } = await admin
        .from("project_team")
        .select("users(email, full_name)")
        .eq("project_id", projectId);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const commentUrl = `${appUrl}/dashboard/comments`;

      const clientsRel: any = Array.isArray(projectData?.clients)
        ? (projectData as any)?.clients?.[0]
        : (projectData as any)?.clients;
      const clientUserRel: any = Array.isArray(clientsRel?.users)
        ? clientsRel?.users?.[0]
        : clientsRel?.users;

      const clientName =
        clientUserRel?.full_name ||
        clientsRel?.company_name ||
        "A client";
      const projectName = projectData?.name || "a project";

      // Send to admins
      const adminEmails = admins || [];
      for (const admin of adminEmails) {
        if (admin.email) {
          await sendCommentNotification({
            recipientEmail: admin.email,
            recipientName: admin.full_name || "Admin",
            clientName,
            projectName,
            commentText: commentText,
            commentUrl,
          }).catch(err => {
            console.error(`Failed to send email to ${admin.email}:`, err);
          });
        }
      }

      // Send to team members
      const teamEmails = teamMembers?.map((tm: any) => tm.users) || [];
      for (const member of teamEmails) {
        if (member?.email) {
          await sendCommentNotification({
            recipientEmail: member.email,
            recipientName: member.full_name || "Team Member",
            clientName,
            projectName,
            commentText: commentText,
            commentUrl,
          }).catch(err => {
            console.error(`Failed to send email to ${member.email}:`, err);
          });
        }
      }

      console.log(`📧 Sent comment notifications for project ${projectId}`);
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error("Failed to send comment notification emails:", emailError);
    }

    return NextResponse.json(
      { comment: data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    console.error("[api/client/projects/[id]/comments] POST error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
