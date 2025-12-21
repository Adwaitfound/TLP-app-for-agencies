import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function withTimeout<T>(label: string, promise: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
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

export default async function ClientProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  if (!projectId) {
    redirect("/dashboard/client?tab=projects");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await withTimeout("auth.getUser", supabase.auth.getUser(), 15000);

  if (!user) {
    redirect("/login?role=client");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server configuration missing</CardTitle>
        </CardHeader>
        <CardContent>
          SUPABASE_SERVICE_ROLE_KEY is not configured on the server.
        </CardContent>
      </Card>
    );
  }

  const admin = createServiceClient();

  const { data: clientRow } = await withTimeout(
    "clients.select",
    admin.from("clients").select("id").eq("user_id", user.id).single(),
    15000,
  );

  if (!clientRow?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client record not found</CardTitle>
        </CardHeader>
        <CardContent>
          Your account is not linked to a client profile.
        </CardContent>
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
        <CardContent>
          This project doesn’t exist or you don’t have access.
        </CardContent>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="text-sm text-muted-foreground">Project details (client view)</div>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/client?tab=projects">Back to Projects</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {project.description ? (
              <div>
                <div className="text-muted-foreground">Description</div>
                <div className="whitespace-pre-wrap">{project.description}</div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Progress</div>
                <div className="font-medium">{project.progress_percentage ?? 0}%</div>
              </div>
              {project.deadline ? (
                <div>
                  <div className="text-muted-foreground">Deadline</div>
                  <div className="font-medium">
                    {new Date(project.deadline).toLocaleDateString()}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(subProjects ?? []).length === 0 ? (
              <div className="text-muted-foreground">No milestones yet.</div>
            ) : (
              <div className="space-y-2">
                {(subProjects ?? []).map((sp: any) => (
                  <div key={sp.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{sp.title || sp.name || "Milestone"}</div>
                      {sp.status ? <StatusBadge status={sp.status} /> : null}
                    </div>
                    {sp.description ? (
                      <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
                        {sp.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(projectFiles ?? []).length === 0 ? (
              <div className="text-muted-foreground">No files uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {(projectFiles ?? []).map((f: any) => (
                  <div key={f.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.file_name || f.name || "File"}</div>
                        {f.created_at ? (
                          <div className="text-xs text-muted-foreground">
                            {new Date(f.created_at).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                      {f.file_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(projectComments ?? []).length === 0 ? (
              <div className="text-muted-foreground">No comments yet.</div>
            ) : (
              <div className="space-y-2">
                {(projectComments ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">
                      {(c.user?.full_name || c.user?.email || "Unknown")} ·{" "}
                      {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{c.comment_text}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
