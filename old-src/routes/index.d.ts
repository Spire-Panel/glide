import { Hono } from "hono";

declare const servers: Hono;
declare const modpacks: Hono;

export { servers, modpacks };

declare module "hono" {
  interface ContextVariableMap {
    // Add any custom context variables here
  }
}
