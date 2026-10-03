import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { RELACION_ASISTENCIAL_KEY } from './decorators';

/**
 * Guard ABAC (Attribute-Based Access Control) — Relación Asistencial.
 *
 * Para médicos y enfermería, verifica que exista UNA relación asistencial vigente:
 *   1. Cita activa (CONFIRMADA o EN_ESPERA) con el paciente
 *   2. Episodio abierto asignado al profesional
 *   3. Referencia aceptada hacia el establecimiento del profesional
 *   4. Acceso de emergencia declarado y vigente (break-glass)
 *
 * Si ninguna condición se cumple → 403 con mensaje explicativo.
 *
 * IMPORTANTE: Este guard se aplica ADEMÁS del JwtAuthGuard (RBAC).
 * Asegura que el rol correcto (MEDICO/ENFERMERIA) no sea suficiente
 * sin una relación asistencial concreta.
 */
@Injectable()
export class RelacionAsistencialGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reflector = new Reflector();
    const requiereRelacion = reflector.getAllAndOverride<boolean>(
      RELACION_ASISTENCIAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no requiere verificación de relación asistencial, pasar
    if (!requiereRelacion) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Solo aplica a médicos y enfermería
    if (!user || !['MEDICO', 'ENFERMERIA'].includes(user.rol)) {
      return true; // Otros roles son manejados por JwtAuthGuard
    }

    // El ID opaco del paciente viene del parámetro de ruta o del body
    // NUNCA del UUID real — se resuelve internamente
    const opaquePatientId =
      request.params?.opaqueId ??
      request.params?.pacienteId ??
      request.body?.pacienteId;

    if (!opaquePatientId) {
      // Si no hay paciente en el contexto, no aplica verificación
      return true;
    }

    // Resolver el ID opaco al UUID interno del paciente
    // (el mapping opaqueId → pacienteUUID se guarda en Redis con TTL de sesión)
    // TODO: Implementar resolución de ID opaco desde Redis
    const pacienteId = await this.resolveOpaqueId(opaquePatientId, user.sub);
    if (!pacienteId) {
      throw new ForbiddenException(
        'No se pudo verificar la relación asistencial. El identificador del paciente no es válido.',
      );
    }

    const ahora = new Date();

    // Verificar si existe una relación asistencial vigente
    const tieneRelacion = await this.verificarRelacion(
      user,
      pacienteId,
      ahora,
    );

    if (!tieneRelacion) {
      throw new ForbiddenException(
        'No tiene una relación asistencial vigente con este paciente. ' +
          'Si es una emergencia, use el acceso de emergencia con justificación obligatoria.',
      );
    }

    return true;
  }

  private async verificarRelacion(
    user: { sub: string; establecimientoId: string | null; rol: string },
    pacienteId: string,
    ahora: Date,
  ): Promise<boolean> {
    // 1. Cita activa confirmada o en espera
    const citaActiva = await this.prisma.cita.findFirst({
      where: {
        pacienteId,
        estado: { in: ['CONFIRMADA', 'EN_ESPERA'] },
        fechaHora: {
          gte: new Date(ahora.getTime() - 4 * 60 * 60 * 1000), // Hasta 4h antes
          lte: new Date(ahora.getTime() + 2 * 60 * 60 * 1000), // Hasta 2h después
        },
        ...(user.establecimientoId
          ? { establecimientoId: user.establecimientoId }
          : {}),
      },
    });
    if (citaActiva) return true;

    // 2. Episodio abierto asignado al profesional
    const episodioAbierto = await this.prisma.episodio.findFirst({
      where: {
        pacienteId,
        estado: 'ABIERTO',
        medicoId: user.sub, // El médico debe ser el asignado
      },
    });
    if (episodioAbierto) return true;

    // 3. Referencia aceptada hacia el establecimiento actual
    if (user.establecimientoId) {
      const referenciaAceptada = await this.prisma.referencia.findFirst({
        where: {
          episodio: { pacienteId },
          estado: 'ACEPTADA',
          establecimientoDestinoId: user.establecimientoId,
        },
      });
      if (referenciaAceptada) return true;
    }

    // 4. Acceso de emergencia vigente (break-glass)
    // Se verifica buscando un episodio de emergencia reciente creado por este profesional
    const accesoEmergencia = await this.prisma.episodio.findFirst({
      where: {
        pacienteId,
        esAccesoEmergencia: true,
        creadoPor: user.sub,
        creadoEn: { gte: new Date(ahora.getTime() - 4 * 60 * 60 * 1000) }, // Vigente 4h
        estado: 'ABIERTO',
      },
    });
    if (accesoEmergencia) return true;

    return false;
  }

  /**
   * Resuelve un ID opaco de sesión al UUID interno del paciente.
   * El mapping se almacena en Redis cuando el médico selecciona un paciente.
   * TODO: Implementar con ioredis
   */
  private async resolveOpaqueId(
    opaqueId: string,
    userId: string,
  ): Promise<string | null> {
    // Por ahora: tratarlo directamente como UUID para desarrollo
    // En producción: Redis.get(`opaque:${userId}:${opaqueId}`)
    return opaqueId;
  }
}
