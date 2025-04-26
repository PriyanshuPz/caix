// import { FILE_PROCESS_QUEUE } from "@/comman/constants";
// import { Queue } from "bullmq";

// export const jobQueue = new Queue(FILE_PROCESS_QUEUE, {
//   connection: {
//     host: Bun.env.REDIS_HOST || "localhost",
//     port: parseInt(Bun.env.REDIS_PORT || "6379s"),
//   },
// });

import PQueue from "p-queue";

export const queue = new PQueue({
  concurrency: 2, // or whatever number of parallel jobs you want
  intervalCap: 10,
  interval: 1000, // limits: max 10 tasks per second
});
