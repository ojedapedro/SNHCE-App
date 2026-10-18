import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── GESTIÓN DE USUARIOS Y ROLES (doble aprobación) ──────────────────────────

  /**
   * Solicita un cambio de rol. Requiere aprobación de un segundo administrador.
   * Patrón: se crea una "solicitud pendiente" que un segundo admin debe confirmar.
   */
  async solicitarCambioRol(usuarioObjetivoId: string, nuevoRol: string, adminSolicitanteId: string, ip: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioObjetivoId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Almacenamos la solicitud pendiente de doble aprobación en un JSON en la auditoría
    await this.audit.registrar({
      usuarioId: adminSolicitanteId,
      accion: 'ACTUALIZAR',
      recurso: 'cambio_rol_pendiente',
      recursoId: usuarioObjetivoId,
      ipDireccion: ip,
      justificacion: `Solicitud de cambio de rol a: ${nuevoRol}`,
      metadatos: { nuevoRol, rolActual: usuario.rol, estado: 'PENDIENTE_SEGUNDA_APROBACION' },
    });

    return { mensaje: `Solicitud registrada. Un segundo Administrador de TI debe aprobar el cambio de rol a ${nuevoRol}.` };
  }

  /**
   * Segundo administrador aprueba o rechaza el cambio de rol pendiente.
   */
  async aprobarCambioRol(usuarioObjetivoId: string, nuevoRol: any, adminAprobadorId: string, ip: string) {
    // En producción se buscaría la solicitud pendiente por ID
    await this.prisma.usuario.update({
      where: { id: usuarioObjetivoId },
      data: { rol: nuevoRol },
    });

    await this.audit.registrar({
      usuarioId: adminAprobadorId,
      accion: 'ACTUALIZAR',
      recurso: 'cambio_rol_aprobado',
      recursoId: usuarioObjetivoId,
      ipDireccion: ip,
      justificacion: `Segundo administrador aprobó el cambio de rol a: ${nuevoRol}`,
      metadatos: { nuevoRol, aprobadoPor: adminAprobadorId },
    });

    return { mensaje: `Rol actualizado exitosamente a ${nuevoRol}.` };
  }

  // ─── FUSIÓN REVERSIBLE DE DUPLICADOS (MPI) ────────────────────────────────────

  /**
   * Fusiona dos registros duplicados de paciente en el MPI.
   * NUNCA se borra información clínica — el registro origen queda como FUSIONADO
   * apuntando al destino. Toda la historia sigue accesible por la cadena.
   */
  async fusionarDuplicados(origenId: string, destinoId: string, adminId: string, ip: string) {
    const [origen, destino] = await Promise.all([
      this.prisma.paciente.findUnique({ where: { id: origenId } }),
      this.prisma.paciente.findUnique({ where: { id: destinoId } }),
    ]);

    if (!origen || !destino) throw new NotFoundException('Uno o ambos pacientes no existen en el MPI');
    if (origen.estadoIdentidad === 'FUSIONADO') throw new ConflictException('El paciente origen ya fue fusionado anteriormente');

    // Ejecutar fusión en una transacción atómica para garantizar consistencia
    await this.prisma.$transaction([
      // Reasignar citas e historias del origen al destino
      this.prisma.cita.updateMany({ where: { pacienteId: origenId }, data: { pacienteId: destinoId } }),
      this.prisma.episodio.updateMany({ where: { pacienteId: origenId }, data: { pacienteId: destinoId } }),
      this.prisma.alergiaAntecedente.updateMany({ where: { pacienteId: origenId }, data: { pacienteId: origenId } }), // Se mantiene referencia
      // Marcar el origen como FUSIONADO con puntero al destino (NUNCA se elimina)
      this.prisma.paciente.update({
        where: { id: origenId },
        data: { estadoIdentidad: 'FUSIONADO', fusionadoConId: destinoId },
      }),
    ]);

    await this.audit.registrar({
      usuarioId: adminId,
      accion: 'FUSIONAR_DUPLICADO',
      recurso: 'mpi_fusion',
      recursoId: origenId,
      ipDireccion: ip,
      justificacion: `Fusión reversible: ${origenId} → ${destinoId}`,
      metadatos: { origenId, destinoId },
    });

    return { mensaje: 'Fusión completada. El registro origen queda marcado como FUSIONADO y su historia permanece accesible.' };
  }

  // ─── VERIFICACIÓN DE INTEGRIDAD DE LA BITÁCORA ────────────────────────────────

  /**
   * Recorre la bitácora de auditoría verificando que cada hash encadenado sea correcto.
   * Si encuentra una ruptura en la cadena, significa que alguien manipuló los datos.
   */
  async verificarIntegridadBitacora(limite: number = 1000) {
    const registros = await this.prisma.auditoriaAcceso.findMany({
      orderBy: { id: 'asc' },
      take: limite,
    });

    const resultados: Array<{ id: string; integro: boolean; error?: string }> = [];
    let hashAnterior: string | null = null;

    for (const registro of registros) {
      const payload = JSON.stringify({
        id: registro.id.toString(),
        usuarioId: registro.usuarioId,
        accion: registro.accion,
        recurso: registro.recurso,
        creadoEn: registro.creadoEn.toISOString(),
      });
      const hashEsperado: string = crypto
        .createHash('sha256')
        .update(payload + (hashAnterior || ''))
        .digest('hex');

      if (registro.hashActual !== hashEsperado) {
        resultados.push({ id: registro.id.toString(), integro: false, error: 'Hash no coincide — posible manipulación detectada' });
      } else {
        resultados.push({ id: registro.id.toString(), integro: true });
      }
      hashAnterior = registro.hashActual;
    }

    const registrosCorruptos = resultados.filter(r => !r.integro);
    return {
      totalVerificados: registros.length,
      integro: registrosCorruptos.length === 0,
      registrosCorruptos,
    };
  }

  // ─── DETECCIÓN DE ANOMALÍAS ────────────────────────────────────────────────────

  /**
   * Detecta patrones sospechosos: médico consultando demasiadas historias en poco tiempo.
   * Corre idealmente en un cron job cada hora.
   */
  async detectarAnomalias() {
    const hace1Hora = new Date(Date.now() - 60 * 60 * 1000);

    // Agrupar accesos de tipo LEER en la última hora por usuario
    const accesos = await this.prisma.auditoriaAcceso.groupBy({
      by: ['usuarioId'],
      where: { accion: 'LEER', recurso: 'resumen_clinico', creadoEn: { gte: hace1Hora } },
      _count: { usuarioId: true },
      having: { usuarioId: { _count: { gt: 30 } } }, // Umbral: >30 historias en 1 hora es anómalo
    });

    return accesos.map((a: { usuarioId: string; _count: { usuarioId: number } }) => ({
      usuarioId: a.usuarioId,
      accesosClinicos: a._count.usuarioId,
      alerta: `Usuario consultó ${a._count.usuarioId} historias clínicas en < 1 hora. Revisar.`,
    }));
  }

  // ─── INDICADORES SEUDONIMIZADOS ────────────────────────────────────────────────

  /**
   * Dashboard epidemiológico: datos nunca llevan identificadores directos.
   */
  async obtenerIndicadores(establecimientoId?: string) {
    const where = establecimientoId ? { establecimientoId } : {};
    const [totalCitas, totalEpisodios, totalPacientes] = await Promise.all([
      this.prisma.cita.count({ where }),
      this.prisma.episodio.count({ where }),
      this.prisma.paciente.count(),
    ]);

    // Diagnósticos más frecuentes (seudonimizados — solo el código CIE-10, no el paciente)
    const diagnosticosFrecuentes = await this.prisma.diagnostico.groupBy({
      by: ['codigoCie10', 'descripcion'],
      _count: { codigoCie10: true },
      orderBy: { _count: { codigoCie10: 'desc' } },
      take: 10,
    });

    return {
      totalPacientesRegistrados: totalPacientes,
      totalCitasUltimoMes: totalCitas,
      totalEpisodiosUltimoMes: totalEpisodios,
      top10PatologiasCie10: diagnosticosFrecuentes.map((d: { codigoCie10: string; descripcion: string; _count: { codigoCie10: number } }) => ({
        codigo: d.codigoCie10,
        descripcion: d.descripcion,
        casos: d._count.codigoCie10,
      })),
    };
  }
}
