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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Image,
  Video,
  File,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  FolderKanban,
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

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            All files from all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery || fileTypeFilter !== "all" || categoryFilter !== "all"
                  ? "No files match your filters"
                  : "No files found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{getFileIcon(file.file_type)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{file.file_name}</span>
                          {file.description && (
                            <span className="text-xs text-muted-foreground">
                              {file.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal"
                          onClick={() =>
                            router.push(`/dashboard/projects?id=${file.project_id}`)
                          }
                        >
                          <FolderKanban className="h-3 w-3 mr-1" />
                          {file.projects?.name || "Unknown"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {file.projects?.clients?.company_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatCategory(file.file_category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            file.storage_type === "supabase"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {file.storage_type === "supabase" ? "Supabase" : "Drive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {file.uploader?.full_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.file_url, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = file.file_url;
                              a.download = file.file_name;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
