import { z } from "zod";
import { readFileSync } from "fs";
import path from "path";
import fs from "fs";

// Custom environment variable loader that doesn't use shell expansion
function loadEnv() {
  try {
    const envFile = readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
    const envVars: Record<string, string> = {};

    envFile.split("\n").forEach((line) => {
      // Skip comments and empty lines
      if (line.trim() === "" || line.startsWith("#")) return;

      // Split on first equals sign
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match?.[1] && match[2] !== undefined) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }
    });

    // Merge with process.env, with .env taking precedence
    return { ...process.env, ...envVars };
  } catch (error) {
    console.warn("No .env file found, using process.env");
    return { ...process.env };
  }
}

if (!fs.existsSync(path.resolve(process.cwd(), "spire_config.json"))) {
  throw new Error("No spire_config.json found");
}

// Load environment variables with our custom loader
const envVars = loadEnv();

// Define the schema for our environment variables
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  CURSEFORGE_API_KEY: z.coerce.string().optional(),

  // Docker configuration
  DOCKER_SOCKET_PATH: z.string().default("/var/run/docker.sock"),

  // Paths
  SERVER_DATA_PATH: z.string().default("./data/servers"),
  MODPACK_CACHE_PATH: z.string().default("./data/modpacks"),

  // Server defaults
  DEFAULT_MEMORY: z.string().default("2G"),
  DEFAULT_CPU_COUNT: z.coerce.number().default(2),
  DEFAULT_PORT: z.coerce.number().default(25565),

  // CORS
  ALLOWED_ORIGINS: z.string().default("*"),

  // SPIRE CONFIG
  SPIRE_TOKEN: z
    .string()
    .optional()
    .default(require("../../spire_config.json")?.token),
});

// Parse environment variables
try {
  envSchema.parse(envVars);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:", error.errors);
    process.exit(1);
  }
}

// Export validated environment variables
export const env = envSchema.parse(envVars);

// Debug: Log the loaded API key (first 5 and last 5 characters for security)
if (env.CURSEFORGE_API_KEY) {
  const key = env.CURSEFORGE_API_KEY;
  console.log(
    `Loaded Curseforge API Key: ${key.substring(0, 5)}...${key.substring(key.length - 5)}`
  );
}

// Export a type for the environment variables
export type Env = z.infer<typeof envSchema>;
