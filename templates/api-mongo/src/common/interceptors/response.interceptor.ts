import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { isPaginatedResult } from '../types/pagination';
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((result) => {
        if (isPaginatedResult(result)) {
          return {
            success: true,
            data: result.data,
            meta: { requestId: request.requestId, ...result.pagination },
          };
        }
        return {
          success: true,
          data: result,
          meta: { requestId: request.requestId },
        };
      }),
    );
  }
}
