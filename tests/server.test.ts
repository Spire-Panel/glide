import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../src/index";
import { env } from "../src/config/env";

// Test server configuration
const TEST_PORT = 3001;
const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

// Create a test request handler
const handler = async (req: Request): Promise<Response> => {
  return await app.fetch(req);
};

// Mock environment variables
process.env.NODE_ENV = "test";

describe("API Endpoints", () => {
  // Test the root endpoint
  it("should return API status", async () => {
    const response = await handler(new Request(TEST_BASE_URL));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("environment", env.NODE_ENV);
  });

  // Test servers endpoint
  describe("Servers API", () => {
    it("should return an empty array of servers", async () => {
      const response = await handler(
        new Request(`${TEST_BASE_URL}/api/v1/servers`)
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status", "success");
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // Test modpacks endpoint
  describe("Modpacks API", () => {
    it("should return an empty array of modpacks", async () => {
      const response = await handler(
        new Request(`${TEST_BASE_URL}/api/v1/modpacks`)
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status", "success");
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});

// Clean up after tests
// Note: In a real test environment, you'd want to clean up any test data
// and shut down the server properly
