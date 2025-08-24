import { DockerNS, Route } from "@/types";
import { Responses } from "@/types/Http";
import { dockerService } from "@/services/Docker.service";

export default {
  handler: async () => {
    try {
      const servers = await dockerService.listServers();
      return Responses.Ok(servers);
    } catch (e: any) {
      const error = e as DockerNS.HttpError;
      console.error(`Error listing servers:`, error);
      return Responses.FromCode(error.statusCode, error.json?.message || "");
    }
  },
} as Route;
