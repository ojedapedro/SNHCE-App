import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Servicio Prisma — envuelve PrismaClient con:
 * - Conexión/desconexión gestionada por el ciclo de vida del módulo NestJS
 * - Middleware de logging de queries (solo en desarrollo)
 * - Extensiones futuras: soft-delete global, auditoría automática
 */
@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'warn' | 'info'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const isDev = nodeEnv !== 'production';

    super({
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
      errorFormat: 'minimal',
    });

    // Middleware de logging de queries en desarrollo
    if (isDev) {
      // Los eventos de query incluyen: query, params, duration, target
      this.$on('query', (event: Prisma.QueryEvent) => {
        this.logger.debug(
          `[Prisma Query] ${event.query} | Params: ${event.params} | Duración: ${event.duration}ms`,
        );
      });
    }

    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(`[Prisma Error] ${event.message}`, event.target);
    });

    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(`[Prisma Warn] ${event.message}`, event.target);
    });
  }

  /**
   * Conectar a la base de datos al inicializar el módulo.
   * NestJS llama esto automáticamente durante el arranque.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida vía Prisma');
  }

  /**
   * Desconectar limpiamente al destruir el módulo.
   * NestJS llama esto durante el apagado graceful.
   */
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
