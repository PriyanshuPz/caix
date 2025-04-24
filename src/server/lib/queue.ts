import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis();
export const jobQueue = new Queue("jobs", { connection });
