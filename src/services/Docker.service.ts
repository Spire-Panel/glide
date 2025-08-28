import Docker from "dockerode";
import { z } from "zod";
import path from "path";
import { env } from "@/config/env";
import { Responses } from "@/types/Http";
import { ZodErrorFormatter } from "@/lib/utils";

// Schema for server configuration
export const ServerTypeEnum = z.enum([
  "VANILLA",
  "PAPER",
  "FORGE",
  "FABRIC",
  "AUTO_CURSEFORGE",
  "FTBA",
]);
const ServerConfigSchema = z.object({
  name: z.string().min(3).max(32),
  version: z.string().min(1),
  type: ServerTypeEnum,
  port: z.number().int().min(1024).max(49151).default(25565),
  memory: z.string().default("2G"),
  modpackId: z.string().or(z.number()).optional(),
});

type ServerConfig = z.infer<typeof ServerConfigSchema>;

export class DockerService {
  private docker: Docker;
  private serverDataPath: string;
  private containerConfigs: Record<string, ServerConfig> = {};
  private containerLabel = "com.glide.mc.server";

  constructor() {
    let docker_url = env["DOCKER_SOCKET_PATH"];
    if (docker_url?.match(/docker\.sock/)) {
      this.docker = new Docker({
        socketPath: docker_url,
      });
    } else {
      // Handle both http://host:port and host:port formats
      const url = new URL(
        docker_url?.startsWith("http") ? docker_url : `tcp://${docker_url}`
      );
      const protocol = url.protocol.replace(":", "") as
        | "http"
        | "https"
        | "ssh";

      this.docker = new Docker({
        protocol: protocol,
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 2375,
      });
    }

    // Set server data path - convert to absolute path
    const defaultPath = path.join(process.cwd(), "data", "servers");
    this.serverDataPath = env["SERVER_DATA_PATH"]
      ? path.resolve(env["SERVER_DATA_PATH"])
      : defaultPath;

    // Ensure the server data directory exists
    if (!require("fs").existsSync(this.serverDataPath)) {
      require("fs").mkdirSync(this.serverDataPath, { recursive: true });
    }
  }

