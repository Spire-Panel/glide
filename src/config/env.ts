import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define the schema for our environment variables
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

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
});

// Parse environment variables
try {
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:", error.errors);
    process.exit(1);
  }
}

// Export validated environment variables
export const env = envSchema.parse(process.env);

// Export a type for the environment variables
export type Env = z.infer<typeof envSchema>;
