import { DockerNS, Route } from "@/types";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { Responses } from "@/types/Http";

export default {
  url: "/containers/:id/files",
  method: "POST",
  handler: async ({ params, request }) => {
    const id = params.id.value;
    const queryParams = request.query as {
      path: string;
    };
    if (!queryParams.path) {
      queryParams.path = "/data/";
    }
    if (!queryParams.path.startsWith("/data/")) {
      queryParams.path = `/data/${queryParams.path}`;
    }
    const path = queryParams.path as `/data/${string}`;

    const files = await dockerService.createFile(id, path);
    return Responses.Ok(files);
  },
} as Route<{
  id: Param<string>;
}>;
