import { OpenAPIHono, z } from "@hono/zod-openapi";
import { dockerService } from "../services/docker.service";
import { env } from "../config/env";
import type { Context } from "hono";
import type { Env } from "hono";
import { Errors, Responses, withErrorHandler } from "@/utils/errors";
import { StatusCode } from "hono/utils/http-status";

// Helper function to safely cast status codes
const getStatusCode = (status: number): StatusCode => {
  const validStatuses = [200, 201, 204, 400, 401, 403, 404, 409, 500];
  return (validStatuses.includes(status) ? status : 500) as StatusCode;
};

// Create a new OpenAPI Hono instance for servers routes
export const servers = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      if (result.error instanceof Error) {
        if (
          "statusCode" in result.error &&
          typeof result.error.statusCode === "number"
        ) {
          // Handle HttpError instances
          const status = getStatusCode(result.error.statusCode);
          return c.json(
            {
              success: false,
              error: result.error.message,
              message: result.error.message,
              ...("details" in result.error && {
                details: (result.error as any).details,
              }),
            },
            status
          ) as any; // Type assertion needed due to OpenAPIHono types
        }

        // Handle other errors
        return c.json(
          {
            success: false,
            error: "Internal Server Error",
            message: result.error.message,
          },
          500 as StatusCode
        ) as any;
      }

      // Handle unknown errors
      return c.json(
        {
          success: false,
          error: "Internal Server Error",
          message: "An unknown error occurred",
        },
        500 as StatusCode
      ) as any;
    }

    // If successful, return undefined to let OpenAPIHono handle the response
    return undefined;
  },
});

// Server type enum
const ServerType = z.enum(["VANILLA", "PAPER", "FORGE", "FABRIC"]);

// Common schemas
const serverSchema = z.object({
  id: z.string().openapi({
    example: "server-123",
    description: "Unique identifier for the server",
  }),
  name: z.string().min(3).max(32).openapi({
    example: "my-server",
    description: "Unique name for the server",
  }),
  version: z.string().min(1).openapi({
    example: "1.20.1",
    description: "Minecraft version",
  }),
  type: ServerType.openapi({
    example: "PAPER",
    description: "Type of Minecraft server",
  }),
  port: z.number().int().min(1024).max(49151).openapi({
    example: 25565,
    description: "Port the server is running on",
  }),
  status: z.enum(["STARTING", "RUNNING", "STOPPED", "ERROR"]).openapi({
    example: "RUNNING",
    description: "Current status of the server",
  }),
  memory: z.string().openapi({
    example: "2G",
    description: "Memory allocation for the server",
  }),
  createdAt: z.string().datetime().openapi({
    example: "2023-01-01T00:00:00Z",
    description: "When the server was created",
  }),
  modpackId: z.string().optional().openapi({
    example: "12345",
    description: "ID of the installed modpack, if any",
  }),
});

// Request schemas
const createServerSchema = z.object({
  name: z.string().min(3).max(32).openapi({
    example: "my-server",
    description: "Unique name for the server",
  }),
  version: z.string().min(1).openapi({
    example: "1.20.1",
    description: "Minecraft version to use",
  }),
  type: ServerType.openapi({
    example: "PAPER",
    description: "Type of Minecraft server",
  }),
  port: z.number().int().min(1024).max(49151).optional().openapi({
    example: 25565,
    description: "Port to expose the server on (default: auto-assigned)",
  }),
  memory: z.string().default(env.DEFAULT_MEMORY).openapi({
    example: "2G",
    description: "Memory allocation for the server",
  }),
  modpackId: z.string().optional().openapi({
    example: "12345",
    description: "Optional modpack ID to install",
  }),
});

const updateServerSchema = createServerSchema.partial();

// Register schemas for OpenAPI documentation
servers.openAPIRegistry.register("Server", serverSchema);
servers.openAPIRegistry.register("CreateServer", createServerSchema);
servers.openAPIRegistry.register("UpdateServer", updateServerSchema);

