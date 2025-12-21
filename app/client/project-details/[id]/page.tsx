import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, FolderKanban, FileText, MessageSquare, Clock, Plus } from "lucide-react";
import { getFileType, getGoogleDriveThumbnailUrl } from "@/lib/file-upload";

type PageProps = {
  params: Promise<{ id: string }>;
};

function withTimeout<T>(
  label: string,
  promise: PromiseLike<T>,
  timeoutMs = 15000,
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

export default async function ClientProjectDetailsStandalonePage({ params }: PageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await withTimeout("auth.getUser", supabase.auth.getUser(), 15000);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not signed in</CardTitle>
        </CardHeader>
        <CardContent>
          Please sign in again from the client dashboard.
          <div className="mt-3">
            <Link
              href="/login?role=client"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go to login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server configuration missing</CardTitle>
        </CardHeader>
        <CardContent>SUPABASE_SERVICE_ROLE_KEY is not configured on the server.</CardContent>
      </Card>
    );
  }

  const admin = createServiceClient();

  const { data: clientRow } = await withTimeout(
    "clients.select",
    admin.from("clients").select("id, company_name").eq("user_id", user.id).single(),
    15000,
  );

  if (!clientRow?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client record not found</CardTitle>
        </CardHeader>
        <CardContent>Your account is not linked to a client profile.</CardContent>
      </Card>
    );
  }

  const { data: project } = await withTimeout(
    "projects.select",
    admin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("client_id", clientRow.id)
      .single(),
    15000,
  );

  if (!project) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project not found</CardTitle>
        </CardHeader>
        <CardContent>This project doesn’t exist or you don’t have access.</CardContent>
      </Card>
    );
  }

  const [{ data: subProjects }, { data: projectFiles }, { data: projectComments }] =
    await Promise.all([
      withTimeout(
        "sub_projects.select",
        admin
          .from("sub_projects")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        15000,
      ),
      withTimeout(
        "project_files.select",
        admin
          .from("project_files")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        15000,
      ),
      withTimeout(
        "project_comments.select",
        admin
          .from("project_comments")
          .select("*, user:users!user_id(full_name, email)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        15000,
      ),
    ]);

  const milestones = subProjects ?? [];
  const files = projectFiles ?? [];
  const comments = projectComments ?? [];
  const progress = project.progress_percentage ?? 0;
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.end_date
    ? new Date(project.end_date)
    : project.deadline
    ? new Date(project.deadline)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {clientRow.company_name || "Client"}
          </h1>
          <p className="text-muted-foreground">
            Manage your projects, invoices, and communications
          </p>
        </div>
        <Button asChild>
          <Link href="/contact" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Request Project
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {project.name || project.title}
            </h1>
            {project.status ? <StatusBadge status={project.status} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">Project details and activity</p>
        </div>
        <Link
          href="/dashboard/client?tab=projects"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Projects
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{progress}%</span>
              <Badge variant="outline" className="text-xs">{project.status ?? "—"}</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Start: {startDate ? startDate.toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due: {endDate ? endDate.toLocaleDateString() : "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Artifacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span>{milestones.length} milestones</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{files.length} files</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>{comments.length} comments</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Created {project.created_at ? new Date(project.created_at).toLocaleDateString() : "—"}</span>
            </div>
            {project.updated_at ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Status and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <Badge variant="outline">Client-owned</Badge>
          </div>
          {project.description ? (
            <div className="whitespace-pre-wrap leading-relaxed">{project.description}</div>
          ) : (
            <div className="text-muted-foreground">No description provided.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Key steps and due dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {milestones.length ? (
              <ul className="space-y-2 text-sm">
                {milestones.map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.title || m.name || "Milestone"}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.status ?? "—"}
                        {m.due_date ? ` • Due ${m.due_date}` : ""}
                      </div>
                    </div>
                    {m.progress_percentage != null ? (
                      <span className="text-xs font-medium">{m.progress_percentage}%</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No milestones yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>Latest uploads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.length ? (
              <ul className="space-y-2 text-sm">
                {files.map((f: any) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const type = f.file_type || getFileType(f.file_name || "");
                        const isImage = type === "image";
                        const isVideo = type === "video";
                        const thumb =
                          f.thumbnail_url ||
                          (f.storage_type === "gdrive" ? getGoogleDriveThumbnailUrl(f.file_url, 160) : null) ||
                          (isImage ? f.file_url : null) ||
                          (isVideo && f.video_thumbnail_url ? f.video_thumbnail_url : null);
                        return thumb ? (
                          <img src={thumb} alt={f.file_name || "File"} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        );
                      })()}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.file_name ?? f.name ?? "File"}</div>
                        {f.created_at ? (
                          <div className="text-xs text-muted-foreground">
                            {new Date(f.created_at).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {f.file_url ? (
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No link</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No files uploaded yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Feedback and discussion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {comments.length ? (
            <ul className="space-y-3 text-sm">
              {comments.map((c: any) => (
                <li key={c.id} className="rounded-md border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {c.user?.full_name || c.user?.email || "Unknown"}
                    {c.created_at ? ` · ${new Date(c.created_at).toLocaleString()}` : ""}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{c.comment_text ?? c.comment ?? ""}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">No comments yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
