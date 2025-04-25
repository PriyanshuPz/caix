// In your main server file or a dedicated worker starter file
import worker from "./src/server/worker";

worker;
console.log("Worker process started, listening for jobs...");
