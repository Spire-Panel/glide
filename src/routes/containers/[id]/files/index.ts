import { DockerNS, Route } from "@/types";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { Responses } from "@/types/Http";

export default {
  method: "GET",
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
    let path = queryParams.path as `/data/${string}`;
    path = path.replace(/\/\//g, "/") as `/data/${string}`;

    const files = await dockerService.listFiles(id, path);

    const file = files.find((file) => file.name === path);
    if (!file) {
      // shows directory listing
      return Responses.Ok(files);
    }
    if (file.isDirectory) {
      return Responses.Ok(files);
    }

    const content = await dockerService.readFile(id, path);
    return Responses.Ok(content);
  },
} as Route<{
  id: Param<string>;
}>;
