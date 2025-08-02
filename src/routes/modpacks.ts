import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { dockerService } from "../services/docker.service";

const modpacks = new Hono();

// Schemas
const installModpackSchema = z.object({
  modpackId: z.string().min(1, "Modpack ID is required"),
  version: z.string().optional(),
  serverId: z.string().optional(), // If installing to an existing server
});

const searchModpacksSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().positive().max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

/**
 * @openapi
 * /modpacks/install:
 *   post:
 *     summary: Install a modpack
 *     tags: [Modpacks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [modpackId]
 *             properties:
 *               modpackId:
 *                 type: string
 *                 description: ID of the modpack to install
 *               version:
 *                 type: string
 *                 description: Specific version of the modpack
 *               serverId:
 *                 type: string
 *                 description: Optional server ID to install the modpack to
 *     responses:
 *       202:
 *         description: Modpack installation started
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
 *                   example: Modpack installation started
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: INSTALLING
 *       400:
 *         description: Invalid request body
 */
modpacks.post(
  "/install",
  zValidator("json", installModpackSchema),
  async (c) => {
    const data = c.req.valid("json");

    try {
      // If serverId is provided, install to existing server
      if (data.serverId) {
        const result = await dockerService.installModpack(
          data.serverId,
          data.modpackId,
          data.version
        );

        return c.json(
          {
            status: "success",
            message: "Modpack installation started for existing server",
            data: {
              id: data.modpackId,
              serverId: data.serverId,
              status: "INSTALLING",
            },
          },
          202
        );
      }

      // Otherwise, create a new server with the modpack
      // This would be implemented in a real scenario
      return c.json(
        {
          status: "success",
          message: "Modpack installation started for new server",
          data: {
            id: data.modpackId,
            status: "CREATING_SERVER",
          },
        },
        202
      );
    } catch (error) {
      console.error("Error installing modpack:", error);
      return c.json(
        {
          status: "error",
          message: "Failed to install modpack",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @openapi
 * /modpacks:
 *   get:
 *     summary: List installed modpacks
 *     tags: [Modpacks]
 *     responses:
 *       200:
 *         description: List of installed modpacks
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       version:
 *                         type: string
 *                       installedAt:
 *                         type: string
 *                         format: date-time
 */
modpacks.get("/", async (c) => {
  try {
    // In a real implementation, this would query a database
    const modpacks: unknown[] = [];

    return c.json({
      status: "success",
      data: modpacks,
    });
  } catch (error) {
    console.error("Error listing modpacks:", error);
    return c.json(
      {
        status: "error",
        message: "Failed to list modpacks",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /modpacks/search:
 *   get:
 *     summary: Search for modpacks
 *     tags: [Modpacks]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Search results
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       downloads:
 *                         type: number
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
modpacks.get(
  "/search",
  zValidator("query", searchModpacksSchema),
  async (c) => {
    const { query, limit, offset } = c.req.valid("query");

    try {
      // In a real implementation, this would search a modpack API
      // For now, return an empty array
      const results: unknown[] = [];

      return c.json({
        status: "success",
        data: results,
        meta: {
          query,
          limit,
          offset,
          total: 0,
        },
      });
    } catch (error) {
      console.error("Error searching modpacks:", error);
      return c.json(
        {
          status: "error",
          message: "Failed to search modpacks",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @openapi
 * /modpacks/{id}:
 *   get:
 *     summary: Get modpack details
 *     tags: [Modpacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modpack ID
 *     responses:
 *       200:
 *         description: Modpack details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     version:
 *                       type: string
 *                     author:
 *                       type: string
 *                     downloadUrl:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Modpack not found
 */
modpacks.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // In a real implementation, this would fetch from a database or API
    // For now, return a placeholder
    return c.json({
      status: "success",
      data: {
        id,
        name: "Example Modpack",
        description: "A sample Minecraft modpack",
        version: "1.0.0",
        author: "Example Author",
        downloadUrl: "https://example.com/modpacks/example",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`Error getting modpack ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to get modpack ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @openapi
 * /modpacks/{id}/versions:
 *   get:
 *     summary: Get available versions for a modpack
 *     tags: [Modpacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modpack ID
 *     responses:
 *       200:
 *         description: List of available versions
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
 *                     type: string
 *                     example: "1.20.1"
 */
modpacks.get("/:id/versions", async (c) => {
  const id = c.req.param("id");

  try {
    // In a real implementation, this would fetch from a modpack API
    return c.json({
      status: "success",
      data: ["1.20.1", "1.19.4", "1.18.2"],
    });
  } catch (error) {
    console.error(`Error getting versions for modpack ${id}:`, error);
    return c.json(
      {
        status: "error",
        message: `Failed to get versions for modpack ${id}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

modpacks.get("/:id", async (c) => {
  const id = c.req.param("id");
  // TODO: Implement modpack details retrieval
  return c.json({
    status: "success",
    data: {
      id,
      name: "Example Modpack",
      versions: ["1.20.1", "1.19.4"],
    },
  });
});

export default modpacks;
