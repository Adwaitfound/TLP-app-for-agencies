"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  Plus,
  Trash2,
  Loader2,
  CheckSquare,
  Users,
  Clock,
} from "lucide-react";

interface SaasProject {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  description: string;
  service_type: string;
  status: string;
  budget: number;
  start_date: string;
  deadline: string;
  progress_percentage: number;
  saas_clients?: {
    id: string;
    company_name: string;
  };
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  due_date: string;
  completed_at?: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  saas_users?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organization, isAdmin } = useOrg();
  const supabase = createClient();
  const projectId = params.id as string;

  const [project, setProject] = useState<SaasProject | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // New milestone form
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    due_date: "",
  });

  useEffect(() => {
    if (projectId && organization) {
      fetchProjectDetails();
      fetchMilestones();
      fetchTeamMembers();
    }
  }, [projectId, organization]);

  async function fetchProjectDetails() {
    const { data, error } = await supabase
      .from("saas_projects")
      .select(
        `
        *,
        saas_clients (
          id,
          company_name
        )
      `
      )
      .eq("id", projectId)
      .eq("org_id", organization?.id)
      .single();

    if (!error && data) {
      setProject(data);
    }
    setLoading(false);
  }

  async function fetchMilestones() {
    const { data } = await supabase
      .from("saas_project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });

    if (data) {
      setMilestones(data);
    }
  }

  async function fetchTeamMembers() {
    const { data } = await supabase
      .from("saas_project_team")
      .select(
        `
        *,
        saas_users:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("project_id", projectId);

    if (data) {
      setTeamMembers(data);
    }
  }

  async function handleAddMilestone() {
    if (!newMilestone.title || !newMilestone.due_date) return;

    const { error } = await supabase.from("saas_project_milestones").insert({
      project_id: projectId,
      title: newMilestone.title,
      description: newMilestone.description,
      due_date: newMilestone.due_date,
      status: "pending",
    });

    if (!error) {
      setNewMilestone({ title: "", description: "", due_date: "" });
      fetchMilestones();
    }
  }

  async function handleUpdateMilestoneStatus(
    milestoneId: string,
    newStatus: string
  ) {
    const updates: any = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("saas_project_milestones")
      .update(updates)
      .eq("id", milestoneId);

    if (!error) {
      fetchMilestones();
    }
  }

  async function handleDeleteMilestone(milestoneId: string) {
    const { error } = await supabase
      .from("saas_project_milestones")
      .delete()
      .eq("id", milestoneId);

    if (!error) {
      fetchMilestones();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-8">
        <p>Project not found</p>
      </div>
    );
  }

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/v2/projects")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-muted-foreground">
              Client: {project.saas_clients?.company_name || "No client"}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {project.status}
          </Badge>
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
                  ₹{project.budget.toLocaleString("en-IN")}
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

      {/* Tabs */}
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
                      value={newMilestone.title}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          title: e.target.value,
                        })
                      }
                      placeholder="Milestone title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="milestone-desc">Description</Label>
                    <Textarea
                      id="milestone-desc"
                      value={newMilestone.description}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          description: e.target.value,
                        })
                      }
                      placeholder="Milestone description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="milestone-date">Due Date</Label>
                    <Input
                      id="milestone-date"
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          due_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button onClick={handleAddMilestone} disabled={!newMilestone.title.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
              </div>

              {/* Milestones list */}
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No milestones yet</p>
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
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <span>
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </span>
                            {milestone.completed_at && (
                              <span>
                                Completed:{" "}
                                {new Date(milestone.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={milestone.status}
                            onValueChange={(value) =>
                              handleUpdateMilestoneStatus(milestone.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
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
              <CardDescription>Manage project team members</CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team members assigned
                </p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={member.saas_users?.avatar_url}
                            alt={member.saas_users?.full_name}
                          />
                          <AvatarFallback>
                            {member.saas_users?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.saas_users?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.saas_users?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
