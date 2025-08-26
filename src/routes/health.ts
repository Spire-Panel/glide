import { Route } from "@/types";
import { Responses } from "@/types/Http";
import process from "process";
import { statfsSync } from "fs";
import os from "os";
import { redisService } from "@/services/Redis.service";

export default {
  handler: async () => {
    const memoryUsage = process.memoryUsage();

    const rssMB = memoryUsage.rss / 1024 / 1024;
    const systemTotalMB = os.totalmem() / 1024 / 1024;
    const systemFreeMB = os.freemem() / 1024 / 1024;

    const memoryUsageMB = Math.round(
      (os.totalmem() - os.freemem()) / 1024 / 1024
    ); // process memory used
    const memoryUsageTotal = Math.round(systemTotalMB); // total system RAM
    const memoryUsageFree = Math.round(systemFreeMB); // free system RAM
    const memoryUsagePercent = Math.round(
      (memoryUsageMB / systemTotalMB) * 100
    ); // % of system RAM
    const totalMemory = memoryUsageMB;

    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = Math.round(
      (cpuUsage.user + cpuUsage.system) / 1024 / 1024
    );
    const cpuCores = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model;

    const uptime = process.uptime();
    const stat = statfsSync("/");

    const blockSize = stat.bsize;
    const totalBlocks = stat.blocks;
    const availableBlocks = stat.bavail;

    const storageTotalSpace = totalBlocks * blockSize;
    const storageFreeSpace = availableBlocks * blockSize;
    const storageUsedSpace = storageTotalSpace - storageFreeSpace;
    const storageUsedPercent = (storageUsedSpace / storageTotalSpace) * 100;

    const lastSeen = new Date();

    return Responses.Ok({
      memoryUsageMB,
      memoryUsagePercent,
      memoryUsageTotal,
      memoryUsageFree,
      totalMemory,
      cpuUsagePercent,
      cpuCores,
      cpuModel,
      uptime,
      storageFreeSpace,
      storageUsedSpace,
      storageTotalSpace,
      storageUsedPercent,
      lastSeen,
    });
  },
} as Route;
