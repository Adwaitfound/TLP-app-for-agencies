"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Clock,
  Zap,
  Flag,
} from "lucide-react";
import {
  createTask,
  updateTask,
  deleteTask,
  getTodayTasks,
  getOverdueTasks,
} from "@/app/actions/employee-tasks";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

const priorityConfig = {
  low: {
    color: "bg-blue-50 border-blue-200 hover:border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    icon: "text-blue-600",
  },
  medium: {
    color: "bg-amber-50 border-amber-200 hover:border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
  high: {
    color: "bg-orange-50 border-orange-200 hover:border-orange-300",
    badge: "bg-orange-100 text-orange-800",
    icon: "text-orange-600",
  },
  urgent: {
    color: "bg-red-50 border-red-200 hover:border-red-300",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600",
  },
};

const statusIcons = {
  todo: Circle,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  blocked: AlertCircle,
  cancelled: Circle,
};

const taskStatuses = ["todo", "in_progress", "blocked", "completed", "cancelled"] as const;

export function TaskManager({
  limit,
  onViewAll,
}: {
  limit?: number;
  onViewAll?: () => void;
}) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);
  const [projectOptions, setProjectOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    due_date: "",
    project_id: "",
    proposed_project_name: "",
    proposed_project_vertical: "" as
      | "video_production"
      | "social_media"
      | "design_branding"
      | "",
  });
  const [proposeNewProject, setProposeNewProject] = useState(false);

  useEffect(() => {
    console.log("[TaskManager] Component mounted, loading tasks...");
    loadTasks();
    loadProjects();
  }, []);

  useEffect(() => {
    console.log("[TaskManager] Tasks state changed:", tasks);
    console.log("[TaskManager] Overdue tasks state changed:", overdueTasks);
  }, [tasks, overdueTasks]);

  // Combined tasks list for simple debug/inspection. Keep hooks unconditional.
  const allTasks = [...overdueTasks, ...tasks];

  useEffect(() => {
    if (allTasks.length > 0) {
      console.log("[TaskManager] First task for inspection:", allTasks[0]);
      const taskWithDesc = allTasks.find((t) => t.description?.trim());
      console.log("[TaskManager] First task WITH description:", taskWithDesc);
    }
  }, [allTasks]);

  async function loadProjects() {
    setProjectLoading(true);
    const supabase = createClient();

    try {
      const [{ data: createdBy }, { data: teamAssignments }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, name")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("project_team").select("projects(id, name)").limit(50),
        ]);

      const combined: { id: string; name: string }[] = [];
      const addUnique = (p?: any) => {
        if (p && !combined.find((c) => c.id === p.id))
          combined.push({ id: p.id, name: p.name });
      };

      const createdProjects = Array.isArray(createdBy) ? createdBy : [];
      const teamProjects = (
        Array.isArray(teamAssignments) ? teamAssignments : []
      )
        .map((t: any) => t.projects)
        .filter(Boolean);

      createdProjects.forEach(addUnique);
      teamProjects.forEach(addUnique);

      setProjectOptions(combined);
    } catch (err) {
      console.error("loadProjects error", err);
    } finally {
      setProjectLoading(false);
    }
  }

  async function loadTasks() {
    setLoading(true);
    const [todayRes, overdueRes] = await Promise.all([
      getTodayTasks(),
      getOverdueTasks(),
    ]);

    console.log("[TaskManager] Today tasks response:", todayRes);
    console.log("[TaskManager] Overdue tasks response:", overdueRes);

    if (todayRes.data) {
      const tasksWithProposals = todayRes.data.filter(
        (t: any) => t.proposed_project_name,
      );
      console.log("[TaskManager] Tasks with proposals:", tasksWithProposals);
      console.log("[TaskManager] Setting tasks state with:", todayRes.data);
      // Debug: Log description field for each task
      console.log("[TaskManager] Task descriptions:", todayRes.data.map((t: any) => ({ 
        id: t.id, 
        title: t.title, 
        description: t.description,
        hasDescription: !!t.description 
      })));
      // The server already filters by user, so no need to filter again
      setTasks(todayRes.data);
    }
    if (overdueRes.data) {
      console.log(
        "[TaskManager] Setting overdue tasks state with:",
        overdueRes.data,
      );
      // The server already filters by user, so no need to filter again
      setOverdueTasks(overdueRes.data);
    }
    setLoading(false);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();

    const payload: any = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      due_date: formData.due_date,
      project_id: formData.project_id || undefined,
      proposed_project_name: proposeNewProject
        ? formData.proposed_project_name
        : undefined,
      proposed_project_vertical:
        formData.proposed_project_vertical || undefined,
    };

    const result = await createTask(payload);
    if (result.error) {
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: result.error, type: "error" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
    } else {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        project_id: "",
        proposed_project_name: "",
        proposed_project_vertical: "",
      });
      setProposeNewProject(false);
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message: "Task created successfully", type: "success" });
      const t = setTimeout(() => setToast(null), 3000);
      setToastTimer(t);
      await loadTasks();
    }
  }

  async function handleToggleComplete(task: any) {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    const result = await updateTask(task.id, { status: newStatus });
    if (result.error) {
      alert(result.error);
    } else {
      await loadTasks();
    }
  }

  async function handleChangeStatus(task: any, status: (typeof taskStatuses)[number]) {
    if (status === task.status) return;
    const result = await updateTask(task.id, { status });
    if (result.error) {
      alert(result.error);
    } else {
      await loadTasks();
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;

    setDeletingTaskId(taskId);
    console.log("[handleDeleteTask] 🔵 START - Deleting task:", taskId);

    try {
      const result = await deleteTask(taskId);
      console.log("[handleDeleteTask] Result:", result);

      if (result.error) {
        console.error("[handleDeleteTask] ❌ Error:", result.error);
        alert("Failed to delete task: " + result.error);
      } else {
        console.log("[handleDeleteTask] ✅ Task deleted, reloading...");
        await loadTasks();
        console.log("[handleDeleteTask] ✅ Tasks reloaded");
      }
    } catch (err) {
      console.error("[handleDeleteTask] ❌ Exception:", err);
      alert("Error deleting task: " + String(err));
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  

  return (
    <Card>
      <CardHeader className="relative">
        <div>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>
            Today&apos;s priorities and overdue items
          </CardDescription>
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {limit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewAll && onViewAll()}
            >
              View All
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your list. You can propose a new project if
                needed.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Project</Label>
                <Select
                  value={
                    proposeNewProject
                      ? "propose_new"
                      : formData.project_id || ""
                  }
                  onValueChange={(value) => {
                    if (value === "propose_new") {
                      setProposeNewProject(true);
                      setFormData({
                        ...formData,
                        project_id: "",
                        proposed_project_name: "",
                      });
                    } else {
                      setProposeNewProject(false);
                      setFormData({
                        ...formData,
                        project_id: value,
                        proposed_project_name: "",
                      });
                    }
                  }}
                  disabled={projectLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        projectLoading
                          ? "Loading projects..."
                          : "Select project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="propose_new">
                      + Propose new project
                    </SelectItem>
                  </SelectContent>
                </Select>
                {proposeNewProject && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <Label htmlFor="proposed_project_name">
                        Proposed Project Name
                      </Label>
                      <Input
                        id="proposed_project_name"
                        value={formData.proposed_project_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            proposed_project_name: e.target.value,
                          })
                        }
                        placeholder="e.g., New Client Campaign"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="proposed_project_vertical">
                        Vertical
                      </Label>
                      <Select
                        value={formData.proposed_project_vertical}
                        onValueChange={(value: any) =>
                          setFormData({
                            ...formData,
                            proposed_project_vertical: value,
                          })
                        }
                      >
                        <SelectTrigger id="proposed_project_vertical">
                          <SelectValue placeholder="Select vertical" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video_production">
                            🎬 Video Production
                          </SelectItem>
                          <SelectItem value="social_media">
                            📱 Social Media
                          </SelectItem>
                          <SelectItem value="design_branding">
                            🎨 Design & Branding
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {allTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks for today. Create one to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {(limit ? allTasks.slice(0, limit) : allTasks).map((task) => {
              const StatusIcon =
                statusIcons[task.status as keyof typeof statusIcons] || Circle;
              const isOverdue =
                task.due_date &&
                new Date(task.due_date) < new Date() &&
                task.status !== "completed";
              const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig];
              const daysUntilDue = task.due_date 
                ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;

              // Debug log for descriptions
              if (task.title.includes("Dealers") && task.description) {
                console.log(`[TaskManager] Task "${task.title}" has description: "${task.description}"`);
              }

              return (
                <div
                  key={task.id}
                  className={`relative overflow-hidden border rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    priorityInfo?.color || "bg-slate-50 border-slate-200"
                  } ${task.status === "completed" ? "opacity-70" : ""}`}
                >
                  {/* Priority indicator bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    task.priority === 'urgent' ? 'bg-red-600' :
                    task.priority === 'high' ? 'bg-orange-600' :
                    task.priority === 'medium' ? 'bg-amber-600' :
                    'bg-blue-600'
                  }`}></div>

                  <div className="p-4 pl-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                      >
                        <StatusIcon
                          className={`h-6 w-6 ${
                            task.status === "completed"
                              ? "text-green-600"
                              : priorityInfo?.icon || "text-slate-400"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p
                              className={`font-semibold text-base transition-opacity text-slate-900 ${
                                task.status === "completed" ? "line-through opacity-60" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {/* Description display */}
                            {task.description ? (
                              <p className="text-sm text-slate-700 mt-1">
                                {task.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={task.status}
                              onValueChange={(val) => handleChangeStatus(task, val as any)}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {taskStatuses.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replace("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Task metadata */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {/* Priority badge */}
                          <Badge className={priorityInfo?.badge || "bg-slate-100 text-slate-800"}>
                            {task.priority === 'urgent' && <Zap className="h-3 w-3 mr-1" />}
                            {task.priority === 'high' && <Flag className="h-3 w-3 mr-1" />}
                            {task.priority === 'medium' && <Clock className="h-3 w-3 mr-1" />}
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </Badge>

                          {/* Due date */}
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                              isOverdue 
                                ? 'bg-red-100 text-red-800 font-semibold' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {isOverdue 
                                ? `Overdue ${Math.abs(daysUntilDue || 0)} days`
                                : `${daysUntilDue === 0 ? 'Today' : `${daysUntilDue} days`}`
                              }
                            </div>
                          )}

                          {/* Proposal badge */}
                          {task.proposed_project_name && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              📋 {task.proposed_project_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
