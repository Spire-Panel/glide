import { Server } from "socket.io";
import { dockerService } from "./Docker.service";
import { redisService } from "./Redis.service";

export class SocketService {
  private io: Server;

  constructor() {
    this.io = new Server({
      cors: {
        origin: "*",
      },
    });

    this.io.on("connection", (socket) => {
      socket.on("subscribe-logs", async (containerId: string) => {
        try {
          const container = await dockerService.getContainer(containerId);

          const logStream = await container.logs({
            stdout: true,
            stderr: true,
            follow: true,
            tail: 0,
          });

          logStream.on("data", (chunk: Buffer) => {
            let line = chunk.toString("utf-8").trim();
            if (line.length === 0) return;

            line = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");

            // Remove any special characters before the first '['
            const firstBracket = line.indexOf("[");
            if (firstBracket > 0) {
              line = line.substring(firstBracket);
            }

            redisService.addLog(containerId, line);
            socket.emit("log", line);
          });

          logStream.on("end", () => {
            socket.emit("log", "[stream ended]");
          });

          socket.on("disconnect", () => {
            // destroy the logstream
            logStream.removeAllListeners();
          });
        } catch (error: any) {
          console.error("Error subscribing to logs:", error);
          socket.emit(
            "log",
            `[error subscribing to logs] [error]: ${error.message}`
          );
        }
      });
    });
  }

  get socket() {
    return this.io;
  }
}

export const socketService = new SocketService();