// List all servers
servers.openapi(
  {
    method: "get",
    path: "/",
    tags: ["Servers"],
    summary: "List all Minecraft servers",
    responses: {
      200: {
        description: "List of all servers",
        content: {
          "application/json": {
            schema: z.array(serverSchema),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({
              status: z.number(),
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
    },
  },
  async (c) => {
    throw Errors.BadRequest("testing an error");
    const serverList = await dockerService.listServers().catch((e) => {
      throw Errors.InternalServerError("Failed to list servers", { error: e });
    });

    // Map the server data to match the serverSchema
    const formattedServers = serverList.map((server) => {
      // Ensure the status is one of the allowed values
      const status = (
        ["STOPPED", "STARTING", "RUNNING", "ERROR"].includes(server.status)
          ? server.status
          : "STOPPED"
      ) as "STOPPED" | "STARTING" | "RUNNING" | "ERROR";

      // Create a properly typed server object that matches serverSchema
      const serverData = {
        id: server.id,
        name: server.name,
        version: server.version,
        type: server.type,
        port: server.port || 25565, // Default port if not specified
        status,
        memory: server.memory || "2G",
        createdAt: server.created || new Date().toISOString(),
        modpackId: server.modpackId,
      };

      return serverData;
    });

    // Return the response with proper typing
    return Responses.Success(c, formattedServers);
  }
);

// Create a new server
servers.openapi(
  {
    method: "post",
    path: "/",
    tags: ["Servers"],
    summary: "Create a new Minecraft server",
    request: {
      body: {
        content: {
          "application/json": {
            schema: createServerSchema,
          },
        },
        required: true,
      },
    },
    responses: {
      201: {
        description: "Server created successfully",
        content: {
          "application/json": {
            schema: serverSchema,
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              status: z.number(),
              error: z.string(),
              message: z.string(),
              details: z.any().optional(),
            }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({
              status: z.number(),
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
    },
  },
  async (c) => {
    try {
      const data = c.req.valid("json") as z.infer<typeof createServerSchema>;

      // Create the server using the Docker service
      const server = await dockerService.createServer({
        ...data,
        port: data.port || 25565, // Use provided port or default
      });

      // Format the response to match serverSchema
      const response: z.infer<typeof serverSchema> = {
        id: server.id,
        name: data.name,
        version: data.version,
        type: data.type,
        port: server.config.port || data.port || 25565,
        status: "STOPPED", // New servers are initially stopped
        memory: data.memory || "2G",
        createdAt: new Date().toISOString(),
        modpackId: data.modpackId,
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Failed to create server:", error);
      return c.json(
        {
          status: 500,
          error: "Internal Server Error",
          message:
            error instanceof Error ? error.message : "Failed to create server",
        },
        500
      );
    }
  }
);

/**
 * @openapi
 * /servers:
 *   get:
 *     summary: List all Minecraft servers
 *     tags: [Servers]
 *     responses:
 *       200:
 *         description: List of servers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Server'
 */
servers.get("/", async (c) => {
  try {
    // In a real implementation, this would query a database
    // For now, return an empty array
    const servers: unknown[] = [];

    return c.json({
      status: "success",
      data: servers,
    });
  } catch (error) {
    console.error("Error listing servers:", error);
    return c.json(
      {
        status: "error",
        message: "Failed to list servers",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /servers/{id}:
 *   get:
 *     summary: Get server details
 *     tags: [Servers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Server ID
 *     responses:
 *       200:
 *         description: Server details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Server'
 *       404:
 *         description: Server not found
 */
servers.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const status = await dockerService.getServerStatus(id);

    if (!status) {
      return c.json(
        {
          status: "error",
          message: `Server ${id} not found`,
        },
        404
      );
    }

    return c.json({
      status: "success",
      data: status,
    });
  } catch (error) {
    console.error(`Error getting server ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to get server ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /servers/{id}/start:
 *   post:
 *     summary: Start a server
 *     tags: [Servers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Server ID
 *     responses:
 *       200:
 *         description: Server started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Server started successfully
 */
servers.post("/:id/start", async (c) => {
  const id = c.req.param("id");

  try {
    await dockerService.startServer(id);

    return c.json({
      status: "success",
      message: `Server ${id} started successfully`,
    });
  } catch (error) {
    console.error(`Error starting server ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to start server ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /servers/{id}/stop:
 *   post:
 *     summary: Stop a server
 *     tags: [Servers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Server ID
 *     responses:
 *       200:
 *         description: Server stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Server stopped successfully
 */
servers.post("/:id/stop", async (c) => {
  const id = c.req.param("id");

  try {
    await dockerService.stopServer(id);

    return c.json({
      status: "success",
      message: `Server ${id} stopped successfully`,
    });
  } catch (error) {
    console.error(`Error stopping server ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to stop server ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /servers/{id}:
 *   delete:
 *     summary: Delete a server
 *     tags: [Servers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Server ID
 *     responses:
 *       200:
 *         description: Server deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Server deleted successfully
 */
servers.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // In a real implementation, this would delete the server container and data
    // For now, just return success
    return c.json({
      status: "success",
      message: `Server ${id} deleted successfully`,
    });
  } catch (error) {
    console.error(`Error deleting server ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to delete server ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Server:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         version:
 *           type: string
 *         type:
 *           type: string
 *           enum: [VANILLA, PAPER, FORGE, FABRIC]
 *         port:
 *           type: integer
 *         memory:
 *           type: string
 *         status:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         ipAddress:
 *           type: string
 *         ports:
 *           type: object
 */

export default servers;
