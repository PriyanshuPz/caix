import { writeFile } from "fs/promises";
import { join } from "path";
import { FileModel } from "./models/FileModel";
import { mkdir } from "fs/promises";

const UPLOAD_DIR = "./uploads";

export class Routes {
  static async handleFileUpload(req: Request): Promise<Response> {
    const formdata = await req.formData();
    const files = formdata.getAll("files");

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const buffer = await file.arrayBuffer();
      const filename = `${Date.now()}-${file.name}`;
      const filepath = join(UPLOAD_DIR, filename);

      // ✅ Ensure uploads folder exists
      await mkdir(UPLOAD_DIR, { recursive: true });

      await writeFile(filepath, Buffer.from(buffer));

      FileModel.insert(file.name, filepath);
      console.log(`Uploaded ${file.name} -> ${filepath}`);
    }

    return Response.json({ message: "Files uploaded successfully" });
  }

  static async handleListFiles(): Promise<Response> {
    const files = FileModel.all();
    return Response.json(files);
  }
}
