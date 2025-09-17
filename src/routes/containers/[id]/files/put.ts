import { dockerService } from "@/services/Docker.service";
import { Route } from "@/types";
import { Responses } from "@/types/Http";
import { Param } from "@/types/Routes";
import { PathSanitizer } from "@/utils";

export default {
  url: "/containers/:id/files",
  method: "PUT",
  handler: async ({ body, params, request }) => {
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
    let path = queryParams.path as `/data/${string}`;
    path = path.replace(/\/\//g, "/") as `/data/${string}`;

    const data = body.data as string;
    await dockerService.writeFile(id, path, data);

    return Responses.Ok({
      message: `File ${path} updated successfully`,
    });
  },
} as Route<
  {
    id: Param<string>;
  },
  {
    data: string;
  }
>;
