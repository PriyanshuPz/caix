import { useGlobalContext } from "@client/contexts/use-global";
import { formatFileSize } from "@client/lib/utils";
import { FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Define more detailed document type
interface DocumentWithStatus {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "processed" | "error" | "deleted";
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  chunkCount?: number;
}

export default function Sidebar() {
  const { sidebarState, toggleSidebar, getCurrentUserId, setLoading } =
    useGlobalContext();

  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Fetch documents with React Query
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", getCurrentUserId()],
    queryFn: async () => {
      const userId = getCurrentUserId();
      if (!userId) return [];

      setLoading("uploads", true);
      try {
        const response = await fetch(`/api/files?user_id=${userId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await response.json();
        return data.files || [];
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to load your documents");
        return [];
      } finally {
        setLoading("uploads", false);
      }
    },
    // Refetch every 5 seconds to check for status updates
    refetchInterval: 5000,
    enabled: !!getCurrentUserId(),
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User session not found");

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("user_id", userId);

      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload files");
      }

      return data;
    },
    onMutate: () => {
      setLoading("uploads", true);
      setFileError(null);
    },
    onSuccess: (data) => {
      toast.success(`${data.files?.length || 1} file(s) uploaded successfully`);
      // Invalidate and refetch documents query
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: Error) => {
      console.error("Error uploading files:", error);
      setFileError(error.message);
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading("uploads", false);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User session not found");

      const response = await fetch(
        `/api/file?file_id=${id}&user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete file");
      }

      return id;
    },
    onSuccess: () => {
      toast.info("Document removed");
      // Invalidate and refetch documents query
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: Error) => {
      console.error("Error removing document:", error);
      toast.error("Failed to remove document");
    },
  });

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await handleFiles(Array.from(e.target.files));
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!e.dataTransfer.files?.length) return;
    await handleFiles(Array.from(e.dataTransfer.files));
  };

  // Common file handling logic
  const handleFiles = useCallback(
    async (files: File[]) => {
      // Validate files
      const maxSize = 50 * 1024 * 1024; // 50MB
      const invalidFiles = files.filter((f) => f.size > maxSize);

      if (invalidFiles.length > 0) {
        setFileError(`File(s) exceed maximum size of 50MB`);
        toast.error("Some files are too large");
        return;
      }

      uploadMutation.mutate(files);
    },
    [uploadMutation]
  );

  // Handle document removal
  const handleRemoveDocument = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Drag event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-card transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:w-80 ${
        sidebarState.isOpen ? "translate-x-0" : "-translate-x-full"
      } border-r border-border`}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-primary">{"CAIX"}</h2>
          <button
            onClick={() => toggleSidebar()}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`bg-muted/50 rounded-xl p-4 mb-6 border ${
            dragActive ? "border-primary border-2" : "border-border/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-center w-full">
            <label
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed ${
                fileError ? "border-destructive" : "border-border"
              } rounded-xl cursor-pointer bg-secondary/60 hover:bg-secondary transition-colors`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploadMutation.isPending ? (
                  <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 mb-3 text-primary" />
                )}
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drop
                  files
                </p>
                <p className="text-xs text-muted-foreground/70">
                  PDF, TXT, DOCX, etc. (max 50MB)
                </p>
                {fileError && (
                  <p className="text-xs text-destructive mt-2">{fileError}</p>
                )}
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                multiple
                disabled={uploadMutation.isPending || isLoading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Your Documents
            </h3>
            {isLoading && (
              <div className="text-xs text-muted-foreground flex items-center">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/70">
              {isLoading ? "Loading documents..." : "No documents uploaded yet"}
            </div>
          ) : (
            documents.map((doc: DocumentWithStatus) => (
              <div
                key={doc.id}
                className="bg-card/50 rounded-xl p-3 flex justify-between items-center border border-muted/80 hover:border-border/50 transition-colors group"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="bg-secondary rounded-lg p-2 mr-3 border border-border/30">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate text-sm">
                        {doc.name}
                      </div>
                      {doc.status === "pending" && (
                        <span className="bg-amber-500/10 text-amber-500 text-xs px-1.5 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                      {doc.status === "processing" && (
                        <span className="bg-blue-500/10 text-blue-500 text-xs px-1.5 py-0.5 rounded flex items-center">
                          <Loader2 className="w-2 h-2 mr-1 animate-spin" />
                          Processing
                        </span>
                      )}
                      {doc.status === "error" && (
                        <span className="bg-destructive/10 text-destructive text-xs px-1.5 py-0.5 rounded">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70 flex items-center gap-2">
                      <span>{formatFileSize(doc.size)}</span>
                      {doc.chunkCount && <span>• {doc.chunkCount} chunks</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-muted ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
