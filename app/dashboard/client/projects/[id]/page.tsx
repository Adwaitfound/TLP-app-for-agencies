"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    ArrowLeft, Video, FileText, MessageSquare, Download,
    Send, Clock, Calendar, User, Loader2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { StatusBadge } from "@/components/shared/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Comment {
    id: string
    comment_text: string
    created_at: string
    user: {
        full_name: string
        email: string
    }
}

export default function ClientProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [project, setProject] = useState<any>(null)
    const [subProjects, setSubProjects] = useState<any[]>([])
    const [files, setFiles] = useState<any[]>([])
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [newComment, setNewComment] = useState("")
    const [submittingComment, setSubmittingComment] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [hasFetched, setHasFetched] = useState(false)

    const supabase = useMemo(() => createClient(), [])
    const projectId = params.id as string

    useEffect(() => {
        let mounted = true

        async function fetchProjectDetails() {
            if (!user || !projectId || hasFetched) {
                if (!user) setLoading(false)
                return
            }

            setHasFetched(true)

            try {
                // First, get the client record to verify ownership
                const { data: clientRecord, error: clientError } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!mounted) return

                if (clientError) {
                    console.error('Error fetching client record:', clientError)
                    throw new Error('Failed to verify client account')
                }

                if (!clientRecord) {
                    console.error('No client record found for user:', user.id)
                    throw new Error('Client account not found')
                }

                // Fetch project details with client verification
                const { data: projectData, error: projectError } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .eq('id', projectId)
                    .eq('client_id', clientRecord.id)
                    .maybeSingle()

                if (!mounted) return

                if (projectError) {
                    console.error('Error fetching project:', projectError)
                    throw projectError
                }

                if (!projectData) {
                    console.error('Project not found or access denied')
                    setLoading(false)
                    return
                }

                setProject(projectData)

                // Fetch sub-projects
                const { data: subProjectsData, error: subProjectsError } = await supabase
                    .from('sub_projects')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })

                if (mounted && !subProjectsError) {
                    setSubProjects(subProjectsData || [])
                }

                // Fetch project files
                const { data: filesData, error: filesError } = await supabase
                    .from('project_files')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })

                if (mounted && !filesError) {
                    setFiles(filesData || [])
                }

                // Fetch comments
                const { data: commentsData, error: commentsError } = await supabase
                    .from('project_comments')
                    .select('*, user:users!user_id(full_name, email)')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })

                if (mounted && !commentsError) {
                    setComments(commentsData || [])
                }

            } catch (error: any) {
                if (mounted) {
                    console.error('Error fetching project details:', {
                        message: error?.message,
                        details: error?.details,
                        hint: error?.hint,
                        code: error?.code
                    })
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        fetchProjectDetails()

        return () => {
            mounted = false
        }
    }, [projectId, user?.id, supabase, hasFetched])

    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || !user || submittingComment) return

        setSubmittingComment(true)
        try {
            const { data, error } = await supabase
                .from('project_comments')
                .insert({
                    project_id: projectId,
                    user_id: user.id,
                    comment_text: newComment.trim(),
                    status: 'pending'
                })
                .select('*, user:users!user_id(full_name, email)')
                .single()

            if (error) throw error

            setComments(prev => [data, ...prev])
            setNewComment("")
        } catch (error) {
            console.error('Error submitting comment:', error)
            alert('Failed to submit comment. Please try again.')
        } finally {
            setSubmittingComment(false)
        }
    }, [newComment, user, projectId, supabase, submittingComment])

    const downloadFile = useCallback(async (file: any) => {
        try {
            if (file.storage_type === 'google_drive') {
                window.open(file.file_url, '_blank')
            } else {
                const { data, error } = await supabase.storage
                    .from('project-files')
                    .createSignedUrl(file.file_url, 3600)

                if (error) throw error
                window.open(data.signedUrl, '_blank')
            }
        } catch (error) {
            console.error('Error downloading file:', error)
            alert('Failed to download file. Please try again.')
        }
    }, [supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
                    <p className="text-muted-foreground mb-4">
                        This project doesn't exist or you don't have permission to view it.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Go Back
                    </Button>
                    <Button onClick={() => router.push('/dashboard/client')}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                </div>
                <StatusBadge status={project.status} />
            </div>

            {/* Project Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Progress</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{project.progress_percentage || 0}%</div>
                        <Progress value={project.progress_percentage || 0} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Deadline</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {project.deadline
                                ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Not set'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {project.deadline
                                ? `${Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                : 'No deadline'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Videos</CardTitle>
                        <Video className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {subProjects.filter(sp => sp.video_url).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Available to review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Comments</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{comments.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total discussions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="videos">Videos</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground">Description</Label>
                                <p className="mt-1">{project.description || 'No description provided'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Status</Label>
                                <div className="mt-1">
                                    <StatusBadge status={project.status} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Created</Label>
                                <p className="mt-1">
                                    {new Date(project.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sub-Projects Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tasks ({subProjects.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {subProjects.map((subProject) => (
                                    <div key={subProject.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex-1">
                                            <p className="font-medium">{subProject.name}</p>
                                            <p className="text-sm text-muted-foreground">{subProject.description}</p>
                                        </div>
                                        <StatusBadge status={subProject.status} />
                                    </div>
                                ))}
                                {subProjects.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Videos</CardTitle>
                            <CardDescription>Watch and review video deliverables</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {subProjects
                                .filter(sp => sp.video_url)
                                .map((subProject) => (
                                    <div key={subProject.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-lg">{subProject.name}</h3>
                                                <p className="text-sm text-muted-foreground">{subProject.description}</p>
                                            </div>
                                            <StatusBadge status={subProject.status} />
                                        </div>
                                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                            <video
                                                src={subProject.video_url}
                                                controls
                                                className="w-full h-full"
                                                preload="metadata"
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                        {subProject.due_date && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>Due: {new Date(subProject.due_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            {subProjects.filter(sp => sp.video_url).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Video className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No videos available yet</h3>
                                    <p className="text-sm text-muted-foreground">Videos will appear here once uploaded by the team</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Files</CardTitle>
                            <CardDescription>Download deliverables and documents</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{file.file_name}</p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>{file.file_category || 'General'}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(file.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                    {file.file_size && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => downloadFile(file)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                ))}
                                {files.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No files available</h3>
                                        <p className="text-sm text-muted-foreground">Files will appear here once uploaded</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Comment</CardTitle>
                            <CardDescription>Share your feedback or ask questions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Textarea
                                    placeholder="Type your comment here..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    rows={4}
                                />
                                <Button
                                    onClick={handleSubmitComment}
                                    disabled={!newComment.trim() || submittingComment}
                                >
                                    {submittingComment ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Submit Comment
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>All Comments ({comments.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="p-4 rounded-lg border space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{comment.user.full_name}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(comment.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-sm">{comment.comment_text}</p>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
                                        <p className="text-sm text-muted-foreground">Be the first to comment on this project</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
