import { Env } from "@/config/env";
import { FastifyRequest, FastifyBaseLogger, FastifyReply } from "fastify";
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

export type HandlerOptions<
  TParams = Record<string, any> | undefined,
  TBody = Record<string, any>,
> = {
  request: FastifyRequest;
  env: Env;
  logger: FastifyBaseLogger;
  params: TParams;
  body: TBody;
  reply: FastifyReply;
};
export type HandlerResponseType =
  | Promise<HttpResponse | HttpError>
  | HttpResponse
  | HttpError;

export type Handler<
  TParams = Record<string, any> | undefined,
  TBody = Record<string, any>,
> = (options: HandlerOptions<TParams, TBody>) => HandlerResponseType | never;

export interface FileRoute<TParams = Record<string, any> | undefined> {
  method?: Method;
  handler?: Handler<TParams>;
  url?: string;
  params?: Params<TParams>[];
}

export interface Route<
  TParams = Record<string, any> | undefined,
  TBody = Record<string, any>,
> {
  method?: Method;
  handler?: Handler<TParams, TBody>;
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
