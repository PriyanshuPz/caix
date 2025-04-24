import { db, type FileRecord } from "../db";

export class FileModel {
  static insert(
    name: string,
    path: string,
    size: number,
    userId: string
  ): string {
    const fileId = crypto.randomUUID();

    db.run(
      "INSERT INTO uploads (id, name, path, size, user_id) VALUES (?, ?, ?, ?, ?)",
      [fileId, name, path, size, userId]
    );
    return fileId;
  }

  static fetchFiles(userId: string): FileRecord[] {
    const files = db
      .query("SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as FileRecord[];
    return files;
  }

  static find(id: number): FileRecord | null {
    return db.query("SELECT * FROM uploads WHERE id = ?").get(id) as FileRecord;
  }
}
