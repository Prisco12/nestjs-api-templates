import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const rawMessage =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message: unknown }).message
        : isHttpException
          ? exception.message
          : 'Internal server error';
    const message = Array.isArray(rawMessage)
      ? 'Validation failed'
      : rawMessage;
    const code =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'code' in exceptionResponse
        ? (exceptionResponse as { code: string }).code
        : (HttpStatus[statusCode] ?? 'INTERNAL_SERVER_ERROR');
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      error: { code, message, details },
      meta: {
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      },
    });
  }
}
