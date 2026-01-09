"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, jsx-a11y/alt-text, @next/next/no-img-element */

import React from "react";
import {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  Suspense,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { debug } from "@/lib/debug";
// (duplicate Select import removed)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Loader2,
  FolderKanban,
  Video,
  Eye,
  Edit,
  Trash2,
  Users,
  FileText,
  CheckSquare,
  TrendingUp,
  Clock,
  Image,
  File as FileIcon,
  UserCheck,
  ListTodo,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  Client,
  ProjectStatus,
  ServiceType,
  ProjectFile,
  Milestone,
  User,
  SubProject,
  SubProjectComment,
  SubProjectUpdate,
  MilestoneStatus,
} from "@/types";
import { SERVICE_TYPES, SERVICE_TYPE_OPTIONS } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { FileManager } from "@/components/projects/file-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
} from "@/app/actions/milestones";
import { deleteProject } from "@/app/actions/delete-project";
import {
  assignTeamMember,
  removeTeamMember,
  getProjectTeamMembers,
  getTeamsForProjects,
} from "@/app/actions/team-management";
import {
  createCommentReply,
  getCommentReplies,
  updateCommentReply,
  deleteCommentReply,
} from "@/app/actions/comment-replies";

function ProjectsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectFiles, setProjectFiles] = useState<
    Record<string, ProjectFile[]>
  >({});
  const [projectMilestones, setProjectMilestones] = useState<
    Record<string, Milestone[]>
  >({});
  const [projectCreators, setProjectCreators] = useState<Record<string, User>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [projectTeam, setProjectTeam] = useState<Record<string, User[]>>({});
  const [projectTeamRoles, setProjectTeamRoles] = useState<
    Record<string, Record<string, string>>
  >({});
  const lastOpenedProjectId = useRef<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [viewerOnly, setViewerOnly] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  const milestoneStatusOptions: { value: MilestoneStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "blocked", label: "Blocked" },
  ];
  const [editFormData, setEditFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
    progress_percentage: 0,
  });

  // Sub-projects state
  const [subProjects, setSubProjects] = useState<Record<string, SubProject[]>>(
    {},
  );
  const [selectedSubProject, setSelectedSubProject] =
    useState<SubProject | null>(null);
  const [isSubProjectDialogOpen, setIsSubProjectDialogOpen] = useState(false);
  const [isEditSubProjectDialogOpen, setIsEditSubProjectDialogOpen] =
    useState(false);
  const [subProjectFormData, setSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  });
  const [editSubProjectFormData, setEditSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  });
  const [subProjectComments, setSubProjectComments] = useState<
    Record<string, SubProjectComment[]>
  >({});
  const [subProjectUpdates, setSubProjectUpdates] = useState<
    Record<string, SubProjectUpdate[]>
  >({});
  const [newComment, setNewComment] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [isSubProjectDetailOpen, setIsSubProjectDetailOpen] = useState(false);
  const [projectComments, setProjectComments] = useState<Record<string, any[]>>(
    {},
  );
  const [commentReplies, setCommentReplies] = useState<Record<string, any[]>>(
    {},
  );
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [newProjectComment, setNewProjectComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set(),
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    projectId: string;
    projectName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
  });

  // Handle URL parameters for service filter
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (
      serviceParam &&
      ["video_production", "social_media", "design_branding"].includes(
        serviceParam,
      )
    ) {
      setServiceFilter(serviceParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch team members when team dialog opens with a selected project
  useEffect(() => {
    if (isTeamDialogOpen && selectedProject) {
      console.log(
        "Team dialog opened, fetching members for project:",
        selectedProject.id,
      );
      fetchProjectTeamMembers(selectedProject.id);
    }
  }, [isTeamDialogOpen, selectedProject?.id]);

  async function fetchData() {
    debug.log("FETCH_DATA", "Starting data fetch...");
    setLoading(true);

    try {
      let projectsData: Project[] = [];

      console.log(
        "[ProjectsPage] 🔵 FETCH START - User:",
        user?.id,
        "Email:",
        user?.email,
        "Role:",
        user?.role,
      );

      // Filter projects based on user role
      if (user?.role === "project_manager" || user?.role === "employee") {
        console.log("[ProjectsPage] 🔷 Employee/PM fetch mode");

        // For employees: fetch projects they created OR are team members of
        console.log("[ProjectsPage] Fetching projects created by:", user.id);
        const { data: createdProjects, error: createdError } = await supabase
          .from("projects")
          .select("*, clients(company_name, contact_person)")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        console.log("[ProjectsPage] Created projects result:", {
          count: createdProjects?.length,
          error: createdError,
        });
        if (createdError) throw createdError;

        // Fetch projects where user is a team member
        console.log(
          "[ProjectsPage] Fetching project_team entries for user:",
          user.id,
        );
        const { data: teamProjects, error: teamError } = await supabase
          .from("project_team")
          .select("projects(*, clients(company_name, contact_person))")
          .eq("user_id", user.id);

        console.log("[ProjectsPage] Team projects result:", {
          count: teamProjects?.length,
          error: teamError,
        });
        if (teamError) {
          console.warn(
            "[ProjectsPage] ⚠️ Team projects query failed:",
            teamError,
          );
        }

        // Combine and deduplicate projects
        const allProjects = [...(createdProjects || [])];
        const teamProjectsData = (teamProjects || [])
          .map((tp: any) => tp.projects)
          .filter(Boolean);

        console.log(
          "[ProjectsPage] Before dedup - created:",
          allProjects.length,
          "from team:",
          teamProjectsData.length,
        );

        teamProjectsData.forEach((tp: any) => {
          if (!allProjects.find((p) => p.id === tp.id)) {
            allProjects.push(tp);
          }
        });

        console.log(
          "[ProjectsPage] After dedup - total projects:",
          allProjects.length,
        );
        allProjects.forEach((p) =>
          console.log("[ProjectsPage] Project:", p.id, p.name),
        );

        projectsData = allProjects;
      } else {
        // For admin: fetch all projects
        console.log(
          "[ProjectsPage] 🔷 Admin fetch mode - fetching ALL projects",
        );
        const { data: allProjects, error: projectsError } = await supabase
          .from("projects")
          .select("*, clients(company_name, contact_person)")
          .order("created_at", { ascending: false });

        console.log("[ProjectsPage] All projects result:", {
          count: allProjects?.length,
          error: projectsError,
        });
        if (projectsError) throw projectsError;
        projectsData = allProjects || [];
      }

      console.log(
        "[ProjectsPage] ✅ Total projects to display:",
        projectsData.length,
      );
      debug.success("FETCH_DATA", "Projects fetched", {
        count: projectsData?.length,
      });

      // Fetch clients for dropdown - filter by agency if agency_admin
      let clientsQuery = supabase
        .from("clients")
        .select("*")
        .eq("status", "active")
        .order("company_name");

      const { data: clientsData, error: clientsError } = await clientsQuery;

      if (clientsError) throw clientsError;
      debug.success("FETCH_DATA", "Clients fetched", {
        count: clientsData?.length,
      });

      setProjects(projectsData || []);
      setClients(clientsData || []);


      // Fetch recent files for the listed projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id);
        const { data: filesData, error: filesError } = await supabase
          .from("project_files")
          .select("*")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        if (filesError) throw filesError;

        const grouped = (filesData || []).reduce(
          (acc, file) => {
            acc[file.project_id] = acc[file.project_id] || [];
            acc[file.project_id].push(file as ProjectFile);
            return acc;
          },
          {} as Record<string, ProjectFile[]>,
        );

        setProjectFiles(grouped);
      }

      // Fetch milestones for projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id);
        const { data: milestonesData, error: milestonesError } = await supabase
          .from("milestones")
          .select("*")
          .in("project_id", projectIds)
          .order("position", { ascending: true })
          .order("due_date", { ascending: true });

        if (milestonesError) {
          console.warn(
            "Milestones table not available:",
            milestonesError.message,
          );
        } else {
          const groupedMilestones = (milestonesData || []).reduce(
            (acc, milestone) => {
              acc[milestone.project_id] = acc[milestone.project_id] || [];
              acc[milestone.project_id].push(milestone as Milestone);
              return acc;
            },
            {} as Record<string, Milestone[]>,
          );

          setProjectMilestones(groupedMilestones);
        }
      }

      // Fetch creator info for projects
      if (projectsData && projectsData.length > 0) {
        const creatorIds = [
          ...new Set(projectsData.map((p) => p.created_by).filter(Boolean)),
        ] as string[];
        if (creatorIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("*")
            .in("id", creatorIds);

          if (usersError) throw usersError;

          const creatorsMap = (usersData || []).reduce(
            (acc, user) => {
              acc[user.id] = user as User;
              return acc;
            },
            {} as Record<string, User>,
          );

          setProjectCreators(creatorsMap);
        }
      }

      // Fetch project team members using server action
      if (projectsData && projectsData.length > 0) {
        debug.log("FETCH_DATA", "Fetching team members for projects...", {
          projectIds: projectsData.map((p) => p.id),
        });
        
        // Batch fetch team members for all projects in a single server action
        const batchResult = await getTeamsForProjects(projectsData.map((p) => p.id));

        const teamMap: Record<string, User[]> = {};
        const rolesMap: Record<string, Record<string, string>> = {};

        if (batchResult.success && batchResult.data) {
          // Group by project_id
          batchResult.data.forEach((assignment: any) => {
            const pid = assignment.project_id;
            if (!teamMap[pid]) teamMap[pid] = [];
            if (!rolesMap[pid]) rolesMap[pid] = {};

            if (assignment.user) {
              teamMap[pid].push(assignment.user as User);
            }
            if (assignment.user_id) {
              rolesMap[pid][assignment.user_id] = assignment.role || "";
            }
          });
        }

        debug.success("FETCH_DATA", "Team members mapped (batched)", {
          projectsWithTeam: Object.keys(teamMap).length,
          teamMap,
        });
        setProjectTeam(teamMap);
        setProjectTeamRoles(rolesMap);
      }

      // Fetch all users for team assignment (admins/PMs/super admins)
      if (user?.role === "admin" || user?.role === "project_manager" || user?.role === "super_admin") {
        const { data: allUsers, error: usersError } = await supabase
          .from("users")
          .select("*")
          .order("full_name", { ascending: true, nullsFirst: false });

        if (usersError) {
          console.error("Error fetching users:", usersError);
        } else {
          // Show all internal roles when assigning projects (admins, PMs, employees)
          const filteredUsers = (allUsers || []).filter(
            (u) =>
              u.role === "admin" ||
              u.role === "project_manager" ||
              u.role === "employee",
          );
          setAvailableUsers(filteredUsers);
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name: formData.name,
            client_id: formData.client_id,
            description: formData.description,
            service_type: formData.service_type,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            start_date: formData.start_date || null,
            deadline: formData.deadline || null,
            status: formData.status,
            progress_percentage: 0,
            created_by: user?.id,
          },
        ])
        .select();

      if (error) throw error;

      // Reset form and close dialog first
      setFormData({
        name: "",
        client_id: "",
        description: "",
        service_type: "video_production" as ServiceType,
        budget: "",
        start_date: "",
        deadline: "",
        status: "planning",
      });
      setIsDialogOpen(false);

      // Then refresh projects list
      await fetchData();
    } catch (error: any) {
      console.error("Error creating project:", error);
      alert(error.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await createMilestone({
        project_id: selectedProject.id,
        title: milestoneFormData.title,
        description: milestoneFormData.description,
        due_date: milestoneFormData.due_date || null,
        status: "pending",
      });

      if (error) throw new Error(error);

      // Reset form and close first
      setMilestoneFormData({ title: "", description: "", due_date: "" });
      setIsMilestoneDialogOpen(false);

      if (data) {
        setProjectMilestones((prev) => ({
          ...prev,
          [selectedProject.id]: [
            data as Milestone,
            ...(prev[selectedProject.id] || []),
          ],
        }));
      }
    } catch (error: any) {
      console.error("Error adding milestone:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      alert(
        error?.message ||
          "Failed to add milestone. The milestones table may not exist yet.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMilestoneStatusChange(
    projectId: string,
    milestoneId: string,
    status: MilestoneStatus,
  ) {
    const { error, data } = await updateMilestoneStatus(milestoneId, status);
    if (error) {
      alert(error);
      return;
    }
    if (data) {
      setProjectMilestones((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map((m) =>
          m.id === milestoneId ? { ...m, status: data.status } : m,
        ),
      }));
    }
  }

  async function handleDeleteMilestone(projectId: string, milestoneId: string) {
    if (!confirm("Delete this milestone?")) return;
    const { error } = await deleteMilestone(milestoneId);
    if (error) {
      alert(error);
      return;
    }
    setProjectMilestones((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter((m) => m.id !== milestoneId),
    }));
  }

  async function handleDeleteProject(projectId: string) {
    setIsDeleting(true);
    try {
      debug.log("PROJECTS", "Deleting project", { projectId });
      const result = await deleteProject(projectId);

      if (!result.success) {
        debug.error("PROJECTS", "Failed to delete project", result.error);
        alert(result.error || "Failed to delete project");
        return;
      }

      debug.success("PROJECTS", "Project deleted successfully");
      setDeleteConfirmation(null);
      setIsDetailModalOpen(false);
      setSelectedProject(null);
      await fetchData();
      alert("Project deleted successfully");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      debug.error("PROJECTS", "Delete error", { error: error?.message });
      alert(error?.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAssignTeamMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !selectedUserId || submitting) return;

    debug.log("ASSIGN_TEAM", "Start team assignment", {
      projectId: selectedProject.id,
      userId: selectedUserId,
    });
    console.log("=== ASSIGN TEAM MEMBER START ===");
    console.log("Selected Project ID:", selectedProject.id);
    console.log("Selected User ID:", selectedUserId);
    console.log("Current projectTeam state:", projectTeam);

    // Check if user is already assigned
    const alreadyAssigned = projectTeam[selectedProject.id]?.find(
      (m) => m.id === selectedUserId,
    );
    if (alreadyAssigned) {
      debug.warn("ASSIGN_TEAM", "User already assigned", {
        userId: selectedUserId,
      });
      alert("This team member is already assigned to this project");
      return;
    }

    setSubmitting(true);

    try {
      const result = await assignTeamMember({
        project_id: selectedProject.id,
        user_id: selectedUserId,
        role: viewerOnly ? "viewer" : teamRole || null,
        assigned_by: user?.id,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to assign team member");
      }

      debug.success("ASSIGN_TEAM", "Team member inserted", {
        projectId: selectedProject.id,
        userId: selectedUserId,
      });
      console.log("Team member inserted successfully");

      // Reset form first
      setSelectedUserId("");
      setTeamRole("");
      setViewerOnly(false);

      // Refresh team members for this project and wait for it
      debug.log("ASSIGN_TEAM", "Fetching updated team members...");
      console.log("Fetching updated team members...");
      const updatedMembers = await fetchProjectTeamMembers(selectedProject.id);
      debug.success("ASSIGN_TEAM", "Members updated", {
        members: updatedMembers.map((m) => m.email),
      });
      console.log("Updated members returned:", updatedMembers);
      console.log("=== ASSIGN TEAM MEMBER END ===");

      // Don't close dialog - let user see the updated list
      // setIsTeamDialogOpen(false)
    } catch (error: any) {
      debug.error("ASSIGN_TEAM", "Assignment failed", error);
      console.error("Error assigning team member:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      alert(error?.message || "Failed to assign team member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveTeamMember(userId: string) {
    if (!selectedProject) return;
    if (!confirm("Remove this team member from the project?")) return;

    try {
      const result = await removeTeamMember(selectedProject.id, userId);

      if (!result.success) {
        throw new Error(result.error || "Failed to remove team member");
      }

      // Update local state immediately
      setProjectTeam((prev) => ({
        ...prev,
        [selectedProject.id]:
          prev[selectedProject.id]?.filter((m) => m.id !== userId) || [],
      }));
    } catch (error: any) {
      console.error("Error removing team member:", error);
      alert(error?.message || "Failed to remove team member");
    }
  }

  async function fetchProjectTeamMembers(projectId: string) {
    try {
      const result = await getProjectTeamMembers(projectId);

      if (!result.success) {
        debug.error("FETCH_TEAM", "Failed to fetch team members:", result.error);
        console.error("Error fetching team members:", result.error);
        return [];
      }

      debug.log("FETCH_TEAM", "Raw data from query:", {
        projectId,
        count: result.data?.length,
      });
      console.log("Fetched team data:", result.data);
      
      const members = (result.data || [])
        .map((assignment: any) => assignment.user as User)
        .filter(Boolean);
      const rolesMap: Record<string, string> = {};
      (result.data || []).forEach((assignment: any) => {
        if (assignment.user_id) {
          rolesMap[assignment.user_id] = assignment.role || "";
        }
      });
      
      debug.success("FETCH_TEAM", "Members processed", {
        projectId,
        members: members.map((m) => ({ id: m.id, email: m.email })),
      });
      console.log("Processed team members:", members);
      setProjectTeam((prev) => ({ ...prev, [projectId]: members }));
      setProjectTeamRoles((prev) => ({ ...prev, [projectId]: rolesMap }));
      return members;
    } catch (error) {
      debug.error("FETCH_TEAM", "Exception:", error);
      console.error("Error in fetchProjectTeamMembers:", error);
      return [];
    }
  }

  async function fetchProjectComments(projectId: string) {
    try {
      const { data, error } = await supabase
        .from("project_comments")
        .select(
          `id, project_id, user_id, comment_text, timestamp_seconds, status, created_at,
           user:users!user_id(id, full_name, role)`
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(100); // Limit initial load
      if (error) throw error;
      setProjectComments((prev) => ({ ...prev, [projectId]: data || [] }));
    } catch (error) {
      console.error("Error fetching project comments:", error);
    }
  }

  async function handleAddProjectComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !newProjectComment.trim() || commentSubmitting)
      return;
    setCommentSubmitting(true);

    try {
      const trimmedComment = newProjectComment.trim();
      if (!trimmedComment) {
        throw new Error("Comment cannot be empty");
      }
      const { error } = await supabase.from("project_comments").insert({
        project_id: selectedProject.id,
        user_id: user?.id,
        comment_text: trimmedComment,
        parent_id: null,
        status: "pending",
      });
      if (error) throw error;
      // refresh comments
      await fetchProjectComments(selectedProject.id);
      // Success toast
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Comment added", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
      setNewProjectComment("");
    } catch (error: any) {
      const msg = error?.message?.includes("row-level security")
        ? "You do not have permissions to comment."
        : error?.message || "Failed to add comment";
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: msg, type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleAddReply(parentCommentId: string) {
    if (!selectedProject) return;
    const text = (replyInputs[parentCommentId] || "").trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);

    try {
      const { error } = await supabase.from("project_comments").insert({
        project_id: selectedProject.id,
        user_id: user?.id,
        comment_text: text,
        parent_id: parentCommentId,
        status: "pending",
      });
      if (error) throw error;
      await fetchProjectComments(selectedProject.id);
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Reply posted", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
      setReplyInputs((prev) => ({ ...prev, [parentCommentId]: "" }));
    } catch (error: any) {
      const msg = error?.message || "Failed to post reply";
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: msg, type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    } finally {
      setCommentSubmitting(false);
    }
  }

  function buildThread(comments: any[]) {
    const byParent: Record<string, any[]> = {};
    comments.forEach((c) => {
      const key = c.parent_id || "root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(c);
    });
    return byParent;
  }

  async function fetchCommentReplies(commentId: string) {
    try {
      const result = await getCommentReplies(commentId);
      if (result.success) {
        setCommentReplies((prev) => ({
          ...prev,
          [commentId]: result.replies || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching comment replies:", error);
    }
  }

  async function handleAddCommentReply(commentId: string) {
    if (!user?.id || commentSubmitting) return;
    const replyText = (replyInputs[commentId] || "").trim();
    if (!replyText) return;

    setCommentSubmitting(true);
    try {
      const result = await createCommentReply({
        commentId,
        replyText,
        userId: user.id,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the replies
      await fetchCommentReplies(commentId);

      // Success toast
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Reply posted", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);

      // Clear input
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
    } catch (error: any) {
      const msg = error?.message || "Failed to post reply";
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: msg, type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleDeleteCommentReply(replyId: string, commentId: string) {
    if (!user?.id || !confirm("Delete this reply?")) return;

    try {
      const result = await deleteCommentReply({
        replyId,
        userId: user.id,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the replies
      await fetchCommentReplies(commentId);

      // Success toast
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Reply deleted", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
    } catch (error: any) {
      const msg = error?.message || "Failed to delete reply";
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: msg, type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    }
  }

  async function fetchSubProjects(projectId: string) {
    try {
      // First try with explicit relationship, fallback to simple select
      let subProjectsData = null;
      let error = null;

      const { data, error: err1 } = await supabase
        .from("sub_projects")
        .select(
          "id, parent_project_id, name, description, status, assigned_to, progress_percentage, due_date, video_url, completed_at, created_by, created_at, updated_at, assigned_user:assigned_to(id, full_name, avatar_url, role)",
        )
        .eq("parent_project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (err1) {
        // Fallback: fetch without user relationship
        const { data: fallbackData, error: err2 } = await supabase
          .from("sub_projects")
          .select(
            "id, parent_project_id, name, description, status, assigned_to, progress_percentage, due_date, video_url, completed_at, created_by, created_at, updated_at",
          )
          .eq("parent_project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(50);

        subProjectsData = fallbackData;
        error = err2;
      } else {
        subProjectsData = data;
        error = err1;
      }

      if (error) {
        console.warn("Sub-projects table not available:", error.message);
        return;
      }

      const normalized = (subProjectsData || []).map((sp: any) => ({
        ...sp,
        assigned_user: Array.isArray(sp.assigned_user)
          ? sp.assigned_user[0] || undefined
          : sp.assigned_user,
      }));

      setSubProjects((prev) => ({
        ...prev,
        [projectId]: normalized as any,
      }));
    } catch (error: any) {
      console.error("Error fetching sub-projects:", error);
    }
  }

  async function handleAddSubProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || submitting) return;

    setSubmitting(true);

    try {
      // Validate form data
      if (!subProjectFormData.name.trim()) {
        throw new Error("Task name is required");
      }

      const assignedUserId =
        subProjectFormData.assigned_to === "unassigned"
          ? null
          : subProjectFormData.assigned_to;

      const { error } = await supabase.from("sub_projects").insert({
        parent_project_id: selectedProject.id,
        name: subProjectFormData.name,
        description: subProjectFormData.description,
        assigned_to: assignedUserId,
        due_date: subProjectFormData.due_date || null,
        status: subProjectFormData.status,
        video_url: subProjectFormData.video_url || null,
        created_by: user?.id,
      });

      if (error) throw error;

      // If assigned to an employee, also create an employee_tasks entry
      if (assignedUserId) {
        const { error: taskError } = await supabase
          .from("employee_tasks")
          .insert({
            user_id: assignedUserId,
            project_id: selectedProject.id,
            title: subProjectFormData.name,
            description: subProjectFormData.description,
            due_date: subProjectFormData.due_date || null,
            status: "todo",
          });

        if (taskError) {
          console.warn(
            "Warning: Task created in sub_projects but failed to create employee task:",
            taskError,
          );
          // Don't fail the whole operation if employee_tasks insert fails
        }
      }

      // Reset form first BEFORE closing dialog to ensure state is clean
      setSubProjectFormData({
        name: "",
        description: "",
        assigned_to: "unassigned",
        due_date: "",
        status: "planning",
        video_url: "",
      });

      // Close dialog
      setIsSubProjectDialogOpen(false);

      // Then fetch updated data
      await fetchSubProjects(selectedProject.id);

      // Success toast
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Task created successfully", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
    } catch (error: any) {
      console.error("Error adding sub-project:", error);
      const errorMsg =
        error?.message || error?.error_description || "Failed to add task";
      const displayMsg =
        errorMsg.includes("sub_projects") || errorMsg.includes("migration")
          ? "Task feature not available. Please run migration 009 or contact support."
          : errorMsg;
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: displayMsg, type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubProject || submitting) return;

    setSubmitting(true);

    try {
      const assignedUserId =
        editSubProjectFormData.assigned_to === "unassigned"
          ? null
          : editSubProjectFormData.assigned_to;

      const { error } = await supabase
        .from("sub_projects")
        .update({
          name: editSubProjectFormData.name,
          description: editSubProjectFormData.description,
          assigned_to: assignedUserId,
          due_date: editSubProjectFormData.due_date || null,
          status: editSubProjectFormData.status,
          video_url: editSubProjectFormData.video_url || null,
        })
        .eq("id", selectedSubProject.id);

      if (error) throw error;

      // Update employee_tasks if assignment changed
      if (assignedUserId) {
        // Check if there's already an employee task for this sub-project
        const { data: existingTask } = await supabase
          .from("employee_tasks")
          .select("id")
          .eq("user_id", assignedUserId)
          .eq("project_id", selectedProject?.id)
          .match({ title: editSubProjectFormData.name })
          .single();

        if (!existingTask) {
          // Create new employee task
          await supabase.from("employee_tasks").insert({
            user_id: assignedUserId,
            project_id: selectedProject?.id,
            title: editSubProjectFormData.name,
            description: editSubProjectFormData.description,
            due_date: editSubProjectFormData.due_date || null,
            status: "todo",
          });
        }
      }

      setIsEditSubProjectDialogOpen(false);
      setSelectedSubProject(null);

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id);
      }

      // Success toast
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Task updated successfully", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
    } catch (error: any) {
      console.error("Error updating sub-project:", error);
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Failed to update task", type: "error" });
      const t = setTimeout(() => setToast(null), 4000);
      setToastTimer(t);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateSubProjectProgress(
    subProjectId: string,
    progress: number,
  ) {
    try {
      const { error } = await supabase
        .from("sub_projects")
        .update({ progress_percentage: progress })
        .eq("id", subProjectId);

      if (error) throw error;

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id);
      }
    } catch (error: any) {
      console.error("Error updating sub-project progress:", error);
    }
  }

  async function handleUpdateSubProjectStatus(
    subProjectId: string,
    status: ProjectStatus,
  ) {
    try {
      const { error } = await supabase
        .from("sub_projects")
        .update({
          status,
          completed_at:
            status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", subProjectId);

      if (error) throw error;

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id);
      }
    } catch (error: any) {
      console.error("Error updating sub-project status:", error);
    }
  }

  const filteredProjects = useMemo(() => {
    const term = deferredSearchQuery.toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(term) ||
        project.clients?.company_name.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      const matchesService =
        serviceFilter === "all" || project.service_type === serviceFilter;
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [projects, deferredSearchQuery, statusFilter, serviceFilter]);

  // Open detail modal automatically when navigated with a project id query param
  useEffect(() => {
    const projectId = searchParams.get("id");
    if (!projectId || projects.length === 0) return;
    if (lastOpenedProjectId.current === projectId && isDetailModalOpen) return;

    const target = projects.find((p) => p.id === projectId);
    if (target) {
      lastOpenedProjectId.current = projectId;
      openProjectDetails(target);
      fetchProjectTeamMembers(target.id);
    }
  }, [searchParams, projects]);

  // Calculate project stats
  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "in_progress").length,
    completed: projects.filter((p) => p.status === "completed").length,
    planning: projects.filter((p) => p.status === "planning").length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    avgProgress:
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + p.progress_percentage, 0) /
              projects.length,
          )
        : 0,
  };

  function openProjectDetails(project: Project) {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
    // Fetch in parallel for faster loading
    Promise.all([
      fetchSubProjects(project.id),
      fetchProjectComments(project.id)
    ]);
  }

  function openEditDialog(project: Project) {
    setSelectedProject(project);
    setEditFormData({
      name: project.name,
      client_id: project.client_id,
      description: project.description || "",
      service_type: project.service_type,
      budget: project.budget?.toString() || "",
      start_date: project.start_date || "",
      deadline: project.deadline || "",
      status: project.status,
      progress_percentage: project.progress_percentage,
    });
    setIsEditDialogOpen(true);
  }

  async function openTeamDialog(project: Project) {
    setSelectedProject(project);
    setIsTeamDialogOpen(true);
    // Fetch team members immediately when dialog opens
    await fetchProjectTeamMembers(project.id);
  }

  function openInvoices(project: Project) {
    window.location.href = `/dashboard/invoices?project=${project.id}`;
  }

  async function handleEditProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          name: editFormData.name,
          client_id: editFormData.client_id || null,
          description: editFormData.description || null,
          service_type: editFormData.service_type,
          budget: editFormData.budget ? Number(editFormData.budget) : null,
          start_date: editFormData.start_date || null,
          deadline: editFormData.deadline || null,
          status: editFormData.status,
          progress_percentage: editFormData.progress_percentage,
        })
        .eq("id", selectedProject.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === selectedProject.id ? { ...p, ...data } : p,
          ),
        );
      }

      setIsEditDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error("Error updating project:", error);
      alert(error.message || "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  }

  const getServiceIcon = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.icon || "📁";
  };

  const getServiceLabel = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.label || serviceType;
  };

  // Calendar state & helpers
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isDateDetailsOpen, setIsDateDetailsOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dateDetails, setDateDetails] = useState<{
    date: Date;
    events: CalendarEvent[];
  } | null>(null);
  type CalendarEvent = {
    id: string;
    date: string; // ISO date
    title: string;
    copy?: string;
    caption?: string; // Full caption for social media post
    status?: "idea" | "editing" | "scheduled" | "published" | "review";
    platform?: "instagram" | "facebook" | "youtube" | "linkedin" | "twitter" | "tiktok";
    type?: "reel" | "carousel" | "story" | "static" | "video";
    media_type?: "static" | "video" | "carousel" | "reel" | "story";
    format_type?: "reel" | "story" | "post" | "carousel" | "static" | "video";
    drive_link?: string; // Google Drive or external media link
    attachments?: {
      id: string;
      url: string;
      kind: "image" | "video" | "pdf" | "document";
    }[];
  };
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Load events for a given month
  const fetchMonthEvents = useCallback(
    async (monthDate: Date) => {
      if (!selectedProject) return;
      
      // Use UTC functions to avoid timezone issues
      const year = monthDate.getUTCFullYear();
      const month = monthDate.getUTCMonth() + 1; // getUTCMonth() returns 0-11
      const monthISO = `${year}-${String(month).padStart(2, '0')}`;
      
      console.log('[DEBUG] Fetching events for month:', monthISO, 'from date:', monthDate.toISOString());
      
      const { listCalendarEvents } = await import(
        "@/app/actions/calendar-events"
      );
      const events = await listCalendarEvents(selectedProject.id, monthISO);
      console.log('[DEBUG] Fetched calendar events:', events.length, 'events for month', monthISO);
      const mapped = events.map((e: any) => ({
        id: e.id,
        date: e.event_date,
        title: e.title,
        copy: e.copy,
        caption: e.caption,
        platform: e.platform,
        type: e.content_type,
        media_type: e.media_type,
        format_type: e.format_type,
        drive_link: e.drive_link,
        status: e.status,
        attachments: e.attachments,
      }));
      console.log('[DEBUG] Setting calendar events state:', mapped.length);
      setCalendarEvents(mapped);
      return mapped;
    },
    [selectedProject],
  );

  // Load calendar events when dialog opens
  useEffect(() => {
    if (isCalendarDialogOpen && selectedProject?.service_type === "social_media") {
      console.log('[DEBUG] Calendar dialog opened, loading current month events');
      const now = new Date();
      fetchMonthEvents(now);
    }
  }, [isCalendarDialogOpen, selectedProject?.id, fetchMonthEvents]);

  async function handleCreateCalendarEvent(date: Date) {
    console.log('[DEBUG] handleCreateCalendarEvent called with date:', date.toISOString(), 'formatted:', date.toLocaleDateString());
    // Open the day detail modal so user can add with full form
    const iso = date.toISOString().slice(0, 10);
    const dayEvents = calendarEvents.filter(
      (e) => (e.date || "").slice(0, 10) === iso,
    );
    console.log('[DEBUG] Opening date details for:', iso, 'with', dayEvents.length, 'events');
    setDateDetails({ date, events: dayEvents });
    setShowEditForm(false);
    setEditingEvent(null);
    setIsDateDetailsOpen(true);
  }

  async function handleUpdateCalendarEvent(event: CalendarEvent) {
    try {
      await (
        await import("@/app/actions/calendar-events")
      ).updateCalendarEvent(event.id, {
        title: event.title,
        copy: event.copy,
        caption: event.caption,
        platform: event.platform,
        media_type: event.media_type,
        format_type: event.format_type,
        drive_link: event.drive_link,
        status: event.status,
        attachments: event.attachments,
      });

      await fetchMonthEvents(event.date ? new Date(event.date) : new Date());
    } catch (e) {
      console.error(e);
      alert("Failed to update event");
    }
  }

  async function handleDeleteCalendarEvent(eventId: string) {
    try {
      const toDelete = calendarEvents.find((e) => e.id === eventId);
      console.log('[DEBUG] Deleting event:', eventId, toDelete?.title);
      
      await (
        await import("@/app/actions/calendar-events")
      ).deleteCalendarEvent(eventId);
      
      console.log('[DEBUG] Event deleted, refreshing month events...');
      const refreshed = await fetchMonthEvents(
        toDelete?.date ? new Date(toDelete.date) : new Date(),
      );
      
      // Update dateDetails to remove the deleted event
      if (dateDetails) {
        const updatedEvents = (refreshed || []).filter(
          (e) => (e.date || "").slice(0, 10) === (dateDetails.date.toISOString().slice(0, 10))
        );
        console.log('[DEBUG] Updated dateDetails with', updatedEvents.length, 'remaining events');
        setDateDetails({ date: dateDetails.date, events: updatedEvents });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete event");
    }
  }

  // Helper to convert Google Drive links to direct viewable URLs
  const getDirectImageUrl = (url: string): string => {
    if (!url) return url;
    
    // If it's a Google Drive link, convert to direct view URL
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = '';
      
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const match1 = url.match(/\/file\/d\/([^\/\?]+)/);
      if (match1) fileId = match1[1];
      
      // Format: https://drive.google.com/open?id=FILE_ID
      const match2 = url.match(/[?&]id=([^&]+)/);
      if (match2) fileId = match2[1];
      
      // If we found a file ID, return direct view URL
      if (fileId) {
        // Use the thumbnail API for better compatibility
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
    }
    
    // Return original URL if not a Google Drive link or couldn't extract ID
    return url;
  };

  // Helper to detect media type from drive link
  const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'image';
    if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) return 'video';
    // Check for Google Drive image/video indicators
    if (lower.includes('drive.google.com')) {
      if (lower.includes('/file/d/') || lower.includes('export=view')) return 'image';
    }
    return 'unknown';
  };

  // Enhanced calendar view with board and calendar modes
  const CalendarView = React.memo(
    function CalendarView({
      events,
      onCreate,
      onUpdate,
      onDelete,
      onOpenDate,
    }: {
      events: CalendarEvent[];
      onCreate: (date: Date) => void;
      onUpdate: (event: CalendarEvent) => void;
      onDelete: (eventId: string) => void;
      onOpenDate: (date: Date, events: CalendarEvent[]) => void;
    }) {
      const [current, setCurrent] = useState(new Date());
      const [viewMode, setViewMode] = useState<"calendar" | "board">("calendar");
      const [selectedDate, setSelectedDate] = useState(new Date());
      const [isMobile, setIsMobile] = useState(false);

      useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
      }, []);

      const startOfMonth = new Date(
        current.getFullYear(),
        current.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        0,
      );
      const startDay = startOfMonth.getDay(); // 0-6
      const daysInMonth = endOfMonth.getDate();

      // Build weeks for 5-column grid (showing all dates)
      const weeks: Array<Array<Date | null>> = [];
      let week: Array<Date | null> = new Array(startDay % 5).fill(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(current.getFullYear(), current.getMonth(), d);
        week.push(date);
        if (week.length === 5) {
          weeks.push(week);
          week = [];
        }
      }
      if (week.length) {
        while (week.length < 5) week.push(null);
        weeks.push(week);
      }

      const formatter = new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      });

      function eventsForDate(date: Date) {
        const iso = date.toISOString().slice(0, 10);
        return events.filter((e) => (e.date || "").slice(0, 10) === iso);
      }

      const getStatusColor = (status?: string) => {
        switch (status) {
          case "published": return "bg-green-500/20 text-green-700 border-green-500";
          case "scheduled": return "bg-blue-500/20 text-blue-700 border-blue-500";
          case "review": return "bg-yellow-500/20 text-yellow-700 border-yellow-500";
          case "editing": return "bg-orange-500/20 text-orange-700 border-orange-500";
          case "idea": return "bg-purple-500/20 text-purple-700 border-purple-500";
          default: return "bg-gray-500/20 text-gray-700 border-gray-500";
        }
      };

      const getPlatformIcon = (platform?: string) => {
        switch (platform) {
          case "instagram": return "📷";
          case "facebook": return "📘";
          case "youtube": return "▶️";
          case "linkedin": return "💼";
          case "twitter": return "🐦";
          case "tiktok": return "🎵";
          default: return "📱";
        }
      };

      return (
        <div className="space-y-4">
          {/* Header with View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              {formatter.format(current)}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center rounded-lg border p-1 bg-muted/50">
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 flex-1 sm:flex-none text-xs sm:text-sm"
                  onClick={() => setViewMode("calendar")}
                >
                  📅 Calendar
                </Button>
                <Button
                  variant={viewMode === "board" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 flex-1 sm:flex-none text-xs sm:text-sm"
                  onClick={() => setViewMode("board")}
                >
                  📋 Board
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() =>
                    setCurrent(
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setCurrent(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() =>
                    setCurrent(
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
                >
                  Next →
                </Button>
              </div>
            </div>
          </div>

          {isMobile && viewMode === "calendar" ? (
            /* Mobile: Vertical Weekly List View */
            <div className="space-y-3">
              {/* Week Navigation */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() - 7);
                    setSelectedDate(newDate);
                    setCurrent(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                  }}
                >
                  ← Prev Week
                </Button>
                <span className="text-sm font-medium">
                  {selectedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() + 7);
                    setSelectedDate(newDate);
                    setCurrent(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                  }}
                >
                  Next Week →
                </Button>
              </div>

              {/* Vertical Day List */}
              <div className="space-y-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const startOfWeek = new Date(selectedDate);
                  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
                  const date = new Date(startOfWeek);
                  date.setDate(startOfWeek.getDate() + i);
                  const dayEvents = eventsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <Card
                      key={i}
                      className={`p-4 cursor-pointer transition-all ${
                        isToday ? "border-primary border-2" : "hover:shadow-md"
                      }`}
                      onClick={() => onOpenDate(date, dayEvents)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-shrink-0">
                          <div className="text-xs text-muted-foreground font-medium">
                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <div className="text-3xl font-bold">
                            {date.getDate()}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {dayEvents.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2">
                              No content scheduled
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {dayEvents.slice(0, 3).map((ev) => (
                                <div key={ev.id} className="text-sm">
                                  <div className="font-medium truncate">
                                    {getPlatformIcon(ev.platform)} {ev.title}
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    {ev.status && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {ev.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreate(date);
                          }}
                        >
                          + Add
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

            </div>
          ) : viewMode === "board" ? (
            /* Kanban Board View */
            <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-5"}`}>
              {["idea", "editing", "review", "scheduled", "published"].map((status) => {
                const statusEvents = events.filter((e) => e.status === status);
                const statusLabels = {
                  idea: "💡 Ideas",
                  editing: "✏️ Editing",
                  review: "👁️ Review",
                  scheduled: "📅 Scheduled",
                  published: "✅ Published"
                };
                
                return (
                  <div key={status} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 sticky top-0 z-10">
                      <h3 className="font-semibold text-sm">
                        {statusLabels[status as keyof typeof statusLabels]}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {statusEvents.length}
                      </Badge>
                    </div>
                    
                    <div className={`space-y-2 ${isMobile ? "max-h-[300px]" : "min-h-[400px] max-h-[600px]"} overflow-y-auto pr-2`}>
                      {statusEvents.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-8">
                          No items
                        </div>
                      ) : (
                        statusEvents.map((ev) => (
                          <Card
                            key={ev.id}
                            className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${getStatusColor(ev.status)}`}
                            onClick={() => {
                              const date = new Date(ev.date);
                              onOpenDate(date, [ev]);
                            }}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm flex-1 line-clamp-2">
                                  {getPlatformIcon(ev.platform)} {ev.title}
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(ev.id);
                                  }}
                                >
                                  ✕
                                </Button>
                              </div>
                              
                              {ev.caption && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {ev.caption}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-1">
                                {ev.platform && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {ev.platform}
                                  </Badge>
                                )}
                                {ev.format_type && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {ev.format_type}
                                  </Badge>
                                )}
                              </div>
                              
                              {ev.drive_link && (
                                <div className="mt-2 rounded overflow-hidden border border-border/50">
                                  {getMediaType(ev.drive_link) === 'image' ? (
                                    <img
                                      src={getDirectImageUrl(ev.drive_link)}
                                      alt={ev.title}
                                      className="w-full h-24 object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        console.error('Image failed to load:', ev.drive_link);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : getMediaType(ev.drive_link) === 'video' ? (
                                    <video
                                      src={getDirectImageUrl(ev.drive_link)}
                                      className="w-full h-24 object-cover"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    <div className="w-full h-20 bg-muted/30 flex items-center justify-center text-xs">
                                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                                <span>📅 {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                {ev.drive_link && (
                                  <a
                                    href={ev.drive_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getMediaType(ev.drive_link) === 'image' ? '🖼️' : getMediaType(ev.drive_link) === 'video' ? '🎥' : '🔗'} View
                                  </a>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Calendar View */
            <>
              <div className="grid grid-cols-5 gap-3 text-xs font-semibold text-muted-foreground px-2">
                {["1", "2", "3", "4", "5"].map((d, i) => (
                  <div key={i} className="py-2 text-center">
                    Col {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-3">
                {weeks.map((w, wi) => (
                  <React.Fragment key={wi}>
                    {w.map((date, di) => {
                      const dayEvents = date ? eventsForDate(date) : [];
                      const isToday = date && date.toDateString() === new Date().toDateString();
                      
                      return (
                        <div
                          key={di}
                          className={`
                            rounded-xl border min-h-[180px] p-3 transition-all group
                            ${date ? "bg-card hover:bg-accent/50 hover:shadow-md cursor-pointer" : "bg-muted/20"}
                            ${isToday ? "ring-2 ring-primary shadow-lg" : ""}
                          `}
                        >
                          {date ? (
                            <div className="flex flex-col h-full gap-2">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-bold ${isToday ? "text-primary text-base" : ""}`}>
                                  {date.getDate()}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => onCreate(date)}
                                >
                                  + Add
                                </Button>
                              </div>
                              
                              <div className="flex-1 space-y-2 overflow-hidden">
                                {dayEvents.slice(0, 2).map((ev) => (
                                  <div
                                    key={ev.id}
                                    className={`
                                      rounded-lg border overflow-hidden cursor-pointer
                                      transition-all hover:scale-[1.02] hover:shadow-md
                                      ${getStatusColor(ev.status)}
                                    `}
                                    onClick={() => onOpenDate(date, dayEvents)}
                                  >
                                    {ev.drive_link && (
                                      <div className="w-full h-20 bg-muted/20 overflow-hidden">
                                        {getMediaType(ev.drive_link) === 'image' ? (
                                          <img
                                            src={getDirectImageUrl(ev.drive_link)}
                                            alt={ev.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : getMediaType(ev.drive_link) === 'video' ? (
                                          <video
                                            src={getDirectImageUrl(ev.drive_link)}
                                            className="w-full h-full object-cover"
                                            muted
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                            <FileIcon className="h-6 w-6 text-muted-foreground" />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="p-2 space-y-1">
                                      <div className="flex items-start gap-1">
                                        <span className="text-xs">{getPlatformIcon(ev.platform)}</span>
                                        <span className="text-xs font-medium line-clamp-2 flex-1">{ev.title}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {ev.platform && (
                                          <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                            {ev.platform}
                                          </Badge>
                                        )}
                                        {ev.format_type && (
                                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                                            {ev.format_type}
                                          </Badge>
                                        )}
                                        {ev.status && (
                                          <Badge 
                                            className={`text-[9px] h-4 px-1 ${
                                              ev.status === 'published' ? 'bg-green-500 text-white hover:bg-green-600' :
                                              ev.status === 'scheduled' ? 'bg-cyan-500 text-white hover:bg-cyan-600' :
                                              ev.status === 'review' ? 'bg-yellow-500 text-black hover:bg-yellow-600' :
                                              ev.status === 'editing' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                                              ev.status === 'idea' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                                              'bg-gray-500 text-white hover:bg-gray-600'
                                            }`}
                                          >
                                            {ev.status}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {dayEvents.length > 2 && (
                                  <button
                                    onClick={() => onOpenDate(date, dayEvents)}
                                    className="text-xs text-muted-foreground hover:text-primary font-medium w-full text-center py-1 rounded hover:bg-accent/50"
                                  >
                                    +{dayEvents.length - 2} more
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      );
    },
  );

  const getServiceBadgeVariant = (
    serviceType: ServiceType,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (serviceType) {
      case "video_production":
        return "default";
      case "social_media":
        return "secondary";
      case "design_branding":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Edit Event Form Component
  const EditEventForm = React.memo(
    function EditEventForm({
      event,
      onUpdate,
      onCancel,
    }: {
      event: CalendarEvent;
      onUpdate: (event: CalendarEvent) => void;
      onCancel: () => void;
    }) {
      const [title, setTitle] = useState(event.title || "");
      const [caption, setCaption] = useState(event.caption || "");
      const [copy, setCopy] = useState(event.copy || "");
      const [driveLink, setDriveLink] = useState(event.drive_link || "");
      const [platform, setPlatform] = useState(event.platform || "instagram");
      const [mediaType, setMediaType] = useState(event.media_type || "video");
      const [formatType, setFormatType] = useState(event.format_type || "post");
      const [status, setStatus] = useState(event.status || "idea");
      const [saving, setSaving] = useState(false);

      return (
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">Edit Content</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Content title"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Platform</label>
                <Select
                  value={platform}
                  onValueChange={(value) =>
                    setPlatform(
                      (value as CalendarEvent["platform"]) || "instagram",
                    )
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">📷 Instagram</SelectItem>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="youtube">▶️ YouTube</SelectItem>
                    <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                    <SelectItem value="twitter">🐦 Twitter</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Media Type</label>
                <Select
                  value={mediaType}
                  onValueChange={(value) =>
                    setMediaType(
                      (value as CalendarEvent["media_type"]) || "video",
                    )
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">🖼️ Static</SelectItem>
                    <SelectItem value="video">🎥 Video</SelectItem>
                    <SelectItem value="carousel">🎠 Carousel</SelectItem>
                    <SelectItem value="reel">📹 Reel</SelectItem>
                    <SelectItem value="story">📖 Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Format</label>
                <Select
                  value={formatType}
                  onValueChange={(value) =>
                    setFormatType(
                      (value as CalendarEvent["format_type"]) || "post",
                    )
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">📝 Post</SelectItem>
                    <SelectItem value="reel">🎬 Reel</SelectItem>
                    <SelectItem value="story">💬 Story</SelectItem>
                    <SelectItem value="carousel">🎡 Carousel</SelectItem>
                    <SelectItem value="static">🖼️ Static</SelectItem>
                    <SelectItem value="video">🎞️ Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(
                      (value as CalendarEvent["status"]) || "idea",
                    )
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">💡 Idea</SelectItem>
                    <SelectItem value="editing">✏️ Editing</SelectItem>
                    <SelectItem value="review">👁️ Review</SelectItem>
                    <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                    <SelectItem value="published">✅ Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Drive Link</label>
                <Input
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Caption</label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Social media caption..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Internal Notes</label>
              <Textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Internal notes or brief..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  console.log('[DEBUG] Save edit clicked for:', event.id, event.title);
                  setSaving(true);
                  onUpdate({
                    ...event,
                    title,
                    caption,
                    copy,
                    drive_link: driveLink,
                    platform: platform as CalendarEvent["platform"],
                    media_type: mediaType as CalendarEvent["media_type"],
                    format_type: formatType as CalendarEvent["format_type"],
                    status: status as CalendarEvent["status"],
                  });
                  setSaving(false);
                }}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      );
    },
  );

  // Quick Add Form component
  const DateQuickAddForm = React.memo(
    function DateQuickAddForm({
      onAdd,
    }: {
      onAdd: (payload: {
        title: string;
        copy?: string;
        caption?: string;
        platform?: CalendarEvent["platform"];
        type?: CalendarEvent["type"];
        media_type?: CalendarEvent["media_type"];
        format_type?: CalendarEvent["format_type"];
        drive_link?: string;
        status?: CalendarEvent["status"];
        attachments?: CalendarEvent["attachments"];
      }) => Promise<void>;
    }) {
      const [title, setTitle] = useState("");
      const [copy, setCopy] = useState("");
      const [caption, setCaption] = useState("");
      const [driveLink, setDriveLink] = useState("");
      const [platform, setPlatform] =
        useState<CalendarEvent["platform"]>("instagram");
      const [type, setType] = useState<CalendarEvent["type"]>("reel");
      const [mediaType, setMediaType] = useState<CalendarEvent["media_type"]>("video");
      const [formatType, setFormatType] = useState<CalendarEvent["format_type"]>("post");
      const [status, setStatus] = useState<CalendarEvent["status"]>("idea");
      const [attachmentUrl, setAttachmentUrl] = useState("");
      const [uploading, setUploading] = useState(false);
      const [submitting, setSubmitting] = useState(false);
      const [uploadedAttachments, setUploadedAttachments] = useState<
        CalendarEvent["attachments"]
      >([]);

      const addAttachmentFromUrl = useCallback(
        (url: string): CalendarEvent["attachments"] | undefined => {
          if (!url) return undefined;
          const kind: "image" | "video" | "pdf" | "document" = url.match(
            /\.(png|jpg|jpeg|gif|webp)$/i,
          )
            ? "image"
            : url.match(/\.(mp4|webm|mov)$/i)
              ? "video"
              : url.match(/\.(pdf)$/i)
                ? "pdf"
                : "document";
          return [{ id: Math.random().toString(36).slice(2), url, kind }];
        },
        [],
      );

      const handleFileUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const { validateFileSize, getFileType } =
              await import("@/lib/file-upload");
            const result = validateFileSize(file);
            if (!result.valid) {
              alert(result.error);
              return;
            }
            const fileType = getFileType(file.name) as
              | "image"
              | "video"
              | "pdf"
              | "document"
              | "other";
            const path = `content/${Date.now()}_${file.name}`;
            const { error } = await supabase.storage
              .from("project-files")
              .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
              });
            if (error) throw new Error(error.message);
            const { data: pub } = supabase.storage
              .from("project-files")
              .getPublicUrl(path);
            const att = {
              id: Math.random().toString(36).slice(2),
              url: pub.publicUrl,
              kind: fileType === "other" ? "document" : fileType,
            };
            setUploadedAttachments((prev) => [...(prev || []), att]);
          } catch (err: any) {
            console.error("Upload failed", err);
            alert(err.message || "Upload failed");
          } finally {
            setUploading(false);
            // Reset the file input
            e.target.value = "";
          }
        },
        [supabase],
      );

      return (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Content title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Platform *
                </label>
                <Select
                  value={platform}
                  onValueChange={(v) =>
                    setPlatform(v as CalendarEvent["platform"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">📷 Instagram</SelectItem>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="youtube">▶️ YouTube</SelectItem>
                    <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                    <SelectItem value="twitter">🐦 Twitter</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Media Type</label>
                <Select
                  value={mediaType}
                  onValueChange={(v) => setMediaType(v as CalendarEvent["media_type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">🖼️ Static Image</SelectItem>
                    <SelectItem value="video">🎥 Video</SelectItem>
                    <SelectItem value="carousel">🎠 Carousel</SelectItem>
                    <SelectItem value="reel">📹 Reel/Short</SelectItem>
                    <SelectItem value="story">📖 Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Format</label>
                <Select
                  value={formatType}
                  onValueChange={(v) => setFormatType(v as CalendarEvent["format_type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">📝 Post</SelectItem>
                    <SelectItem value="reel">🎬 Reel</SelectItem>
                    <SelectItem value="story">💬 Story</SelectItem>
                    <SelectItem value="carousel">🎡 Carousel</SelectItem>
                    <SelectItem value="static">🖼️ Static</SelectItem>
                    <SelectItem value="video">🎞️ Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as CalendarEvent["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">💡 Idea</SelectItem>
                    <SelectItem value="editing">✏️ Editing</SelectItem>
                    <SelectItem value="review">👁️ Ready for Review</SelectItem>
                    <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                    <SelectItem value="published">✅ Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Caption (Full Social Media Caption)
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write the full caption for this post..."
                  rows={4}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Internal Notes / Brief
                </label>
                <Textarea
                  value={copy}
                  onChange={(e) => setCopy(e.target.value)}
                  placeholder="Internal notes, brief, or instructions"
                  rows={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Google Drive / Media Link
                </label>
                <Input
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/... or other media link"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Attachment URL (optional)
              </label>
              <Input
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="flex items-center gap-2">
                <input
                  id="calendar-file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  disabled={uploading}
                  className="text-sm"
                />
                {uploading && (
                  <span className="text-xs text-muted-foreground">
                    Uploading…
                  </span>
                )}
              </div>
              {uploadedAttachments && uploadedAttachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="rounded-md overflow-hidden border bg-black/20"
                    >
                      {att.kind === "image" && (
                        <img
                          src={att.url}
                          alt="attachment"
                          className="w-full h-20 object-cover"
                        />
                      )}
                      {att.kind === "video" && (
                        <video
                          src={att.url}
                          className="w-full h-20 object-cover"
                          controls
                          preload="metadata"
                        />
                      )}
                      {att.kind !== "image" && att.kind !== "video" && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs p-2 inline-block w-full truncate"
                        >
                          {att.url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!title.trim() || submitting) return;
                  setSubmitting(true);
                  try {
                    await onAdd({
                      title,
                      copy,
                      caption,
                      platform,
                      type,
                      media_type: mediaType,
                      format_type: formatType,
                      drive_link: driveLink,
                      status,
                      attachments: [
                        ...(uploadedAttachments || []),
                        ...(addAttachmentFromUrl(attachmentUrl) || []),
                      ],
                    });
                    setTitle("");
                    setCopy("");
                    setCaption("");
                    setDriveLink("");
                    setAttachmentUrl("");
                    setUploadedAttachments([]);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={!title.trim() || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Adding..." : "Add to Calendar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    },
  );

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 overflow-x-hidden">
      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg text-sm text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {user?.role === "project_manager" || user?.role === "employee"
              ? "My Projects"
              : "Projects"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.role === "project_manager" || user?.role === "employee"
              ? "All your assigned projects and collaborations"
              : "Manage all your video production projects"}
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Enter the project details to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      placeholder="Brand Video Production"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, client_id: value })
                      }
                      required
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No clients available
                          </SelectItem>
                        ) : (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {clients.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add a client first before creating a project
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service">Service Type *</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          service_type: value as ServiceType,
                        })
                      }
                      required
                    >
                      <SelectTrigger id="service">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SERVICE_TYPES).map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            <span className="flex items-center gap-2">
                              <span>{service.icon}</span>
                              <span>{service.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {SERVICE_TYPES[formData.service_type].description}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief project description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget (₹)</Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="10000"
                        value={formData.budget}
                        onChange={(e) =>
                          setFormData({ ...formData, budget: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: ProjectStatus) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="stuck">Stuck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) =>
                          setFormData({ ...formData, deadline: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || clients.length === 0}
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {submitting ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Project Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Total Projects
              </CardDescription>
              <CardTitle className="text-2xl">{projectStats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projectStats.active} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Completed</CardDescription>
              <CardTitle className="text-2xl">
                {projectStats.completed}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projects.length > 0
                  ? Math.round((projectStats.completed / projects.length) * 100)
                  : 0}
                % success rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Total Budget
              </CardDescription>
              <CardTitle className="text-2xl">
                ₹{Math.round(projectStats.totalBudget / 1000)}k
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Avg Progress
              </CardDescription>
              <CardTitle className="text-2xl">
                {projectStats.avgProgress}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={projectStats.avgProgress} className="h-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Type Filter Cards */}
      <div className="px-1 sm:px-0">
        <div className="flex gap-4 overflow-x-auto pl-4 pr-3 sm:px-0 py-1 pb-4 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:py-0">
          {Object.values(SERVICE_TYPES).map((service) => {
            const serviceProjects = projects.filter(
              (p) => p.service_type === service.value,
            );
            const isSelected = serviceFilter === service.value;
            return (
              <Card
                key={service.value}
                className={`flex-shrink-0 w-[calc(100vw-4rem)] sm:w-[300px] lg:w-auto cursor-pointer transition-all hover:shadow-lg snap-start ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() =>
                  setServiceFilter(isSelected ? "all" : service.value)
                }
              >
                <CardHeader
                  className={`pb-3 bg-gradient-to-br ${service.color} text-white rounded-t-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{service.icon}</div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg text-white">
                        {service.label}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">
                        {serviceProjects.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        {
                          serviceProjects.filter((p) => p.status === "completed")
                            .length
                        }{" "}
                        Completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {
                          serviceProjects.filter(
                            (p) => p.status === "in_progress",
                          ).length
                        }{" "}
                        In Progress
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="video_production">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.video_production.icon} Video Production
              </span>
            </SelectItem>
            <SelectItem value="social_media">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.social_media.icon} Social Media
              </span>
            </SelectItem>
            <SelectItem value="design_branding">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.design_branding.icon} Design & Branding
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="stuck">Stuck</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by creating your first project
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={clients.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Add a client first in the Clients page
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No projects match your search
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openProjectDetails(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{project.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {project.clients?.company_name || "No client"}
                        </CardDescription>
                      </div>
                      {project.thumbnail_url && (
                        <div className="w-12 h-12 rounded overflow-hidden border bg-muted flex-shrink-0">
                          <img
                            src={project.thumbnail_url}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge
                        variant={getServiceBadgeVariant(project.service_type)}
                        className="text-xs"
                      >
                        <span className="mr-1">
                          {getServiceIcon(project.service_type)}
                        </span>
                        {getServiceLabel(project.service_type)}
                      </Badge>
                      <StatusBadge status={project.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress_percentage}%</span>
                      </div>
                      <Progress value={project.progress_percentage} className="h-1.5" />
                    </div>

                    {/* Deadline & Budget */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {project.deadline && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            Deadline
                          </div>
                          <p className="text-xs font-medium">
                            {new Date(project.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {project.budget && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <IndianRupee className="h-3 w-3" />
                            Budget
                          </div>
                          <p className="text-xs font-medium">
                            ₹{project.budget.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectDetails(project);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(project);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTeamDialog(project);
                        }}
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoices(project);
                        }}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Project Detail Modal */}
      <Dialog
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          if (!open && commentSubmitting) return;
          setIsDetailModalOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-t-2xl"
          />
          {selectedProject && (
            <div className="relative z-10">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">
                      {selectedProject.name}
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      Client:{" "}
                      {selectedProject.clients?.company_name || "No client"}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={getServiceBadgeVariant(
                        selectedProject.service_type,
                      )}
                    >
                      <span className="mr-1">
                        {getServiceIcon(selectedProject.service_type)}
                      </span>
                      {getServiceLabel(selectedProject.service_type)}
                    </Badge>
                    <StatusBadge status={selectedProject.status} />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Project Overview */}
                <div>
                  <h3 className="font-semibold mb-3">Project Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedProject.budget && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <IndianRupee className="h-3 w-3" />
                          Budget
                        </div>
                        <p className="font-semibold">
                          ₹{selectedProject.budget.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedProject.start_date && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Start Date
                        </div>
                        <p className="font-semibold">
                          {new Date(
                            selectedProject.start_date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedProject.deadline && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Deadline
                        </div>
                        <p className="font-semibold">
                          {new Date(
                            selectedProject.deadline,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Progress
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={selectedProject.progress_percentage}
                          className="h-2 flex-1"
                        />
                        <span className="font-semibold text-sm">
                          {selectedProject.progress_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProject.description}
                    </p>
                  </div>
                )}

                {/* Actions (only for Social Media projects) */}
                {selectedProject?.service_type === "social_media" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setIsCalendarDialogOpen(true)}
                    >
                      Content Calendar
                    </Button>
                  </div>
                )}

                {/* Sub-Projects (Tasks) Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Sub-Projects / Tasks
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSubProjectDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  </div>
                  {subProjects[selectedProject.id] &&
                  subProjects[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {subProjects[selectedProject.id].map((subProject) => (
                        <Card
                          key={subProject.id}
                          className="hover:border-primary/50 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">
                                      {subProject.name}
                                    </h4>
                                    <StatusBadge status={subProject.status} />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setSelectedSubProject(subProject);
                                        setEditSubProjectFormData({
                                          name: subProject.name,
                                          description:
                                            subProject.description || "",
                                          assigned_to:
                                            subProject.assigned_to ||
                                            "unassigned",
                                          due_date: subProject.due_date || "",
                                          status: subProject.status,
                                          video_url: subProject.video_url || "",
                                        });
                                        setIsEditSubProjectDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {subProject.description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {subProject.description}
                                    </p>
                                  )}
                                  {subProject.video_url && (
                                    <div className="mb-2">
                                      <a
                                        href={subProject.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                      >
                                        <Video className="h-3 w-3" />
                                        View Video
                                      </a>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    {subProject.assigned_user && (
                                      <div className="flex items-center gap-1">
                                        <UserCheck className="h-3 w-3" />
                                        {subProject.assigned_user.full_name ||
                                          subProject.assigned_user.email}
                                      </div>
                                    )}
                                    {subProject.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(
                                          subProject.due_date,
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Select
                                  value={subProject.status}
                                  onValueChange={(value: ProjectStatus) =>
                                    handleUpdateSubProjectStatus(
                                      subProject.id,
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="planning">
                                      Planning
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                      In Progress
                                    </SelectItem>
                                    <SelectItem value="in_review">
                                      In Review
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      Completed
                                    </SelectItem>
                                    <SelectItem value="stuck">Stuck</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={subProject.progress_percentage}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-xs font-medium w-10 text-right">
                                    {subProject.progress_percentage}%
                                  </span>
                                </div>
                                <Input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={subProject.progress_percentage}
                                  onChange={(e) =>
                                    handleUpdateSubProjectProgress(
                                      subProject.id,
                                      parseInt(e.target.value),
                                    )
                                  }
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No tasks yet. Break down this project into smaller
                          tasks.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Milestones Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Milestones</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsMilestoneDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Milestone
                    </Button>
                  </div>
                  {projectMilestones[selectedProject.id] &&
                  projectMilestones[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectMilestones[selectedProject.id].map(
                        (milestone) => (
                          <Card key={milestone.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">
                                      {milestone.title}
                                    </h4>
                                    <StatusBadge status={milestone.status} />
                                  </div>
                                  {milestone.description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {milestone.description}
                                    </p>
                                  )}
                                  {milestone.due_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Due:{" "}
                                      {new Date(
                                        milestone.due_date,
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={milestone.status}
                                    onValueChange={(val) =>
                                      handleMilestoneStatusChange(
                                        selectedProject.id,
                                        milestone.id,
                                        val as MilestoneStatus,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-[160px]">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {milestoneStatusOptions.map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteMilestone(
                                        selectedProject.id,
                                        milestone.id,
                                      )
                                    }
                                    title="Delete milestone"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ),
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No milestones yet. Add milestones to track project
                          progress.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Team Members</h3>
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTeamDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Assign Member
                      </Button>
                    )}
                  </div>
                  {projectTeam[selectedProject.id] &&
                  projectTeam[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectTeam[selectedProject.id].map((member) => (
                        <Card key={member.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {member.full_name?.charAt(0) ||
                                      member.email.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {member.full_name || member.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.role}
                                  </p>
                                </div>
                              </div>
                              {(user?.role === "admin" || user?.role === "super_admin") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveTeamMember(member.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No team members assigned yet.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Comment Access */}
                {(user?.role === "admin" || user?.role === "super_admin") && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Comment Access</h3>
                      <p className="text-xs text-muted-foreground">
                        Manage team member access to client comments
                      </p>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {projectTeam[selectedProject.id] &&
                          projectTeam[selectedProject.id].length > 0 ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-3">
                                All assigned team members can view and respond to comments by default. Viewers can see comments but cannot reply.
                              </p>
                              <div className="space-y-2">
                                {projectTeam[selectedProject.id].map(
                                  (member) => {
                                    const memberRole =
                                      projectTeamRoles[selectedProject.id]?.[
                                        member.id
                                      ] || "";
                                    return (
                                      <div
                                        key={member.id}
                                        className="flex items-center justify-between p-2 rounded border"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                            {member.full_name?.charAt(0) ||
                                              member.email.charAt(0)}
                                          </div>
                                          <span className="text-sm font-medium">
                                            {member.full_name ||
                                              member.email}
                                          </span>
                                        </div>
                                        <Badge
                                          variant={
                                            memberRole === "viewer"
                                              ? "secondary"
                                              : "default"
                                          }
                                          className="text-xs"
                                        >
                                          {memberRole === "viewer"
                                            ? "Viewer (Read-Only)"
                                            : "Full Access"}
                                        </Badge>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-3 italic">
                                💡 Tip: Assign team members with "Viewer"
                                role to restrict comment editing to admins
                                only.
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No team members assigned. Add team members to
                              grant them comment access.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Files & Documents */}
                <div>
                  <h3 className="font-semibold mb-3">Files & Documents</h3>
                  {(() => {
                    const rolesForProject =
                      projectTeamRoles[selectedProject.id] || {};
                    const isViewer =
                      user?.role === "employee" &&
                      rolesForProject[user?.id || ""] === "viewer";
                    return (
                      <FileManager
                        projectId={selectedProject.id}
                        driveFolderUrl={selectedProject.drive_folder_url}
                        readOnly={isViewer}
                        onDriveFolderUpdate={(url) => {
                          setSelectedProject({
                            ...selectedProject,
                            drive_folder_url: url,
                          });
                          // Update in the projects list
                          setProjects((prevProjects) =>
                            prevProjects.map((p) =>
                              p.id === selectedProject.id
                                ? { ...p, drive_folder_url: url }
                                : p,
                            ),
                          );
                        }}
                      />
                    );
                  })()}
                </div>

                {/* Project Comments */}
                <div>
                  <h3 className="font-semibold mb-3">Project Comments</h3>
                  <div className="space-y-4">
                    {(projectComments[selectedProject.id] || []).length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            <p>No comments yet</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      (projectComments[selectedProject.id] || []).map(
                        (comment: any) => (
                          <Card
                            key={comment.id}
                            className="hover:border-primary/50 transition-colors"
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* Comment Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                    {comment.user?.full_name?.[0] ||
                                      comment.user?.email?.[0] ||
                                      "U"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {comment.user?.full_name ||
                                        comment.user?.email ||
                                        "User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(
                                        comment.created_at,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {comment.user?.role && (
                                  <Badge variant="outline" className="text-xs">
                                    {comment.user.role}
                                  </Badge>
                                )}
                              </div>

                              {/* Comment Text */}
                              <p className="text-sm whitespace-pre-wrap">
                                {comment.comment_text}
                              </p>

                              {/* File & Timestamp Info */}
                              {(comment.file || comment.timestamp_seconds) && (
                                <div className="mt-2 p-2 rounded bg-muted/50 space-y-1">
                                  {comment.file && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <FileText className="h-3 w-3 text-blue-500" />
                                      <span className="font-medium">
                                        Linked file:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {comment.file.file_name}
                                      </span>
                                      {comment.file.file_type && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs ml-auto"
                                        >
                                          {comment.file.file_type.toUpperCase()}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {comment.timestamp_seconds && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Clock className="h-3 w-3 text-orange-500" />
                                      <span className="font-medium">
                                        Timestamp:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {comment.timestamp_seconds}s
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Replies Section */}
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <button
                                  onClick={() => {
                                    setExpandedComments((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(comment.id)) {
                                        newSet.delete(comment.id);
                                      } else {
                                        newSet.add(comment.id);
                                        // Fetch replies when expanding
                                        if (!commentReplies[comment.id]) {
                                          fetchCommentReplies(comment.id);
                                        }
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  {expandedComments.has(comment.id)
                                    ? "Hide"
                                    : "Show"}{" "}
                                  Responses (
                                  {commentReplies[comment.id]?.length || 0})
                                </button>

                                {expandedComments.has(comment.id) && (
                                  <div className="mt-3 space-y-2 pl-4 border-l-2">
                                    {(commentReplies[comment.id] || []).length >
                                    0 ? (
                                      (commentReplies[comment.id] || []).map(
                                        (reply: any) => (
                                          <div
                                            key={reply.id}
                                            className="rounded-md bg-muted/30 p-2 text-sm"
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <div>
                                                <p className="font-medium text-xs">
                                                  {reply.user?.full_name ||
                                                    reply.user?.email ||
                                                    "Admin"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(
                                                    reply.created_at,
                                                  ).toLocaleString()}
                                                </p>
                                              </div>
                                              {user?.id === reply.user_id &&
                                                (user?.role === "admin" ||
                                                  user?.role === "project_manager" ||
                                                  user?.role === "super_admin") && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() =>
                                                      handleDeleteCommentReply(
                                                        reply.id,
                                                        comment.id,
                                                      )
                                                    }
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                )}
                                            </div>
                                            <p className="text-xs whitespace-pre-wrap">
                                              {reply.reply_text}
                                            </p>
                                          </div>
                                        ),
                                      )
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        No responses yet
                                      </p>
                                    )}

                                    {/* Reply Input - Only for Admin/PM */}
                                    {(user?.role === "admin" ||
                                      user?.role === "project_manager" ||
                                      user?.role === "super_admin") && (
                                      <div className="mt-3 space-y-2">
                                        <Textarea
                                          value={
                                            replyInputs[comment.id] || ""
                                          }
                                          onChange={(e) =>
                                            setReplyInputs((prev) => ({
                                              ...prev,
                                              [comment.id]: e.target.value,
                                            }))
                                          }
                                          placeholder="Type your response..."
                                          className="text-xs"
                                          rows={2}
                                          disabled={commentSubmitting}
                                        />
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                              commentSubmitting ||
                                              !(
                                                replyInputs[comment.id] || ""
                                              ).trim()
                                            }
                                            onClick={() =>
                                              handleAddCommentReply(comment.id)
                                            }
                                          >
                                            {commentSubmitting && (
                                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                            )}
                                            Post Response
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ),
                      )
                    )}

                    {/* Add Comment Form - For Clients and Admins */}
                    {(user?.role === "client" ||
                      user?.role === "admin" ||
                      user?.role === "employee" ||
                      user?.role === "super_admin") && (
                      <form
                        onSubmit={handleAddProjectComment}
                        className="space-y-2"
                      >
                        <Label htmlFor="project-comment" className="font-medium">
                          Add Comment
                        </Label>
                        <Textarea
                          id="project-comment"
                          value={newProjectComment}
                          onChange={(e) => setNewProjectComment(e.target.value)}
                          placeholder="Share your thoughts or questions..."
                          disabled={commentSubmitting}
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={
                              commentSubmitting || !newProjectComment.trim()
                            }
                          >
                            {commentSubmitting && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {commentSubmitting ? "Posting..." : "Post Comment"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteConfirmation({
                        projectId: selectedProject.id,
                        projectName: selectedProject.name,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDetailModalOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setEditFormData({
                          name: selectedProject.name,
                          client_id: selectedProject.client_id,
                          description: selectedProject.description || "",
                          service_type: selectedProject.service_type,
                          budget: selectedProject.budget?.toString() || "",
                          start_date: selectedProject.start_date || "",
                          deadline: selectedProject.deadline || "",
                          status: selectedProject.status,
                          progress_percentage:
                            selectedProject.progress_percentage || 0,
                        });
                        setIsEditDialogOpen(true);
                        setIsDetailModalOpen(false);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content Calendar Dialog */}
      {/* Calendar only for Social Media projects */}
      <Dialog
        open={
          isCalendarDialogOpen &&
          selectedProject?.service_type === "social_media"
        }
        onOpenChange={setIsCalendarDialogOpen}
      >
        <DialogContent
          className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="relative z-10 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">Content Calendar</DialogTitle>
              <DialogDescription>
                Plan and manage content for {selectedProject?.name || "project"}
              </DialogDescription>
            </DialogHeader>
            <CalendarView
              events={calendarEvents}
              onCreate={(date) => handleCreateCalendarEvent(date)}
              onUpdate={(event) => handleUpdateCalendarEvent(event)}
              onDelete={(eventId) => handleDeleteCalendarEvent(eventId)}
              onOpenDate={(date, events) => {
                setDateDetails({ date, events });
                setIsCalendarDialogOpen(false); // Close calendar when opening date details
                setIsDateDetailsOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Details Dialog - Mobile Friendly */}
      <Dialog open={isDateDetailsOpen} onOpenChange={setIsDateDetailsOpen}>
        <DialogContent
          className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl p-0 sm:p-0 sm:rounded-xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DialogHeader className="px-4 sm:px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 -ml-2"
                    onClick={() => {
                      setIsDateDetailsOpen(false);
                      setShowEditForm(false);
                      setEditingEvent(null);
                      setIsCalendarDialogOpen(true); // Reopen calendar
                    }}
                  >
                    ← Back to Calendar
                  </Button>
                  <DialogTitle className="text-xl sm:text-2xl">
                    {dateDetails
                      ? new Date(dateDetails.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : "Date"}
                  </DialogTitle>
                  <DialogDescription>Plan and manage content</DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsDateDetailsOpen(false);
                    setShowEditForm(false);
                    setEditingEvent(null);
                  }}
                >
                  ✕
                </Button>
              </div>
            </DialogHeader>
          </div>

          <div className="px-4 sm:px-6 py-4 space-y-4 pb-8">
            {/* Existing events list - shown first on mobile */}
            {(dateDetails?.events || []).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Today's Content</h3>
                {(dateDetails?.events || []).map((ev) => (
                  <Card key={ev.id} className="overflow-hidden">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base break-words">
                            {ev.title}
                          </h4>
                          {(() => {
                            const meta = [
                              ev.platform,
                              ev.media_type,
                              ev.format_type,
                              ev.status,
                            ]
                              .filter(Boolean)
                              .join(" • ");
                            return meta ? (
                              <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                                {meta}
                              </p>
                            ) : null;
                          })()}
                          <div className="hidden sm:flex items-center flex-wrap gap-1 mt-1">
                            {ev.platform && (
                              <Badge variant="secondary" className="text-[10px]">
                                {ev.platform}
                              </Badge>
                            )}
                            {ev.media_type && (
                              <Badge variant="outline" className="text-[10px]">
                                {ev.media_type}
                              </Badge>
                            )}
                            {ev.format_type && (
                              <Badge variant="outline" className="text-[10px]">
                                {ev.format_type}
                              </Badge>
                            )}
                            {ev.status && (
                              <Badge 
                                variant={
                                  ev.status === "published" ? "default" :
                                  ev.status === "scheduled" ? "secondary" :
                                  ev.status === "review" ? "outline" : "destructive"
                                } 
                                className="text-[10px]"
                              >
                                {ev.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => handleDeleteCalendarEvent(ev.id)}
                        >
                          🗑️
                        </Button>
                      </div>

                      {ev.caption && (
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <p className="font-medium mb-1">Caption:</p>
                          <p className="line-clamp-3">{ev.caption}</p>
                        </div>
                      )}

                      {ev.copy && (
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <p className="font-medium mb-1">Internal Notes:</p>
                          <p className="line-clamp-2">{ev.copy}</p>
                        </div>
                      )}

                      {ev.drive_link && (
                        <div className="space-y-2">
                          <div className="rounded-lg overflow-hidden border border-border">
                            {getMediaType(ev.drive_link) === 'image' ? (
                              <img
                                src={getDirectImageUrl(ev.drive_link)}
                                alt={ev.title}
                                className="w-full max-h-64 object-contain bg-muted/10"
                                loading="lazy"
                                onError={(e) => {
                                  console.error('Image failed to load:', ev.drive_link);
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-full h-32 bg-yellow-500/10 border border-yellow-500/30 rounded flex flex-col items-center justify-center gap-2 p-4"><div class="text-sm font-medium text-yellow-600 dark:text-yellow-500">⚠️ Image Preview Unavailable</div><div class="text-xs text-center text-muted-foreground">Google Drive file must be shared as "Anyone with the link"</div><div class="text-xs text-muted-foreground">Click the link below to view</div></div>';
                                  }
                                }}
                              />
                            ) : getMediaType(ev.drive_link) === 'video' ? (
                              <video
                                src={getDirectImageUrl(ev.drive_link)}
                                controls
                                className="w-full max-h-64 object-contain bg-black"
                                playsInline
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <div className="w-full h-32 bg-muted/30 flex flex-col items-center justify-center gap-2">
                                <FileIcon className="h-12 w-12 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Media file</span>
                              </div>
                            )}
                          </div>
                          <a
                            href={ev.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline break-all"
                          >
                            {getMediaType(ev.drive_link) === 'image' ? '🖼️ View Image' : getMediaType(ev.drive_link) === 'video' ? '🎥 Open Video' : '🔗 View Media'}
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={() => {
                            console.log('[DEBUG] Edit button clicked for event:', ev.id, ev.title);
                            console.log('[DEBUG] Before: showEditForm=', showEditForm, 'editingEvent=', editingEvent?.id);
                            setEditingEvent(ev);
                            setShowEditForm(true);
                            console.log('[DEBUG] After: showEditForm should be true, editingEvent should be:', ev.id);
                          }}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs sm:text-sm"
                          onClick={() => {
                            const newStatus = ev.status === "published" ? "scheduled" : "published";
                            handleUpdateCalendarEvent({ ...ev, status: newStatus as CalendarEvent["status"] });
                          }}
                        >
                          {ev.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick add form */}
            {!showEditForm && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Add New Content</h3>
                <DateQuickAddForm
                  onAdd={async (payload) => {
                    console.log('[DEBUG] Add calendar event started', payload.title);
                    if (!selectedProject) {
                      alert("Please select a project first");
                      return;
                    }
                    const baseDate = dateDetails?.date || new Date();
                    console.log('[DEBUG] baseDate from dateDetails:', baseDate?.toISOString(), 'or current:', new Date().toISOString());
                    const eventDate = new Date(
                      baseDate.getFullYear(),
                      baseDate.getMonth(),
                      baseDate.getDate(),
                    )
                      .toISOString()
                      .slice(0, 10);
                    console.log('[DEBUG] Final eventDate to create:', eventDate);

                    try {
                      console.log('[DEBUG] Creating calendar event...');
                      await (
                        await import("@/app/actions/calendar-events")
                      ).createCalendarEvent({
                        project_id: selectedProject.id,
                        event_date: eventDate,
                        title: payload.title,
                        copy: payload.copy,
                        caption: payload.caption,
                        platform: payload.platform,
                        media_type: payload.media_type,
                        format_type: payload.format_type,
                        drive_link: payload.drive_link,
                        status: payload.status,
                        attachments: payload.attachments,
                      });

                      console.log('[DEBUG] Event created, fetching month events...');
                      const refreshed = await fetchMonthEvents(baseDate);
                      console.log('[DEBUG] Refreshed events:', refreshed?.length);

                      // Refresh the day details list with the latest data for this date
                      setDateDetails((prev) => {
                        const date = prev?.date || baseDate;
                        const iso = date.toISOString().slice(0, 10);
                        const eventsForDay = (refreshed || calendarEvents).filter(
                          (e) => (e.date || "").slice(0, 10) === iso,
                        );
                        console.log('[DEBUG] Events for day:', eventsForDay.length);
                        return { date, events: eventsForDay };
                      });

                      console.log('[DEBUG] Add calendar event complete');
                      // Close the dialog after successful add (optional - user can keep adding)
                      // setIsDateDetailsOpen(false);
                    } catch (e) {
                      console.error('[DEBUG] Add calendar event error:', e);
                      alert("Failed to add content. Please try again.");
                    }
                  }}
                />
              </div>
            )}

            {/* Edit Form */}
            {showEditForm && editingEvent && (
              <>
                <EditEventForm
                  event={editingEvent}
                  onUpdate={async (updatedEvent) => {
                    try {
                      await (
                        await import("@/app/actions/calendar-events")
                      ).updateCalendarEvent(updatedEvent.id, updatedEvent);

                      const refreshDate =
                        dateDetails?.date ||
                        (updatedEvent.date ? new Date(updatedEvent.date) : new Date());

                      const refreshed = await fetchMonthEvents(refreshDate);

                      // Refresh the day detail list to reflect latest edits
                      setDateDetails((prev) => {
                        const date = prev?.date || refreshDate;
                        const iso = date.toISOString().slice(0, 10);
                        const eventsForDay = (refreshed || calendarEvents).filter(
                          (e) => (e.date || "").slice(0, 10) === iso,
                        );
                        return { date, events: eventsForDay };
                      });

                      setShowEditForm(false);
                      setEditingEvent(null);
                    } catch (e) {
                      console.error(e);
                      alert("Failed to update event. Please try again.");
                    }
                  }}
                  onCancel={() => {
                    setShowEditForm(false);
                    setEditingEvent(null);
                  }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog
        open={isMilestoneDialogOpen}
        onOpenChange={setIsMilestoneDialogOpen}
      >
        <DialogContent>
          <form onSubmit={handleAddMilestone}>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Create a new milestone for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="milestone-title">Title *</Label>
                <Input
                  id="milestone-title"
                  placeholder="Script completion"
                  required
                  value={milestoneFormData.title}
                  onChange={(e) =>
                    setMilestoneFormData({
                      ...milestoneFormData,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-desc">Description</Label>
                <Textarea
                  id="milestone-desc"
                  placeholder="Complete final draft of script"
                  value={milestoneFormData.description}
                  onChange={(e) =>
                    setMilestoneFormData({
                      ...milestoneFormData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-date">Due Date</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={milestoneFormData.due_date}
                  onChange={(e) =>
                    setMilestoneFormData({
                      ...milestoneFormData,
                      due_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMilestoneDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Team Member Dialog */}
      {user?.role === "admin" && (
        <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Team Members</DialogTitle>
                  <DialogDescription>
                    Manage team members for {selectedProject?.name}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    selectedProject &&
                    fetchProjectTeamMembers(selectedProject.id)
                  }
                  className="gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                  </svg>
                  Refresh
                </Button>
              </div>
            </DialogHeader>

            {/* Current Team Members */}
            <div className="space-y-4 py-4">
              {/* Debug Info */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800 space-y-1">
                  <div>
                    <strong>Debug Info:</strong>
                  </div>
                  <div>
                    Project ID: <code>{selectedProject?.id}</code>
                  </div>
                  <div>
                    Team Count:{" "}
                    <code>
                      {projectTeam[selectedProject?.id || ""]?.length || 0}
                    </code>
                  </div>
                  <div>
                    Has Team Data:{" "}
                    <code>
                      {projectTeam[selectedProject?.id || ""] ? "Yes" : "No"}
                    </code>
                  </div>
                  <div>
                    All Projects with Teams:{" "}
                    <code>{Object.keys(projectTeam).length}</code>
                  </div>
                  {projectTeam[selectedProject?.id || ""] && (
                    <div>
                      Members:{" "}
                      <code>
                        {projectTeam[selectedProject?.id || ""]
                          .map((m) => m.email)
                          .join(", ")}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Team Stats */}
              {projectTeam[selectedProject?.id || ""] &&
                projectTeam[selectedProject?.id || ""].length > 0 && (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {projectTeam[selectedProject?.id || ""].length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Team Members
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {
                          projectTeam[selectedProject?.id || ""].filter(
                            (m) => m.role === "admin",
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Admins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {
                          projectTeam[selectedProject?.id || ""].filter(
                            (m) => m.role === "project_manager",
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">PMs</p>
                    </div>
                  </div>
                )}

              <div>
                <h3 className="font-semibold mb-3">
                  Current Team Members (
                  {projectTeam[selectedProject?.id || ""]?.length || 0})
                </h3>
                {projectTeam[selectedProject?.id || ""] &&
                projectTeam[selectedProject?.id || ""].length > 0 ? (
                  <div className="space-y-2">
                    {projectTeam[selectedProject?.id || ""].map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {member.full_name?.charAt(0) ||
                                member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {member.full_name || member.email}
                              </p>
                              <Badge
                                variant={
                                  member.role === "admin"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {member.role === "admin" ? "Admin" : "PM"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No team members assigned yet
                  </div>
                )}
              </div>

              {/* Add Team Member Form */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Add Team Member</h3>
                <form onSubmit={handleAssignTeamMember}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="team-member">Team Member *</Label>
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                        required
                      >
                        <SelectTrigger id="team-member">
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No users available
                            </SelectItem>
                          ) : (
                            availableUsers
                              .filter(
                                (u) =>
                                  !projectTeam[selectedProject?.id || ""]?.find(
                                    (m) => m.id === u.id,
                                  ),
                              )
                              .map((availableUser) => (
                                <SelectItem
                                  key={availableUser.id}
                                  value={availableUser.id}
                                >
                                  {availableUser.full_name} (
                                  {availableUser.email})
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="team-role">Role (Optional)</Label>
                      <Input
                        id="team-role"
                        placeholder="e.g., Lead Editor, Designer"
                        value={teamRole}
                        onChange={(e) => setTeamRole(e.target.value)}
                        disabled={viewerOnly}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          id="team-viewer-only"
                          type="checkbox"
                          className="h-4 w-4"
                          checked={viewerOnly}
                          onChange={(e) => setViewerOnly(e.target.checked)}
                        />
                        <Label htmlFor="team-viewer-only">
                          View-only access
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTeamDialogOpen(false)}
                      disabled={submitting}
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !selectedUserId}
                    >
                      {submitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Assign Member
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client">Client *</Label>
                <Select
                  value={editFormData.client_id}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, client_id: value })
                  }
                  required
                >
                  <SelectTrigger id="edit-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Project description"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-service">Service Type *</Label>
                  <Select
                    value={editFormData.service_type}
                    onValueChange={(value: ServiceType) =>
                      setEditFormData({ ...editFormData, service_type: value })
                    }
                    required
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="mr-2">{type.icon}</span>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: ProjectStatus) =>
                      setEditFormData({ ...editFormData, status: value })
                    }
                    required
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-budget">Budget (₹)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    placeholder="100000"
                    value={editFormData.budget}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        budget: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-progress">Progress (%)</Label>
                  <Input
                    id="edit-progress"
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.progress_percentage}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        progress_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        start_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        deadline: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Project Dialog */}
      <Dialog
        open={isSubProjectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Reset form when closing dialog to prevent stuck states
            setSubProjectFormData({
              name: "",
              description: "",
              assigned_to: "unassigned",
              due_date: "",
              status: "planning",
              video_url: "",
            });
          }
          setIsSubProjectDialogOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={handleAddSubProject}>
            <DialogHeader>
              <DialogTitle>Add Sub-Project / Task</DialogTitle>
              <DialogDescription>
                Create a task for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sub-project-name">Task Name *</Label>
                <Input
                  id="sub-project-name"
                  placeholder="e.g., Script Writing, Video Editing"
                  required
                  value={subProjectFormData.name}
                  onChange={(e) =>
                    setSubProjectFormData({
                      ...subProjectFormData,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-desc">Description</Label>
                <Textarea
                  id="sub-project-desc"
                  placeholder="Task details..."
                  value={subProjectFormData.description}
                  onChange={(e) =>
                    setSubProjectFormData({
                      ...subProjectFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-assign">Assign To</Label>
                  <Select
                    value={subProjectFormData.assigned_to}
                    onValueChange={(value) =>
                      setSubProjectFormData({
                        ...subProjectFormData,
                        assigned_to: value,
                      })
                    }
                  >
                    <SelectTrigger id="sub-project-assign">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem
                          key={availableUser.id}
                          value={availableUser.id}
                        >
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-status">Status</Label>
                  <Select
                    value={subProjectFormData.status}
                    onValueChange={(value: ProjectStatus) =>
                      setSubProjectFormData({
                        ...subProjectFormData,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger id="sub-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-date">Due Date</Label>
                <Input
                  id="sub-project-date"
                  type="date"
                  value={subProjectFormData.due_date}
                  onChange={(e) =>
                    setSubProjectFormData({
                      ...subProjectFormData,
                      due_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-video">Video URL (Optional)</Label>
                <Input
                  id="sub-project-video"
                  type="text"
                  inputMode="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={subProjectFormData.video_url}
                  onChange={(e) =>
                    setSubProjectFormData({
                      ...subProjectFormData,
                      video_url: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubProjectDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                formNoValidate
                disabled={submitting || !subProjectFormData.name.trim()}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {submitting ? "Creating Task..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub-Project Dialog */}
      <Dialog
        open={isEditSubProjectDialogOpen}
        onOpenChange={setIsEditSubProjectDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEditSubProject}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details for this project
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-name">Task Name *</Label>
                <Input
                  id="edit-sub-project-name"
                  value={editSubProjectFormData.name}
                  onChange={(e) =>
                    setEditSubProjectFormData({
                      ...editSubProjectFormData,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-description">
                  Description
                </Label>
                <Textarea
                  id="edit-sub-project-description"
                  value={editSubProjectFormData.description}
                  onChange={(e) =>
                    setEditSubProjectFormData({
                      ...editSubProjectFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-video">
                    Video URL (Optional)
                  </Label>
                  <Input
                    id="edit-sub-project-video"
                    type="text"
                    inputMode="url"
                    placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                    value={editSubProjectFormData.video_url}
                    onChange={(e) =>
                      setEditSubProjectFormData({
                        ...editSubProjectFormData,
                        video_url: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a YouTube, Google Drive, or other video link
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-assigned">Assigned To</Label>
                  <Select
                    value={editSubProjectFormData.assigned_to}
                    onValueChange={(value) =>
                      setEditSubProjectFormData({
                        ...editSubProjectFormData,
                        assigned_to: value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-sub-project-assigned">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem
                          key={availableUser.id}
                          value={availableUser.id}
                        >
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-status">Status</Label>
                  <Select
                    value={editSubProjectFormData.status}
                    onValueChange={(value: ProjectStatus) =>
                      setEditSubProjectFormData({
                        ...editSubProjectFormData,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-sub-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-date">Due Date</Label>
                <Input
                  id="edit-sub-project-date"
                  type="date"
                  value={editSubProjectFormData.due_date}
                  onChange={(e) =>
                    setEditSubProjectFormData({
                      ...editSubProjectFormData,
                      due_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-video">
                  Video URL (Optional)
                </Label>
                <Input
                  id="edit-sub-project-video"
                  type="text"
                  inputMode="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={editSubProjectFormData.video_url}
                  onChange={(e) =>
                    setEditSubProjectFormData({
                      ...editSubProjectFormData,
                      video_url: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSubProjectDialogOpen(false);
                  setSelectedSubProject(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirmation?.projectName}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This will delete the project and all
              associated files, milestones, tasks, and comments.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmation(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteConfirmation &&
                handleDeleteProject(deleteConfirmation.projectId)
              }
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProjectsPageContent />
    </Suspense>
  );
}
