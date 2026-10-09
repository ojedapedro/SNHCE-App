import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/database/prisma.service';
import Redis from 'ioredis';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../../package.json') as { version: string };

interface DependencyStatus {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

export interface ReadinessResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    minio: DependencyStatus;
  };
}

/**
 * Servicio de health checks.
 * Verifica conectividad con PostgreSQL, Redis y MinIO.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Inicializar cliente Redis lazy (solo para health checks)
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl, {
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });
    }
  }

  /**
   * Estado general: incluye versión del servicio.
   */
  getHealth(): Record<string, unknown> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
      servicio: 'SNHCE Backend',
    };
  }

  /**
   * Liveness probe: solo verifica que el proceso responde.
   */
  getLiveness(): Record<string, unknown> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe: verifica todas las dependencias externas.
   * Lanza 503 si la base de datos no está disponible (dependencia crítica).
   */
  async checkReadiness(): Promise<ReadinessResult> {
    const [dbStatus, redisStatus, minioStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinio(),
    ]);

    const allOk = dbStatus.status === 'ok' && redisStatus.status === 'ok' && minioStatus.status === 'ok';
    const partialOk = dbStatus.status === 'ok';

    const result: ReadinessResult = {
      status: allOk ? 'ok' : partialOk ? 'degraded' : 'error',
      timestamp: new Date().toISOString(),
      version,
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
        minio: minioStatus,
      },
    };

    // La base de datos es crítica — sin ella el servicio no puede operar
    if (dbStatus.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  /**
   * Verifica conectividad con PostgreSQL via Prisma.
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const isHealthy = await this.prismaService.isHealthy();
      const latencyMs = Date.now() - start;
      return isHealthy ? { status: 'ok', latencyMs } : { status: 'error', error: 'Sin respuesta de la BD' };
    } catch (error) {
      this.logger.error('Health check de base de datos fallido', error);
      return { status: 'error', error: 'Conexión fallida', latencyMs: Date.now() - start };
    }
  }

  /**
   * Verifica conectividad con Redis.
   */
  private async checkRedis(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      if (!this.redisClient) {
        return { status: 'error', error: 'REDIS_URL no configurado' };
      }
      await this.redisClient.ping();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.warn('Health check de Redis fallido', error);
      return { status: 'error', error: 'Conexión Redis fallida', latencyMs: Date.now() - start };
    }
  }

  /**
   * Verifica conectividad con MinIO (almacenamiento de objetos).
   * Se verifica via HTTP al endpoint de salud de MinIO.
   */
  private async checkMinio(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT');
      if (!minioEndpoint) {
        return { status: 'error', error: 'MINIO_ENDPOINT no configurado' };
      }

      // Verificar el endpoint de salud de MinIO (/minio/health/live)
      const response = await fetch(`${minioEndpoint}/minio/health/live`, {
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - start;
      return response.ok
        ? { status: 'ok', latencyMs }
        : { status: 'error', error: `MinIO respondió ${response.status}` };
    } catch (error) {
      this.logger.warn('Health check de MinIO fallido', error);
      return { status: 'error', error: 'Conexión MinIO fallida', latencyMs: Date.now() - start };
    }
  }
}
