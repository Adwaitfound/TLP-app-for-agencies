"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Folder as FolderIcon,
  ExternalLink,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { debug } from "@/lib/debug";
import type { ProjectFile, FileCategory } from "@/types";
import {
  FILE_CATEGORIES,
  validateFileSize,
  formatFileSize,
  getFileType,
} from "@/lib/file-upload";
import { useAuth } from "@/contexts/auth-context";
import { getSignedProjectFileUrl } from "@/app/actions/project-file-operations";
import { logAuditEvent } from "@/app/actions/audit-log";

interface FileManagerProps {
  projectId: string;
  driveFolderUrl?: string;
  onDriveFolderUpdate?: (url: string) => void;
  readOnly?: boolean;
}

export function FileManager({
  projectId,
  driveFolderUrl,
  onDriveFolderUpdate,
  readOnly,
}: FileManagerProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isDriveFolderDialogOpen, setIsDriveFolderDialogOpen] = useState(false);
  const [newDriveFolderUrl, setNewDriveFolderUrl] = useState(
    driveFolderUrl || "",
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  // Refs to prevent race conditions and state corruption
  const isUploadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const componentMountedRef = useRef(true);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("other");
  const [uploadDescription, setUploadDescription] = useState("");

  // Link form state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkCategory, setLinkCategory] = useState<FileCategory>("other");
  const [linkDescription, setLinkDescription] = useState("");

  function showToast(
    message: string,
    type: "success" | "error" = "success",
    duration = 3000,
  ) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ message, type });
    const t = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, duration);
    toastTimerRef.current = t;
  }

  const fetchFiles = useCallback(async () => {
    // Guard: component unmounted or missing project
    if (!componentMountedRef.current || !projectId) return;

    setLoading(true);
    const supabase = createClient();

    try {
      debug.log("FILE_MANAGER", "Fetching files...", { projectId });
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Only update state if component still mounted
      if (componentMountedRef.current) {
        setFiles(data || []);
        debug.success("FILE_MANAGER", "Files fetched", { count: data?.length });
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      debug.error("FILE_MANAGER", "Error fetching files", {
        message: (error as any)?.message,
        code: (error as any)?.code,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Cleanup on unmount
  useEffect(() => {
    const controller = abortControllerRef.current;
    return () => {
      componentMountedRef.current = false;
      // Cancel any pending requests
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  // Fetch files on mount and when project changes
  useEffect(() => {
    if (!projectId || !componentMountedRef.current) return;
    fetchFiles();
  }, [projectId, fetchFiles]);

  // Keep local state in sync with incoming prop updates ONLY when dialog is closed
  // This prevents the input from changing while the user is editing it
  useEffect(() => {
    if (!isDriveFolderDialogOpen) {
      setNewDriveFolderUrl(driveFolderUrl || "");
    }
  }, [driveFolderUrl, isDriveFolderDialogOpen]);

  // Reset forms when dialogs close to avoid re-render loops in onOpenChange
  useEffect(() => {
    if (!isUploadDialogOpen) {
      setSelectedFile(null);
      setUploadDescription("");
      setUploadCategory("other");
      setUploading(false);
      isUploadingRef.current = false;
      // Also clear the file input element
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][id="file-upload-input"]');
      if (fileInput) fileInput.value = '';
    }
  }, [isUploadDialogOpen]);

  useEffect(() => {
    if (!isLinkDialogOpen) {
      console.log("[FileManager] Link dialog closed - resetting form");
      setLinkUrl("");
      setLinkName("");
      setLinkDescription("");
      setLinkCategory("other");
      setLinkSubmitting(false);
      debug.log("FILE_MANAGER", "Add link dialog closed and form reset");
    } else {
      console.log("[FileManager] Link dialog opened");
    }
  }, [isLinkDialogOpen]);

  useEffect(() => {
    if (!isDriveFolderDialogOpen) {
      setNewDriveFolderUrl(driveFolderUrl || "");
      setSavingDrive(false);
    }
  }, [isDriveFolderDialogOpen, driveFolderUrl]);

  async function handleFileUpload() {
    // Block duplicate submissions or unmounted component
    if (!componentMountedRef.current) {
      console.log("[handleFileUpload] BLOCKED: component unmounted");
      return;
    }
    if (uploading || isUploadingRef.current) {
      console.log("[handleFileUpload] BLOCKED: already uploading");
      return;
    }

    if (!selectedFile) {
      showToast("Please select a file to upload", "error");
      return;
    }

    if (!projectId) {
      showToast("Missing project. Please reopen the project and try again.", "error");
      return;
    }

    if (!user?.id) {
      showToast("Missing user session. Please log in again.", "error");
      return;
    }

    if (files.length >= 20) {
      showToast(
        "Maximum 20 files/link per project. Please delete some files before adding more.",
        "error",
      );
      return;
    }

    const validation = validateFileSize(selectedFile);
    if (!validation.valid) {
      showToast(validation.error || "File is too large", "error");
      return;
    }

    setUploading(true);
    isUploadingRef.current = true;

    const supabase = createClient();
    const fileToUpload = selectedFile;

    try {
      // Upload to Supabase Storage
      const filePath = `${projectId}/${Date.now()}-${fileToUpload.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("project-files").getPublicUrl(filePath);

      // Save file metadata
      const { data: fileData, error: dbError } = await supabase
        .from("project_files")
        .insert({
          project_id: projectId,
          file_name: fileToUpload.name,
          file_type: getFileType(fileToUpload.name),
          file_category: uploadCategory,
          storage_type: "supabase",
          file_url: publicUrl,
          file_size: fileToUpload.size,
          description: uploadDescription,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Optimistically add to files array
      if (fileData && componentMountedRef.current) {
        setFiles((prev) => [fileData, ...prev]);
      }

      // Log the file upload (fire-and-forget)
      logAuditEvent({
        action: "upload",
        entityType: "file",
        entityId: fileData?.id,
        entityName: fileToUpload.name,
        status: "success",
        newValues: {
          file_name: fileToUpload.name,
          file_type: getFileType(fileToUpload.name),
          file_category: uploadCategory,
          file_size: fileToUpload.size,
        },
        details: {
          project_id: projectId,
          description: uploadDescription,
        },
      }).catch((e) => console.warn("Failed to log audit event:", e));

      if (componentMountedRef.current) {
        // Close dialog and reset form
        setIsUploadDialogOpen(false);
        setSelectedFile(null);
        setUploadDescription("");
        setUploadCategory("other");
        setUploading(false);
      }

      debug.success(
        "FILE_MANAGER",
        "Upload saved, added to list, dialog closed",
      );
      showToast("File uploaded successfully", "success");
    } catch (error: any) {
      console.error("Error uploading file:", error);

      // Log the failure
      logAuditEvent({
        action: "upload",
        entityType: "file",
        entityName: fileToUpload.name,
        status: "error",
        errorMessage: error?.message,
        details: {
          project_id: projectId,
          file_size: fileToUpload.size,
        },
      }).catch((e) => console.warn("Failed to log audit event:", e));

      debug.error("FILE_MANAGER", "Upload error", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      showToast(error.message || "Failed to upload file", "error", 4000);
    } finally {
      if (componentMountedRef.current) {
        setUploading(false);
      }
      isUploadingRef.current = false;
      debug.log("FILE_MANAGER", "Upload end - flags reset");
    }
  }

  async function handleAddLink() {
    // ========== GUARDS: Block execution if already in progress ==========
    if (!componentMountedRef.current) {
      console.log("[handleAddLink] BLOCKED: component unmounted");
      return;
    }
    if (linkSubmitting) {
      console.log("[handleAddLink] BLOCKED: already submitting");
      return;
    }

    // ========== VALIDATION ==========
    const trimmedUrl = linkUrl.trim();
    const trimmedName = linkName.trim();

    if (!trimmedUrl || !trimmedName) {
      showToast("Please provide both URL and file name", "error");
      console.log("[handleAddLink] BLOCKED: missing URL or name");
      return;
    }

    if (files.length >= 20) {
      showToast(
        "Maximum 20 files/link per project. Please delete some files before adding more.",
        "error",
      );
      console.log("[handleAddLink] BLOCKED: file limit reached");
      return;
    }

    if (!projectId) {
      showToast("Missing project. Please reopen the project and try again.", "error");
      console.log("[handleAddLink] BLOCKED: no projectId");
      return;
    }

    if (!user?.id) {
      showToast("Missing user session. Please log in again.", "error");
      console.log("[handleAddLink] BLOCKED: no user");
      return;
    }

    // ========== SET GUARDS ==========
    setLinkSubmitting(true);

    // Failsafe to prevent UI from getting stuck if the request never resolves
    const submissionGuard = window.setTimeout(() => {
      console.warn("[handleAddLink] ⚠️ Submission guard fired; resetting state");
      if (componentMountedRef.current) {
        setLinkSubmitting(false);
        showToast("Request timed out. Please try again.", "error", 4000);
      }
    }, 15000);

    try {
      console.log("[handleAddLink] ✅ Starting submission");

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);

      const res = await fetch("/api/project-files/add-drive-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: trimmedName,
          fileUrl: trimmedUrl,
          fileCategory: linkCategory,
          description: linkDescription,
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeout);

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Failed to add link (${res.status})`);
      }

      const { data } = await res.json();

      if (!data) {
        throw new Error("No data returned from insert");
      }

      console.log("[handleAddLink] ✅ Link inserted successfully");

      // ========== UPDATE LOCAL STATE SAFELY ==========
      if (componentMountedRef.current && data) {
        setFiles((prev) => {
          // Guard: prevent adding duplicate
          if (prev.some((f) => f.id === data.id)) return prev;
          return [data, ...prev];
        });
      }

      debug.success("FILE_MANAGER", "Link added successfully");
      showToast("Drive link added", "success");

      // Close dialog on success
      if (componentMountedRef.current) {
        setIsLinkDialogOpen(false);
      }
    } catch (error: any) {
      // ========== ERROR HANDLING ==========
      console.error("[handleAddLink] ❌ Error:", error.message);

      const msg = error?.message?.includes("row-level security")
        ? "You do not have permissions to add links."
        : error?.message || "Failed to add link";

      // Only alert if component still mounted
      if (componentMountedRef.current) {
        showToast(msg, "error", 4000);
      }

      debug.error("FILE_MANAGER", "Add link failed", {
        message: error?.message,
      });
    } finally {
      // ========== ALWAYS RESET GUARDS ==========
      if (componentMountedRef.current) {
        setLinkSubmitting(false);
      }
      window.clearTimeout(submissionGuard);
      console.log("[handleAddLink] ✅ Submission complete, guards reset");
    }
  }

  async function handleUpdateDriveFolder() {
    // Prevent overlapping saves
    if (savingDrive) {
      debug.log(
        "FILE_MANAGER",
        "Drive folder save already in progress, ignoring",
      );
      return;
    }

    const trimmed = newDriveFolderUrl.trim();
    if (!trimmed) {
      showToast("Please provide a folder URL", "error");
      console.log("[handleUpdateDriveFolder] BLOCKED: empty URL");
      return;
    }

    // Validate it's a Google Drive URL
    if (!trimmed.includes("drive.google.com")) {
      showToast("Please provide a valid Google Drive URL", "error", 4000);
      console.log("[handleUpdateDriveFolder] BLOCKED: not a Drive URL");
      return;
    }

    if (!projectId) {
      showToast("Missing project. Please reopen the project and try again.", "error");
      console.log("[handleUpdateDriveFolder] BLOCKED: no projectId");
      return;
    }

    console.log("[handleUpdateDriveFolder] ✅ Starting save", { projectId, url: trimmed });
    setSavingDrive(true);

    const supabase = createClient();

    try {
      debug.log("FILE_MANAGER", "Saving drive folder", {
        projectId,
        url: trimmed,
      });

      console.log("[handleUpdateDriveFolder] 📡 Calling database update...");

      // Add a soft timeout so the UI never stays stuck if the network hangs.
      const timeoutMs = 12000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Drive folder update timed out")), timeoutMs);
      });

      const updatePromise = supabase
        .from("projects")
        .update({ drive_folder_url: trimmed })
        .eq("id", projectId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      console.log("[handleUpdateDriveFolder] 📡 Database response received", { hasError: !!error });

      if (error) {
        console.error("[handleUpdateDriveFolder] ❌ Database error:", error);
        throw error;
      }

      console.log("[handleUpdateDriveFolder] ✅ Save successful");
      debug.success("FILE_MANAGER", "Drive folder saved successfully");

      // Notify parent component first
      if (onDriveFolderUpdate) {
        console.log("[handleUpdateDriveFolder] 📢 Calling parent callback");
        onDriveFolderUpdate(trimmed);
      }

      // Show success message
      showToast("Drive folder saved", "success");

      // Close dialog on success
      console.log("[handleUpdateDriveFolder] 🚪 Closing dialog");
      setIsDriveFolderDialogOpen(false);
    } catch (error: any) {
      console.error("[handleUpdateDriveFolder] ❌ Error caught:", error);
      debug.error("FILE_MANAGER", "Drive folder save error", {
        message: error?.message,
        code: error?.code,
      });
      showToast(
        error.message || "Failed to update drive folder",
        "error",
        4000,
      );
    } finally {
      console.log("[handleUpdateDriveFolder] 🔄 Finally block - resetting savingDrive");
      setSavingDrive(false);
      debug.log("FILE_MANAGER", "Drive folder save end - flags reset");
    }
  }

  async function handleDeleteFile(
    fileId: string,
    fileUrl: string,
    storageType: string,
  ) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    const supabase = createClient();

    try {
      // If it's a Supabase file, delete from storage
      if (storageType === "supabase") {
        const path = fileUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("project-files").remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("project_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      // Log the deletion
      logAuditEvent({
        action: "delete",
        entityType: "file",
        entityId: fileId,
        status: "success",
        details: {
          project_id: projectId,
          storage_type: storageType,
        },
      }).catch((e) => console.warn("Failed to log audit event:", e));

      fetchFiles();
      showToast("File deleted", "success");
    } catch (error: any) {
      console.error("Error deleting file:", error);

      // Log the failure
      logAuditEvent({
        action: "delete",
        entityType: "file",
        entityId: fileId,
        status: "error",
        errorMessage: error?.message,
        details: {
          project_id: projectId,
          storage_type: storageType,
        },
      }).catch((e) => console.warn("Failed to log audit event:", e));

      showToast(error.message || "Failed to delete file", "error", 4000);
    }
  }

  function parseGoogleDriveId(url: string): string | null {
    try {
      const u = new URL(url);
      // Pattern: /file/d/<id>/
      const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch) return fileMatch[1];
      // Pattern: /drive/folders/<id> (for folder links)
      const folderMatch = u.pathname.match(/\/drive\/folders\/([^/?]+)/);
      if (folderMatch) return folderMatch[1];
      // Pattern: ?id=<id> query parameter
      const idParam = u.searchParams.get("id");
      if (idParam) return idParam;
    } catch (e) {
      console.error(`Error parsing Drive URL: ${e}`);
    }
    return null;
  }

  function getDrivePreviewUrl(url: string): string | null {
    const id = parseGoogleDriveId(url);
    if (!id) return null;
    return `https://drive.google.com/file/d/${id}/preview`;
  }

  function getDriveThumbnailUrl(url: string, size = 120): string | null {
    const id = parseGoogleDriveId(url);
    if (!id) return null;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function openPreview(file: ProjectFile) {
    setPreviewFile(file);
    setPreviewUrl(null);
    setIsPreviewOpen(true);
    if (file.storage_type === "supabase") {
      const res = await getSignedProjectFileUrl(file.file_url);
      console.log("📸 Preview signed URL response:", { fileName: file.file_name, hasUrl: !!res.signedUrl, error: res.error });
      if (!res.error && res.signedUrl) setPreviewUrl(res.signedUrl);
      else {
        console.warn("⚠️ Failed to get signed preview URL, using fallback:", res.error);
        setPreviewUrl(file.file_url); // fallback for public buckets
      }
    } else {
      setPreviewUrl(file.file_url);
    }
  }

  async function openFile(file: ProjectFile) {
    if (file.storage_type === "supabase") {
      const res = await getSignedProjectFileUrl(file.file_url);
      if (res.error || !res.signedUrl) {
        // Fallback for public buckets
        window.open(file.file_url, "_blank");
        return;
      }
      window.open(res.signedUrl, "_blank");
    } else {
      window.open(file.file_url, "_blank");
    }
  }

  function FileThumb({
    file,
    display = "inline",
    size = 48,
  }: {
    file: ProjectFile;
    display?: "inline" | "tile";
    size?: number;
  }) {
    const [failed, setFailed] = useState(false);
    const [signedSrc, setSignedSrc] = useState<string | null>(null);
    let src: string | null = null;

    // Check if this is a Google Drive folder link
    const isDriveFolder = file.storage_type === "google_drive" && 
                          file.file_url.includes('/drive/folders/');
    
    // Note: Google Drive thumbnails disabled due to CSP violations and authentication requirements
    // All Drive files will show appropriate icons instead
    
    // PRIORITY 1: Supabase images - use signed URL
    if (file.file_type === "image" && file.storage_type === "supabase") {
      src = signedSrc ?? file.file_url; // allow public bucket fallback
    }
    // PRIORITY 2: External image links
    else if (file.file_type === "image") {
      src = file.file_url;
    }
    // FALLBACK: No thumbnail available
    else {
      // No thumbnail strategy for non-image types
    }

    useEffect(() => {
      let cancelled = false;
      async function run() {
        if (file.file_type === "image" && file.storage_type === "supabase") {
          const res = await getSignedProjectFileUrl(file.file_url, 300);
          if (!cancelled && !res.error && res.signedUrl) {
            setSignedSrc(res.signedUrl);
          }
          if (!cancelled && res.error) {
            // Fallback to file_url directly for public buckets or as last resort
            setSignedSrc(file.file_url);
          }
        }
      }
      run();
      return () => {
        cancelled = true;
      };
    }, [file.file_url, file.file_type, file.storage_type]);

    const boxStyle =
      display === "tile"
        ? { width: "100%", height: "100%" }
        : { width: size, height: size };

    if (!src || failed) {
      // Fallback: for Google Drive items, attempt to embed the preview iframe
      if (file.storage_type === "google_drive") {
        const preview = getDrivePreviewUrl(file.file_url);
        if (preview) {
          return (
            <iframe
              src={preview}
              title={file.file_name || "Drive preview"}
              className={display === "tile" ? "w-full h-full" : "rounded"}
              style={boxStyle}
              allow="autoplay"
              allowFullScreen
              loading="lazy"
            />
          );
        }
      }
      return (
        <div
          className="flex items-center justify-center rounded bg-muted"
          style={boxStyle}
        >
          {file.storage_type === "google_drive" ? (
            isDriveFolder ? (
              <FolderIcon className="h-4 w-4 text-blue-500" />
            ) : (
              <ExternalLink className="h-4 w-4 text-blue-500" />
            )
          ) : (
            getFileIcon(file.file_type)
          )}
        </div>
      );
    }

    return (
      // Signed URLs may point to dynamic hosts (Supabase/Drive), so we intentionally use <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={file.file_name || ""}
        className={
          display === "tile"
            ? "w-full h-full object-cover"
            : "rounded object-cover"
        }
        style={boxStyle}
        onError={() => {
          setFailed(true);
        }}
      />
    );
  }

  function getFileIcon(fileType: string) {
    switch (fileType) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  }

  const filesByCategory = files.reduce(
    (acc, file) => {
      if (!acc[file.file_category]) {
        acc[file.file_category] = [];
      }
      acc[file.file_category].push(file);
      return acc;
    },
    {} as Record<FileCategory, ProjectFile[]>,
  );

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded shadow-md text-sm ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
      {/* Drive Folder Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Google Drive Folder</CardTitle>
              <CardDescription>
                Main project folder for large files
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDriveFolderDialogOpen(true)}
              disabled={!!readOnly}
            >
              {driveFolderUrl ? "Update" : "Add"} Folder
            </Button>
          </div>
        </CardHeader>
        {driveFolderUrl && (
          <CardContent>
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open Drive Folder
            </a>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                debug.log("FILE_MANAGER", "Open upload dialog");
                setIsUploadDialogOpen(true);
              }}
              disabled={files.length >= 20 || uploading || !!readOnly}
              title={files.length >= 20 ? "Maximum 20 files reached" : readOnly ? "Read-only mode" : "Upload a file"}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              type="button"
              onClick={() => {
                debug.log("FILE_MANAGER", "Open add link dialog");
                setIsLinkDialogOpen(true);
              }}
              disabled={
                files.length >= 20 || linkSubmitting || !!readOnly
              }
              title={files.length >= 20 ? "Maximum 20 files reached" : readOnly ? "Read-only mode" : "Add a Google Drive link"}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Add Drive Link
            </Button>
          </div>
          <p
            className={`text-sm ${files.length >= 20 ? "text-red-600 font-medium" : "text-muted-foreground"}`}
          >
            {files.length}/20 files
          </p>
        </div>
        {files.length >= 20 && (
          <p className="text-sm text-red-600">
            Maximum file limit reached. Delete some files to add more.
          </p>
        )}
      </div>

      {/* Files by Category */}
      {Object.entries(FILE_CATEGORIES).map(([category, config]) => {
        const categoryFiles = filesByCategory[category as FileCategory] || [];
        if (categoryFiles.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-video bg-muted">
                        <FileThumb file={file} display="tile" />
                        <div className="absolute top-2 left-2 flex gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {file.storage_type === "supabase" ? "Uploaded" : "Drive"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {file.file_type}
                          </Badge>
                        </div>
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-2">{file.file_name}</p>
                            {file.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {file.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1">
                              {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                              <span>Category: {file.file_category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openPreview(file)}
                              aria-label="Preview file"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openFile(file)}
                              aria-label="Open file"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeleteFile(
                                file.id,
                                file.file_url,
                                file.storage_type,
                              )
                            }
                            disabled={!!readOnly}
                            aria-label="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {files.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No files uploaded yet
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload File Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFileUpload();
            }}
          >
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
              <DialogDescription>
                Upload documents, images, and small videos to Supabase storage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="file-upload-input">File</Label>
                <Input
                  id="file-upload-input"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  required
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(selectedFile.size)} - Max:{" "}
                    {formatFileSize(
                      validateFileSize(selectedFile).valid ? 999999999 : 0,
                    )}
                  </p>
                )}
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={uploadCategory}
                  onValueChange={(v) => setUploadCategory(v as FileCategory)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Brief description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedFile || uploading}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Drive Link Dialog */}
      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing if not currently submitting
          if (!linkSubmitting) {
            setIsLinkDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddLink();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add Google Drive Link</DialogTitle>
              <DialogDescription>
                Add a link to a file stored in Google Drive
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>File Name</Label>
                <Input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  className="mt-1"
                  placeholder="Final_Edit_v3.mp4"
                  disabled={linkSubmitting}
                  required
                />
              </div>
              <div>
                <Label>Google Drive URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="mt-1"
                  placeholder="https://drive.google.com/file/d/..."
                  disabled={linkSubmitting}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={linkCategory}
                  onValueChange={(v) => setLinkCategory(v as FileCategory)}
                  disabled={linkSubmitting}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Brief description"
                  disabled={linkSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
                disabled={linkSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!linkUrl.trim() || !linkName.trim() || linkSubmitting}
              >
                {linkSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {linkSubmitting ? "Adding..." : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Drive Folder Dialog */}
      <Dialog
        open={isDriveFolderDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing if not currently saving
          if (!savingDrive) {
            setIsDriveFolderDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateDriveFolder();
            }}
          >
            <DialogHeader>
              <DialogTitle>Set Google Drive Folder</DialogTitle>
              <DialogDescription>
                Add the main project folder URL from Google Drive
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Folder URL</Label>
              <Input
                value={newDriveFolderUrl}
                onChange={(e) => setNewDriveFolderUrl(e.target.value)}
                className="mt-1"
                placeholder="https://drive.google.com/drive/folders/..."
                disabled={savingDrive}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDriveFolderDialogOpen(false)}
                disabled={savingDrive}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !newDriveFolderUrl.trim() ||
                  !newDriveFolderUrl.includes("drive.google.com") ||
                  savingDrive
                }
              >
                {savingDrive && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {savingDrive ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>{previewFile?.file_name}</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {previewFile &&
              (() => {
                const type = previewFile.file_type;
                const url = previewUrl || previewFile.file_url;
                const storage = previewFile.storage_type;
                if (storage === "supabase" && !previewUrl) {
                  return (
                    <div className="text-sm text-muted-foreground p-6 text-center">
                      Generating secure preview link...
                    </div>
                  );
                }
                // Always try Google Drive embed for Drive files, regardless of type
                if (storage === "google_drive") {
                  const embed = getDrivePreviewUrl(url);
                  if (embed) {
                    return (
                      <iframe
                        src={embed}
                        className="w-full h-[70vh] rounded"
                        allow="autoplay"
                        allowFullScreen
                      />
                    );
                  }
                }
                if (type === "image") {
                  return (
                    // Signed URLs may point to dynamic hosts (Supabase/Drive), so we intentionally use <img>.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={previewFile.file_name || ""}
                      className="max-h-[70vh] w-auto mx-auto rounded"
                    />
                  );
                }
                if (type === "video") {
                  if (storage === "google_drive") {
                    const embed = getDrivePreviewUrl(url);
                    if (embed) {
                      return (
                        <iframe
                          src={embed}
                          className="w-full h-[70vh] rounded"
                          allow="autoplay"
                          allowFullScreen
                        />
                      );
                    }
                  }
                  return (
                    <video controls className="w-full max-h-[70vh] rounded">
                      <source src={url} />
                      Your browser does not support the video tag.
                    </video>
                  );
                }
                if (type === "pdf" || url.endsWith(".pdf")) {
                  return (
                    <iframe src={url} className="w-full h-[70vh] rounded" />
                  );
                }
                // Fallback
                return (
                  <div className="text-center text-sm text-muted-foreground">
                    Preview not available. Use the open link to view the file.
                  </div>
                );
              })()}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
            {previewFile &&
              (previewFile.storage_type === "supabase" ? (
                <Button type="button" onClick={() => openFile(previewFile)}>
                  Open in new tab
                </Button>
              ) : (
                <Button asChild>
                  <a
                    href={previewFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab
                  </a>
                </Button>
              ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
