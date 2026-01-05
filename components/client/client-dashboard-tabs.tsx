"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdDisplay } from "./ad-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Download,
  FileText,
  Plus,
  Eye,
  Search,
  MessageSquare,
  Clock,
  Star,
  ExternalLink,
  Play,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Progress } from "@/components/ui/progress";
import { debug } from "@/lib/debug";
import { getFileType, getGoogleDriveThumbnailUrl, FILE_CATEGORIES } from "@/lib/file-upload";
import { getSignedProjectFileUrl } from "@/app/actions/project-file-operations";

export default function ClientDashboardTabs() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [subProjects, setSubProjects] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [favoriteProjects, setFavoriteProjects] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [newCommentFileId, setNewCommentFileId] = useState<string | null>(null);
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Pagination states
  const [filesPaginationPage, setFilesPaginationPage] = useState(1);
  const [commentsPaginationPage, setCommentsPaginationPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  function getDrivePreviewUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split("/");
      const idx = pathParts.findIndex((p) => p === "d");
      const id = idx >= 0 ? pathParts[idx + 1] : null;
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
      const ucId = u.searchParams.get("id");
      if (ucId) return `https://drive.google.com/file/d/${ucId}/preview`;
    } catch {}
    return null;
  }

  function FileThumb({ file }: { file: any }) {
    const type = file.file_type || getFileType(file.file_name || "");
    const [failed, setFailed] = useState(false);
    const [signedSrc, setSignedSrc] = useState<string | null>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(false);
    let src: string | null = null;
    
    if (file.storage_type === "google_drive") {
      src = getGoogleDriveThumbnailUrl(file.file_url, 480);
    } else if (type === "image") {
      src = file.storage_type === "supabase" ? signedSrc ?? file.file_url : file.file_url;
    } else if (type === "video") {
      // For videos, try to load the signed URL and then extract thumbnail
      src = videoThumbnail || (file.storage_type === "supabase" ? signedSrc : file.file_url);
    }
    
    // Only fetch signed URLs when element is visible
    useEffect(() => {
      if (!isInView) return;
      
      let cancelled = false;
      async function run() {
        if (type === "image" && file.storage_type === "supabase") {
          const res = await getSignedProjectFileUrl(file.file_url, 300);
          if (!cancelled && !res.error && res.signedUrl) setSignedSrc(res.signedUrl);
          if (!cancelled && res.error) setSignedSrc(null);
        } else if (type === "video" && file.storage_type === "supabase" && !videoThumbnail) {
          const res = await getSignedProjectFileUrl(file.file_url, 300);
          if (!cancelled && !res.error && res.signedUrl) {
            setSignedSrc(res.signedUrl);
          }
        }
      }
      run();
      return () => {
        cancelled = true;
      };
    }, [file.file_url, type, file.storage_type, videoThumbnail, isInView]);

    // Intersection Observer for lazy loading
    useEffect(() => {
      const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '50px' }
      );

      const ref = document.getElementById(`file-thumb-${file.id}`);
      if (ref) {
        observer.observe(ref);
      }

      return () => observer.disconnect();
    }, [file.id]);

    if (!src || failed) {
      if (file.storage_type === "google_drive") {
        const preview = getDrivePreviewUrl(file.file_url);
        if (preview) {
          return (
            <iframe
              src={preview}
              title={file.file_name || "Drive preview"}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              loading="lazy"
            />
          );
        }
      }
      // Show appropriate icon based on file type
      const IconComponent = type === "video" ? Play : FileText;
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-muted to-muted/80">
          <IconComponent className="h-8 w-8 opacity-60 mb-2" />
          <span className="text-[10px] opacity-60">{type === "video" ? "Video" : "File"}</span>
        </div>
      );
    }
    
    // For videos, render as a video element which shows the browser's native video preview
    if (type === "video" && src) {
      return (
        <video
          src={src}
          className="w-full h-full object-cover"
          preload="metadata"
          playsInline
          muted
          onError={() => setFailed(true)}
        />
      );
    }
    
    // For images, render as img with native lazy loading
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={file.file_name || "File"} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />;
  }

  const userId = user?.id;

  const tabParam = searchParams.get("tab");

  useEffect(() => {
    const nextTab = tabParam || "dashboard";
    if (
      nextTab === "dashboard" ||
      nextTab === "projects" ||
      nextTab === "invoices" ||
      nextTab === "comments"
    ) {
      setActiveTab(nextTab);
    } else {
      setActiveTab("dashboard");
    }
  }, [tabParam]);

  const handleTabChange = (nextValue: string) => {
    const nextTab =
      nextValue === "dashboard" ||
      nextValue === "projects" ||
      nextValue === "invoices" ||
      nextValue === "comments"
        ? nextValue
        : "dashboard";

    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/dashboard/client?${params.toString()}`);
  };

  const fetchClientData = useCallback(async () => {
    // Guard when no user
    if (!userId) {
      console.log("❌ No userId available yet, skipping fetch");
      setClientData(null);
      setProjects([]);
      setInvoices([]);
      setFiles([]);
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Helper function to race a promise with a timeout
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    };

    try {
      console.log("🔄 Starting data fetch for user:", userId);
      
      // Get client record
      const clientResult = await withTimeout(
        Promise.resolve(
          supabase
            .from("clients")
            .select("id,user_id,company_name,email,status")
            .eq("user_id", userId)
            .single()
        ),
        10000 // 10 second timeout per query
      );

      const { data: clientRecord, error: clientError } = clientResult as any;

      if (clientError) {
        console.error("[1/6] Clients query failed:", clientError);
        setError(`Failed to load client info: ${clientError.message}`);
        setLoading(false);
        return;
      }
      
      if (!clientRecord) {
        console.error("[1/6] No client found for user");
        setError("No client profile found for your account");
        setLoading(false);
        return;
      }
      
      console.debug("[1/6] Clients query OK");
      setClientData(clientRecord);

      const clientId = clientRecord.id;

      // Fetch projects and invoices (by client) in parallel
      console.log("🔄 Fetching projects and invoices for client:", clientId);
      const projectsResult = await withTimeout(
        Promise.resolve(
          supabase
            .from("projects")
            .select(
              "id,name,status,description,created_at,client_id,clients(company_name)",
            )
            .eq("client_id", clientId)
            .order("created_at", { ascending: false })
        ),
        10000
      );

      const invoicesClientResult = await withTimeout(
        Promise.resolve(
          supabase
            .from("invoices")
            .select(
              "id,project_id,client_id,status,total,invoice_number,created_at,due_date,issue_date,shared_with_client",
            )
            .eq("client_id", clientId)
            .eq("shared_with_client", true)
            .order("created_at", { ascending: false })
        ),
        10000
      );

      const { data: projectsData, error: projectsError } = projectsResult as any;
      if (projectsError) {
        console.error("[2/6] Projects query failed:", projectsError);
        setError(`Failed to load projects: ${projectsError.message}`);
        setLoading(false);
        return;
      }
      console.debug("[2/6] Projects query OK:", projectsData?.length || 0);

      const projectIds = projectsData?.map((p: any) => p.id) || [];

      const { data: invoicesByClient, error: invoicesByClientError } =
        invoicesClientResult as any;
      if (invoicesByClientError) {
        console.error("[3/6] Invoices (by client) query failed:", invoicesByClientError);
        // Don't fail completely - just use empty array
        console.warn("Continuing with empty invoices array");
      }
      console.debug("[3/6] Invoices (by client) query OK:", invoicesByClient?.length || 0);

      let invoicesByProject: any[] = [];
      let filesData: any[] = [];
      let commentsData: any[] = [];
      let subProjectsData: any[] = [];

      if (projectIds.length > 0) {
        // Load initial data immediately, defer loading all files and comments
        console.log("🔄 Fetching invoices by project and files for", projectIds.length, "projects");
        
        const [invoicesByProjectRes, filesRes] = await Promise.all([
          withTimeout(
            Promise.resolve(
              supabase
                .from("invoices")
                .select(
                  "id,project_id,client_id,status,total,invoice_number,created_at,due_date,issue_date,shared_with_client",
                )
                .in("project_id", projectIds)
                .eq("shared_with_client", true)
                .order("created_at", { ascending: false })
            ),
            10000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from("project_files")
                .select("id,project_id,file_name,file_url,file_type,file_category,storage_type,created_at,description,file_size,projects(name)")
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(100) // Limit files to first 100 for faster initial load
            ),
            10000
          ),
        ]);

        const { data: fetchedInvoices, error: invoicesByProjectError } =
          invoicesByProjectRes as any;
        if (invoicesByProjectError) {
          console.error("[4/6] Invoices (by project) query failed:", invoicesByProjectError);
          setError(`Failed to load project invoices: ${invoicesByProjectError.message}`);
          setLoading(false);
          return;
        }
        console.debug("[4/6] Invoices (by project) query OK:", fetchedInvoices?.length || 0);
        invoicesByProject = fetchedInvoices || [];

        const { data: fetchedFiles, error: filesError } = filesRes as any;
        if (filesError) {
          console.error("[5a/6] Files query failed:", filesError);
          setError(`Failed to load files: ${filesError.message}`);
          setLoading(false);
          return;
        }
        console.debug("[5a/6] Files query OK:", fetchedFiles?.length || 0);
        filesData = fetchedFiles || [];

        // Load comments and sub-projects in background (non-blocking)
        Promise.all([
          withTimeout(
            Promise.resolve(
              supabase
                .from("project_comments")
                .select(
                  "id,project_id,comment_text,file_id,timestamp_seconds,created_at,projects(name),user:users!user_id(full_name,email)",
                )
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(50)
            ),
            10000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from("sub_projects")
                .select("id,project_id,title,status,due_date,created_at")
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
            ),
            10000
          ),
        ]).then(([commentsRes, subProjectsRes]) => {
          const { data: fetchedComments, error: commentsError } = commentsRes as any;
          if (!commentsError && fetchedComments) {
            console.debug("[5b/6] Comments query OK:", fetchedComments.length);
            setComments(fetchedComments);
          }

          const { data: fetchedSubProjects, error: subProjectsError } = subProjectsRes as any;
          if (subProjectsError) {
            console.warn("[6/6] sub_projects fetch skipped due to permissions:", subProjectsError);
          } else {
            console.debug("[6/6] Sub-projects query OK:", fetchedSubProjects?.length || 0);
            setSubProjects(fetchedSubProjects || []);
          }
        }).catch(err => {
          console.warn("⚠️ Background data load failed:", err);
        });
      }

      const invoicesData = (() => {
        const byId = new Map<string, any>();
        for (const inv of invoicesByClient || []) byId.set(inv.id, inv);
        for (const inv of invoicesByProject || []) byId.set(inv.id, inv);
        return Array.from(byId.values());
      })();

      setProjects(projectsData || []);
      setInvoices(invoicesData || []);
      setFiles(filesData);
      
      console.log("📊 Client Dashboard Data Loaded:");
      console.log("  - Client ID:", clientId);
      console.log("  - Invoices Count:", invoicesData?.length || 0);
    } catch (err: any) {
      const errorDetails = {
        message: err?.message || "Unknown error",
        code: err?.code || "UNKNOWN",
        details: err?.details || null,
        hint: err?.hint || null,
        status: err?.status || null,
        statusText: err?.statusText || null,
        toString: err?.toString?.() || String(err),
        fullError: JSON.stringify(err, null, 2),
      };
      console.error("❌ Error fetching client data:", errorDetails);
      console.error("   Raw error object:", err);
      setError("Failed to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!authLoading && userId) {
      console.log("🔄 Auth loaded, userId available:", userId);
      fetchClientData();
    } else if (!authLoading && !userId) {
      console.warn("⚠️ Auth loaded but no userId - user may not be authenticated");
      setLoading(false);
      setError("You must be logged in to view this dashboard");
    }
  }, [userId, authLoading, fetchClientData]);

  // Subscribe to real-time updates for all client data
  useEffect(() => {
    if (!clientData?.id || !projects.length) return;

    const supabase = createClient();
    const projectIds = projects.map(p => p.id);
    
    console.log("🔔 Setting up real-time subscriptions for client:", clientData.id);
    
    // Debounce real-time updates to avoid excessive re-fetches
    let realtimeTimeout: NodeJS.Timeout | null = null;
    const scheduleRefresh = () => {
      if (realtimeTimeout) clearTimeout(realtimeTimeout);
      realtimeTimeout = setTimeout(() => {
        console.log("📡 Performing debounced refresh");
        fetchClientData();
      }, 1000); // Wait 1 second to batch multiple changes
    };
    
    // Subscribe to all relevant tables for real-time updates
    const channel = supabase
      .channel(`client-dashboard-${clientData.id}`)
      // Invoices
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `client_id=eq.${clientData.id}`,
        },
        (payload: any) => {
          console.log("📡 Invoice change:", payload.eventType);
          scheduleRefresh();
        }
      )
      // Projects
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `client_id=eq.${clientData.id}`,
        },
        (payload: any) => {
          console.log("📡 Project change:", payload.eventType);
          scheduleRefresh();
        }
      )
      // Project Files
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_files",
        },
        (payload: any) => {
          // Check if file belongs to client's projects
          if (projectIds.includes(payload.new?.project_id || payload.old?.project_id)) {
            console.log("📡 File change:", payload.eventType);
            scheduleRefresh();
          }
        }
      )
      // Comments
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_comments",
        },
        (payload: any) => {
          if (projectIds.includes(payload.new?.project_id || payload.old?.project_id)) {
            console.log("📡 Comment change:", payload.eventType);
            scheduleRefresh();
          }
        }
      )
      // Sub-projects
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sub_projects",
        },
        (payload: any) => {
          if (projectIds.includes(payload.new?.project_id || payload.old?.project_id)) {
            console.log("📡 Sub-project change:", payload.eventType);
            scheduleRefresh();
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
      });

    return () => {
      console.log("🔕 Removing all subscriptions");
      supabase.removeChannel(channel);
      if (realtimeTimeout) clearTimeout(realtimeTimeout);
    };
  }, [clientData?.id, projects, fetchClientData]);

  const stats = useMemo(() => {
    const activeCount = projects.filter(
      (p) => p.status === "in_progress" || p.status === "in_review",
    ).length;
    const completedCount = projects.filter(
      (p) => p.status === "completed",
    ).length;
    const pendingInvoicesCount = invoices.filter(
      (inv) => inv.status === "sent" || inv.status === "overdue",
    ).length;
    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    const totalSpent = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    console.log("📊 Stats calculated:", {
      totalInvoices: invoices.length,
      paidInvoicesCount: paidInvoices.length,
      paidInvoices: paidInvoices.map(inv => ({ 
        id: inv.id, 
        number: inv.invoice_number, 
        total: inv.total,
        amount: inv.amount,
        status: inv.status,
        allFields: Object.keys(inv)
      })),
      totalSpent,
    });

    return {
      activeProjects: activeCount,
      completedProjects: completedCount,
      pendingInvoices: pendingInvoicesCount,
      totalSpent,
    };
  }, [projects, invoices]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [projects, statusFilter, searchQuery]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    if (invoiceFilter !== "all") {
      filtered = filtered.filter((inv) => inv.status === invoiceFilter);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter((inv) =>
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [invoices, invoiceFilter, searchQuery]);

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    return comments.filter(
      (c) =>
        c.comment_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [comments, searchQuery]);

  // Paginated data accessors
  const paginatedFiles = useMemo(() => {
    const start = (filesPaginationPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return files.slice(start, end);
  }, [files, filesPaginationPage]);

  const paginatedComments = useMemo(() => {
    const start = (commentsPaginationPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredComments.slice(start, end);
  }, [filteredComments, commentsPaginationPage]);

  const filesTotalPages = useMemo(() => Math.ceil(files.length / ITEMS_PER_PAGE), [files]);
  const commentsTotalPages = useMemo(() => Math.ceil(filteredComments.length / ITEMS_PER_PAGE), [filteredComments]);

  const toggleFavorite = (projectId: string) => {
    setFavoriteProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const projectDetailsHref = useCallback((projectId: string) => {
    return `/client/project-details/${projectId}`;
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const selectedMilestones = useMemo(
    () => subProjects.filter((m) => m.project_id === selectedProjectId),
    [subProjects, selectedProjectId],
  );

  const selectedFiles = useMemo(
    () => files.filter((f) => f.project_id === selectedProjectId),
    [files, selectedProjectId],
  );

  const filesByCategory = useMemo(() => {
    const acc: Record<string, any[]> = {};
    for (const f of selectedFiles) {
      const type = f.file_type || getFileType(f.file_name || "");
      let cat = f.file_category as string | undefined;
      // Align with admin: videos appear under Deliverables
      if (!cat || cat === "other") {
        cat = type === "video" ? "deliverables" : (cat || "other");
      }
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(f);
    }
    return acc;
  }, [selectedFiles]);

  const openPreview = async (file: any) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    setIsPreviewOpen(true);
    setPreviewLoading(true);
    
    try {
      if (file.storage_type === "supabase") {
        const res = await getSignedProjectFileUrl(file.file_url, 300);
        if (!res.error && res.signedUrl) {
          setPreviewUrl(res.signedUrl);
        } else {
          // Fallback to direct URL if signing fails
          setPreviewUrl(file.file_url);
        }
      } else {
        setPreviewUrl(file.file_url);
      }
    } catch (err) {
      console.error("Preview error:", err);
      setPreviewUrl(file.file_url);
    } finally {
      setPreviewLoading(false);
    }
  };
  const openFile = (file: any) => {
    if (!file?.file_url) return;
    window.open(file.file_url, "_blank", "noopener,noreferrer");
  };

  const selectedComments = useMemo(
    () => comments.filter((c) => c.project_id === selectedProjectId),
    [comments, selectedProjectId],
  );

  const submitComment = useCallback(async () => {
    if (!selectedProjectId || submittingComment) return;
    const text = newCommentText.trim();
    if (!text) return;
    try {
      setSubmittingComment(true);
      const timestampSeconds = newCommentTimestamp
        ? Number.parseFloat(newCommentTimestamp)
        : null;
      const res = await fetch(`/api/client/projects/${selectedProjectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: text,
          file_id: newCommentFileId ? newCommentFileId : null,
          timestamp_seconds: Number.isFinite(timestampSeconds as number)
            ? (timestampSeconds as number)
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit comment");
      // Prepend the new comment and clear form
      setComments((prev) => [data.comment, ...prev]);
      setNewCommentText("");
      setNewCommentFileId("");
      setNewCommentTimestamp("");
    } catch (e: any) {
      console.error("Submit comment failed:", e);
      alert(e?.message || "Could not submit comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  }, [selectedProjectId, newCommentText, newCommentFileId, newCommentTimestamp, submittingComment]);

  const statusAccent = useMemo(() => {
    const s = selectedProject?.status;
    switch (s) {
      case "in_progress":
        return {
          card: "border-emerald-500/30 bg-emerald-500/5",
          badge: "bg-emerald-500/10 text-emerald-600",
        };
      case "in_review":
        return {
          card: "border-amber-500/30 bg-amber-500/5",
          badge: "bg-amber-500/10 text-amber-600",
        };
      case "completed":
        return {
          card: "border-sky-500/30 bg-sky-500/5",
          badge: "bg-sky-500/10 text-sky-600",
        };
      case "planning":
        return {
          card: "border-slate-500/30 bg-slate-500/5",
          badge: "bg-slate-500/10 text-slate-600",
        };
      default:
        return {
          card: "border-primary/20 bg-card",
          badge: "bg-primary/10",
        };
    }
  }, [selectedProject?.status]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
    );
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
      trend:
        stats.pendingInvoices > 0 ? ("down" as const) : ("neutral" as const),
      icon: FileText,
    },
    {
      title: "Total Comments",
      value: comments.length.toString(),
      change: "Across all projects",
      trend: "neutral" as const,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {clientData?.company_name}
          </h1>
          <p className="text-muted-foreground">
            Manage your projects, invoices, and communications
          </p>
        </div>
        <Button onClick={() => router.push("/contact")}>
          <Plus className="h-4 w-4 mr-2" />
          Request Project
        </Button>
      </div>

      {/* Top Advertisement */}
      <AdDisplay position="top" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                      onClick={() => {
                        debug.log("CLIENT_DASHBOARD", "Recent project clicked", {
                          projectId: project.id,
                          projectName: project.name,
                        });
                        setSelectedProjectId(project.id);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{project.name}</p>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={project.progress_percentage || 0}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground">
                          {project.progress_percentage || 0}%
                        </span>
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
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {(() => {
                          const type = file.file_type || getFileType(file.file_name || "");
                          const isImage = type === "image";
                          const isVideo = type === "video";
                          const thumb =
                            file.thumbnail_url ||
                            (file.storage_type === "gdrive" ? getGoogleDriveThumbnailUrl(file.file_url, 160) : null) ||
                            (isImage ? file.file_url : null) ||
                            (isVideo && file.video_thumbnail_url ? file.video_thumbnail_url : null);
                          return thumb ? (
                            <img src={thumb} alt={file.file_name || "File"} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.projects?.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => file.project_id && setSelectedProjectId(file.project_id)}
                        disabled={!file.project_id}
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
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(project.id);
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${favoriteProjects.includes(project.id) ? "fill-yellow-500 text-yellow-500" : ""}`}
                      />
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
                      <span className="font-medium">
                        {project.progress_percentage || 0}%
                      </span>
                    </div>
                    <Progress
                      value={project.progress_percentage || 0}
                      className="h-2"
                    />
                  </div>
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => {
                      debug.log("CLIENT_DASHBOARD", "View Details clicked", {
                        projectId: project.id,
                        projectName: project.name,
                      });
                      setSelectedProjectId(project.id);
                    }}
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
                <h3 className="text-lg font-semibold mb-2">
                  No projects found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters
                </p>
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
              <Card
                key={invoice.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {invoice.invoice_number}
                        </h3>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {invoice.issue_date && (
                          <div>
                            Issue Date:{" "}
                            {new Date(invoice.issue_date).toLocaleDateString()}
                          </div>
                        )}
                        {invoice.due_date && (
                          <div>
                            Due:{" "}
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          ₹{invoice.total?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {invoice.status !== "paid" && (
                          <Button size="sm">Pay Now</Button>
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
                <h3 className="text-lg font-semibold mb-2">
                  No invoices found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </p>
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
              <Card
                key={comment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium">{comment.projects?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        By{" "}
                        {comment.user?.full_name ||
                          comment.user?.email ||
                          "Unknown"}{" "}
                        • {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        comment.project_id ? setSelectedProjectId(comment.project_id) : null
                      }
                    >
                      View Details
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
                <h3 className="text-lg font-semibold mb-2">
                  No comments found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Comments will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* File preview dialog (image/video/Drive) */}
      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewFile(null);
            setPreviewUrl(null);
            setPreviewLoading(false);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-3xl p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{previewFile?.file_name || "Preview"}</span>
              {previewFile?.file_category ? (
                <Badge variant="outline" className="text-[11px]">
                  {previewFile.file_category}
                </Badge>
              ) : null}
              {previewFile?.file_type ? (
                <Badge variant="secondary" className="text-[11px]">
                  {previewFile.file_type}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {previewFile?.description || "Preview this file or open it in a new tab."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <div className="animate-spin mb-2">⟳</div>
                Loading preview...
              </div>
            ) : (() => {
              const type = previewFile?.file_type || getFileType(previewFile?.file_name || "");
              const isImage = type === "image";
              const isVideo = type === "video";
              const drivePreview = previewFile?.file_url ? getDrivePreviewUrl(previewFile.file_url) : null;

              if (isImage && previewUrl) {
                // eslint-disable-next-line @next/next/no-img-element
                return <img src={previewUrl} alt={previewFile?.file_name || "File"} className="w-full h-auto rounded" />;
              }

              if (isVideo && previewUrl) {
                return (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    controlsList="nodownload"
                    className="w-full rounded"
                  />
                );
              }

              if (drivePreview) {
                return (
                  <iframe
                    src={drivePreview}
                    title={previewFile?.file_name || "Drive preview"}
                    className="w-full aspect-video rounded"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                );
              }

              return <div className="text-sm text-muted-foreground">Preview unavailable. Use Open to view the file.</div>;
            })()}

            {previewFile?.file_url ? (
              <div className="flex justify-end">
                <Button type="button" onClick={() => openFile(previewFile)} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedProjectId}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-4xl sm:w-[80vw] p-0">
          {selectedProject ? (
            <>
              <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
                <DialogTitle className="flex flex-wrap items-center gap-3 justify-between">
                  <span className="text-xl font-semibold">{selectedProject.name}</span>
                  <StatusBadge status={selectedProject.status} />
                </DialogTitle>
                <DialogDescription>
                  Project details stay in your dashboard.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[85vh] overflow-y-auto p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{selectedProject.progress_percentage ?? 0}%</span>
                      <Badge className={`text-xs ${statusAccent.badge}`}>{selectedProject.status ?? "—"}</Badge>
                    </div>
                    <Progress value={selectedProject.progress_percentage ?? 0} className="h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Start: {selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Due: {selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Artifacts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedMilestones.length} milestones</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedFiles.length} files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedComments.length} comments</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Meta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Created {selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                    {selectedProject.updated_at ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Updated {new Date(selectedProject.updated_at).toLocaleDateString()}</span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                    <CardDescription>Status and description</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedProject.status} />
                      <Badge className={statusAccent.badge}>Client-owned</Badge>
                    </div>
                    {selectedProject.description ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{selectedProject.description}</div>
                    ) : (
                      <div className="text-muted-foreground">No description provided.</div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Milestones</CardTitle>
                      <CardDescription>Key steps and due dates</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedMilestones.length ? (
                        <ul className="space-y-2 text-sm">
                          {selectedMilestones.map((m: any) => (
                            <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{m.title || m.name || "Milestone"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {m.status ?? "—"}
                                  {m.due_date ? ` • Due ${m.due_date}` : ""}
                                </div>
                              </div>
                              {m.progress_percentage != null ? (
                                <span className="text-xs font-medium">{m.progress_percentage}%</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">No milestones yet.</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Files by Category - mirror admin/employee tile layout */}
                  {Object.entries(FILE_CATEGORIES).map(([category, config]) => {
                    const categoryFiles = filesByCategory[category] || [];
                    if (categoryFiles.length === 0) return null;
                    return (
                      <Card key={category}>
                        <CardHeader>
                          <CardTitle className="text-lg">{config.label}</CardTitle>
                          <CardDescription>{config.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryFiles.map((f: any) => {
                              const type = f.file_type || getFileType(f.file_name || "");

                              return (
                                <Card key={f.id} className="overflow-hidden">
                                  <CardContent className="p-0">
                                    <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                      <FileThumb file={f} />
                                      <div className="absolute top-2 left-2 flex gap-1">
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          {f.storage_type === "supabase" ? "Uploaded" : "Drive"}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          {type}
                                        </Badge>
                                      </div>
                                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                                    </div>
                                    <div className="p-3 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm line-clamp-2">{f.file_name ?? f.name ?? "File"}</p>
                                          {f.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{f.description}</p>
                                          )}
                                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1">
                                            <span>Category: {f.file_category || category}</span>
                                            {f.created_at ? (
                                              <span>{new Date(f.created_at).toLocaleString()}</span>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between gap-2 text-xs">
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openPreview(f)}
                                            aria-label="Preview file"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openFile(f)}
                                            aria-label="Open file"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        {/* No delete for client view */}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Comments</CardTitle>
                    <CardDescription>Feedback and discussion</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3 rounded-md border p-3">
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="newCommentText">Add your feedback</Label>
                          <Textarea
                            id="newCommentText"
                            placeholder="Type your comment here..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="associateFile">Associate to file (optional)</Label>
                            <Select
                              value={newCommentFileId ?? ""}
                              onValueChange={(v) =>
                                setNewCommentFileId(v === "none" ? null : v)
                              }
                            >
                              <SelectTrigger id="associateFile">
                                <SelectValue placeholder="Select a file" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {selectedFiles.map((f: any) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.file_name ?? f.name ?? "File"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label htmlFor="timestamp">Timestamp (seconds, optional)</Label>
                            <Input
                              id="timestamp"
                              type="number"
                              inputMode="decimal"
                              placeholder="e.g. 42.5"
                              value={newCommentTimestamp}
                              onChange={(e) => setNewCommentTimestamp(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={submitComment}
                            disabled={submittingComment || !newCommentText.trim()}
                          >
                            {submittingComment ? "Submitting..." : "Post Comment"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {selectedComments.length ? (
                      <ul className="space-y-3 text-sm">
                        {selectedComments.map((c: any) => (
                          <li key={c.id} className="rounded-md border p-3 space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {c.user?.full_name || c.user?.email || "Unknown"}
                              {c.created_at ? ` · ${new Date(c.created_at).toLocaleString()}` : ""}
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">{c.comment_text ?? c.comment ?? ""}</div>
                            {c.file_id ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                Linked file: {selectedFiles.find((f) => f.id === c.file_id)?.file_name ?? "Unknown"}
                                {c.timestamp_seconds != null ? ` • at ${c.timestamp_seconds}s` : ""}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-muted-foreground">No comments yet.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Bottom Advertisement */}
      <AdDisplay position="bottom" />
    </div>
  );
}
