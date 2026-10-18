import { HttpStatus } from '@nestjs/common';
import { HealthService, ReadinessResult } from './health.service';

/**
 * Tests unitarios – HealthService
 * Se mockean PrismaService y ConfigService para no requerir BD ni Redis reales.
 */
describe('HealthService', () => {
  // ── Mocks ────────────────────────────────────────────────────────────
  const prismaServiceMock = {
    isHealthy: jest.fn().mockResolvedValue(true),
  } as any;

  // ConfigService: REDIS_URL vacío → redisClient queda null (checkRedis devuelve error)
  // MINIO_ENDPOINT vacío → checkMinio devuelve error
  // Así probamos el caso "solo DB disponible" y "todo disponible" con fetch mock.
  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'REDIS_URL') return ''; // sin Redis en unit tests
      if (key === 'MINIO_ENDPOINT') return ''; // sin MinIO en unit tests
      return undefined;
    }),
  } as any;

  let service: HealthService;

  beforeEach(() => {
    service = new HealthService(prismaServiceMock, configServiceMock);
    jest.clearAllMocks();
    prismaServiceMock.isHealthy.mockResolvedValue(true);
  });

  // ------------------------------------------------------------------
  describe('getLiveness()', () => {
    it('devuelve { status: "alive" }', () => {
      const result = service.getLiveness();
      expect(result['status']).toBe('alive');
    });
  });

  // ------------------------------------------------------------------
  describe('getHealth()', () => {
    it('devuelve { status: "ok" } con timestamp y versión', () => {
      const result = service.getHealth();
      expect(result['status']).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
    });
  });

  // ------------------------------------------------------------------
  describe('checkReadiness()', () => {
    it('devuelve status "degraded" cuando DB ok pero Redis y MinIO fallan (sin REDIS_URL/MINIO_ENDPOINT)', async () => {
      const result: ReadinessResult = await service.checkReadiness();
      // DB ok → no lanza 503, pero Redis y MinIO no están configurados → degraded
      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('ok');
      expect(result.dependencies.redis.status).toBe('error');
      expect(result.dependencies.minio.status).toBe('error');
    });

    it('lanza HttpException 503 si la base de datos falla', async () => {
      prismaServiceMock.isHealthy.mockResolvedValueOnce(false);

      await expect(service.checkReadiness()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });

    it('lanza HttpException 503 si Prisma lanza error', async () => {
      prismaServiceMock.isHealthy.mockRejectedValueOnce(new Error('DB down'));

      await expect(service.checkReadiness()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });
});
