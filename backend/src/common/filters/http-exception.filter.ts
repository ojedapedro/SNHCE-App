import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Formato estándar de respuesta de error para toda la API.
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}

/**
 * Mapa de códigos de error Prisma a códigos HTTP y mensajes amigables.
 * Nunca se exponen detalles internos de la base de datos al cliente.
 */
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'El recurso ya existe (restricción de unicidad)' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'El recurso solicitado no fue encontrado' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referencia a un recurso inexistente' },
  P2014: { status: HttpStatus.BAD_REQUEST, message: 'La relación es inválida' },
  P2021: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error de configuración de base de datos' },
  P2022: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error de configuración de base de datos' },
};

/**
 * Filtro global de excepciones HTTP.
 * - Respuesta consistente para todos los errores
 * - Manejo especial de errores Prisma (P2002, P2025, etc.)
 * - Nunca expone stack traces en producción
 * - Registra todos los errores con Winston
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger;
  private readonly isProduction: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: Logger,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(HttpExceptionFilter.name);
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'sin-id';
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Loguear el error con contexto completo (sin exponer al cliente)
    const logContext = {
      requestId,
      method: request.method,
      path,
      statusCode,
      userId: (request as Request & { user?: { sub?: string } }).user?.sub ?? 'anonimo',
      ip: request.ip,
      userAgent: request.get('user-agent') ?? 'desconocido',
    };

    if (statusCode >= 500) {
      this.winstonLogger.error(
        `[${request.method}] ${path} → ${statusCode}`,
        // Solo incluir stack trace en logs internos, nunca en la respuesta
        this.isProduction ? logContext : { ...logContext, exception: String(exception) },
      );
    } else if (statusCode >= 400) {
      this.winstonLogger.warn(`[${request.method}] ${path} → ${statusCode}: ${String(message)}`, logContext);
    }

    const errorBody: ErrorResponse = {
      statusCode,
      error,
      message,
      timestamp,
      path,
      requestId,
    };

    response.status(statusCode).json(errorBody);
  }

  /**
   * Resuelve el tipo de excepción y retorna código HTTP, mensaje y tipo de error.
   */
  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    // 1. Errores conocidos de Prisma
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        return {
          statusCode: mapped.status,
          message: mapped.message,
          error: `PrismaError_${exception.code}`,
        };
      }
      // Código Prisma desconocido — error interno genérico
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno de base de datos',
        error: 'DatabaseError',
      };
    }

    // 2. Errores de validación/esquema de Prisma
    if (
      exception instanceof Prisma.PrismaClientValidationError ||
      exception instanceof Prisma.PrismaClientRustPanicError ||
      exception instanceof Prisma.PrismaClientInitializationError
    ) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor',
        error: 'DatabaseError',
      };
    }

    // 3. Excepciones HTTP de NestJS (incluye BadRequestException con errores de validación)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        return {
          statusCode: status,
          message: (resp['message'] as string | string[]) ?? exception.message,
          error: (resp['error'] as string | undefined) ?? exception.name,
        };
      }

      return {
        statusCode: status,
        message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
        error: exception.name,
      };
    }

    // 4. Error genérico no manejado
    const genericMessage = this.isProduction
      ? 'Error interno del servidor'
      : exception instanceof Error
        ? exception.message
        : 'Error desconocido';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: genericMessage,
      error: 'InternalServerError',
    };
  }
}
