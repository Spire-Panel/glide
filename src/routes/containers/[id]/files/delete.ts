import { DockerNS, Route } from "@/types";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { Responses } from "@/types/Http";
import { PathSanitizer } from "@/utils";

export default {
  url: "/containers/:id/files",
  method: "DELETE",
  handler: async ({ params, request }) => {
    const id = params.id.value;
    const queryParams = request.query as {
      path: string;
    };
    queryParams.path = PathSanitizer(queryParams.path);
    if (!queryParams.path) {
      queryParams.path = "/data/";
    }
    if (!queryParams.path.startsWith("/data/")) {
      queryParams.path = `/data/${queryParams.path}`;
    }
    const path = queryParams.path as `/data/${string}`;

    const files = await dockerService.deleteFile(id, path);
    return Responses.Ok(files);
  },
} as Route<{
  id: Param<string>;
}>;
