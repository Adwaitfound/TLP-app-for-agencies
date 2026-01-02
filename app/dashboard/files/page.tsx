"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Image,
  Video,
  File,
  Download,
  Eye,
  Search,
  Filter,
  FolderKanban,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { ProjectFile, FileType, FileCategory } from "@/types";

interface FileWithProject extends ProjectFile {
  projects?: {
    name: string;
    clients?: {
      company_name: string;
    };
  };
  uploader?: {
    full_name: string;
    email: string;
  };
}

export default function AllFilesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FileWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [storageTypeFilter, setStorageTypeFilter] = useState<string>("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithProject | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    loadFiles();
  }, [user]);

  async function loadFiles() {
    if (!user) return;
    
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("project_files")
        .select(
          `
          *,
          projects(
            name,
            clients(company_name)
          ),
          uploader:uploaded_by(full_name, email)
        `
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setFiles((data as FileWithProject[]) || []);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  }

  // Generate signed preview URLs for Supabase files so thumbnails work on private buckets
  useEffect(() => {
    async function buildPreviewUrls() {
      if (!files.length) {
        setPreviewUrls({});
        return;
      }

      const supabase = createClient();
      const urlMap: Record<string, string> = {};

      await Promise.all(
        files.map(async (file) => {
          // Use direct URL for non-supabase storage
          if (file.storage_type !== "supabase" || !file.file_url) {
            urlMap[file.id] = file.file_url || "";
            return;
          }

          // Try to derive storage path from public URL and request a signed URL
          const parts = file.file_url.split("/project-files/");
          const path = parts[1]?.split("?")[0];
          if (!path) {
            urlMap[file.id] = file.file_url;
            return;
          }

          const { data, error } = await supabase.storage
            .from("project-files")
            .createSignedUrl(path, 60 * 60); // 1 hour

          if (error || !data?.signedUrl) {
            urlMap[file.id] = file.file_url;
            return;
          }

          urlMap[file.id] = data.signedUrl;
        }),
      );

      setPreviewUrls(urlMap);
    }

    buildPreviewUrls();
  }, [files]);

  function getPreviewUrl(file: FileWithProject) {
    // Prefer signed Supabase URLs, otherwise drive thumbnails or raw URL
    if (file.storage_type === "supabase") {
      return previewUrls[file.id] || file.file_url;
    }

    const driveId = getDriveId(file.file_url);
    if (driveId) {
      return `https://drive.google.com/thumbnail?id=${driveId}`;
    }

    return previewUrls[file.id] || file.file_url;
  }

  function getDriveId(url?: string | null) {
    if (!url) return null;
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch?.[1]) return fileIdMatch[1];
    const queryIdMatch = url.match(/[?&]id=([^&#]+)/);
    if (queryIdMatch?.[1]) return queryIdMatch[1];
    return null;
  }

  function getDrivePreviewEmbedUrl(file: FileWithProject) {
    const driveId = getDriveId(file.file_url);
    if (!driveId) return null;
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  function getFileIcon(fileType: FileType) {
    switch (fileType) {
      case "image":
        return <Image className="h-5 w-5 text-blue-500" />;
      case "video":
        return <Video className="h-5 w-5 text-purple-500" />;
      case "pdf":
      case "document":
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function formatCategory(category: FileCategory) {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function openFileViewer(file: FileWithProject) {
    setSelectedFile(file);
    setViewerOpen(true);
  }

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      searchQuery === "" ||
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.projects?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFileType =
      fileTypeFilter === "all" || file.file_type === fileTypeFilter;
    const matchesCategory =
      categoryFilter === "all" || file.file_category === categoryFilter;
    const matchesStorage =
      storageTypeFilter === "all" || file.storage_type === storageTypeFilter;

    return (
      matchesSearch && matchesFileType && matchesCategory && matchesStorage
    );
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "project_manager")) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* File Viewer Modal */}
      {selectedFile && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon(selectedFile.file_type)}
                {selectedFile.file_name}
              </DialogTitle>
              <DialogDescription>
                {selectedFile.projects?.name} - {selectedFile.projects?.clients?.company_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* File Preview */}
              <div className="rounded-lg border bg-muted/50 overflow-hidden">
                {(() => {
                  const driveEmbed = getDrivePreviewEmbedUrl(selectedFile);
                  if (selectedFile.storage_type !== "supabase" && driveEmbed) {
                    return (
                      <iframe
                        src={driveEmbed}
                        className="w-full h-[60vh]"
                        title={selectedFile.file_name}
                        allow="autoplay; fullscreen"
                      />
                    );
                  }

                  if (selectedFile.file_type === "image") {
                    return (
                      <img
                        src={getPreviewUrl(selectedFile)}
                        alt={selectedFile.file_name}
                        className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                      />
                    );
                  }
                  if (selectedFile.file_type === "video") {
                    return (
                      <video
                        src={getPreviewUrl(selectedFile)}
                        controls
                        className="w-full h-auto max-h-[60vh]"
                      >
                        Your browser does not support the video tag.
                      </video>
                    );
                  }
                  if (selectedFile.file_type === "pdf") {
                    return (
                      <iframe
                        src={getPreviewUrl(selectedFile)}
                        className="w-full h-[60vh]"
                        title={selectedFile.file_name}
                      />
                    );
                  }
                  return (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Preview not available for this file type
                      </p>
                      <Button
                        onClick={() => window.open(selectedFile.file_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* File Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span>{" "}
                  <Badge variant="outline">
                    {formatCategory(selectedFile.file_category)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Size:</span>{" "}
                  {formatFileSize(selectedFile.file_size)}
                </div>
                <div>
                  <span className="font-medium">Storage:</span>{" "}
                  <Badge
                    variant={
                      selectedFile.storage_type === "supabase"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedFile.storage_type === "supabase" ? "Supabase" : "Drive"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span>{" "}
                  {new Date(selectedFile.created_at).toLocaleDateString()}
                </div>
                {selectedFile.uploader && (
                  <div className="col-span-2">
                    <span className="font-medium">Uploaded by:</span>{" "}
                    {selectedFile.uploader.full_name || selectedFile.uploader.email}
                  </div>
                )}
                {selectedFile.description && (
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span>{" "}
                    {selectedFile.description}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = selectedFile.file_url;
                    a.download = selectedFile.file_name;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedFile.file_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  onClick={() =>
                    router.push(`/dashboard/projects?id=${selectedFile.project_id}`)
                  }
                >
                  <FolderKanban className="h-4 w-4 mr-2" />
                  View Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Files</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all project files across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base px-3 py-1">
            {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* File Type Filter */}
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="pre_production">Pre Production</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="post_production">Post Production</SelectItem>
                <SelectItem value="deliverables">Deliverables</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Storage Type Filter */}
            <Select
              value={storageTypeFilter}
              onValueChange={setStorageTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Storage</SelectItem>
                <SelectItem value="supabase">Supabase</SelectItem>
                <SelectItem value="google_drive">Google Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            All files from all projects — click any card to preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery ||
                fileTypeFilter !== "all" ||
                categoryFilter !== "all"
                  ? "No files match your filters"
                  : "No files found"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => {
                const url = getPreviewUrl(file);
                const isImage = file.file_type === "image";
                const isVideo = file.file_type === "video";
                const driveEmbed = getDrivePreviewEmbedUrl(file);

                return (
                  <div
                    key={file.id}
                    className="group rounded-xl border bg-card/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openFileViewer(file)}
                  >
                    <div className="relative h-60 w-full bg-black flex items-center justify-center overflow-hidden">
                      {(() => {
                        const previewSrc = driveEmbed ? getPreviewUrl(file) : url;
                        if (isImage) {
                          return (
                            <img
                              src={previewSrc}
                              alt={file.file_name}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          );
                        }
                        if (isVideo && file.storage_type === "supabase") {
                          return (
                            <video
                              src={url}
                              className="max-h-full max-w-full object-contain"
                              muted
                              playsInline
                            />
                          );
                        }
                        return (
                          <img
                            src={previewSrc}
                            alt={file.file_name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        );
                      })()}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      <div className="absolute top-2 left-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur">
                          {formatCategory(file.file_category)}
                        </Badge>
                        <Badge
                          variant={file.storage_type === "supabase" ? "default" : "secondary"}
                          className="bg-background/80 backdrop-blur"
                        >
                          {file.storage_type === "supabase" ? "Supabase" : "Drive"}
                        </Badge>
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFileViewer(file);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            const a = document.createElement("a");
                            a.href = file.file_url;
                            a.download = file.file_name;
                            a.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {file.file_name}
                            </p>
                            {file.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {file.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {formatFileSize(file.file_size)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FolderKanban className="h-3 w-3" />
                          <button
                            className="underline-offset-2 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/projects?id=${file.project_id}`);
                            }}
                          >
                            {file.projects?.name || "Unknown"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{file.projects?.clients?.company_name || "N/A"}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" aria-hidden />
                          <span>
                            Uploaded {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>By {file.uploader?.full_name || file.uploader?.email || "Unknown"}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFileViewer(file);
                            }}
                            aria-label="Preview file"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/projects?id=${file.project_id}`);
                            }}
                            aria-label="View project"
                          >
                            <FolderKanban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              const a = document.createElement("a");
                              a.href = file.file_url;
                              a.download = file.file_name;
                              a.click();
                            }}
                            aria-label="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
