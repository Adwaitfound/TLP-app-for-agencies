// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { FileManager } from "@/components/projects/file-manager";
import {
  getProjectDetailForEmployee,
  updateTaskStatusForEmployee,
  updateMilestoneStatusForEmployee,
} from "@/app/actions/employee-projects";
import type { Project, ProjectFile, Milestone, ServiceType } from "@/types";
import { SERVICE_TYPES } from "@/types";
import {
  FilePlus2,
  Loader2,
  ExternalLink,
  IndianRupee,
  Calendar,
  Clock,
  TrendingUp,
  CheckSquare,
  FileText,
} from "lucide-react";

type Props = {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ProjectDetail = Project & {
  clients?: { company_name?: string | null } | null;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
};

const taskStatuses = ["not_started", "in_progress", "in_review", "completed"];
const milestoneStatuses: Milestone["status"][] = [
  "not_started",
  "in_progress",
  "in_review",
  "completed",
];
const fileCategories: ProjectFile["file_category"][] = [
  "brief",
  "asset",
  "invoice",
  "contract",
  "other",
];
const fileTypes: ProjectFile["file_type"][] = [
  "document",
  "image",
  "video",
  "other",
];

function getServiceBadgeVariant(serviceType?: ServiceType) {
  if (!serviceType) return "default" as const;
  return (SERVICE_TYPES[serviceType]?.variant || "default") as const;
}

export function EmployeeProjectDetailModal({ projectId, open, onOpenChange }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [savingMilestoneId, setSavingMilestoneId] = useState<string | null>(null);

  async function loadData() {
    if (!open || !projectId) return;
    setLoading(true);
    const result = await getProjectDetailForEmployee(projectId);
    if (!("error" in result) && result.project) {
      setProject(result.project as ProjectDetail);
      setTasks(result.tasks as Task[]);
      setMilestones(result.milestones as Milestone[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [open, projectId]);

  async function handleTaskStatusChange(id: string, status: string) {
    setSavingTaskId(id);
    const res = await updateTaskStatusForEmployee(id, status);
    if (!res?.error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }
    setSavingTaskId(null);
  }

  async function handleMilestoneStatusChange(id: string, status: Milestone["status"]) {
    setSavingMilestoneId(id);
    const res = await updateMilestoneStatusForEmployee(id, status);
    if (!res?.error) {
      setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    }
    setSavingMilestoneId(null);
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-t-2xl"
        />
        {loading ? (
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle>Loading Project...</DialogTitle>
              <DialogDescription>
                Please wait while we load the project details.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : (
          project && (
            <div className="relative z-10">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl sm:text-2xl">
                      {project.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1 sm:mt-2 text-sm">
                      Client: {project.clients?.company_name || "No client"}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-shrink-0">
                    <Badge variant={getServiceBadgeVariant(project.service_type)}>
                      <span className="mr-1">
                        {SERVICE_TYPES[project.service_type]?.icon}
                      </span>
                      {SERVICE_TYPES[project.service_type]?.label || project.service_type}
                    </Badge>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Project Overview */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Project Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {project.budget && (
                      <div className="p-2 sm:p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <IndianRupee className="h-3 w-3" />
                          Budget
                        </div>
                        <p className="text-sm sm:text-base font-semibold truncate">
                          ₹{project.budget.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {project.start_date && (
                      <div className="p-2 sm:p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Start Date
                        </div>
                        <p className="text-sm sm:text-base font-semibold">
                          {new Date(project.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="p-2 sm:p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Deadline
                        </div>
                        <p className="text-sm sm:text-base font-semibold">
                          {new Date(project.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Progress
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress_percentage || 0} className="h-2 flex-1" />
                        <span className="font-semibold text-sm">
                          {project.progress_percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                )}

                {/* Tasks Section */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">My Tasks</h3>
                  {tasks.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No tasks assigned yet.
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <Card key={task.id}>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start flex-wrap gap-2 mb-1">
                                  <h4 className="text-sm sm:text-base font-medium flex-1 min-w-0">{task.title}</h4>
                                  <StatusBadge status={task.status} />
                                </div>
                                {task.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                                  <span className="px-2 py-1 bg-muted rounded">Priority: {task.priority}</span>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                                      <Calendar className="h-3 w-3" />
                                      <span className="hidden sm:inline">{new Date(task.due_date).toLocaleDateString()}</span>
                                      <span className="sm:hidden">{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Select
                                value={task.status}
                                onValueChange={(val) => handleTaskStatusChange(task.id, val)}
                                disabled={savingTaskId === task.id}
                              >
                                <SelectTrigger className="w-full sm:w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {taskStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones Section */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Milestones</h3>
                  {milestones.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No milestones yet.
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {milestones.map((milestone) => (
                        <Card key={milestone.id}>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start flex-wrap gap-2 mb-1">
                                  <h4 className="font-medium flex-1">{milestone.title}</h4>
                                  <StatusBadge status={milestone.status} />
                                </div>
                                {milestone.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                                    {milestone.description}
                                  </p>
                                )}
                                {milestone.due_date && (
                                  <p className="text-[10px] sm:text-xs text-muted-foreground px-2 py-1 bg-muted rounded inline-block">
                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={milestone.status}
                                onValueChange={(val) =>
                                  handleMilestoneStatusChange(
                                    milestone.id,
                                    val as Milestone["status"],
                                  )
                                }
                                disabled={savingMilestoneId === milestone.id}
                              >
                                <SelectTrigger className="w-full sm:w-[140px]">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {milestoneStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Files & Documents Section */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold">Files & Documents</h3>
                  </div>

                  {/* Use FileManager Component */}
                  <FileManager
                    projectId={projectId || ""}
                    driveFolderUrl={(project as any)?.drive_folder_url}
                    onDriveFolderUpdate={() => {
                      // Reload files after drive folder update
                      if (projectId) {
                        loadData();
                      }
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
