import Fastify from "fastify";
import fs from "fs";
import { FileRoute, Method, Params, Route } from "./types";
import path from "path";
import { env } from "./config/env";
import { HttpError, HttpResponse, Responses } from "./types/Http";

const app = Fastify({
  logger: {
    level: "info",
  },
});

app.register((fastify, opts) => {
  fastify.addContentTypeParser(
    "application/json",
    function (request, payload, done) {
      try {
        JSON.parse(payload.toString());
        done(null, payload);
      } catch (error) {
        done(error as Error);
      }
    }
  );
});

let routes: FileRoute[] = [];
const readRoutes = async (basePath: string, dir: string) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      await readRoutes(basePath, filePath);
      continue;
    } else {
      let req = await import(filePath);
      req = req.default ? req.default : req;

      const route = req as Route;

      const segments = filePath.split(path.sep);
      const relativePath = segments.slice(segments.indexOf(basePath) + 1);
      const withoutExt = relativePath.map((seg) =>
        seg.replace(/\.[tj]sx?$/, "")
      );

      if (withoutExt[withoutExt.length - 1] === "index") {
        withoutExt.pop();
      }

      let url = "/" + withoutExt.join("/");
      url = url === "" ? "/" : url;

      if (!route.method) route.method = "GET";
      if (!route.handler)
        route.handler = () => {
          return Responses.Ok({
            message: "You have not yet set up this route.",
          });
        };

      const params = filePath
        .split("/")
        .filter((p) => p.startsWith("["))
        .map((p, i) => {
          const noBrackets = p.replace("[", "").replace("]", "");
          const type = noBrackets.includes(":")
            ? noBrackets.split(":")[1]
            : "string";
          const name = noBrackets.split(":")[0];
          return {
            name,
            type,
            index: i,
          } as Params;
        });

      params.forEach((param) => {
        url = url.replace(`[${param.name}:${param.type}]`, `:${param.name}`);
        url = url.replace(`[${param.name}]`, `:${param.name}`);
      });

      routes.push({
        ...route,
        url: route.url || url,
        params: params as unknown as Params<Record<string, any>>[],
      });
    }
  }
  return routes;
};

await readRoutes("routes", path.join(__dirname, "routes"));

routes?.map((route) => {
  console.log(`Registered route at path: ${route.method} ${route.url}`);
  app.route({
    method: route.method!,
    url: route.url!,
    handler: async (request, reply) => {
      try {
        const requestParams = request.params as Record<string, any>;
        const params = route.params?.map((routeParam) => {
          const name = routeParam.name;
          let value = requestParams[routeParam.name];
          switch (routeParam.type) {
            case "string":
              value = value.toString();
              break;
            case "number":
              value = Number(value);
              break;
            case "boolean":
              value = Boolean(value);
              break;
          }

          return {
            name,
            type: routeParam.type,
            index: routeParam.index,
            value,
          };
        });

        const paramsObj: Record<string, any> = {};
        if (params)
          for (const param of params)
            paramsObj[param.name] = {
              type: param.type,
              index: param.index,
              value: param.value,
            };
        const body = request.body as Record<string, any>;
        const response = await route.handler!({
          request,
          env,
          logger: app.log,
          params: paramsObj,
          body,
        });

        if (response instanceof HttpResponse) {
          reply.status(response.status).send({
            success: true,
            data: response.body,
          });
        } else {
          reply.status(500).send({
            error: "Internal Server Error",
            success: false,
            detailed: response,
          });
        }
      } catch (error: any) {
        if (error instanceof HttpError) {
          console.log("httperror");
          reply.status(error.status).send({
            error: error.name,
            message: error.message,
            success: false,
            details: (error.details as any)?.details
              ? error.details.details
              : error.details
                ? error.details
                : undefined,
          });
        }

        reply.status(500).send({
          error: "Internal Server Error",
          success: false,
          message: error.message,
        });
      }
    },
  });
});

app.listen({ port: 3000 }, (err, addr) => {});

// const route = req as Route;
// const appMethods = [
//   "get",
//   "post",
//   "put",
//   "delete",
//   "patch",
//   "options",
//   "head",
// ] as const;
// appMethods.forEach((method) => {
//   if (route.method?.toLowerCase() === method) {
//     const requestUrl = console.log({ requestUrl });
//     app[method](filePath, (request, response) => {
//       const routeParams = params.map((p) => {
//         //
//       });
//       return route.handler({
//         request,
//         response,
//         env,
//         logger: app.log,
//         params,
//       });
//     });
//   }
// });
