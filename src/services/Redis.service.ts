import Redis from "ioredis";
import { socketService } from "./Socket.service";
import { env } from "@/config/env";

export class RedisService {
  private client: Redis;
  private readonly LOGS_KEY = "logs";
  private readonly LOG_LIMIT = 1000;

  constructor() {
    this.client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    });
  }

  async getLogs(containerId: string) {
    const logs = await this.client.lrange(
      `${this.LOGS_KEY}:${containerId}`,
      0,
      -1
    );
    for (let i = 0; i < logs.length; i++) {
      if (!logs[i]) continue;
      logs[i] = logs[i]!.replace(/[^\x20-\x7E\n]/g, "");
      const firstBracket = logs[i]!.indexOf("[");
      if (firstBracket > 0) {
        logs[i] = logs[i]!.substring(firstBracket);
      }
    }
    return logs.reverse();
  }

  async addLog(containerId: string, line: string) {
    this.client.lpush(`${this.LOGS_KEY}:${containerId}`, line);
    this.client.ltrim(`${this.LOGS_KEY}:${containerId}`, 0, this.LOG_LIMIT - 1);
  }
}

export const redisService = new RedisService();
