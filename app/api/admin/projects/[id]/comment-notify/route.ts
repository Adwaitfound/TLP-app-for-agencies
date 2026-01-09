import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendCommentNotification } from "@/lib/provisioning/email-service";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = (await Promise.resolve((context as any).params)) as { id: string };
  const projectId = params?.id;

  if (!projectId) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      comment_text?: string;
    };

    const commentText = (body.comment_text || "").trim();
    if (!commentText) {
      return NextResponse.json({ error: "comment_text is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured for notifications" }, { status: 500 });
    }

    const admin = createServiceClient();

    // Get the posting user's name
    const { data: actor } = await admin
      .from("users")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    // Find the project's client user to notify
    const { data: project } = await admin
      .from("projects")
      .select("name, clients(user_id, company_name, users(full_name, email))")
      .eq("id", projectId)
      .single();

    const clientsRel: any = Array.isArray(project?.clients)
      ? (project as any)?.clients?.[0]
      : (project as any)?.clients;
    const clientUserRel: any = Array.isArray(clientsRel?.users)
      ? clientsRel?.users?.[0]
      : clientsRel?.users;

    const clientUserEmail = clientUserRel?.email || null;
    const clientUserName = clientUserRel?.full_name || clientsRel?.company_name || "Client";
    const projectName = project?.name || "Project";

    if (!clientUserEmail) {
      // No client user email found; do not fail hard
      return NextResponse.json({ ok: true, message: "No client user email for project" }, { status: 200 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const commentUrl = `${appUrl}/dashboard/client?tab=comments`;

    // Reuse notification template; set clientName to actor for subject clarity
    await sendCommentNotification({
      recipientEmail: clientUserEmail,
      recipientName: clientUserName,
      clientName: actor?.full_name || "Team",
      projectName,
      commentText,
      commentUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin comment-notify] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
