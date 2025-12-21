import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = (await Promise.resolve((context as any).params)) as { id: string };
  const projectId = params?.id;

  const withTimeout = async <T,>(
    label: string,
    promise: PromiseLike<T>,
    timeoutMs = 15000,
  ): Promise<T> => {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  };

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing project id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    console.log("[api/client/projects/[id]] start", { projectId });
    const supabase = await createClient();

    console.log("[api/client/projects/[id]] auth.getUser...");
    const {
      data: { user },
      error: authError,
    } = await withTimeout("auth.getUser", supabase.auth.getUser(), 15000);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.log("[api/client/projects/[id]] authed", { userId: user.id });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured on the server (required to bypass RLS for this endpoint).",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const admin = createServiceClient();

    // Resolve the requesting user's client record.
    console.log("[api/client/projects/[id]] loading client row...");
    const { data: clientRow, error: clientError } = await withTimeout(
      "clients.select",
      admin.from("clients").select("id").eq("user_id", user.id).single(),
      15000,
    );

    if (clientError || !clientRow?.id) {
      return NextResponse.json(
        { error: "Client record not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Fetch the project and enforce ownership by client_id.
    console.log("[api/client/projects/[id]] loading project...");
    const { data: project, error: projectError } = await withTimeout(
      "projects.select",
      admin
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("client_id", clientRow.id)
        .single(),
      15000,
    );

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { project },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    console.error("[api/client/projects/[id]] error:", e);
    if (String(e?.message || "").includes("timed out")) {
      return NextResponse.json(
        { error: e?.message || "Request timed out" },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
