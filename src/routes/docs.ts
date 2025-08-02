import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { apiReference } from "@scalar/hono-api-reference";
import servers from "./servers";
import modpacks from "./modpacks";

// Create a new OpenAPI Hono app
export const openapi = new OpenAPIHono();

// Basic OpenAPI configuration
openapi.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Glide Daemon API",
    version: "0.1.0",
    description: "API for managing Minecraft servers and modpacks",
  },
});

// Add security scheme (commented out for now as it's not used yet)
// openapi.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
//   type: "http",
//   scheme: "bearer",
//   bearerFormat: "JWT",
//   description: "Enter JWT token in the format: Bearer <token>",
// });

// Mount API routes
openapi.route("/api/v1/servers", servers);
openapi.route("/api/v1/modpacks", modpacks);

// Root documentation endpoint
openapi.get("/", (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    message: "Glide Daemon API Documentation",
    documentation: [
      {
        name: "OpenAPI Specification",
        url: `${baseUrl}/docs/openapi.json`,
        description: "The raw OpenAPI specification in JSON format",
      },
      {
        name: "Swagger UI",
        url: `${baseUrl}/docs/ui`,
        description: "Interactive API documentation with Swagger UI",
      },
      {
        name: "API Reference",
        url: `${baseUrl}/docs/reference`,
        description: "Alternative interactive API documentation",
      },
    ],
    version: "0.1.0",
  });
});

// Add Swagger UI route
openapi.get(
  "/ui",
  swaggerUI({
    url: "/docs/openapi.json",
    title: "Glide Daemon - API Documentation",
  })
);

// Add Scalar API Reference route (alternative to Swagger UI)
openapi.get(
  "/reference",
  apiReference({
    spec: {
      url: "/docs/openapi.json",
    },
    theme: "bluePlanet",
  } as any) // Type assertion to bypass type checking for now
);

// Add OpenAPI JSON endpoint
openapi.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Enter JWT token in the format: Bearer <token>",
});

// Simple health check endpoint
openapi.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "API is running",
    version: "0.1.0",
    environment: process.env["NODE_ENV"] || "development",
  });
});

export default openapi;
