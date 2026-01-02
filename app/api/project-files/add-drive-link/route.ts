import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function inferFileType(name: string): string {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "m4v", "avi", "mkv"].includes(ext)) return "video";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "txt", "md", "rtf", "pages"].includes(ext)) return "document";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = String(body?.projectId || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const fileUrl = String(body?.fileUrl || "").trim();
    const fileCategory = String(body?.fileCategory || "other");
    const description = body?.description ? String(body.description) : null;

    if (!projectId || !fileName || !fileUrl) {
      return NextResponse.json({ error: "Missing projectId, fileName, or fileUrl" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    const { data, error } = await service
      .from("project_files")
      .insert({
        project_id: projectId,
        file_name: fileName,
        file_type: inferFileType(fileName),
        file_category: fileCategory,
        storage_type: "google_drive",
        file_url: fileUrl,
        description,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    const msg = err?.message || "Failed to add link";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
