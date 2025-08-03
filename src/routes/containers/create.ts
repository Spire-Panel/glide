import { env } from "@/config/env";
import { ZodErrorFormatter } from "@/lib/utils";
import { dockerService } from "@/services/Docker.service";
import { DockerNS, Route } from "@/types";
import { Responses } from "@/types/Http";
import { z } from "zod";

const createServerSchema = z.object({
  name: z.string().min(3).max(32),
  version: z.string().min(1).default("1.20.1"),
  type: z.enum(["VANILLA", "PAPER", "FORGE", "FABRIC"]).default("VANILLA"),
  port: z.number().int().min(1024).max(49151).optional().default(25565),
  memory: z.string().default(env.DEFAULT_MEMORY),
});
type CreateServerSchema = typeof createServerSchema;

export default {
  url: "/containers",
  method: "POST",
  handler: async ({ request, body }) => {
    const validatedBody = createServerSchema.safeParse(body);
    if (!validatedBody.success) {
      throw Responses.BadRequest("Invalid body", {
        details: ZodErrorFormatter<CreateServerSchema>(
          createServerSchema,
          validatedBody.error
        ),
      });
    }

    try {
      const server = await dockerService.createServer(validatedBody.data);

      return Responses.Ok({
        id: server.id,
        name: validatedBody.data.name,
        version: validatedBody.data.version,
        type: validatedBody.data.type,
        port: server.config.port || validatedBody.data.port || 25565,
        status: "STOPPED", // New servers are initially stopped
        memory: validatedBody.data.memory,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      const error = e as DockerNS.HttpError;
      throw Responses.FromCode(error.statusCode, error.json.message || "");
    }
  },
} as Route;
