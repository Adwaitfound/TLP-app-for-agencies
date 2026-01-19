"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ArrowLeft,
  IndianRupee,
  Loader2,
  Calendar,
  Edit,
  Users,
  FileText,
  CheckSquare,
  TrendingUp,
  Clock,
  Image,
  File as FileIcon,
  UserCheck,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  ProjectFile,
  Milestone,
  User,
  SubProject,
  SubProjectComment,
  SubProjectUpdate,
  MilestoneStatus,
} from "@/types";
import { SERVICE_TYPES } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { FileManager } from "@/components/projects/file-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
} from "@/app/actions/milestones";
import {
  assignTeamMember,
  removeTeamMember,
  getProjectTeamMembers,
} from "@/app/actions/team-management";
import {
  createCommentReply,
  getCommentReplies,
  updateCommentReply,
  deleteCommentReply,
} from "@/app/actions/comment-replies";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CommentReplies = Record<string, SubProjectComment[]>;

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [projectComments, setProjectComments] = useState<SubProjectComment[]>([]);
  const [commentReplies, setCommentReplies] = useState<CommentReplies>({});
  const [commentReplyText, setCommentReplyText] = useState<Record<string, string>>({});
  const [loadingCommentReplies, setLoadingCommentReplies] = useState<Record<string, boolean>>({});
  const [projectTeam, setProjectTeam] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

  const supabase = createClient();

  // Fetch project details
  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchSubProjects(projectId);
      fetchProjectComments(projectId);
      fetchProjectTeamMembers(projectId);
      fetchMilestones(projectId);
    }
  }, [projectId]);

  async function fetchProjectDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("saas_projects")
        .select(`
          *,
          clients:saas_clients(*)
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubProjects(pid: string) {
    try {
      const { data, error } = await supabase
        .from("sub_projects")
        .select("*")
        .eq("project_id", pid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubProjects(data || []);
    } catch (error) {
      console.error("Error fetching sub-projects:", error);
    }
  }

  async function fetchProjectComments(pid: string) {
    try {
      const { data, error } = await supabase
        .from("sub_project_comments")
        .select(`
          *,
          users(id, full_name, email)
        `)
        .eq("project_id", pid)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjectComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }

  async function fetchProjectTeamMembers(pid: string) {
    try {
      const result = await getProjectTeamMembers(pid);
      if (result.success && Array.isArray(result.data)) {
        setProjectTeam(result.data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  }

  async function fetchMilestones(pid: string) {
    try {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", pid)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    }
  }

  async function fetchAllUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("status", "approved")
        .order("full_name");

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !project || !user) return;

    setCommentSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("sub_project_comments")
        .insert({
          project_id: project.id,
          user_id: user.id,
          comment: commentText.trim(),
        })
        .select(`
          *,
          users(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      setProjectComments((prev) => [data, ...prev]);
      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || !project || submitting) return;

    setSubmitting(true);
    try {
      const result = await createMilestone({
        project_id: project.id,
        title: newMilestoneTitle,
        description: newMilestoneDescription,
        due_date: newMilestoneDueDate || null,
      });

      if (result.data) {
        setMilestones((prev) => [...prev, result.data]);
        setNewMilestoneTitle("");
        setNewMilestoneDescription("");
        setNewMilestoneDueDate("");
      }
    } catch (error) {
      console.error("Error creating milestone:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMilestoneStatus = async (
    milestoneId: string,
    newStatus: MilestoneStatus
  ) => {
    try {
      const result = await updateMilestoneStatus(milestoneId, newStatus);
      if (!result?.error) {
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId ? { ...m, status: newStatus } : m
          )
        );
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      const result = await deleteMilestone(milestoneId);
      if (!result?.error) {
        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      }
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleAssignTeamMember = async () => {
    if (!project || !selectedUserId || submitting) return;

    const alreadyAssigned = projectTeam.find(
      (member) => member.id === selectedUserId
    );

    if (alreadyAssigned) {
      alert("User is already assigned to this project");
      return;
    }

    setSubmitting(true);
    try {
      const result = await assignTeamMember({
        project_id: project.id,
        user_id: selectedUserId
      });

      if (!result?.error && result?.success) {
        const updatedResult = await getProjectTeamMembers(project.id);
        if (updatedResult.success && Array.isArray(updatedResult.data)) {
          setProjectTeam(updatedResult.data);
        }
        setSelectedUserId("");
      }
    } catch (error) {
      console.error("Error assigning team member:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!project) return;

    setSubmitting(true);
    try {
      const result = await removeTeamMember(project.id, userId);

      if (!result?.error) {
        setProjectTeam((prev) => prev.filter((m) => m.id !== userId));
      }
    } catch (error) {
      console.error("Error removing team member:", error);
    } finally {
      setSubmitting(false);
    }
  };

  async function toggleCommentReplies(commentId: string) {
    if (commentReplies[commentId]) {
      setCommentReplies((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
    } else {
      setLoadingCommentReplies((prev) => ({ ...prev, [commentId]: true }));
      try {
        const result = await getCommentReplies(commentId);
        const replies = Array.isArray(result) ? result : (result?.replies || []);
        setCommentReplies((prev) => ({ ...prev, [commentId]: replies as SubProjectComment[] }));
      } catch (error) {
        console.error("Error fetching replies:", error);
      } finally {
        setLoadingCommentReplies((prev) => ({ ...prev, [commentId]: false }));
      }
    }
  }

  async function handleAddReply(commentId: string) {
    const text = commentReplyText[commentId]?.trim();
    if (!text || !user) return;

    try {
      const response = await createCommentReply({
        commentId,
        replyText: text,
        userId: user.id,
      });

      if (response.success && response.reply) {
        const newReply: SubProjectComment = {
          id: response.reply.id,
          sub_project_id: projectId,
          user_id: response.reply.user_id,
          comment_text: response.reply.reply_text,
          created_at: response.reply.created_at,
          users: {
            id: response.reply.user?.[0]?.id,
            full_name: response.reply.user?.[0]?.full_name,
            email: response.reply.user?.[0]?.email,
            role: response.reply.user?.[0]?.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User,
        };

        setCommentReplies((prev) => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), newReply],
        }));
        setCommentReplyText((prev) => ({ ...prev, [commentId]: "" }));
      }
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  }

  const getServiceBadgeVariant = (serviceType: string) => {
    switch (serviceType) {
      case "social_media":
        return "default";
      case "video_production":
        return "secondary";
      case "design_branding":
        return "outline";
      default:
        return "default";
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case "social_media":
        return "📱";
      case "video_production":
        return "🎥";
      case "design_branding":
        return "🎨";
      default:
        return "📋";
    }
  };

  const getServiceLabel = (serviceType: string) => {
    const service = SERVICE_TYPES[serviceType as keyof typeof SERVICE_TYPES];
    return service?.label || serviceType;
  };

  const getMilestoneStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "in_progress":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => router.push("/dashboard/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/projects")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-muted-foreground">
              Client: {project.clients?.company_name || "No client"}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={getServiceBadgeVariant(project.service_type)}>
              <span className="mr-1">{getServiceIcon(project.service_type)}</span>
              {getServiceLabel(project.service_type)}
            </Badge>
            <StatusBadge status={project.status} />
          </div>
        </div>
      </div>

      {/* Project Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {project.budget && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <IndianRupee className="h-3 w-3" />
                  Budget
                </div>
                <p className="font-semibold">
                  ₹{project.budget.toLocaleString()}
                </p>
              </div>
            )}
            {project.start_date && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </div>
                <p className="font-semibold">
                  {new Date(project.start_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {project.deadline && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Deadline
                </div>
                <p className="font-semibold">
                  {new Date(project.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Progress
              </div>
              <p className="font-semibold">{project.progress_percentage}%</p>
            </div>
          </div>

          {project.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {project.progress_percentage}%
              </span>
            </div>
            <Progress value={project.progress_percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">
            <CheckSquare className="h-4 w-4 mr-2" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="comments">
            <FileText className="h-4 w-4 mr-2" />
            Comments
          </TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>Track project milestones and progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new milestone */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Add New Milestone</h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="milestone-title">Title</Label>
                    <Input
                      id="milestone-title"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Milestone title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="milestone-desc">Description</Label>
                    <Textarea
                      id="milestone-desc"
                      value={newMilestoneDescription}
                      onChange={(e) => setNewMilestoneDescription(e.target.value)}
                      placeholder="Milestone description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="milestone-date">Due Date</Label>
                    <Input
                      id="milestone-date"
                      type="date"
                      value={newMilestoneDueDate}
                      onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddMilestone}
                    disabled={submitting || !newMilestoneTitle.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Milestone
                  </Button>
                </div>
              </div>

              {/* Milestones list */}
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No milestones yet
                  </p>
                ) : (
                  milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold">{milestone.title}</h5>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                          )}
                          {milestone.due_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={milestone.status}
                            onValueChange={(value) =>
                              handleUpdateMilestoneStatus(
                                milestone.id,
                                value as MilestoneStatus
                              )
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Badge className={getMilestoneStatusColor(milestone.status)}>
                        {milestone.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage project team assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add team member */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Add Team Member</h4>
                <div className="flex gap-2">
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      fetchAllUsers();
                      setIsTeamDialogOpen(true);
                    }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </div>

              {/* Team members list */}
              <div className="space-y-2">
                {projectTeam.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No team members assigned yet
                  </p>
                ) : (
                  projectTeam.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeamMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
              <CardDescription>Manage project files and documents</CardDescription>
            </CardHeader>
            <CardContent>
              <FileManager projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments & Discussion</CardTitle>
              <CardDescription>Project conversations and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add comment */}
              <div className="space-y-2">
                <Label htmlFor="new-comment">Add a comment</Label>
                <Textarea
                  id="new-comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={commentSubmitting || !commentText.trim()}
                >
                  {commentSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Post Comment
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {projectComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet
                  </p>
                ) : (
                  projectComments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {comment.users?.full_name || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>

                      {/* Show/hide replies */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCommentReplies(comment.id)}
                      >
                        {commentReplies[comment.id]
                          ? "Hide replies"
                          : `Show replies (${commentReplies[comment.id]?.length || 0})`}
                      </Button>

                      {/* Replies */}
                      {commentReplies[comment.id] && (
                        <div className="ml-6 space-y-2 mt-2">
                          {loadingCommentReplies[comment.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            commentReplies[comment.id].map((reply) => (
                              <div
                                key={reply.id}
                                className="border-l-2 pl-3 py-2 space-y-1"
                              >
                                <p className="font-semibold text-xs">
                                  {reply.users?.full_name || "Unknown User"}
                                </p>
                                <p className="text-sm">{reply.comment_text}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(reply.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))
                          )}

                          {/* Add reply */}
                          <div className="flex gap-2">
                            <Input
                              value={commentReplyText[comment.id] || ""}
                              onChange={(e) =>
                                setCommentReplyText((prev) => ({
                                  ...prev,
                                  [comment.id]: e.target.value,
                                }))
                              }
                              placeholder="Write a reply..."
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddReply(comment.id)}
                              disabled={!commentReplyText[comment.id]?.trim()}
                            >
                              Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a user to add to the project team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTeamMember} disabled={!selectedUserId}>
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
