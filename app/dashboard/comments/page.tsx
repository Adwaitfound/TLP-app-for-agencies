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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, UserPlus, Send, ChevronDown, ChevronUp, Users, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CommentsAdminPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [comments, setComments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [repliesData, setRepliesData] = useState<Record<string, any[]>>({});

  const isAdmin = user?.role === "admin" || user?.role === "project_manager";

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      const supabase = createClient();
      setLoading(true);
      try {
        // Get user's role and info from auth context or database
        let userRole: any = user?.role;
        
        // If no role from context, fetch from database
        if (!userRole) {
          const { data: userData } = await supabase
            .from("users")
            .select("id, role")
            .eq("id", userId)
            .single();
          userRole = userData?.role;
        }

        console.log("👤 User Role Check:", { userId, contextRole: user?.role, userRole });

        // If admin/PM, get all projects; if agency_admin get only their agency's projects; otherwise get their assigned projects
        let projectsData: any[] = [];
        
        if (userRole === "admin") {
          // System admin can see all projects
          const { data } = await supabase
            .from("projects")
            .select("id, name, client_id, clients(company_name)")
            .order("created_at", { ascending: false });
          projectsData = data || [];
          console.log("✅ Admin fetched projects:", projectsData?.length);
        } else if (userRole === "project_manager") {
          // Project manager can see assigned projects
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
        } else if (userRole === "project_manager") {
          // PM can see all projects
          const { data } = await supabase
            .from("projects")
            .select("id, name, client_id, clients(company_name)")
            .order("created_at", { ascending: false });
          projectsData = data || [];
          console.log("✅ PM fetched projects:", projectsData?.length);
        } else {
          // Regular employee can only see projects they're assigned to
          const { data: assignedProjects } = await supabase
            .from("project_team")
            .select("project_id, projects(id, name, client_id, clients(company_name))")
            .eq("user_id", userId);
          projectsData = assignedProjects?.map(p => p.projects).filter(Boolean) || [];
        }

        const projectIds = projectsData?.map((p: any) => p.id) || [];

        console.log("🔍 Fetching comments with:", {
          userRole,
          projectCount: projectsData?.length,
          projectIds,
          isAdmin: userRole === "admin" || userRole === "project_manager",
        });

        // Fetch all comments for visible projects
        // For admins, fetch without project filter; for others, filter by project
        let commentsQuery = supabase
          .from("project_comments")
          .select(
            `
                        id,
                        project_id,
                        user_id,
                        comment_text,
                        status,
                        created_at
                    `,
          );

        // Only apply project filter for non-admin users
        if ((userRole !== "admin" && userRole !== "project_manager") && projectIds.length > 0) {
          commentsQuery = commentsQuery.in("project_id", projectIds);
        }

        const { data: commentsData, error: commentsError } = await commentsQuery.order("created_at", { ascending: false });

        if (commentsError) {
          console.error("❌ Error fetching comments:", {
            code: commentsError.code,
            message: commentsError.message,
            details: commentsError.details,
            hint: commentsError.hint,
            fullError: commentsError
          });
        } else {
          console.log("✅ Got comments count:", commentsData?.length);
        }

        // Fetch author data for all comments
        const commentUserIds = commentsData?.map((c) => c.user_id).filter(Boolean) || [];
        let authorMap: Record<string, any> = {};
        if (commentUserIds.length > 0) {
          const { data: authors } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", commentUserIds);
          
          authors?.forEach((user) => {
            authorMap[user.id] = user;
          });
        }

        // Fetch project details
        const projectIdsFromComments = commentsData?.map((c) => c.project_id).filter(Boolean) || [];
        let projectMap: Record<string, any> = {};
        if (projectIdsFromComments.length > 0) {
          const { data: projectDetails } = await supabase
            .from("projects")
            .select("id, name, client_id, clients(company_name)")
            .in("id", projectIdsFromComments);
          
          projectDetails?.forEach((proj) => {
            projectMap[proj.id] = proj;
          });
        }

        // Attach all data to comments
        const commentsWithAllData = commentsData?.map((comment) => ({
          ...comment,
          author: authorMap[comment.user_id] || null,
          projects: projectMap[comment.project_id] || null,
        }));

        // Fetch replies for all comments
        const commentIds = commentsData?.map((c) => c.id) || [];
        let repliesData: any[] = [];
        if (commentIds.length > 0) {
          const { data: replies } = await supabase
            .from("comment_replies")
            .select("id, comment_id, user_id, reply_text, created_at")
            .in("comment_id", commentIds)
            .order("created_at", { ascending: true });
          
          repliesData = replies || [];
        }

        // Fetch reply authors
        const replyUserIds = repliesData.map((r) => r.user_id).filter(Boolean);
        let replyAuthorMap: Record<string, any> = {};
        if (replyUserIds.length > 0) {
          const { data: replyAuthors } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", replyUserIds);
          
          replyAuthors?.forEach((user) => {
            replyAuthorMap[user.id] = user;
          });
        }

        // Attach replies to comments
        const repliesByComment: Record<string, any[]> = {};
        repliesData.forEach((reply) => {
          if (!repliesByComment[reply.comment_id]) {
            repliesByComment[reply.comment_id] = [];
          }
          repliesByComment[reply.comment_id].push({
            ...reply,
            author: replyAuthorMap[reply.user_id] || null,
          });
        });
        setRepliesData(repliesByComment);

        setProjects(projectsData || []);
        setComments(commentsWithAllData || []);

        console.log("✅ Comments Loaded:", {
          projectCount: projectsData?.length,
          commentCount: commentsData?.length,
          userRole,
          projectIds,
          hasComments: (commentsData || []).length > 0,
          firstComment: commentsData?.[0],
        });

        // Set up real-time subscriptions
        const commentsChannel = supabase
          .channel("comments-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "project_comments",
            },
            async (payload) => {
              if (payload.eventType === "INSERT") {
                // Fetch full comment data
                const { data: newComment } = await supabase
                  .from("project_comments")
                  .select("id, project_id, user_id, comment_text, status, created_at")
                  .eq("id", payload.new.id)
                  .single();

                if (newComment) {
                  // Fetch author
                  const { data: author } = await supabase
                    .from("users")
                    .select("id, full_name, email")
                    .eq("id", newComment.user_id)
                    .single();

                  // Fetch project details
                  const { data: project } = await supabase
                    .from("projects")
                    .select("id, name, client_id, clients(company_name)")
                    .eq("id", newComment.project_id)
                    .single();

                  // Attach related data
                  const commentWithData = {
                    ...newComment,
                    author: author || null,
                    projects: project || null,
                  };

                  setComments((prev) => [commentWithData, ...prev]);
                }
              } else if (payload.eventType === "UPDATE") {
                setComments((prev) =>
                  prev.map((c) =>
                    c.id === payload.new.id
                      ? { ...c, ...payload.new }
                      : c,
                  ),
                );
              } else if (payload.eventType === "DELETE") {
                setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "comment_replies",
            },
            async (payload) => {
              // Fetch full reply data
              const { data: newReply } = await supabase
                .from("comment_replies")
                .select("id, reply_text, created_at, comment_id, user_id")
                .eq("id", payload.new.id)
                .single();

              if (newReply) {
                // Fetch author
                const { data: author } = await supabase
                  .from("users")
                  .select("id, full_name, email")
                  .eq("id", newReply.user_id)
                  .single();

                const replyWithAuthor = {
                  ...newReply,
                  author: author || null,
                };

                setRepliesData((prev) => ({
                  ...prev,
                  [newReply.comment_id]: [
                    ...(prev[newReply.comment_id] || []),
                    replyWithAuthor,
                  ],
                }));
              }
            },
          )
          .subscribe();

        return () => {
          supabase.removeChannel(commentsChannel);
        };
      } catch (e) {
        console.error("❌ Failed to fetch comments admin view", e);
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
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;
      const haystack =
        `${c.comment_text || ""} ${c.projects?.name || ""} ${c.author?.full_name || ""} ${c.author?.email || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesProject && matchesSearch && matchesStatus;
    });
  }, [comments, projectFilter, search, statusFilter]);

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
      const { data, error } = await supabase
        .from("comment_replies")
        .insert([
          {
            comment_id: commentId,
            user_id: userId,
            reply_text: replyText,
          },
        ])
        .select("id, reply_text, created_at, user_id")
        .single();

      if (error) throw error;

      if (data) {
        // Fetch author data
        const { data: author } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", data.user_id)
          .single();

        const replyWithAuthor = {
          ...data,
          author: author || null,
        };

        setReplies((prev) => ({ ...prev, [commentId]: "" }));
        setRepliesData((prev) => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), replyWithAuthor],
        }));
        
        // Auto-expand after replying
        setExpandedComments((prev) => new Set(prev).add(commentId));
      }
    } catch (e) {
      console.error("Failed to add reply", e);
    }
  };

  const updateStatus = async (commentId: string, newStatus: string) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("project_comments")
        .update({ status: newStatus })
        .eq("id", commentId);

      if (error) throw error;

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, status: newStatus } : c
        )
      );
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pending":
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Client Feedback & Comments
                </CardTitle>
                <CardDescription className="mt-1">
                  {isAdmin ? "Manage and respond to client feedback" : "View comments and feedback"}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {filtered.length} {filtered.length === 1 ? "Comment" : "Comments"}
              </Badge>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Search comments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No comments found</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isExpanded = expandedComments.has(c.id);
              
              return (
                <Card key={c.id} className="overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    {/* Comment Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10 border-2">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {c.author?.full_name?.[0] || c.author?.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">
                              {c.author?.full_name || c.author?.email || "Unknown"}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              Client
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(c.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <Badge className={cn("border", getStatusColor(c.status))}>
                        {c.status || "pending"}
                      </Badge>
                    </div>

                    {/* Project Info */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{c.projects?.name}</p>
                        {c.projects?.clients?.company_name && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground">
                              {c.projects.clients.company_name}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comment Text */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {c.comment_text}
                      </p>
                    </div>

                    {/* Status Update - Admin Only */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Select
                          value={c.status || "pending"}
                          onValueChange={(value) => updateStatus(c.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Replies Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Responses ({repliesData[c.id]?.length || 0})
                        </h4>
                        
                        {repliesData[c.id]?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpanded(c.id)}
                          >
                            {expandedComments.has(c.id) ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show {repliesData[c.id].length} {repliesData[c.id].length === 1 ? "Response" : "Responses"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Replies List */}
                      {expandedComments.has(c.id) && repliesData[c.id]?.length > 0 && (
                        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                          {repliesData[c.id].map((reply) => (
                            <div key={reply.id} className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {reply.author?.full_name?.[0] || reply.author?.email?.[0] || "A"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium">
                                      {reply.author?.full_name || reply.author?.email}
                                    </p>
                                    <Badge variant="secondary" className="text-xs">
                                      Admin
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-2 whitespace-pre-wrap">
                                    {reply.reply_text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input - Admin Only */}
                      {isAdmin && (
                        <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                          <Textarea
                            placeholder="Write your response to the client..."
                            value={replies[c.id] || ""}
                            onChange={(e) =>
                              setReplies((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            className="text-sm min-h-[80px] bg-background"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => addReply(c.id)}
                              disabled={!replies[c.id]?.trim()}
                            >
                              <Send className="h-3 w-3 mr-2" />
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
