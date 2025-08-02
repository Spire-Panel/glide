import { Hono } from "hono";

const app = new Hono();

app.get("/hello-world", (c) => {
  return c.text("Hello Hono!");
});

export default app;
