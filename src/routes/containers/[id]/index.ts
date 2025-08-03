import { DockerNS, Route } from "@/types";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { Responses } from "@/types/Http";

export default {
  method: "DELETE",
  handler: async ({ params }) => {
    const id = params.id.value;
    try {
      const status = await dockerService.getServerStatus(id);
      if (status?.running) {
        await dockerService.stopServer(id);
      }
      await dockerService.removeServer(id);
      return Responses.Ok({
        message: `Server ${id} deleted successfully`,
      });
    } catch (e: any) {
      const error = e as DockerNS.HttpError;
      console.error(`Error deleting server ${id}:`, error);
      return Responses.FromCode(error.statusCode, error.json.message || "");
    }
  },
} as Route<{
  id: Param<string>;
}>;
