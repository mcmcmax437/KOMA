import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { log } from "../common/log";
import { SourceError, statusForSourceError } from "../sources/errors/source-errors";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId;

    if (exception instanceof SourceError) {
      log("warn", "source_error", {
        requestId,
        code: exception.code,
        parserVersion: exception.parserVersion,
        path: request.path,
      });
      response.status(statusForSourceError(exception.code)).json({
        error: { code: exception.code, message: exception.message, actions: exception.actions },
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message.join(", "))
            : ((body as { message?: string }).message ?? exception.message);
      response.status(status).json({
        error: { code: status === 429 ? "RATE_LIMITED" : "HTTP_ERROR", message },
        requestId,
      });
      return;
    }

    log("error", "unhandled", {
      requestId,
      path: request.path,
      name: exception instanceof Error ? exception.name : "unknown",
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: "INTERNAL", message: "Щось пішло не так" },
      requestId,
    });
  }
}
