"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TaskManager } from "@/components/dashboard/task-manager";
import { AllTasksTab } from "@/components/dashboard/all-tasks-tab";
import { EmployeeProjectDetailModal } from "@/components/dashboard/employee-project-detail-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  Briefcase,
  ListTodo,
  Flag,
  Calendar,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Clock,
  FolderKanban,
  Plus,
} from "lucide-react";
import type { Project, Milestone, ProjectStatus } from "@/types";

type ProjectSummary = {
  id: string;
  name: string;
  status?: ProjectStatus;
  deadline?: string | null;
  progress_percentage?: number | null;
  start_date?: string | null;
  description?: string | null;
  clients?: { company_name?: string | null };
};

type MilestoneSummary = {
  id: string;
  title: string;
  due_date?: string | null;
  status?: string;
  project_id?: string;
  projects?: { name?: string | null };
};

export function EmployeeDashboardTabs() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isRequestProjectOpen, setIsRequestProjectOpen] = useState(false);
  const [requestProjectFormData, setRequestProjectFormData] = useState({
    projectName: "",
    description: "",
    vertical: "video_production",
  });
  const [requestingProject, setRequestingProject] = useState(false);
  const [overview, setOverview] = useState({
    activeProjects: 0,
    tasksToday: 0,
    overdueTasks: 0,
    upcomingMilestones: 0,
    completedThisWeek: 0,
  });
  const [showCongrats, setShowCongrats] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!userId) return;
      setLoading(true);

      // Restore congrats banner preference
      try {
        const hidden = localStorage.getItem("employee_congrats_hidden");
        if (hidden === "true") setShowCongrats(false);
      } catch (_) {}

      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      try {
        // Load project IDs for this employee (small, indexed query)
        const { data: teamData, error: teamError } = await supabase
          .from("project_team")
          .select("project_id")
          .eq("user_id", userId)
          .limit(50);

        if (teamError) {
          console.error("Error fetching project team:", teamError);
        }

        const projectIds = (teamData || [])
          .map((item: any) => item.project_id)
          .filter(Boolean);

        // Prepare parallel queries to reduce total load time
        const projectsPromise = projectIds.length
          ? supabase
              .from("projects")
              .select(
                "id,name,status,deadline,progress_percentage,start_date,description,clients(company_name)",
              )
              .in("id", projectIds)
              .limit(50)
          : Promise.resolve({ data: [] as any[], error: null } as any);

        const milestonesPromise = projectIds.length
          ? supabase
              .from("milestones")
              .select("id,title,due_date,status,project_id,projects(name)")
              .in("project_id", projectIds)
              .gte("due_date", today)
              .order("due_date", { ascending: true })
              .limit(8)
          : Promise.resolve({ data: [] as any[], error: null } as any);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const completedCountPromise = supabase
          .from("employee_tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("completed_at", sevenDaysAgo.toISOString());

        const [projectsRes, milestonesRes, completedRes] = await Promise.all([
          projectsPromise,
          milestonesPromise,
          completedCountPromise,
        ]);

        const projectsData = (projectsRes as any)?.data || [];
        const milestonesData = (milestonesRes as any)?.data || [];
        const completedThisWeek = (completedRes as any)?.count || 0;

        const allProjects: ProjectSummary[] = projectsData.map((p: any) => ({
          ...p,
          clients: Array.isArray(p.clients) ? p.clients[0] : p.clients,
        }));

        setProjects(allProjects);

        setMilestones(milestonesData as MilestoneSummary[]);
        
        // Calculate overview metrics with minimal work
        const activeCount = allProjects.filter(
          (p) => p.status === "in_progress" || p.status === "in_review",
        ).length;

        setOverview((prev) => ({
          ...prev,
          upcomingMilestones: milestonesData.length,
          activeProjects: activeCount,
          completedThisWeek: completedThisWeek || 0,
        }));
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [userId]);

  async function handleRequestProject(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !requestProjectFormData.projectName.trim()) return;

    setRequestingProject(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("employee_tasks").insert({
        user_id: userId,
        title: requestProjectFormData.projectName,
        description: requestProjectFormData.description,
        proposed_project_name: requestProjectFormData.projectName,
        proposed_project_vertical: requestProjectFormData.vertical,
        proposed_project_status: "pending",
        status: "todo",
        priority: "medium",
      });

      if (error) throw error;

      // Reset form and close dialog
      setRequestProjectFormData({
        projectName: "",
        description: "",
        vertical: "video_production",
      });
      setIsRequestProjectOpen(false);

      // Show success message and reload
      alert("Project request submitted! Your admin will review and approve it soon.");
      window.location.reload();
    } catch (error: any) {
      console.error("Error requesting project:", error);
      alert(error?.message || "Failed to request project");
    } finally {
      setRequestingProject(false);
    }
  }

  function openProjectDetail(projectId: string) {
    setSelectedProjectId(projectId);
    setModalOpen(true);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show content immediately, load data in background
  const contentReady = true;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Work</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects, tasks, and milestones
          </p>
        </div>
        <Button size="lg" className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Project Detail Modal */}
      <EmployeeProjectDetailModal
        projectId={selectedProjectId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={overview.activeProjects.toString()}
          icon={Briefcase}
        />
        <StatCard
          title="Tasks Today"
          value={overview.tasksToday.toString()}
          icon={ListTodo}
        />
        <StatCard
          title="Overdue Tasks"
          value={overview.overdueTasks.toString()}
          icon={AlertCircle}
          iconClassName="text-amber-500"
        />
        <StatCard
          title="Upcoming Milestones"
          value={overview.upcomingMilestones.toString()}
          icon={Calendar}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="overview" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">All Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">Milestones</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Congrats banner */}
          <Card className="bg-lime-50 border-lime-200">
            <CardContent className="py-4 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-lime-800">
                    Congratulations! You have completed {overview.completedThisWeek} task{overview.completedThisWeek === 1 ? "" : "s"} this week.
                  </p>
                  <p className="text-xs text-lime-700">
                    Keep up the good work and stay on track!
                  </p>
                </div>
                <button
                  aria-label="Dismiss"
                  className="text-xs text-lime-700 hover:text-lime-900"
                  onClick={() => {
                    setShowCongrats(false);
                    try {
                      localStorage.setItem("employee_congrats_hidden", "true");
                    } catch (_) {}
                  }}
                >
                  ✕
                </button>
              </div>
            </CardContent>
          </Card>

          <TaskManager limit={5} onViewAll={() => setActiveTab("tasks")} />

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>
                  Your recently active projects
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("projects")}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No projects assigned
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => openProjectDetail(project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.clients?.company_name || "No client"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {project.progress_percentage !== null && (
                          <div className="text-right">
                            <p className="text-xs font-medium">
                              {project.progress_percentage}%
                            </p>
                            <Progress
                              value={project.progress_percentage}
                              className="h-1.5 w-20 mt-1"
                            />
                          </div>
                        )}
                        <StatusBadge status={project.status || "planning"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Milestones */}
          {milestones.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Milestones</CardTitle>
                  <CardDescription>Next deadlines</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("milestones")}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milestones.slice(0, 5).map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {milestone.projects?.name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium">
                          {milestone.due_date
                            ? new Date(milestone.due_date).toLocaleDateString()
                            : "No date"}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {milestone.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <AllTasksTab />
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">All Projects</CardTitle>
                <CardDescription>
                  All projects assigned to you ({projects.length})
                </CardDescription>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsRequestProjectOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Request a Project</span>
                <span className="sm:hidden">Request</span>
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderKanban className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No projects assigned yet
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setIsRequestProjectOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request a Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openProjectDetail(project.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">
                                {project.name}
                              </h3>
                              <StatusBadge status={project.status || "planning"} />
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {project.description ||
                                "No description provided"}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              {project.clients?.company_name && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  {project.clients.company_name}
                                </div>
                              )}
                              {project.start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(project.start_date).toLocaleDateString()}
                                </div>
                              )}
                              {project.deadline && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Due:{" "}
                                  {new Date(project.deadline).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          {project.progress_percentage !== null &&
                            project.progress_percentage !== undefined && (
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-2xl font-bold">
                                    {project.progress_percentage}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Complete
                                  </p>
                                </div>
                                <Progress
                                  value={project.progress_percentage}
                                  className="h-2 w-32"
                                />
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">All Milestones</CardTitle>
              <CardDescription>
                Important project deadlines ({milestones.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No upcoming milestones
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((milestone) => {
                    const daysUntil = milestone.due_date
                      ? Math.ceil(
                          (new Date(milestone.due_date).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null;
                    const isOverdue =
                      daysUntil !== null && daysUntil < 0;
                    const isUrgent =
                      daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

                    return (
                      <Card
                        key={milestone.id}
                        className={`${
                          isOverdue
                            ? "border-red-500/50 bg-red-500/5"
                            : isUrgent
                              ? "border-amber-500/50 bg-amber-500/5"
                              : ""
                        }`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">
                                  {milestone.title}
                                </h3>
                                {isOverdue && (
                                  <Badge className="bg-red-500">Overdue</Badge>
                                )}
                                {isUrgent && !isOverdue && (
                                  <Badge className="bg-amber-500">
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {milestone.projects?.name}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-semibold">
                                {milestone.due_date
                                  ? new Date(milestone.due_date).toLocaleDateString()
                                  : "No date"}
                              </p>
                              {daysUntil !== null && (
                                <p className="text-sm text-muted-foreground">
                                  {isOverdue
                                    ? `${Math.abs(daysUntil)} days overdue`
                                    : `${daysUntil} days away`}
                                </p>
                              )}
                              <Badge variant="outline" className="mt-2">
                                {milestone.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Project Dialog */}
      <Dialog open={isRequestProjectOpen} onOpenChange={setIsRequestProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a New Project</DialogTitle>
            <DialogDescription>
              Submit a project request. Your admin will review and create the project if approved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={requestProjectFormData.projectName}
                onChange={(e) =>
                  setRequestProjectFormData({
                    ...requestProjectFormData,
                    projectName: e.target.value,
                  })
                }
                placeholder="e.g., New Client Campaign"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={requestProjectFormData.description}
                onChange={(e) =>
                  setRequestProjectFormData({
                    ...requestProjectFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the project..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-vertical">Service Type *</Label>
              <Select
                value={requestProjectFormData.vertical}
                onValueChange={(value) =>
                  setRequestProjectFormData({
                    ...requestProjectFormData,
                    vertical: value,
                  })
                }
              >
                <SelectTrigger id="project-vertical">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video_production">Video Production</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="design_branding">Design & Branding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRequestProjectOpen(false)}
                disabled={requestingProject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  requestingProject ||
                  !requestProjectFormData.projectName.trim()
                }
              >
                {requestingProject ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
