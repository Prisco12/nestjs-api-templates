import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
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
