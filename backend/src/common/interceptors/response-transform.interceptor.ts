import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Envoltorio estándar de respuesta exitosa.
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Interceptor de transformación de respuestas.
 * Envuelve todos los datos exitosos en el formato estándar:
 * { data: T, meta: { requestId, timestamp } }
 *
 * Las respuestas de error NO pasan por este interceptor
 * (son manejadas por HttpExceptionFilter antes de llegar aquí).
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'sin-id';

    return next.handle().pipe(
      map((data: T): ApiResponse<T> => ({
        data,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
