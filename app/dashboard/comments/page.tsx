"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCommentToEmployee } from "@/app/actions/client-comments";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CommentsAdminPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [comments, setComments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamByProject, setTeamByProject] = useState<Record<string, any[]>>({});
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [repliesData, setRepliesData] = useState<Record<string, any[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      const supabase = createClient();
      setLoading(true);
      try {
        // Get user's role and info
        const { data: userData } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", userId)
          .single();

        // If admin/PM, get all projects; if agency_admin get only their agency's projects; otherwise get their assigned projects
        let projectsData: any[] = [];
        
        if (userData?.role === "admin") {
          // System admin can see all projects
          const { data } = await supabase
            .from("projects")
            .select("id, name, client_id, clients(company_name)")
            .order("created_at", { ascending: false });
          projectsData = data || [];
        } else if (userData?.role === "agency_admin") {
          // Agency admin can see only their agency's projects
          const { data: userAgency } = await supabase
            .from("user_agencies")
            .select("agency_id")
            .eq("user_id", userId)
            .single();

          if (userAgency) {
            const { data } = await supabase
              .from("projects")
              .select("id, name, client_id, clients(company_name)")
              .eq("agency_id", userAgency.agency_id)
              .order("created_at", { ascending: false });
            projectsData = data || [];
          }
        } else if (userData?.role === "project_manager") {
          // PM can see all projects
          const { data } = await supabase
            .from("projects")
            .select("id, name, client_id, clients(company_name)")
            .order("created_at", { ascending: false });
          projectsData = data || [];
        } else {
          // Regular employee can only see projects they're assigned to
          const { data: assignedProjects } = await supabase
            .from("project_team")
            .select("project_id, projects(id, name, client_id, clients(company_name))")
            .eq("user_id", userId);
          projectsData = assignedProjects?.map(p => p.projects).filter(Boolean) || [];
        }

        const projectIds = projectsData?.map((p: any) => p.id) || [];

        // Fetch all comments for visible projects
        const { data: commentsData } = await supabase
          .from("project_comments")
          .select(
            `
                        id,
                        project_id,
                        user_id,
                        comment_text,
                        assigned_user_id,
                        status,
                        created_at,
                        author:user_id(full_name, email),
                        assignee:assigned_user_id(full_name, email),
                        projects(name, clients(company_name)),
                        comment_replies(id, reply_text, created_at, author:user_id(full_name, email))
                    `,
          )
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        // Organize replies by comment ID
        const repliesByComment: Record<string, any[]> = {};
        commentsData?.forEach((comment) => {
          repliesByComment[comment.id] = comment.comment_replies || [];
        });
        setRepliesData(repliesByComment);

        const { data: teamRows } = await supabase
          .from("project_team")
          .select("project_id, user_id, users(full_name, email)")
          .in("project_id", projectIds);

        const groupedTeam = (teamRows || []).reduce(
          (acc, row) => {
            acc[row.project_id] = acc[row.project_id] || [];
            acc[row.project_id].push(row);
            return acc;
          },
          {} as Record<string, any[]>,
        );

        setProjects(projectsData || []);
        setComments(commentsData || []);
        setTeamByProject(groupedTeam);
      } catch (e) {
        console.error("Failed to fetch comments admin view", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      const matchesProject =
        projectFilter === "all" || c.project_id === projectFilter;
      const haystack =
        `${c.comment_text || ""} ${c.projects?.name || ""} ${c.author?.full_name || ""} ${c.author?.email || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesProject && matchesSearch;
    });
  }, [comments, projectFilter, search]);

  const assign = async (commentId: string, userId: string) => {
    if (!userId) return;
    const res = await assignCommentToEmployee({ commentId, userId });
    if (res.success) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                assigned_user_id: userId,
                assignee: res.comment?.assignee,
              }
            : c,
        ),
      );
    }
  };

  const addReply = async (commentId: string) => {
    const replyText = replies[commentId]?.trim();
    if (!replyText || !userId) return;

    const supabase = createClient();
    try {
      const { data: newReply, error } = await supabase
        .from("comment_replies")
        .insert([
          {
            comment_id: commentId,
            user_id: userId,
            reply_text: replyText,
          },
        ])
        .select(
          `
          id,
          reply_text,
          created_at,
          author:user_id(full_name, email)
        `,
        )
        .single();

      if (error) throw error;

      setReplies((prev) => ({ ...prev, [commentId]: "" }));
      setRepliesData((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), newReply],
      }));
    } catch (e) {
      console.error("Failed to add reply", e);
    }
  };

  const toggleExpanded = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Project Comments</CardTitle>
            <CardDescription>
              Admin/PM view of all comments across projects
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search comments or authors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments found</p>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {c.author?.full_name || c.author?.email || "Unknown user"}
                  </span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {c.projects?.name || "Project"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.projects?.clients?.company_name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.status}
                  </span>
                </div>
                <p className="text-sm">{c.comment_text}</p>
                {c.assignee && (
                  <p className="text-xs text-muted-foreground">
                    Assigned to {c.assignee.full_name || c.assignee.email}
                  </p>
                )}
                {teamByProject[c.project_id]?.length ? (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={assignees[c.id] ?? c.assigned_user_id ?? ""}
                      onChange={(e) =>
                        setAssignees((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select assignee</option>
                      {teamByProject[c.project_id].map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.users?.full_name || m.users?.email || "Member"}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        assignees[c.id] && assign(c.id, assignees[c.id])
                      }
                    >
                      Assign
                    </Button>
                  </div>
                ) : null}

                {/* Replies Section */}
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Replies ({repliesData[c.id]?.length || 0})
                    </h4>
                    {repliesData[c.id]?.length > 0 && expandedComments.has(c.id) && (
                      <div className="space-y-2 bg-muted/30 p-2 rounded">
                        {repliesData[c.id].map((reply) => (
                          <div key={reply.id} className="text-xs border-l-2 border-primary pl-2">
                            <p className="font-medium">
                              {reply.author?.full_name || reply.author?.email}
                            </p>
                            <p className="text-muted-foreground">
                              {new Date(reply.created_at).toLocaleString()}
                            </p>
                            <p className="mt-1">{reply.reply_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpanded(c.id)}
                  >
                    {expandedComments.has(c.id) ? "Hide Replies" : "Show Replies"}
                  </Button>

                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replies[c.id] || ""}
                      onChange={(e) =>
                        setReplies((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      className="text-sm"
                      rows={2}
                    />
                    <Button
                      size="sm"
                      onClick={() => addReply(c.id)}
                      disabled={!replies[c.id]?.trim()}
                    >
                      Post Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
