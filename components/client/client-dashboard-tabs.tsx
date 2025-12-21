"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    FolderKanban, Download, FileText, Plus, Eye, Filter, CalendarClock,
    Search, MessageSquare, TrendingUp, Clock, CheckCircle2, Star
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { Progress } from "@/components/ui/progress"

export default function ClientDashboardTabs() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard')
    const [projects, setProjects] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [files, setFiles] = useState<any[]>([])
    const [comments, setComments] = useState<any[]>([])
    const [clientData, setClientData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
    const [favoriteProjects, setFavoriteProjects] = useState<string[]>([])

    const fetchClientData = useCallback(async () => {
        // Guard when auth still initializing
        if (!user || authLoading) {
            if (!user && !authLoading) {
                setClientData(null)
                setProjects([])
                setInvoices([])
                setFiles([])
                setComments([])
                setLoading(false)
            }
            return
        }

        setLoading(true)
        setError(null)
        const supabase = createClient()

        try {
            // Get client record
            const { data: clientRecord, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (clientError) throw clientError
            setClientData(clientRecord)

            // Fetch projects for this client
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*, clients(company_name)')
                .eq('client_id', clientRecord.id)
                .order('created_at', { ascending: false })

            if (projectsError) throw projectsError

            // Fetch invoices for this client
            const { data: invoicesData, error: invoicesError } = await supabase
                .from('invoices')
                .select('*')
                .eq('client_id', clientRecord.id)
                .order('created_at', { ascending: false })

            if (invoicesError) throw invoicesError

            const projectIds = projectsData?.map(p => p.id) || []

            // If there are no projects yet, short-circuit file/comment queries to avoid empty IN errors
            let filesData: any[] = []
            let commentsData: any[] = []
            if (projectIds.length > 0) {
                const { data: fetchedFiles, error: filesError } = await supabase
                    .from('project_files')
                    .select('*, projects(name)')
                    .in('project_id', projectIds)
                    .order('created_at', { ascending: false })

                if (filesError) throw filesError
                filesData = fetchedFiles || []

                const { data: fetchedComments, error: commentsError } = await supabase
                    .from('project_comments')
                    .select('*, projects(name), user:users!user_id(full_name, email)')
                    .in('project_id', projectIds)
                    .order('created_at', { ascending: false })

                if (commentsError) throw commentsError
                commentsData = fetchedComments || []
            }

            setProjects(projectsData || [])
            setInvoices(invoicesData || [])
            setFiles(filesData)
            setComments(commentsData)
        } catch (err: any) {
            console.error('Error fetching client data:', err)
            setError('Failed to load your dashboard. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [user?.id, authLoading])

    useEffect(() => {
        fetchClientData()
    }, [fetchClientData])

    const stats = useMemo(() => {
        const activeCount = projects.filter(p => p.status === 'in_progress' || p.status === 'in_review').length
        const completedCount = projects.filter(p => p.status === 'completed').length
        const pendingInvoicesCount = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length
        const totalSpent = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)

        return {
            activeProjects: activeCount,
            completedProjects: completedCount,
            pendingInvoices: pendingInvoicesCount,
            totalSpent,
        }
    }, [projects, invoices])

    const filteredProjects = useMemo(() => {
        let filtered = projects
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter)
        }
        if (searchQuery.trim()) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        return filtered
    }, [projects, statusFilter, searchQuery])

    const filteredInvoices = useMemo(() => {
        let filtered = invoices
        if (invoiceFilter !== 'all') {
            filtered = filtered.filter(inv => inv.status === invoiceFilter)
        }
        if (searchQuery.trim()) {
            filtered = filtered.filter(inv =>
                inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        return filtered
    }, [invoices, invoiceFilter, searchQuery])

    const filteredComments = useMemo(() => {
        if (!searchQuery.trim()) return comments
        return comments.filter(c =>
            c.comment_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [comments, searchQuery])

    const toggleFavorite = (projectId: string) => {
        setFavoriteProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        )
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="flex flex-col gap-3 py-10 items-center text-center">
                    <h2 className="text-lg font-semibold">Dashboard failed to load</h2>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button onClick={fetchClientData}>Retry</Button>
                </CardContent>
            </Card>
        )
    }

    const statsCards = [
        {
            title: "Active Projects",
            value: stats.activeProjects.toString(),
            change: `${stats.completedProjects} completed`,
            trend: "neutral" as const,
            icon: FolderKanban,
        },
        {
            title: "Total Spent",
            value: `₹${stats.totalSpent.toLocaleString()}`,
            change: "Paid invoices",
            trend: "neutral" as const,
            icon: FileText,
        },
        {
            title: "Pending Invoices",
            value: stats.pendingInvoices.toString(),
            change: "Awaiting payment",
            trend: stats.pendingInvoices > 0 ? "down" as const : "neutral" as const,
            icon: FileText,
        },
        {
            title: "Total Comments",
            value: comments.length.toString(),
            change: "Across all projects",
            trend: "neutral" as const,
            icon: MessageSquare,
        },
    ]

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, {clientData?.company_name}</h1>
                    <p className="text-muted-foreground">Manage your projects, invoices, and communications</p>
                </div>
                <Button onClick={() => router.push('/dashboard/client/request')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Request Project
                </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {statsCards.map((stat) => (
                            <StatCard key={stat.title} {...stat} />
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Recent Projects */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Projects</CardTitle>
                                <CardDescription>Your latest active projects</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {projects.slice(0, 5).map((project) => (
                                        <div
                                            key={project.id}
                                            className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                            onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-medium">{project.name}</p>
                                                <StatusBadge status={project.status} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Progress value={project.progress_percentage || 0} className="h-2 flex-1" />
                                                <span className="text-xs text-muted-foreground">{project.progress_percentage || 0}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Deliverables */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Latest Deliverables</CardTitle>
                                <CardDescription>Recently uploaded files</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {files.slice(0, 5).map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{file.file_name}</p>
                                                    <p className="text-xs text-muted-foreground">{file.projects?.name}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => router.push(`/dashboard/client/projects/${file.project_id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Projects Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <Card key={project.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{project.name}</CardTitle>
                                            <CardDescription className="mt-1 line-clamp-2">
                                                {project.description || 'No description'}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleFavorite(project.id)
                                            }}
                                        >
                                            <Star className={`h-4 w-4 ${favoriteProjects.includes(project.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <StatusBadge status={project.status} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{project.progress_percentage || 0}%</span>
                                        </div>
                                        <Progress value={project.progress_percentage || 0} className="h-2" />
                                    </div>
                                    {project.deadline && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <Button
                                        className="w-full"
                                        onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredProjects.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                                <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Invoices</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Invoices List */}
                    <div className="space-y-3">
                        {filteredInvoices.map((invoice) => (
                            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                                                <StatusBadge status={invoice.status} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                <div>Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}</div>
                                                {invoice.due_date && (
                                                    <div>Due: {new Date(invoice.due_date).toLocaleDateString()}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">₹{invoice.total?.toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {invoice.invoice_file_url && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(invoice.invoice_file_url, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4 mr-1" />
                                                        PDF
                                                    </Button>
                                                )}
                                                {invoice.status !== 'paid' && (
                                                    <Button size="sm">
                                                        Pay Now
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredInvoices.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search comments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                        {filteredComments.map((comment) => (
                            <Card key={comment.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="font-medium">{comment.projects?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                By {comment.user?.full_name || comment.user?.email || 'Unknown'} • {new Date(comment.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/client/projects/${comment.project_id}`)}
                                        >
                                            View Project
                                        </Button>
                                    </div>
                                    <p className="text-sm">{comment.comment_text}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredComments.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No comments found</h3>
                                <p className="text-sm text-muted-foreground">Comments will appear here</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
