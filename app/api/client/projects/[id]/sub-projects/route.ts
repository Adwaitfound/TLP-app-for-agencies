import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
      .from("sub_projects")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { subProjects: data ?? [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    console.error("[api/client/projects/[id]/sub-projects] error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
