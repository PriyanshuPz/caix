import { useGlobalContext } from "@client/contexts/use-global";
import { formatFileSize } from "@client/lib/utils";
import { File, Trash2, Upload, X } from "lucide-react";

export default function Sidebar() {
  const {
    uploadedDocuments,
    sidebarState,
    toggleSidebar,
    removeDocument,
    addDocument,
  } = useGlobalContext();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      addDocument({
        id: data.id,
        name: data.name,
        size: data.size,
      });

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload files");
      }

      console.log(data);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
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

        <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-secondary/60 hover:bg-secondary transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-primary" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag
                </p>
                <p className="text-xs text-muted-foreground/70">
                  PDF, TXT, DOCX, etc.
                </p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Documents
          </h3>
          {uploadedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/70">
              No documents uploaded yet
            </div>
          ) : (
            uploadedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-card/50 rounded-xl p-3 flex justify-between items-center border border-muted/80 hover:border-border/50 transition-colors group"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="bg-secondary rounded-lg p-2 mr-3 border border-border/30">
                    <File className="h-4 w-4 text-primary" />
                  </div>
                  <div className="truncate">
                    <div className="font-medium truncate text-sm">
                      {doc.name}
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      {formatFileSize(doc.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-muted ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
