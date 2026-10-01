import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { log } from "./log";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: { id: string } }>();
    const response = http.getResponse<Response>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, started),
        error: () => this.write(request, response.statusCode || 500, started),
      }),
    );
  }

  private write(request: Request & { requestId?: string; user?: { id: string } }, status: number, started: number): void {
    const source = typeof request.params?.source === "string" ? request.params.source : request.query?.source;
    log("info", "request", {
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      status,
      durationMs: Date.now() - started,
      source: typeof source === "string" ? source : undefined,
      userId: request.user?.id,
    });
  }
}
