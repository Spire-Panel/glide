import { DockerNS, Route } from "@/types";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { Responses } from "@/types/Http";

export default {
  method: "GET",
  handler: async ({ params }) => {
    const id = params.id.value;
    try {
      const status = await dockerService.getServerStatus(id);
      return Responses.Ok(status);
    } catch (e: any) {
      const error = e as DockerNS.HttpError;
      console.error(`Error getting server status ${id}:`, error);
      return Responses.FromCode(error.statusCode, error.json.message || "");
    }
  },
} as Route<{
  id: Param<string>;
}>;
