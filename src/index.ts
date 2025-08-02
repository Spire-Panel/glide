import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { OpenAPIHono } from "@hono/zod-openapi";

// Import routes
import servers from "./routes/servers";
import modpacks from "./routes/modpacks";
import docs from "./routes/docs";
import { env } from "./config/env";

// Read package.json for version
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

// Initialize Hono app
export const app = new Hono({
  // Enable request logging in development
  strict: env.NODE_ENV !== "production",
});

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Health check endpoint
app.get("/health", (c) =>
  c.json({
    status: "ok",
    message: "Glide Wings Daemon is running",
    version: packageJson.version || "0.1.0",
    environment: env.NODE_ENV,
  })
);

// Root route
app.get("/", (c) => {
  return c.redirect("/docs");
});

// API Routes
app.route("/api/v1/servers", servers);
app.route("/api/v1/modpacks", modpacks);

// Mount OpenAPI documentation
app.route("/docs", docs);

// 404 Handler
app.notFound((c) =>
  c.json(
    {
      status: 404,
      error: "Not Found",
      message: "The requested resource was not found",
    },
    404
  )
);

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      status: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
      ...(env.NODE_ENV === "development" && { details: err.message }),
    },
    500
  );
});

// Start the server in non-test environments
if (env.NODE_ENV !== "test") {
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    () => {
      console.log(`Server is running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Docker socket: ${env.DOCKER_SOCKET_PATH}`);
      console.log(`Server data path: ${env.SERVER_DATA_PATH}`);
    }
  );
}
