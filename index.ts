import { Hono, MiddlewareHandler } from "hono";
import type { Context } from "hono";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
const app = new Hono();

app.use("*", logger());

class HttpError {
  public name: string;

  constructor(
    public status: ContentfulStatusCode,
    public message: string,
    public readonly details?: Record<string, any>
  ) {
    this.name = "HttpError";
    this.status = status;
    this.message = message;
    this.details = details;
  }

  toResponse(c: Context) {
    c.status(this.status);
    return c.json(
      {
        status: this.status,
        error: this.name,
        message: this.message,
        ...(this.details?.details
          ? { details: this.details.details }
          : (this.details && { details: this.details }) || {}),
      },
      this.status
    );
  }
}

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({
      fuck: "yyoou",
    });
  }

  return c.json({
    error: err.name,
    message: err.message,
  });
});

const Errors = {
  NotFound: (message = "Resource not found", details?: Record<string, any>) => {
    throw new HttpError(404, message, details);
  },
  BadRequest: (message = "Bad request", details?: Record<string, any>) => {
    throw new HttpError(400, message, details);
  },
  Unauthorized: (message = "Unauthorized", details?: Record<string, any>) => {
    throw new HttpError(401, message, details);
  },
  Forbidden: (message = "Forbidden", details?: Record<string, any>) => {
    throw new HttpError(403, message, details);
  },
  Conflict: (message = "Conflict", details?: Record<string, any>) => {
    throw new HttpError(409, message, details);
  },
  InternalServerError: (
    message = "Internal server error",
    details?: Record<string, any>
  ) => {
    throw new HttpError(500, message, details);
  },
  fromStatus: (
    status: ContentfulStatusCode,
    message?: string,
    details?: Record<string, any>
  ) => {
    throw new HttpError(status, message || "An error occurred", details);
  },
};

const errorHandler = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await next();
    } catch (error: any) {
      if (error instanceof HttpError) {
        return error.toResponse(c);
      }

      return c.json(
        {
          status: error.status,
          error: error.name,
          message: error.message,
        },
        error.status
      );
    }
  };
};

app.use("*", errorHandler());

app.get("/", (c) => {
  throw Errors.InternalServerError("helo");
});

export default {
  app,
  fetch: app.fetch,
};
