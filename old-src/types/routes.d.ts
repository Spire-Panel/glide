declare module "./routes/servers" {
  import { Hono } from "hono";
  const servers: Hono;
  export default servers;
}

declare module "./routes/modpacks" {
  import { Hono } from "hono";
  const modpacks: Hono;
  export default modpacks;
}
