import { dockerService } from "@/services/Docker.service";
import { DockerNS, Route } from "@/types";
import { Responses } from "@/types/Http";
import { Param } from "@/types/Routes";

export default {
  method: "POST",
  handler: async ({ params }) => {
    const id = params.id.value;
    try {
      await dockerService.restartServer(id);
      return Responses.Ok({
        message: `Server ${id} restarted successfully`,
      });
    } catch (e: any) {
      const error = e as DockerNS.HttpError;
      console.error(`Error restarting server ${id}:`, error);
      return Responses.FromCode(error.statusCode, error.json.message || "");
    }
  },
} as Route<{
  id: Param<string>;
}>;
