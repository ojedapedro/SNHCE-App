import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio Prisma — envuelve PrismaClient con:
 * - Conexión/desconexión gestionada por el ciclo de vida del módulo NestJS
 * - Middleware de logging de queries (solo en desarrollo)
 * - Extensiones futuras: soft-delete global, auditoría automática
 *
 * NOTA: En Prisma v5, los tipos de eventos (QueryEvent, LogEvent) se exponen
 * como `any` al llamar $on. Se tipan inline para evitar breaking changes futuros.
 */
@Injectable()
export class PrismaService
  extends PrismaClient<
    { log: { emit: 'event'; level: 'query' | 'error' | 'warn' | 'info' }[] },
    'query' | 'error' | 'warn' | 'info'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly isDev: boolean;

  constructor() {
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';
    const isDev = nodeEnv !== 'production';

    super({
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
    });

    this.isDev = isDev;
  }

  async onModuleInit(): Promise<void> {
    if (this.isDev) {
      // Prisma v5: los eventos son tipados como `any` por la librería
      (this as any).$on('query', (event: { query: string; params: string; duration: number }) => {
        this.logger.debug(
          `[Prisma Query] ${event.query} | Params: ${event.params} | Duración: ${event.duration}ms`,
        );
      });
    }

    (this as any).$on('error', (event: { message: string; target: string }) => {
      this.logger.error(`[Prisma Error] ${event.message}`, event.target);
    });

    (this as any).$on('warn', (event: { message: string; target: string }) => {
      this.logger.warn(`[Prisma Warn] ${event.message}`, event.target);
    });

    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida vía Prisma');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada limpiamente');
  }

  /**
   * Verifica la conectividad con la base de datos.
   * Usado por el health check de readiness.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
