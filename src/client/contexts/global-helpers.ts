import type { FileRecord } from "@/server/models/FileModel";

export async function fetchFiles(userId: string): Promise<FileRecord[]> {
  const response = await fetch(`/api/files/${userId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }
  const data = await response.json();
  return data.files;
}
