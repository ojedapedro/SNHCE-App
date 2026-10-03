import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Emite una referencia de un establecimiento de Nivel I a uno de Nivel II/III.
   */
  async emitirReferencia(params: {
    episodioId: string;
    establecimientoOrigenId: string;
    establecimientoDestinoId: string;
    especialidadDestino: string;
    motivoReferencia: string;
    nivelAtencionDestino: string;
    medicoId: string;
  }) {
    return this.prisma.referencia.create({
      data: {
        episodioId: params.episodioId,
        establecimientoOrigenId: params.establecimientoOrigenId,
        establecimientoDestinoId: params.establecimientoDestinoId,
        especialidadDestino: params.especialidadDestino,
        motivoReferencia: params.motivoReferencia,
        nivelAtencionDestino: params.nivelAtencionDestino,
        creadoPor: params.medicoId,
      }
    });
  }

  /**
   * Responde a una referencia completada (Contrarreferencia).
   */
  async emitirContraReferencia(referenciaId: string, diagnosticoFinal: string, indicaciones: string) {
    return this.prisma.referencia.update({
      where: { id: referenciaId },
      data: {
        estado: 'CONTRARREFERIDA',
        contraReferencia: `Diagnóstico: ${diagnosticoFinal}\nIndicaciones: ${indicaciones}`
      }
    });
  }
}
