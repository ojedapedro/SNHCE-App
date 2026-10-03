import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Obtiene la agenda diaria de un establecimiento y especialidad.
   */
  async obtenerAgenda(establecimientoId: string, fechaLocal: string, ip: string, usuarioId: string) {
    // fechaLocal viene como YYYY-MM-DD
    const inicio = new Date(`${fechaLocal}T00:00:00Z`);
    const fin = new Date(`${fechaLocal}T23:59:59Z`);

    const citas = await this.prisma.cita.findMany({
      where: {
        establecimientoId,
        fechaHora: {
          gte: inicio,
          lte: fin,
        },
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombresCifrado: true,
            apellidosCifrado: true,
          }
        },
        medico: true,
      },
      orderBy: { fechaHora: 'asc' },
    });

    // Auditoría (el administrativo/médico está viendo quién viene hoy)
    await this.audit.registrar({
      usuarioId,
      accion: 'LEER',
      recurso: 'agenda_diaria',
      establecimientoId,
      ipDireccion: ip,
      metadatos: { fecha: fechaLocal },
    });

    return citas.map(cita => ({
      id: cita.id,
      fechaHora: cita.fechaHora,
      estado: cita.estado,
      especialidad: cita.especialidad,
      // Se enmascaran los nombres (M. P.) para privacidad en listas
      pacienteNombre: `${cita.paciente.nombresCifrado[0]}. ${cita.paciente.apellidosCifrado[0]}.`,
      // Simulamos la generación del opaqueId
      opaqueId: Buffer.from(cita.paciente.id).toString('base64'),
    }));
  }

  /**
   * Motor de Disponibilidad y Encolamiento (Manejo de picos).
   * Crea una solicitud de cita desde el portal del paciente.
   */
  async solicitarCita(params: {
    pacienteId: string;
    establecimientoId: string;
    especialidad: string;
    fechaPreferida: Date;
    motivoConsulta?: string;
    ip: string;
  }) {
    // 1. Motor de Disponibilidad: Buscar la agenda del centro para la especialidad y el día
    const diaSemana = params.fechaPreferida.getDay() || 7; // 1-7
    const agenda = await this.prisma.agenda.findFirst({
      where: { establecimientoId: params.establecimientoId, especialidad: params.especialidad, diaSemana, activo: true }
    });

    if (!agenda) throw new NotFoundException('No hay agenda activa para esa especialidad en la fecha seleccionada.');

    // 2. Contar citas ya agendadas
    const citasDelDia = await this.prisma.cita.count({
      where: {
        establecimientoId: params.establecimientoId,
        especialidad: params.especialidad,
        fechaHora: {
          gte: new Date(params.fechaPreferida.setHours(0,0,0,0)),
          lte: new Date(params.fechaPreferida.setHours(23,59,59,999)),
        },
        estado: { notIn: ['CANCELADA'] }
      }
    });

    // 3. Manejo de Lista de Espera si los cupos máximos se alcanzan
    const estadoAsignado = citasDelDia >= agenda.cuposMaximos ? 'EN_ESPERA' : 'SOLICITADA';

    const cita = await this.prisma.cita.create({
      data: {
        pacienteId: params.pacienteId,
        establecimientoId: params.establecimientoId,
        especialidad: params.especialidad,
        fechaHora: params.fechaPreferida,
        estado: estadoAsignado,
        canal: 'PORTAL_WEB',
        motivoConsulta: params.motivoConsulta, // TODO: Cifrar
        creadoPor: params.pacienteId,
      },
    });

    await this.audit.registrar({
      usuarioId: params.pacienteId,
      pacienteId: params.pacienteId,
      accion: 'CREAR',
      recurso: 'cita',
      recursoId: cita.id,
      establecimientoId: params.establecimientoId,
      ipDireccion: params.ip,
      metadatos: { enListaEspera: estadoAsignado === 'EN_ESPERA' }
    });

    return {
      mensaje: estadoAsignado === 'EN_ESPERA' 
        ? 'No hay cupos disponibles. Ha sido agregado a la lista de espera.' 
        : 'Cita solicitada exitosamente. Recibirá un SMS de confirmación.',
      cita
    };
  }
}
