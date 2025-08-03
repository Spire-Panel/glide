import { Env } from "@/config/env";
import { FastifyRequest, FastifyBaseLogger } from "fastify";
import { ErrorStatusCode, HttpError, HttpResponse } from "./Http";
import { ValidParamType } from "./Routes";

export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export type HandlerOptions<TParams = Record<string, any> | undefined> = {
  request: FastifyRequest;
  env: Env;
  logger: FastifyBaseLogger;
  params: TParams;
  body: Record<string, any>;
};
export type HandlerResponseType =
  | Promise<HttpResponse | HttpError>
  | HttpResponse
  | HttpError;

export type Handler<TParams = Record<string, any> | undefined> = (
  options: HandlerOptions<TParams>
) => HandlerResponseType | never;

export interface FileRoute<TParams = Record<string, any> | undefined> {
  method?: Method;
  handler?: Handler<TParams>;
  url?: string;
  params?: Params<TParams>[];
}

export interface Route<TParams = Record<string, any> | undefined> {
  method?: Method;
  handler?: Handler<TParams>;
  url?: string;
}

export interface Params<TParamType = string | number | boolean> {
  name: string;
  type: ValidParamType;
  index: number;
  value: TParamType;
}

export namespace DockerNS {
  export interface HttpError {
    statusCode: ErrorStatusCode;
    json: {
      message?: string;
      [key: string]: any;
    };
    reason?: unknown;
  }
}
