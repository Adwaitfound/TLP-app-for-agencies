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
  const [teamByProject, setTeamByProject] = useState<Record<string, any[]>>({});
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [repliesData, setRepliesData] = useState<Record<string, any[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isAdmin = user?.role === "admin" || user?.role === "project_manager";

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      const supabase = createClient();
      setLoading(true);
      try {
        // Get user's role and info from auth context or database
        let userRole = user?.role;
        
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
        } else if (userRole === "agency_admin") {
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
                        assigned_user_id,
                        status,
                        created_at,
                        author:users!project_comments_user_id_fkey(full_name, email),
                        projects(name, clients(company_name)),
                        comment_replies(id, reply_text, created_at, author:users!comment_replies_user_id_fkey(full_name, email))
                    `,
          );

        // Only apply project filter for non-admin users
        if ((userRole !== "admin" && userRole !== "project_manager") && projectIds.length > 0) {
          commentsQuery = commentsQuery.in("project_id", projectIds);
        }

        const { data: commentsData, error: commentsError } = await commentsQuery.order("created_at", { ascending: false });

        if (commentsError) {
          console.error("❌ Error fetching comments:", commentsError);
        } else {
          console.log("✅ Got comments count:", commentsData?.length);
        }

        // Fetch assignee data for comments that have assigned_user_id
        const assigneeIds = commentsData
          ?.filter((c) => c.assigned_user_id)
          .map((c) => c.assigned_user_id) || [];
        
        let assigneeMap: Record<string, any> = {};
        if (assigneeIds.length > 0) {
          const { data: assigneeData } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", assigneeIds);
          
          assigneeData?.forEach((user) => {
            assigneeMap[user.id] = user;
          });
        }

        // Attach assignee data to comments
        const commentsWithAssignees = commentsData?.map((comment) => ({
          ...comment,
          assignee: comment.assigned_user_id ? assigneeMap[comment.assigned_user_id] : null,
        }));

        // Organize replies by comment ID
        const repliesByComment: Record<string, any[]> = {};
        commentsWithAssignees?.forEach((comment) => {
          repliesByComment[comment.id] = comment.comment_replies || [];
        });
        setRepliesData(repliesByComment);

        let teamQuery = supabase
          .from("project_team")
          .select("project_id, user_id, users!project_team_user_id_fkey(full_name, email)");

        if (projectIds.length > 0) {
          teamQuery = teamQuery.in("project_id", projectIds);
        }

        const { data: teamRows } = await teamQuery;

        const groupedTeam = (teamRows || []).reduce(
          (acc, row) => {
            acc[row.project_id] = acc[row.project_id] || [];
            acc[row.project_id].push(row);
            return acc;
          },
          {} as Record<string, any[]>,
        );

        setProjects(projectsData || []);
        setComments(commentsWithAssignees || []);
        setTeamByProject(groupedTeam);

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
                // Fetch full comment data with relations
                const { data: newComment } = await supabase
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
                  author:users!project_comments_user_id_fkey(full_name, email),
                  projects(name, clients(company_name)),
                  comment_replies(id, reply_text, created_at, author:users!comment_replies_user_id_fkey(full_name, email))
                `,
                  )
                  .eq("id", payload.new.id)
                  .single();

                if (newComment) {
                  setComments((prev) => [newComment, ...prev]);
                  setRepliesData((prev) => ({
                    ...prev,
                    [newComment.id]: newComment.comment_replies || [],
                  }));
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
                .select(
                  `
                  id,
                  reply_text,
                  created_at,
                  comment_id,
                  author:users!comment_replies_user_id_fkey(full_name, email)
                `,
                )
                .eq("id", payload.new.id)
                .single();

              if (newReply) {
                setRepliesData((prev) => ({
                  ...prev,
                  [newReply.comment_id]: [
                    ...(prev[newReply.comment_id] || []),
                    newReply,
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
          author:users!comment_replies_user_id_fkey(full_name, email)
        `,
        )
        .single();

      if (error) throw error;

      setReplies((prev) => ({ ...prev, [commentId]: "" }));
      setRepliesData((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), newReply],
      }));
      
      // Auto-expand after replying
      setExpandedComments((prev) => new Set(prev).add(commentId));
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
              const replyCount = repliesData[c.id]?.length || 0;
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

                    {/* Assignment Section - Admin Only */}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Assign to:</span>
                        </div>
                        
                        {teamByProject[c.project_id]?.length ? (
                          <>
                            <Select
                              value={assignees[c.id] ?? c.assigned_user_id ?? ""}
                              onValueChange={(value) =>
                                setAssignees((prev) => ({ ...prev, [c.id]: value }))
                              }
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamByProject[c.project_id].map((m) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.users?.full_name || m.users?.email || "Member"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => assignees[c.id] && assign(c.id, assignees[c.id])}
                              disabled={!assignees[c.id]}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">No team members available</p>
                        )}
                        
                        {c.assignee && (
                          <Badge variant="secondary" className="ml-auto">
                            Assigned: {c.assignee.full_name || c.assignee.email}
                          </Badge>
                        )}
                        
                        {/* Status Update - Admin Only */}
                        <div className="flex items-center gap-2 ml-auto">
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
                      </div>
                    )}

                    {/* Replies Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Conversation ({replyCount})
                        </h4>
                        
                        {replyCount > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpanded(c.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Replies List */}
                      {isExpanded && replyCount > 0 && (
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
                      
                      {/* View Only Message for Team */}
                      {!isAdmin && (
                        <p className="text-xs text-muted-foreground italic">
                          You can view this conversation. Only admins can reply.
                        </p>
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
