import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length < 80 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
