import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor de logging de solicitudes HTTP.
 * Registra: método, ruta, código de estado, duración, userId, IP, User-Agent.
 * Se usa como interceptor global en main.ts.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { sub?: string; preferred_username?: string } }>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') ?? 'desconocido';
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'sin-id';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const userId = request.user?.sub ?? 'anonimo';

          this.logger.log(
            `[${method}] ${url} | ${statusCode} | ${duration}ms | usuario:${userId} | ip:${ip ?? 'desconocida'} | ua:${userAgent}`,
            { requestId },
          );
        },
        error: (error: unknown) => {
          // Los errores son capturados y logueados también por HttpExceptionFilter
          // Aquí solo registramos la duración para métricas
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          const userId = request.user?.sub ?? 'anonimo';
          const errorMessage = error instanceof Error ? error.message : 'error desconocido';

          this.logger.warn(
            `[${method}] ${url} | ${statusCode} | ${duration}ms | usuario:${userId} | error:${errorMessage}`,
            { requestId },
          );
        },
      }),
    );
  }
}
