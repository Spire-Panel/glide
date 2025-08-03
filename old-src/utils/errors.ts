import { Context } from "hono";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

type SuccessResponse<T = any> = {
  success: true;
  data?: T;
};

type ErrorResponse = {
  success: false;
  error: string;
  message?: string;
  details?: any;
  stack?: string;
};

type SuccessStatusCode =
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226;
type ErrorStatusCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;
type HttpStatusCode = SuccessStatusCode | ErrorStatusCode;

// Type guard to check if an error is an HttpError
export function isHttpError(error: unknown): error is HttpError {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof (error as any).statusCode === "number" &&
    "toResponse" in error &&
    typeof (error as any).toResponse === "function"
  );
}

export class HttpError extends Error {
  public override readonly name = "HttpError";

  constructor(
    public readonly statusCode: HttpStatusCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);

    // Set the prototype explicitly for better instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toResponse(c: Context) {
    const response: ErrorResponse = {
      success: false,
      error: this.message,
      message: this.message,
      ...(this.details && { details: this.details }),
    };

    c.status(this.statusCode);
    return c.json(response);
  }
}

export const Errors = {
  NotFound: (message = "Resource not found", details?: Record<string, any>) =>
    new HttpError(404, message, details),
  BadRequest: (message = "Bad request", details?: Record<string, any>) =>
    new HttpError(400, message, details),
  Unauthorized: (message = "Unauthorized", details?: Record<string, any>) =>
    new HttpError(401, message, details),
  Forbidden: (message = "Forbidden", details?: Record<string, any>) =>
    new HttpError(403, message, details),
  Conflict: (message = "Conflict", details?: Record<string, any>) =>
    new HttpError(409, message, details),
  InternalServerError: (
    message = "Internal server error",
    details?: Record<string, any>
  ) => new HttpError(500, message, details),
  fromStatus: (
    status: HttpStatusCode,
    message?: string,
    details?: Record<string, any>
  ) => new HttpError(status, message || "An error occurred", details),
};

export const Responses = {
  NotFound: (c: Context, error?: Omit<ErrorResponse, "success">) => {
    return c.json({ success: false, ...error } as const, { status: 404 });
  },
  BadRequest: (c: Context, error?: Omit<ErrorResponse, "success">) => {
    return c.json({ success: false, ...error } as const, { status: 400 });
  },
  Unauthorized: (c: Context, error?: Omit<ErrorResponse, "success">) => {
    return c.json({ success: false, ...error } as const, { status: 401 });
  },
  Forbidden: (c: Context, error?: Omit<ErrorResponse, "success">) => {
    return c.json({ success: false, ...error } as const, { status: 403 });
  },
  InternalServerError: (c: Context, error?: Omit<ErrorResponse, "success">) => {
    return c.json({ success: false, ...error } as const, { status: 500 });
  },
  Success: <T = any>(c: Context, data?: T) => {
    return c.json({ success: true, data } as const, { status: 200 });
  },
  Created: <T = any>(c: Context, data?: T) => {
    return c.json({ success: true, data } as const, { status: 201 });
  },
  Status: <T = any>(c: Context, status: HttpStatusCode, data?: T) => {
    const isSuccess = status >= 200 && status < 300;
    const response = isSuccess
      ? { success: true as const, data }
      : { success: false as const, error: "Error", ...(data as any) };
    return c.json(response, { status: status as ContentfulStatusCode });
  },
};

export const errorHandler = async (error: unknown, c: Context) => {
  console.error("Error handler received:", {
    error,
    errorType: typeof error,
    isErrorInstance: error instanceof Error,
    errorName: error instanceof Error ? error.name : "not an Error",
    errorKeys: error ? Object.keys(error) : "no error object",
    errorProto: error ? Object.getPrototypeOf(error) : "no prototype",
  });

  // Handle HttpError
  if (isHttpError(error)) {
    console.log("Processing as HttpError");
    return error.toResponse(c);
  }

  // Check if error is an instance of Error
  if (!(error instanceof Error)) {
    console.log("Error is not an Error instance");
    const response: ErrorResponse = {
      success: false,
      error: "Internal Server Error",
      message: "An unknown error occurred",
    };
    c.status(500);
    return c.json(response);
  }

  const response: ErrorResponse = {
    success: false,
    error: "Internal Server Error",
    message: error.message || "An unexpected error occurred",
    ...(c.env?.NODE_ENV === "development" && { stack: error.stack }),
  };

  c.status(500);
  return c.json(response);
};

// Hono middleware for error handling
export const withErrorHandler = () => {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      await next();

      // If no response was sent, send a success response
      if (!c.res || !c.res.body) {
        return Responses.Success(c) || c.json({ success: true });
      }
      return;
    } catch (error: unknown) {
      console.error("Error in withErrorHandler:", error);

      // If response was already sent, log the error and let Hono handle it
      if (c.res && c.res.body) {
        console.error("Error after response was sent:", error);
        return;
      }

      try {
        // Handle the error with our error handler
        const response = await errorHandler(error, c);
        if (response) {
          return response;
        }
      } catch (innerError) {
        console.error("Error in error handler:", innerError);
        // If our error handler fails, return a generic 500 error
        return c.json(
          {
            success: false,
            error: "Internal Server Error",
            message: "An unexpected error occurred",
          },
          500
        );
      }

      // Ensure we always return a response
      return c.json(
        {
          success: false,
          error: "Unknown Error",
          message: "An unknown error occurred",
        },
        500
      );
    }
  };
};

// For backward compatibility
export const wrapWithErrorHandler = (
  handler: (c: Context) => Promise<void> | void | Promise<Response> | Response
) => {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error: unknown) {
      return errorHandler(error as Error, c);
    }
  };
};
