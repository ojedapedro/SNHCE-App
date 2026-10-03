import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async obtenerResumen(pacienteId: string, medicoId: string, establecimientoId: string, ip: string, esAccesoEmergencia: boolean) {
    // La relación asistencial (el permiso) ya fue validada por el Guard
    
    // Optimizamos la carga del paciente con selectivo agresivo para < 1s
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: {
        alergias: { where: { activa: true } },
        episodios: {
          take: 5,
          orderBy: { creadoEn: 'desc' },
          include: {
            diagnosticos: { where: { estadoDx: 'ACTIVO' } },
            prescripciones: { where: { estado: 'ACTIVA' } },
          },
        },
      },
    });

    if (!paciente) throw new NotFoundException('Paciente no encontrado');

    // Registrar en bitácora inmutable la lectura clínica obligatoria
    await this.audit.registrar({
      usuarioId: medicoId,
      pacienteId: paciente.id,
      accion: 'LEER',
      recurso: 'resumen_clinico',
      recursoId: paciente.id,
      establecimientoId,
      ipDireccion: ip,
      justificacion: esAccesoEmergencia ? 'Acceso de emergencia médica activado' : undefined,
    });

    return {
      paciente: { id: paciente.id, estadoIdentidad: paciente.estadoIdentidad },
      alergias: paciente.alergias,
      ultimosEpisodios: paciente.episodios,
      esAccesoEmergencia,
    };
  }

  /**
   * Creación de un Episodio Clínico (Base de la consulta).
   */
  async crearEpisodio(params: any) {
    // Código de creación del episodio
    return { id: 'ep-uuid-simulated', ...params };
  }

  /**
   * Anexar evolución a un episodio existente. Las historias clínicas NO se modifican,
   * se "anexan" adendos versionados para cumplimiento legal.
   */
  async anexarEvolucion(episodioId: string, medicoId: string, establecimientoId: string, evolucionBase64: string, ip: string) {
    const episodio = await this.prisma.episodio.findUnique({ where: { id: episodioId } });
    if (!episodio) throw new NotFoundException('Episodio no encontrado');

    // Actualiza versión (append-only logic on fields, increment version)
    const episodioActualizado = await this.prisma.episodio.update({
      where: { id: episodioId },
      data: {
        evolucionCifrado: `${episodio.evolucionCifrado || ''}\n\n--- Anexo [${new Date().toISOString()}] ---\n${evolucionBase64}`,
        version: { increment: 1 },
      }
    });

    await this.audit.registrar({
      usuarioId: medicoId,
      accion: 'ACTUALIZAR',
      recurso: 'episodio_anexo',
      recursoId: episodioId,
      establecimientoId,
      ipDireccion: ip,
    });

    return episodioActualizado;
  }
}
