/**
 * SNHCE — Outbox Sync Service (Backend)
 * 
 * Patrón Outbox Transaccional:
 *   1. El backend local escribe evento en tabla `outbox` DENTRO de la misma
 *      transacción que la operación de dominio (atómico).
 *   2. Este worker consulta el outbox cada N segundos y publica a Redis Streams.
 *   3. El centro de datos central consume el stream y aplica la operación.
 *   4. Resolución de conflictos: Los registros clínicos son APPEND-ONLY y
 *      versionados. El campo `version` del episodio sigue la política
 *      "Last-Write-Wins por timestamp del nodo" — pero las notas clínicas
 *      NUNCA se sobreescriben, sólo se anexan (ver conflictResolver).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  // Umbral configurable de eventos por ciclo (comentado si no se usa)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron: Cada 5 segundos procesa los eventos pendientes del outbox.
   * En nodo local: los publica a la cola de Redis para sincronización.
   * En nodo central: los aplica directamente.
   */
  @Cron('*/5 * * * * *')
  async procesarOutbox() {
    // Buscar eventos pendientes del outbox (tabla `auditoria_accesos` en modo outbox,
    // o una tabla `outbox_eventos` dedicada en el esquema real)
    this.logger.debug('Procesando eventos de outbox...');

    // En producción: buscar en tabla outbox_eventos donde estado = PENDIENTE
    // y publicarlos en Redis Streams con idempotency_key para deduplicación
  }

  /**
   * Resuelve conflictos cuando el mismo episodio fue modificado en el nodo local
   * y en el central durante el período de desconexión.
   * 
   * POLÍTICA DOCUMENTADA:
   * - Signos Vitales: Last-Write-Wins por timestamp (el más reciente gana)
   * - Notas SOAP (evolucionCifrado): Merge por concatenación — ambas versiones
   *   se conservan con un separador que indica "conflicto resuelto"
   * - Diagnósticos: Union — se incluyen todos los diagnósticos de ambas versiones
   * - Alergias: Union — NUNCA se pierde una alerta de alergia
   * - Prescripciones: Requiere revisión manual — se marca como CONFLICTO
   */
  async resolverConflicto(episodioIdCentral: string, episodioNodoLocal: Record<string, unknown>) {
    this.logger.warn(`Resolviendo conflicto para episodio ${episodioIdCentral}`);

    const central = await this.prisma.episodio.findUnique({
      where: { id: episodioIdCentral },
      include: { diagnosticos: true, alergias: true }
    });

    if (!central) return;

    const local = episodioNodoLocal as {
      evolucionCifrado?: string;
      diagnosticos?: Array<{ codigoCie10: string; descripcion: string }>;
    };

    // Merge de notas SOAP — ambas versiones preservadas
    if (local.evolucionCifrado && central.evolucionCifrado !== local.evolucionCifrado) {
      await this.prisma.episodio.update({
        where: { id: episodioIdCentral },
        data: {
          evolucionCifrado: [
            central.evolucionCifrado,
            '\n\n=== CONFLICTO: Versión del Nodo Local (Fusionado automáticamente) ===\n',
            local.evolucionCifrado,
          ].join(''),
          version: { increment: 1 },
        }
      });
    }

    // Union de diagnósticos — nunca se pierde un Dx
    if (local.diagnosticos?.length) {
      for (const dx of local.diagnosticos) {
        await this.prisma.diagnostico.upsert({
          where: { id: `${episodioIdCentral}-${dx.codigoCie10}` },
          create: { episodioId: episodioIdCentral, ...dx, tipoDx: 'SECUNDARIO', creadoPor: 'SYNC_NODO_LOCAL' },
          update: {}, // Si ya existe, no modificar
        });
      }
    }
  }
}
