export type SuccessfulStatusCode = 200 | 201 | 202 | 204;

export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 500;

export class HttpResponse {
  status: SuccessfulStatusCode;
  body: any;

  constructor(status: SuccessfulStatusCode, body: any) {
    this.status = status;
    this.body = body;
  }
}

export class HttpError extends Error {
  status: ErrorStatusCode;
  override message: string;
  details?: any;

  constructor(status: ErrorStatusCode, message: string, details?: any) {
    super("HttpError");
    this.status = status;
    this.message = message;
    this.details = details;
  }
}

export const Responses = {
  Ok: (body?: any) => new HttpResponse(200, body),
  Created: (body?: any) => new HttpResponse(201, body),
  Accepted: (body?: any) => new HttpResponse(202, body),
  NoContent: (body?: any) => new HttpResponse(204, body),
  BadRequest: (message: string, details?: any) =>
    new HttpError(400, message, details),
  Unauthorized: (message: string, details?: any) =>
    new HttpError(401, message, details),
  Forbidden: (message: string, details?: any) =>
    new HttpError(403, message, details),
  NotFound: (message: string, details?: any) =>
    new HttpError(404, message, details),
  Conflict: (message: string, details?: any) =>
    new HttpError(409, message, details),
  InternalServerError: (message: string, details?: any) =>
    new HttpError(500, message, details),
  FromCode: (status: ErrorStatusCode, message: string, details?: any) =>
    new HttpError(status, message, details),
};
