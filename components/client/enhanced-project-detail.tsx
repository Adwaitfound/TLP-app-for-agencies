"use client"

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    Download, CheckCircle2, AlertTriangle, Clock, Calendar, FileText,
    MessageSquare, Users, TrendingUp, Eye, Play, Pause, CheckSquare,
    XCircle, ArrowLeft, IndianRupee, Activity, ListTodo, Plus,
    Package, Target, Zap, FileCheck, ShieldCheck, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { ClientHeader } from '@/components/dashboard/client-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { useRouter } from 'next/navigation'

interface ClientProjectDetailProps {
    projectId: string
}

export default function EnhancedClientProjectDetail({ projectId }: ClientProjectDetailProps) {
    const { user } = useAuth()
    const router = useRouter()
    const [project, setProject] = useState<any | null>(null)
    const [files, setFiles] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [comments, setComments] = useState<any[]>([])
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [milestones, setMilestones] = useState<any[]>([])
    const [subProjects, setSubProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    // Task Request Dialog State
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [taskSubmitting, setTaskSubmitting] = useState(false)
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        estimatedHours: ''
    })

    // Comment State
    const [commentText, setCommentText] = useState('')
    const [commentSubmitting, setCommentSubmitting] = useState(false)
    const [restrictAccess, setRestrictAccess] = useState(false)

    useEffect(() => {
        async function fetchProjectData() {
            if (!user || !projectId) return
            const supabase = createClient()

            try {
                // Fetch project details
                const { data: proj, error: projErr } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .eq('id', projectId)
                    .single()

                if (projErr) {
                    console.error('Error fetching project:', projErr.message || projErr)
                    throw projErr
                }
                setProject(proj)

                // Fetch team members
                const { data: teamData, error: teamErr } = await supabase
                    .from('project_team')
                    .select('user_id, users!user_id(id, full_name, email, role)')
                    .eq('project_id', projectId)

                if (teamErr) console.error('Error fetching team:', teamErr.message || teamErr)
                setTeamMembers(teamData || [])

                // Fetch files/deliverables
                const { data: filesData, error: filesErr } = await supabase
                    .from('project_files')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })

                if (filesErr) console.error('Error fetching files:', filesErr.message || filesErr)
                setFiles(filesData || [])

                // Fetch milestones
                const { data: milestonesData, error: milestonesErr } = await supabase
                    .from('milestones')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('due_date', { ascending: true })

                if (milestonesErr) console.error('Error fetching milestones:', milestonesErr.message || milestonesErr)
                setMilestones(milestonesData || [])

                // Fetch sub-projects (tasks)
                const { data: subProjectsData, error: subProjectsErr } = await supabase
                    .from('sub_projects')
                    .select('*, assigned_to_user:users!assigned_to(full_name, email)')
                    .eq('parent_project_id', projectId)
                    .order('created_at', { ascending: false })

                if (subProjectsErr) console.error('Error fetching sub-projects:', subProjectsErr.message || subProjectsErr)
                setSubProjects(subProjectsData || [])

                // Fetch comments
                const { data: commentsData, error: commentsErr } = await supabase
                    .from('project_comments')
                    .select('*, user:users!user_id(full_name, email, role)')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })

                if (commentsErr) console.error('Error fetching comments:', commentsErr.message || commentsErr)
                setComments(commentsData || [])

                // Fetch invoices
                const { data: invData, error: invErr } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('due_date', { ascending: true })

                if (invErr) console.error('Error fetching invoices:', invErr.message || invErr)
                setInvoices(invData || [])

                // Check access restrictions
                const restr = (invData || []).some(inv =>
                    inv.status !== 'paid' &&
                    inv.due_date &&
                    (new Date(inv.due_date).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000)
                )
                setRestrictAccess(restr)

            } catch (e: any) {
                console.error('Error fetching project data:', {
                    message: e?.message,
                    error: e?.error,
                    details: e?.details,
                    hint: e?.hint,
                    code: e?.code,
                    full: e
                })
            } finally {
                setLoading(false)
            }
        }

        fetchProjectData()
    }, [projectId, user?.id])

    // Calculate deliverables stats
    const deliverablesStats = useMemo(() => {
        const total = files.length
        const completed = files.filter(f => f.status === 'approved' || f.status === 'delivered').length
        const pending = total - completed
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

        return { total, completed, pending, completionRate }
    }, [files])

    // Calculate budget stats
    const budgetStats = useMemo(() => {
        const totalBudget = project?.budget || 0
        const spent = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)
        const remaining = totalBudget - spent
        const spentPercentage = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0

        return { totalBudget, spent, remaining, spentPercentage }
    }, [project, invoices])

    // Get today's activity
    const todaysActivity = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayFiles = files.filter(f => new Date(f.created_at) >= today)
        const todayComments = comments.filter(c => new Date(c.created_at) >= today)
        const todayTasks = subProjects.filter(t =>
            new Date(t.updated_at || t.created_at) >= today
        )

        return {
            filesUploaded: todayFiles.length,
            commentsAdded: todayComments.length,
            tasksUpdated: todayTasks.length,
            activities: [
                ...todayFiles.map(f => ({ type: 'file', data: f, time: f.created_at })),
                ...todayComments.map(c => ({ type: 'comment', data: c, time: c.created_at })),
                ...todayTasks.map(t => ({ type: 'task', data: t, time: t.updated_at || t.created_at }))
            ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        }
    }, [files, comments, subProjects])

    const handleSubmitTaskRequest = async () => {
        if (!taskFormData.title.trim()) return

        setTaskSubmitting(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('sub_projects')
                .insert({
                    parent_project_id: projectId,
                    name: taskFormData.title,
                    description: taskFormData.description,
                    status: 'planning',
                    created_by: user?.id,
                    // Add metadata for client-requested tasks
                    metadata: {
                        client_requested: true,
                        priority: taskFormData.priority,
                        estimated_hours: taskFormData.estimatedHours ? parseInt(taskFormData.estimatedHours) : null,
                        requested_at: new Date().toISOString()
                    }
                })

            if (error) throw error

            // Refresh sub-projects
            const { data: updatedSubProjects } = await supabase
                .from('sub_projects')
                .select('*, assigned_to_user:users!assigned_to(full_name, email)')
                .eq('parent_project_id', projectId)
                .order('created_at', { ascending: false })

            setSubProjects(updatedSubProjects || [])
            setIsTaskDialogOpen(false)
            setTaskFormData({ title: '', description: '', priority: 'medium', estimatedHours: '' })
        } catch (e) {
            console.error('Error submitting task request:', e)
        } finally {
            setTaskSubmitting(false)
        }
    }

    const handleSubmitComment = async () => {
        if (!commentText.trim() || commentSubmitting) return

        setCommentSubmitting(true)
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('project_comments')
                .insert({
                    project_id: projectId,
                    user_id: user!.id,
                    comment_text: commentText.trim(),
                    status: 'pending'
                })
                .select('*, user:users!user_id(full_name, email, role)')
                .single()

            if (error) throw error
            setComments(prev => [data, ...prev])
            setCommentText('')
        } catch (e) {
            console.error('Error submitting comment:', e)
        } finally {
            setCommentSubmitting(false)
        }
    }

    const handleApproveProject = async () => {
        const supabase = createClient()
        const { error } = await supabase
            .from('projects')
            .update({
                client_approved: true,
                client_approved_at: new Date().toISOString()
            })
            .eq('id', projectId)

        if (!error) {
            setProject((p: any) => ({
                ...p,
                client_approved: true,
                client_approved_at: new Date().toISOString()
            }))
        }
    }

    if (loading || !project) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <ClientHeader />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <div className="flex items-center justify-center h-96">
                        <p className="text-muted-foreground">Loading project details...</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <ClientHeader />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                            <p className="text-muted-foreground">{project.clients?.company_name}</p>
                        </div>
                        <StatusBadge status={project.status} />
                    </div>

                    {restrictAccess && (
                        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <p className="text-sm text-destructive font-medium">
                                Access restricted: invoice overdue by 30+ days. Please settle dues to continue.
                            </p>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Progress</p>
                                        <p className="text-2xl font-bold">{project.progress_percentage || 0}%</p>
                                    </div>
                                    <TrendingUp className="h-8 w-8 text-primary" />
                                </div>
                                <Progress value={project.progress_percentage || 0} className="mt-2" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Deliverables</p>
                                        <p className="text-2xl font-bold">{deliverablesStats.completed}/{deliverablesStats.total}</p>
                                    </div>
                                    <Package className="h-8 w-8 text-green-600" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {deliverablesStats.completionRate}% complete
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Budget</p>
                                        <p className="text-2xl font-bold">₹{budgetStats.remaining.toLocaleString()}</p>
                                    </div>
                                    <IndianRupee className="h-8 w-8 text-blue-600" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {budgetStats.spentPercentage}% spent
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team</p>
                                        <p className="text-2xl font-bold">{teamMembers.length}</p>
                                    </div>
                                    <Users className="h-8 w-8 text-purple-600" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Active members
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="team">Team</TabsTrigger>
                        <TabsTrigger value="budget">Budget</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Project Description */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Project Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {project.description || 'No description provided'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        {project.start_date && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Start Date</p>
                                                <p className="text-sm font-medium">
                                                    {new Date(project.start_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {project.deadline && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Deadline</p>
                                                <p className="text-sm font-medium">
                                                    {new Date(project.deadline).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Today's Activity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Today's Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Files Uploaded</span>
                                            <Badge variant="outline">{todaysActivity.filesUploaded}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Comments Added</span>
                                            <Badge variant="outline">{todaysActivity.commentsAdded}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Tasks Updated</span>
                                            <Badge variant="outline">{todaysActivity.tasksUpdated}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Activity Feed */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest updates on this project</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {todaysActivity.activities.slice(0, 10).map((activity, idx) => (
                                        <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                                            {activity.type === 'file' && <FileText className="h-5 w-5 text-blue-600 mt-0.5" />}
                                            {activity.type === 'comment' && <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />}
                                            {activity.type === 'task' && <CheckSquare className="h-5 w-5 text-purple-600 mt-0.5" />}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    {activity.type === 'file' && `File uploaded: ${activity.data.file_name}`}
                                                    {activity.type === 'comment' && `Comment: ${activity.data.comment_text?.slice(0, 50)}...`}
                                                    {activity.type === 'task' && `Task updated: ${activity.data.name}`}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(activity.time).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {todaysActivity.activities.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No activity today
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Milestones */}
                        {milestones.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Project Milestones</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {milestones.map((milestone) => (
                                            <div key={milestone.id} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div className="flex items-center gap-3">
                                                    {milestone.status === 'completed' ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    ) : milestone.status === 'in_progress' ? (
                                                        <Play className="h-5 w-5 text-blue-600" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{milestone.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Due: {new Date(milestone.due_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={milestone.status} />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Deliverables Tab */}
                    <TabsContent value="deliverables" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Deliverables</CardTitle>
                                        <CardDescription>
                                            {deliverablesStats.completed} of {deliverablesStats.total} completed
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{deliverablesStats.completionRate}%</p>
                                        <p className="text-xs text-muted-foreground">Complete</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {files.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors">
                                            <div className="flex items-center gap-3 flex-1">
                                                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{file.file_name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Uploaded {new Date(file.created_at).toLocaleDateString()}</span>
                                                        {file.file_size && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {file.status && (
                                                    <Badge variant={file.status === 'approved' ? 'default' : 'secondary'}>
                                                        {file.status}
                                                    </Badge>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={restrictAccess}
                                                    onClick={() => window.open(file.file_url, '_blank')}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={restrictAccess}
                                                    onClick={() => window.open(file.file_url, '_blank')}
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {files.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No deliverables yet
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Project Tasks</CardTitle>
                                        <CardDescription>{subProjects.length} total tasks</CardDescription>
                                    </div>
                                    <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Request Task
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Request New Task</DialogTitle>
                                                <DialogDescription>
                                                    Submit a task request. It will be reviewed and assigned by the team.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="task-title">Task Title *</Label>
                                                    <Input
                                                        id="task-title"
                                                        value={taskFormData.title}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                                        placeholder="e.g., Add logo animation"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="task-description">Description</Label>
                                                    <Textarea
                                                        id="task-description"
                                                        value={taskFormData.description}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                                        placeholder="Describe what needs to be done..."
                                                        rows={4}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="task-priority">Priority</Label>
                                                        <select
                                                            id="task-priority"
                                                            value={taskFormData.priority}
                                                            onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                        >
                                                            <option value="low">Low</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="high">High</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="task-hours">Estimated Hours</Label>
                                                        <Input
                                                            id="task-hours"
                                                            type="number"
                                                            value={taskFormData.estimatedHours}
                                                            onChange={(e) => setTaskFormData({ ...taskFormData, estimatedHours: e.target.value })}
                                                            placeholder="e.g., 4"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleSubmitTaskRequest}
                                                    disabled={!taskFormData.title.trim() || taskSubmitting}
                                                >
                                                    {taskSubmitting ? 'Submitting...' : 'Submit Request'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {subProjects.map((task) => (
                                        <div key={task.id} className="p-4 rounded-lg border">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{task.name}</p>
                                                        {task.metadata?.client_requested && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <Target className="h-3 w-3 mr-1" />
                                                                Client Request
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                                    )}
                                                </div>
                                                <StatusBadge status={task.status} />
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {task.assigned_to_user && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {task.assigned_to_user.full_name}
                                                    </span>
                                                )}
                                                {task.due_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Due {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {task.metadata?.priority && (
                                                    <Badge
                                                        variant={
                                                            task.metadata.priority === 'high' ? 'destructive' :
                                                                task.metadata.priority === 'medium' ? 'default' :
                                                                    'secondary'
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {task.metadata.priority}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {subProjects.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No tasks yet. Request a task to get started.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Project Timeline</CardTitle>
                                <CardDescription>All activity and updates</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[...files, ...comments, ...subProjects]
                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map((item, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        {'file_name' in item && <FileText className="h-5 w-5 text-primary" />}
                                                        {'comment_text' in item && <MessageSquare className="h-5 w-5 text-green-600" />}
                                                        {'parent_project_id' in item && <ListTodo className="h-5 w-5 text-purple-600" />}
                                                    </div>
                                                    {idx < [...files, ...comments, ...subProjects].length - 1 && (
                                                        <div className="w-0.5 h-full bg-border flex-1 mt-2" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <p className="font-medium text-sm">
                                                        {'file_name' in item && `File uploaded: ${item.file_name}`}
                                                        {'comment_text' in item && 'New comment added'}
                                                        {'parent_project_id' in item && `Task created: ${item.name}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(item.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Team Tab */}
                    <TabsContent value="team" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Project Team</CardTitle>
                                <CardDescription>{teamMembers.length} team members</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {teamMembers.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-4 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{member.users?.full_name || 'Team Member'}</p>
                                                    <p className="text-sm text-muted-foreground">{member.users?.email}</p>
                                                </div>
                                            </div>
                                            <Badge>{member.users?.role || 'Member'}</Badge>
                                        </div>
                                    ))}
                                    {teamMembers.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No team members assigned yet
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Budget Tab */}
                    <TabsContent value="budget" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-sm text-muted-foreground">Total Budget</p>
                                    <p className="text-3xl font-bold">₹{budgetStats.totalBudget.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-sm text-muted-foreground">Spent</p>
                                    <p className="text-3xl font-bold text-red-600">₹{budgetStats.spent.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{budgetStats.spentPercentage}% of budget</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-sm text-muted-foreground">Remaining</p>
                                    <p className="text-3xl font-bold text-green-600">₹{budgetStats.remaining.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{100 - budgetStats.spentPercentage}% available</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Budget Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>Budget Utilization</span>
                                            <span className="font-medium">{budgetStats.spentPercentage}%</span>
                                        </div>
                                        <Progress value={budgetStats.spentPercentage} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Invoices</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {invoices.map((invoice) => (
                                        <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div>
                                                <p className="font-medium">{invoice.invoice_number}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Due: {new Date(invoice.due_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold">₹{invoice.total?.toLocaleString()}</p>
                                                <StatusBadge status={invoice.status} />
                                            </div>
                                        </div>
                                    ))}
                                    {invoices.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No invoices yet
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Comments Section - Always visible at bottom */}
                <Card>
                    <CardHeader>
                        <CardTitle>Comments & Discussions</CardTitle>
                        <CardDescription>Communicate with the project team</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add your comment or feedback..."
                                rows={3}
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSubmitComment}
                                    disabled={!commentText.trim() || commentSubmitting}
                                >
                                    {commentSubmitting ? 'Posting...' : 'Post Comment'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {comments.map((comment) => {
                                const isAdmin = (comment.user?.role || '').toLowerCase().includes('admin')
                                const roleLabel = isAdmin ? 'Admin' : 'Client'
                                const containerClasses = `p-4 rounded-lg border border-l-4 ${isAdmin
                                    ? 'border-blue-300 bg-blue-100/70 dark:border-blue-700 dark:bg-blue-900/40 border-l-blue-500'
                                    : 'border-emerald-300 bg-emerald-100/70 dark:border-emerald-700 dark:bg-emerald-900/40 border-l-emerald-500'
                                    }`

                                return (
                                    <div key={comment.id} className={containerClasses}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {isAdmin ? (
                                                        <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                    )}
                                                    <p className="font-medium text-sm">
                                                        {comment.user?.full_name || comment.user?.email || 'User'}
                                                    </p>
                                                    <Badge variant={isAdmin ? 'default' : 'outline'} className="text-xs">
                                                        {roleLabel}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm">{comment.comment_text}</p>
                                    </div>
                                )
                            })}
                            {comments.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No comments yet. Be the first to comment!
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Approval Section */}
                {!project.client_approved && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-lg">Ready to Approve?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Approve this project when you're satisfied with the deliverables
                                    </p>
                                </div>
                                <Button onClick={handleApproveProject} size="lg">
                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                    Approve Project
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {project.client_approved && (
                    <Card className="border-green-500/20 bg-green-500/5">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                                <div>
                                    <p className="font-semibold text-lg">Project Approved</p>
                                    <p className="text-sm text-muted-foreground">
                                        Approved on {new Date(project.client_approved_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
