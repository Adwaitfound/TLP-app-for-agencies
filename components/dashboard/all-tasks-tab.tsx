"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Flag, Zap, Circle, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { getTasks, updateTask, deleteTask } from "@/app/actions/employee-tasks";

const priorityConfig = {
  low: {
    badge: "bg-blue-100 text-blue-800",
    icon: "text-blue-600",
  },
  medium: {
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
  high: {
    badge: "bg-orange-100 text-orange-800",
    icon: "text-orange-600",
  },
  urgent: {
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600",
  },
} as const;

const statusIcons = {
  todo: Circle,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  blocked: AlertCircle,
  cancelled: Circle,
} as const;

const taskStatuses = ["todo", "in_progress", "blocked", "completed", "cancelled"] as const;

export function AllTasksTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load archived ids from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("archived_task_ids");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setArchivedIds(new Set(parsed));
      }
    } catch (_) {}
  }, []);

  function persistArchivedIds(ids: Set<string>) {
    setArchivedIds(new Set(ids));
    try {
      localStorage.setItem("archived_task_ids", JSON.stringify(Array.from(ids)));
    } catch (_) {}
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getTasks();
      if (res && (res as any).data) {
        const data = (res as any).data as any[];
        // sort by due_date asc, nulls last
        data.sort((a, b) => {
          const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return ad - bd;
        });
        // split using persisted archived ids or completed status
        const activeList: any[] = [];
        const archivedList: any[] = [];
        for (const t of data) {
          if (archivedIds.has(t.id) || t.status === "completed") {
            archivedList.push(t);
          } else {
            activeList.push(t);
          }
        }
        setTasks(activeList);
        setArchived(archivedList);
      }
      setLoading(false);
    }
    load();
  }, [archivedIds]);

  async function toggleComplete(task: any) {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    const res = await updateTask(task.id, { status: newStatus });
    if (!(res as any)?.error) {
      if (newStatus === "completed") {
        // move to archived list
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        setArchived((prev) => [...prev, { ...task, status: newStatus }]);
        const next = new Set(archivedIds);
        next.add(task.id);
        persistArchivedIds(next);
      } else {
        // restore from archived to active list
        setArchived((prev) => prev.filter((t) => t.id !== task.id));
        setTasks((prev) => [...prev, { ...task, status: newStatus }]);
        const next = new Set(archivedIds);
        next.delete(task.id);
        persistArchivedIds(next);
      }
    }
  }

  async function changeStatus(task: any, status: (typeof taskStatuses)[number]) {
    if (status === task.status) return;
    const res = await updateTask(task.id, { status });
    if ((res as any)?.error) return;

    const updated = { ...task, status };
    const nextArchived = new Set(archivedIds);

    const moveToArchived = status === "completed";
    if (moveToArchived) {
      nextArchived.add(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setArchived((prev) => [...prev.filter((t) => t.id !== task.id), updated]);
    } else {
      nextArchived.delete(task.id);
      setArchived((prev) => prev.filter((t) => t.id !== task.id));
      setTasks((prev) => {
        const without = prev.filter((t) => t.id !== task.id);
        return [...without, updated];
      });
    }
    persistArchivedIds(nextArchived);
  }

  async function remove(taskId: string) {
    const ok = confirm("Delete this task?");
    if (!ok) return;
    const res = await deleteTask(taskId);
    if (!(res as any)?.error) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setArchived((prev) => prev.filter((t) => t.id !== taskId));
      const next = new Set(archivedIds);
      next.delete(taskId);
      persistArchivedIds(next);
    }
  }

  function archiveCompletedLocally() {
    const completed = tasks.filter((t) => t.status === "completed");
    if (completed.length === 0) return;
    setTasks((prev) => prev.filter((t) => t.status !== "completed"));
    setArchived((prev) => [...prev, ...completed]);
    const next = new Set(archivedIds);
    completed.forEach((t) => next.add(t.id));
    persistArchivedIds(next);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">All Tasks</CardTitle>
          <CardDescription>Sorted by due date</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {tasks.length} Active
          </Badge>
          <Badge variant="outline" className="text-xs">
            {archived.length} Archived
          </Badge>
          <button
            onClick={archiveCompletedLocally}
            className="text-sm text-primary hover:underline"
          >
            Archive completed
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : tasks.length === 0 && archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks found.</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {tasks.map((task) => {
              const StatusIcon = (statusIcons as any)[task.status] || Circle;
              const priorityInfo = (priorityConfig as any)[task.priority];
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
              const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={task.id} className="border rounded-lg p-4 bg-white dark:bg-white/90">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleComplete(task)} className="mt-1 flex-shrink-0">
                      <StatusIcon className={`h-6 w-6 ${task.status === "completed" ? "text-green-600" : priorityInfo?.icon || "text-slate-400"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-semibold text-base ${task.status === "completed" ? "line-through opacity-60" : ""} text-slate-900`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-slate-700 mt-1">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select value={task.status} onValueChange={(val) => changeStatus(task, val as any)}>
                            <SelectTrigger className="w-[140px]">
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
                          <button onClick={() => remove(task.id)} className="text-muted-foreground hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge className={priorityInfo?.badge || "bg-slate-100 text-slate-800"}>
                          {task.priority === "urgent" && <Zap className="h-3 w-3 mr-1" />}
                          {task.priority === "high" && <Flag className="h-3 w-3 mr-1" />}
                          {task.priority === "medium" && <Clock className="h-3 w-3 mr-1" />}
                          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)} Priority
                        </Badge>
                        {task.due_date && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${isOverdue ? "bg-red-100 text-red-800 font-semibold" : "bg-slate-100 text-slate-600"}`}>
                            <Clock className="h-3 w-3" />
                            {isOverdue ? `Overdue ${Math.abs(daysUntilDue || 0)} days` : `${daysUntilDue === 0 ? "Today" : `${daysUntilDue} days`}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {archived.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Archived (completed)
                </p>
                <div className="space-y-3">
                  {archived.map((task) => {
                    const StatusIcon = (statusIcons as any)[task.status] || Circle;
                    const priorityInfo = (priorityConfig as any)[task.priority];
                    const isOverdue = false;
                    const daysUntilDue = null;
                    return (
                      <div key={task.id} className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleComplete(task)} className="mt-1 flex-shrink-0">
                            <StatusIcon className={`h-6 w-6 ${"text-green-600"}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-base text-slate-900 line-through opacity-60">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-slate-700 mt-1">{task.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Select value={task.status} onValueChange={(val) => changeStatus(task, val as any)}>
                                  <SelectTrigger className="w-[140px]">
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
                                <button onClick={() => remove(task.id)} className="text-muted-foreground hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <Badge className={priorityInfo?.badge || "bg-slate-100 text-slate-800"}>
                                Completed
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
