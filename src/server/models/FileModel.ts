import { db } from "../db";

export interface FileRecord {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export class FileModel {
  static insert(name: string, path: string) {
    db.run("INSERT INTO uploads (name, path) VALUES (?, ?)", [name, path]);
  }

  static all(): FileRecord[] {
    return db
      .query("SELECT * FROM uploads ORDER BY created_at DESC")
      .all() as FileRecord[];
  }

  static find(id: number): FileRecord | null {
    return db.query("SELECT * FROM uploads WHERE id = ?").get(id) as FileRecord;
  }
}
