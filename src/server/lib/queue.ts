import { FILE_PROCESS_QUEUE } from "@/comman/constants";
import { Queue } from "bullmq";

export const jobQueue = new Queue(FILE_PROCESS_QUEUE, {
  connection: {
    host: Bun.env.REDIS_HOST || "localhost",
    port: parseInt(Bun.env.REDIS_PORT || "6379s"),
  },
});
