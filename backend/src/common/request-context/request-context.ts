import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export type RequestContextSnapshot = {
  requestId: string;
  correlationId: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  startedAt: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextSnapshot>();

function readHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizePath(req: Request): string {
  return req.originalUrl || req.url || req.path || '/';
}

function buildRequestContext(req: Request): RequestContextSnapshot {
  const requestId = readHeaderValue(req.headers['x-request-id']) ?? randomUUID();
  const correlationId =
    readHeaderValue(req.headers['x-correlation-id']) ?? randomUUID();
  const userAgent = readHeaderValue(req.headers['user-agent']);

  return {
    requestId,
    correlationId,
    method: req.method,
    path: normalizePath(req),
    ip: req.ip || req.socket?.remoteAddress || undefined,
    userAgent,
    startedAt: new Date().toISOString(),
  };
}

export function getRequestContext(): RequestContextSnapshot | null {
  return requestContextStorage.getStore() ?? null;
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const context = buildRequestContext(req);

  res.setHeader('x-request-id', context.requestId);
  res.setHeader('x-correlation-id', context.correlationId);

  requestContextStorage.run(context, () => next());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeRequestContextIntoDetails(
  details?: Prisma.InputJsonValue,
): Prisma.InputJsonValue | undefined {
  const context = getRequestContext();
  if (!context) {
    return details;
  }

  if (details === undefined || details === null) {
    return {
      _requestContext: context,
    } as Prisma.InputJsonValue;
  }

  if (!isPlainObject(details)) {
    return details;
  }

  return {
    ...details,
    _requestContext: context,
  } as Prisma.InputJsonValue;
}
