import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Módulo de health checks.
 * Expone endpoints para Kubernetes liveness/readiness probes
 * y monitoreo general del servicio.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