  /**
   * List all Minecraft server containers
   */
  async listServers() {
    const containers = this.docker.listContainers({
      all: true, // Include stopped containers
      filters: {
        label: [this.containerLabel],
      },
    });

    const result = containers.then((containers) => {
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
    });

    return result;
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
    const validatedConfig = ServerConfigSchema.safeParse(config);
    if (!validatedConfig.success) {
      throw Responses.BadRequest("Invalid body", {
        details: ZodErrorFormatter(ServerConfigSchema, validatedConfig.error),
      });
    }

    // Generate a unique ID for the server
    const serverId = `mc-${Date.now()}`;
    const serverPath = path.join(this.serverDataPath, serverId);

    // Determine the Docker image based on server type
    let imageName: string;
    switch (validatedConfig.data.type) {
      case "PAPER":
        imageName = `itzg/minecraft-server:java17`;
        break;
      case "FORGE":
        imageName = `itzg/minecraft-server:java17-forge`;
        break;
      case "FABRIC":
        imageName = `fabricmc/fabric-loader:latest`;
        break;
      case "AUTO_CURSEFORGE":
        imageName = `itzg/minecraft-server`;
        break;
      case "FTBA":
        imageName = `itzg/minecraft-server:java8-multiarch`;
        break;
      default: // VANILLA
        imageName = `itzg/minecraft-server:java17`;
    }

    // Pull image if it doesn't exist
    try {
      await this.docker.pull(imageName);
    } catch (error) {
      console.error("Error pulling image:", error);
    }

    // Create container
    const ftb_modpack_id: number =
      validatedConfig.data.modpackId &&
      typeof validatedConfig.data.modpackId === "string"
        ? parseInt(validatedConfig.data.modpackId!)
        : (validatedConfig.data.modpackId as number);

    // Prepare environment variables
    const envVars: string[] = [
      "EULA=TRUE",
      "CREATE_CONSOLE_IN_PIPE=true",
      `TYPE=${validatedConfig.data.type.toLowerCase()}`,
      `VERSION=${validatedConfig.data.version}`,
      `MEMORY=${validatedConfig.data.memory}`,
    ];

    // Add CurseForge specific environment variables if needed
    if (validatedConfig.data.type === "AUTO_CURSEFORGE") {
      if (env.CURSEFORGE_API_KEY) {
        envVars.push(`CF_API_KEY=${env.CURSEFORGE_API_KEY}`);
      }
      if (validatedConfig.data.modpackId) {
        envVars.push(`CF_PAGE_URL=${validatedConfig.data.modpackId}`);
      }
    } else if (validatedConfig.data.type === "FTBA") {
      envVars.push(`FTB_MODPACK_ID=${ftb_modpack_id}`);
    }

    const container = await this.docker.createContainer({
      Image: imageName,
      name: `mc-${validatedConfig.data.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      Labels: {
        [this.containerLabel]: "true",
      },
      Env: envVars,
      HostConfig: {
        PortBindings: {
          "25565/tcp": [{ HostPort: validatedConfig.data.port.toString() }],
        },
        Binds: [`${serverPath}:/data`],
      },
    });

    return {
      id: container.id,
      name: validatedConfig.data.name,
      status: "CREATED",
      config: {
        name: validatedConfig.data.name,
        type: validatedConfig.data.type,
        port: validatedConfig.data.port,
        memory: validatedConfig.data.memory,
        modpackId: validatedConfig.data.modpackId,
      },
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
   * Delete a Minecraft server container
   */
  async removeServer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.remove();
    return { status: "REMOVED" };
  }

  /**
   * Restart a Minecraft server container
   */
  async restartServer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.restart();
    return { status: "RESTARTED" };
  }

  /**
   * Get server status
   */
  async getServerStatus(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      const data = await container.inspect();
      const stats = await container.stats({
        "one-shot": true,
        stream: false,
      });

      return {
        id: data.Id,
        name: data.Name.replace(/^\//, ""),
        status: data.State.Status.toUpperCase(),
        running: data.State.Running,
        createdAt: data.Created,
        ipAddress: data.NetworkSettings.IPAddress,
        ports: data.NetworkSettings.Ports,
        memory: stats.memory_stats,
        cpu: stats.cpu_stats,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List directory contents and return as an array of FileInfo objects
   */

  /**
   * List directory contents and return as an array of FileInfo objects
   */
  private async readDirectory(
    container: Docker.Container,
    dirPath: string
  ): Promise<Array<{ name: string; isDirectory: boolean }> | null> {
    const exec = await container.exec({
      Cmd: ["ls", "-p", dirPath], // -p flag appends / to directory names
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    // check if there was an error
    stream.on("error", (error: any) => {
      throw error;
    });

    // check if ls had an error
    stream.on("exit", (code: number) => {
      if (code !== 0) {
        throw new Error(`ls failed with code ${code}`);
      }
    });

    await new Promise<void>((resolve) => stream.on("end", resolve));

    const files = output
      .split("\n")
      .map((item: string) => {
        let cleaned = item.replace(/[^\x20-\x7E\n]/g, "");
        cleaned = cleaned.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
        return cleaned.trim();
      })
      .filter(Boolean)
      .filter((item: string) => item !== "./" && item !== "../")
      .map((item: string) => {
        const isDirectory = item.endsWith("/");
        const name = isDirectory ? item.slice(0, -1) : item;
        const cleanName = name.replace(/[^\x20-\x7E]/g, "");
        return {
          name: cleanName,
          isDirectory,
        };
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
      });

    const file = files.find((file) => {
      if (file.name.includes("No such file or directory")) {
        return true;
      }
      return false;
    });
    if (file) {
      return null;
    }

    return files;
  }

  /**
   * List files
   */
  async listFiles(containerId: string, path: `/data/${string}` = "/data/") {
    const container = this.docker.getContainer(containerId);
    const output = await this.readDirectory(container, path);
    if (!output) {
      throw Responses.NotFound("No such file or directory");
    }

    return output;
  }

  async deleteFile(containerId: string, path: `/data/${string}`) {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ["rm", path],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    // check if there was an error
    stream.on("error", (error: any) => {
      throw error;
    });

    // check if rm had an error
    stream.on("exit", (code: number) => {
      if (code !== 0) {
        throw new Error(`rm failed with code ${code}`);
      }
    });

    await new Promise<void>((resolve) => stream.on("end", resolve));

    if (output.includes("No such file or directory")) {
      throw Responses.NotFound("No such file or directory");
    }

    return output;
  }

  async createFile(containerId: string, path: `/data/${string}`) {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ["touch", path],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    // check if there was an error
    stream.on("error", (error: any) => {
      throw error;
    });

    // check if touch had an error
    stream.on("exit", (code: number) => {
      if (code !== 0) {
        throw new Error(`touch failed with code ${code}`);
      }
    });

    await new Promise<void>((resolve) => stream.on("end", resolve));

    if (output.includes("No such file or directory")) {
      throw Responses.NotFound("No such file or directory");
    }

    return output;
  }

  async readFile(containerId: string, path: `/data/${string}`) {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ["cat", path],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    // check if there was an error
    stream.on("error", (error: any) => {
      throw error;
    });

    // check if cat had an error
    stream.on("exit", (code: number) => {
      if (code !== 0) {
        throw new Error(`cat failed with code ${code}`);
      }
    });

    await new Promise<void>((resolve) => stream.on("end", resolve));

    if (output.includes("No such file or directory")) {
      throw Responses.NotFound("No such file or directory");
    }

    return output
      .trim()
      .replace(/�/g, "")
      .replace(/[^\x20-\x7E\n]/g, "");
  }

  async getContainer(containerId: string) {
    const container = await this.docker.getContainer(containerId);
    return container;
  }

  async executeCommand(containerId: string, command: string) {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ["sudo", "/bin/bash", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});

    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    // check if there was an error
    stream.on("error", (error: any) => {
      throw error;
    });

    // check if exec had an error
    stream.on("exit", (code: number) => {
      if (code !== 0) {
        throw new Error(`exec failed with code ${code}`);
      }
    });

    await new Promise<void>((resolve) => stream.on("end", resolve));

    if (output.includes("No such file or directory")) {
      throw Responses.NotFound("No such file or directory");
    }

    output = output
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/\u0000/g, "")
      .replace(/\u0002/g, "")
      .replace(/\u0001/g, "")
      .replace(/\u001e/g, "")
      .replace(/\f/g, "")
      .replace(/\u0011/g, "");

    return output;
  }
}

export const dockerService = new DockerService();
