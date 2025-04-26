import fs from "fs";

export const FILE_PROCESS_QUEUE = "file-process-queue";
export const QUEUE_NAME = "process-queue";

const ROOT = process.env.ROOT_USERDATA_DIR || `${process.cwd()}/user_data`;

export const UPLOAD_DIR = `${ROOT}/uploads`;
const DB_DIR = `${ROOT}/db`;
export const DB_URL = `file:${DB_DIR}/local.db`;

async function createDirectories() {
  const directories = [UPLOAD_DIR, ROOT, DB_DIR];

  for (const dir of directories) {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      console.log(`Directory created: ${dir}`);
    } catch (error) {
      if (error.code === "EEXIST") {
      } else {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }
}
createDirectories()
  .then(() => {})
  .catch((error) => {
    console.error("Error creating directories:", error);
  });
