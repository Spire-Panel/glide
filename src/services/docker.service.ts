import Docker from "dockerode";
import { z } from "zod";
import path from "path";

// Schema for server configuration
const ServerConfigSchema = z.object({
  name: z.string().min(3).max(32),
  version: z.string().min(1),
  type: z.enum(["VANILLA", "PAPER", "FORGE", "FABRIC"]),
  port: z.number().int().min(1024).max(49151).default(25565),
  memory: z.string().default("2G"),
  modpackId: z.string().optional(),
});

type ServerConfig = z.infer<typeof ServerConfigSchema>;

class DockerService {
  private docker: Docker;
  private serverDataPath: string;
  private containerLabel = "com.glide.mc.server";

  constructor() {
    // Initialize Docker client
    this.docker = new Docker({
      socketPath: process.env["DOCKER_SOCKET_PATH"] || "/var/run/docker.sock",
    });

    // Set server data path
    this.serverDataPath = process.env["SERVER_DATA_PATH"] || "./data/servers";
  }

  /**
   * List all Minecraft server containers
   */
  async listServers() {
    try {
      const containers = await this.docker.listContainers({
        all: true, // Include stopped containers
        filters: {
          label: [this.containerLabel],
        },
      });

      return Promise.all(
        containers.map(async (containerInfo) => {
          const container = this.docker.getContainer(containerInfo.Id);
          const inspectData = await container.inspect();
          const serverData = this.extractServerData(inspectData);

          return {
            id: containerInfo.Id,
            name: containerInfo.Names[0]?.replace(/^\//, "") || "unknown",
            state: containerInfo.State,
            created: new Date(containerInfo.Created * 1000).toISOString(),
            image: containerInfo.Image,
            ports: containerInfo.Ports || [],
            labels: containerInfo.Labels || {},
            ...serverData,
          };
        })
      );
    } catch (error) {
      console.error("Error listing servers:", error);
      throw new Error("Failed to list servers");
    }
  }

  /**
   * Extract server data from container inspection
   */
  private extractServerData(inspectData: Docker.ContainerInspectInfo) {
    const envVars = (inspectData.Config.Env || []).reduce<
      Record<string, string>
    >((acc, envVar) => {
      const [key, ...valueParts] = envVar.split("=");
      if (key) {
        acc[key] = valueParts.join("=");
      }
      return acc;
    }, {});

    const portBindings = inspectData.HostConfig?.PortBindings || {};
    const minecraftPort = portBindings["25565/tcp"]?.[0]?.HostPort || "";

    return {
      containerName: inspectData.Name?.replace(/^\//, "") || "unknown",
      version: envVars["VERSION"] || "unknown",
      type:
        (envVars["TYPE"] as "VANILLA" | "PAPER" | "FORGE" | "FABRIC") ||
        "VANILLA",
      port: minecraftPort ? parseInt(minecraftPort, 10) : 25565,
      memory: envVars["MEMORY"] || "2G",
      modpackId: envVars["MODPACK_ID"],
      status: inspectData.State?.Status || "unknown",
      startedAt: inspectData.State?.StartedAt,
      finishedAt: inspectData.State?.FinishedAt,
      error: inspectData.State?.Error,
    };
  }

  /**
   * Create a new Minecraft server container
   */
  async createServer(config: ServerConfig) {
    // Validate config
    const validatedConfig = ServerConfigSchema.parse(config);

    // Generate a unique ID for the server
    const serverId = `mc-${Date.now()}`;
    const serverPath = path.join(this.serverDataPath, serverId);

    // Determine the Docker image based on server type
    let imageName: string;
    switch (validatedConfig.type) {
      case "PAPER":
        imageName = `itzg/minecraft-server:java17`;
        break;
      case "FORGE":
        imageName = `itzg/minecraft-server:java17-forge`;
        break;
      case "FABRIC":
        imageName = `fabricmc/fabric-loader:latest`;
        break;
      default: // VANILLA
        imageName = `itzg/minecraft-server:java17`;
    }

    // Create container
    const container = await this.docker.createContainer({
      Image: imageName,
      name: `mc-${validatedConfig.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      Env: [
        `EULA=TRUE`,
        `TYPE=${validatedConfig.type.toLowerCase()}`,
        `VERSION=${validatedConfig.version}`,
        `MEMORY=${validatedConfig.memory}`,
      ],
      HostConfig: {
        PortBindings: {
          "25565/tcp": [{ HostPort: validatedConfig.port.toString() }],
        },
        Binds: [`${serverPath}:/data`],
      },
    });

    return {
      id: container.id,
      name: validatedConfig.name,
      status: "CREATED",
      config: validatedConfig,
    };
  }

  /**
   * Start a Minecraft server container
   */
  async startServer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.start();
    return { status: "STARTED" };
  }

  /**
   * Stop a Minecraft server container
   */
  async stopServer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.stop();
    return { status: "STOPPED" };
  }

  /**
   * Get server status
   */
  async getServerStatus(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      const data = await container.inspect();

      return {
        id: data.Id,
        name: data.Name.replace(/^\//, ""),
        status: data.State.Status.toUpperCase(),
        running: data.State.Running,
        createdAt: data.Created,
        ipAddress: data.NetworkSettings.IPAddress,
        ports: data.NetworkSettings.Ports,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Install a modpack to a server
   */
  async installModpack(
    containerId: string,
    modpackId: string,
    version?: string
  ) {
    // This is a simplified example. In a real implementation, you would:
    // 1. Download the modpack from a source (e.g., CurseForge, Modrinth)
    // 2. Extract the modpack to the server's mods/config folders
    // 3. Restart the server if needed

    const container = this.docker.getContainer(containerId);

    // Example: Install modpack using a helper script inside the container
    const exec = await container.exec({
      Cmd: ["/bin/sh", "-c", `install-modpack ${modpackId} ${version || ""}`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    return new Promise((resolve, reject) => {
      let output = "";
      stream.on("data", (chunk) => {
        output += chunk.toString();
      });

      stream.on("end", () => {
        resolve({
          success: true,
          output,
        });
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  }
}

export const dockerService = new DockerService();
