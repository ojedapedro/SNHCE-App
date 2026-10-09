import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * Controlador de health checks.
 * Expone tres endpoints estándar para Kubernetes/Docker:
 * - /health  → estado general
 * - /health/ready → readiness probe (verifica dependencias externas)
 * - /health/live  → liveness probe (verificación simple de que el proceso responde)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Estado general del servicio con versión.
   * No verifica dependencias externas.
   */
  @Get()
  @ApiOperation({ summary: 'Estado general del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando correctamente' })
  getHealth(): Record<string, unknown> {
    return this.healthService.getHealth();
  }

  /**
   * Readiness probe: verifica que todas las dependencias están disponibles.
   * Kubernetes usará este endpoint para decidir si el pod puede recibir tráfico.
   * Retorna 503 si alguna dependencia falla.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — verifica DB, Redis, MinIO' })
  @ApiResponse({ status: 200, description: 'Todas las dependencias disponibles' })
  @ApiResponse({ status: 503, description: 'Una o más dependencias no disponibles' })
  async getReadiness() {
    return this.healthService.checkReadiness();
  }

  /**
   * Liveness probe: verificación mínima de que el proceso está vivo.
   * Si esto falla, Kubernetes reinicia el pod.
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — verificación mínima de proceso' })
  @ApiResponse({ status: 200, description: 'Proceso activo' })
  getLiveness(): Record<string, unknown> {
    return this.healthService.getLiveness();
  }
}
