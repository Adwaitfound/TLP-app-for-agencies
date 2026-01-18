"use client";

import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Loader2,
  FolderKanban,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/org-context";

interface Project {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: "planning" | "in_progress" | "in_review" | "completed" | "cancelled";
  service_type: "social_media" | "video_production" | "design_branding";
  budget: number | null;
  start_date: string | null;
  deadline: string | null;
  progress_percentage: number;
  thumbnail_url: string | null;
  drive_folder_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  saas_clients?: { company_name: string; contact_person: string };
}

interface Client {
  id: string;
  org_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: string;
}

type ProjectStatus = Project["status"];
type ServiceType = Project["service_type"];

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: "secondary" | "default" | "destructive" }
> = {
  planning: { label: "Planning", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  in_review: { label: "In Review", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string; icon: string }[] = [
  { value: "video_production", label: "Video Production", icon: "🎬" },
  { value: "social_media", label: "Social Media", icon: "📱" },
  { value: "design_branding", label: "Design & Branding", icon: "🎨" },
];

export default function V2ProjectsPage() {
  const { organization, member, isLoading: orgLoading } = useOrg();
  const supabase = useMemo(() => createClient(), []);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

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

  const isAdmin = member?.role === "admin";
  const isMember = member?.role === "admin" || member?.role === "member";

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Fetch projects for this org
      const { data: projectsData, error: projectsError } = await supabase
        .from("saas_projects")
        .select("*, saas_clients(company_name, contact_person)")
        .eq("org_id", organization.id)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch clients for this org
      const { data: clientsData, error: clientsError } = await supabase
        .from("saas_clients")
        .select("*")
        .eq("org_id", organization.id)
        .eq("status", "active")
        .order("company_name");

      if (clientsError) throw clientsError;

      setProjects(projectsData || []);
      setClients(clientsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      showToast(error.message || "Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  }, [organization?.id, supabase, showToast]);

  useEffect(() => {
    if (orgLoading) return;
    void fetchData();
  }, [orgLoading, fetchData]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Filter by service type
    if (serviceFilter !== "all") {
      filtered = filtered.filter((p) => p.service_type === serviceFilter);
    }

    // Filter by search query
    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.saas_clients?.company_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [projects, statusFilter, serviceFilter, deferredSearchQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || submitting) return;

    setSubmitting(true);

    try {
      const { data, error} = await supabase
        .from("saas_projects")
        .insert([
          {
            org_id: organization.id,
            name: formData.name,
            client_id: formData.client_id,
            description: formData.description,
            service_type: formData.service_type,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            start_date: formData.start_date || null,
            deadline: formData.deadline || null,
            status: formData.status,
            progress_percentage: 0,
            created_by: member?.user_id || null,
          },
        ])
        .select();

      if (error) throw error;

      setFormData({
        name: "",
        client_id: "",
        description: "",
        service_type: "video_production",
        budget: "",
        start_date: "",
        deadline: "",
        status: "planning",
      });
      setIsDialogOpen(false);
      showToast("Project created successfully", "success");
      await fetchData();
    } catch (error: any) {
      console.error("Error creating project:", error);
      showToast(error.message || "Failed to create project", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || !selectedProject || submitting) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("saas_projects")
        .update({
          name: editFormData.name,
          client_id: editFormData.client_id,
          description: editFormData.description,
          service_type: editFormData.service_type,
          budget: editFormData.budget ? parseFloat(editFormData.budget) : null,
          start_date: editFormData.start_date || null,
          deadline: editFormData.deadline || null,
          status: editFormData.status,
          progress_percentage: editFormData.progress_percentage,
        })
        .eq("org_id", organization.id)
        .eq("id", selectedProject.id);

      if (error) throw error;

      setIsEditDialogOpen(false);
      setSelectedProject(null);
      showToast("Project updated successfully", "success");
      await fetchData();
    } catch (error: any) {
      console.error("Error updating project:", error);
      showToast(error.message || "Failed to update project", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!organization?.id) return;
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const { error } = await supabase
        .from("saas_projects")
        .delete()
        .eq("org_id", organization.id)
        .eq("id", projectId);

      if (error) throw error;

      showToast("Project deleted successfully", "success");
      await fetchData();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      showToast(error.message || "Failed to delete project", "error");
    }
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

  if (orgLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md space-y-2 text-center">
          <h2 className="text-xl font-semibold">Access restricted</h2>
          <p className="text-sm text-muted-foreground">
            Only admin and members can manage projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg text-sm text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage your projects and deliverables</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter((p) => p.status === "in_progress").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter((p) => p.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No projects found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" || serviceFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first project to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && serviceFilter === "all" && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-1">
                      {project.saas_clients?.company_name}
                    </CardDescription>
                  </div>
                  <Badge variant={statusConfig[project.status].variant}>
                    {statusConfig[project.status].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {SERVICE_TYPE_OPTIONS.find((s) => s.value === project.service_type)?.icon}
                  </span>
                  <span>
                    {SERVICE_TYPE_OPTIONS.find((s) => s.value === project.service_type)?.label}
                  </span>
                </div>

                {project.budget && (
                  <div className="flex items-center gap-2 text-sm">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      ₹{project.budget.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {project.deadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress_percentage}%</span>
                  </div>
                  <Progress value={project.progress_percentage} />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProject(project);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project for your organization
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter project name"
                  required
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
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
                <Label htmlFor="service_type">Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value: ServiceType) =>
                    setFormData({ ...formData, service_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget (₹)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    placeholder="50000"
                    min="0"
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
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
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar structure */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  required
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
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="edit-service">Service Type *</Label>
                <Select
                  value={editFormData.service_type}
                  onValueChange={(value: ServiceType) =>
                    setEditFormData({ ...editFormData, service_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-budget">Budget (₹)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    value={editFormData.budget}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, budget: e.target.value })
                    }
                    min="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: ProjectStatus) =>
                      setEditFormData({ ...editFormData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, start_date: e.target.value })
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
                      setEditFormData({ ...editFormData, deadline: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-progress">
                  Progress: {editFormData.progress_percentage}%
                </Label>
                <Input
                  id="edit-progress"
                  type="range"
                  min="0"
                  max="100"
                  value={editFormData.progress_percentage}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      progress_percentage: parseInt(e.target.value),
                    })
                  }
                />
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
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProject.name}</DialogTitle>
                <DialogDescription>
                  {selectedProject.saas_clients?.company_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant={statusConfig[selectedProject.status].variant}>
                    {statusConfig[selectedProject.status].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {
                      SERVICE_TYPE_OPTIONS.find(
                        (s) => s.value === selectedProject.service_type
                      )?.label
                    }
                  </span>
                </div>

                {selectedProject.description && (
                  <div>
                    <h4 className="mb-2 font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedProject.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedProject.budget && (
                    <div>
                      <h4 className="mb-1 text-sm font-semibold">Budget</h4>
                      <p className="text-sm">
                        ₹{selectedProject.budget.toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}

                  {selectedProject.start_date && (
                    <div>
                      <h4 className="mb-1 text-sm font-semibold">Start Date</h4>
                      <p className="text-sm">
                        {new Date(selectedProject.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedProject.deadline && (
                    <div>
                      <h4 className="mb-1 text-sm font-semibold">Deadline</h4>
                      <p className="text-sm">
                        {new Date(selectedProject.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Progress</h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={selectedProject.progress_percentage}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium">
                        {selectedProject.progress_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
