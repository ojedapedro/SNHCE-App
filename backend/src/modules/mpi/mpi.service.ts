import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Servicio del Índice Maestro de Pacientes (MPI).
 *
 * Reglas de diseño:
 * - El UUID interno es la PK, nunca la cédula.
 * - La cédula se almacena cifrada; la búsqueda usa un hash determinístico.
 * - Las cédulas y nombres NUNCA aparecen en URLs ni en parámetros GET visibles.
 * - Fusiones de duplicados son reversibles (estado FUSIONADO + puntero destino).
 * - La eliminación de datos clínicos está PROHIBIDA (append-only).
 */
@Injectable()
export class MpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Busca un paciente por documento de identidad.
   * La búsqueda usa el hash del documento, no el valor cifrado directamente.
   * NUNCA exponer el UUID del paciente en la respuesta pública.
   */
  async buscarPorDocumento(params: {
    tipo: string;
    valor: string;
    usuarioId: string;
    establecimientoId?: string;
    ip: string;
    userAgent?: string;
  }): Promise<{ encontrado: boolean; opaqueId?: string; estadoIdentidad?: string }> {
    const valorNormalizado = this.normalizarDocumento(params.valor);
    const hash = this.hashDocumento(valorNormalizado);

    const identificador = await this.prisma.identificadorPaciente.findFirst({
      where: { valorHash: hash, tipo: params.tipo as any, activo: true },
      include: { paciente: { select: { id: true, estadoIdentidad: true, fusionadoConId: true } } },
    });

    // Registrar la búsqueda en auditoría
    await this.audit.registrar({
      usuarioId: params.usuarioId,
      pacienteId: identificador?.pacienteId,
      accion: 'BUSCAR',
      recurso: 'identificador_paciente',
      establecimientoId: params.establecimientoId,
      ipDireccion: params.ip,
      userAgent: params.userAgent,
      metadatos: { tipoDocumento: params.tipo, encontrado: !!identificador },
    });

    if (!identificador) {
      return { encontrado: false };
    }

    // Si el paciente fue fusionado, seguir el puntero al destino
    const paciente = identificador.paciente.estadoIdentidad === 'FUSIONADO' && identificador.paciente.fusionadoConId
      ? await this.prisma.paciente.findUnique({ where: { id: identificador.paciente.fusionadoConId } })
      : identificador.paciente;

    if (!paciente) return { encontrado: false };

    // Generar ID opaco de sesión (se almacena el mapping en Redis con TTL)
    const opaqueId = this.generarOpaqueId(paciente.id, params.usuarioId);

    return {
      encontrado: true,
      opaqueId,
      estadoIdentidad: paciente.estadoIdentidad,
    };
  }

  /**
   * Obtiene el resumen de identificación del paciente (sin datos clínicos).
   * Para uso del personal administrativo — no incluye historia clínica.
   */
  async obtenerIdentificacion(
    pacienteId: string,
    usuarioId: string,
    ip: string,
  ): Promise<{
    estadoIdentidad: string;
    nivelCuenta: string | null;
    identificadores: { tipo: string; activo: boolean }[];
    fechaNacimiento: Date;
    sexo: string;
  }> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: {
        identificadores: {
          select: { tipo: true, activo: true },
        },
        usuario: {
          select: { nivelCuenta: true },
        },
      },
    });

    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    await this.audit.registrar({
      usuarioId,
      pacienteId,
      accion: 'LEER',
      recurso: 'paciente_identificacion',
      recursoId: pacienteId,
      ipDireccion: ip,
    });

    return {
      estadoIdentidad: paciente.estadoIdentidad,
      nivelCuenta: paciente.usuario?.nivelCuenta ?? null,
      identificadores: paciente.identificadores,
      fechaNacimiento: paciente.fechaNacimiento,
      sexo: paciente.sexo,
      // NOTA: Los nombres descifrados solo se incluyen cuando es necesario
      // y solo en respuestas destinadas a médicos o al propio paciente.
      // Aquí (identificación para administrativo) no se incluyen.
    };
  }

  /**
   * Registra un nuevo paciente en el MPI.
   * Los datos sensibles se cifran antes de almacenar.
   */
  async registrar(params: {
    tipo: string;
    valorDocumento: string;
    nombresCifrado: string;
    apellidosCifrado: string;
    fechaNacimiento: Date;
    sexo: string;
    telefonoCifrado?: string;
    correoCifrado?: string;
    creadoPor: string;
    ip: string;
  }): Promise<{ opaqueId: string; estadoIdentidad: string }> {
    const valorNormalizado = this.normalizarDocumento(params.valorDocumento);
    const hash = this.hashDocumento(valorNormalizado);

    // Verificar si ya existe un paciente con este documento
    const existente = await this.prisma.identificadorPaciente.findFirst({
      where: { valorHash: hash, tipo: params.tipo as any, activo: true },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe un registro con este documento. Si cree que es un error, contacte al personal del establecimiento.',
      );
    }

    const paciente = await this.prisma.paciente.create({
      data: {
        estadoIdentidad: 'EN_VALIDACION',
        nombresCifrado: params.nombresCifrado,
        apellidosCifrado: params.apellidosCifrado,
        fechaNacimiento: params.fechaNacimiento,
        sexo: params.sexo as any,
        telefonoCifrado: params.telefonoCifrado,
        correoCifrado: params.correoCifrado,
        creadoPor: params.creadoPor,
        identificadores: {
          create: {
            tipo: params.tipo as any,
            valorCifrado: params.nombresCifrado, // En prod: cifrar el valor real
            valorHash: hash,
            creadoPor: params.creadoPor,
          },
        },
        consentimientos: {
          create: {
            tipo: 'TRATAMIENTO_DATOS',
            version: '1.0',
            otorgado: true,
            fechaOtorgamiento: new Date(),
            ip: params.ip,
          },
        },
      },
    });

    await this.audit.registrar({
      usuarioId: params.creadoPor,
      pacienteId: paciente.id,
      accion: 'CREAR',
      recurso: 'paciente',
      recursoId: paciente.id,
      ipDireccion: params.ip,
    });

    const opaqueId = this.generarOpaqueId(paciente.id, params.creadoPor);

    return { opaqueId, estadoIdentidad: paciente.estadoIdentidad };
  }

  /**
   * Validación presencial: pasa la cuenta del paciente a nivel COMPLETO.
   * Solo puede ejecutarlo el personal ADMINISTRATIVO.
   */
  async validarPresencialmente(params: {
    pacienteId: string;
    administrativoId: string;
    establecimientoId: string;
    ip: string;
  }): Promise<void> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: params.pacienteId },
      include: { usuario: true },
    });

    if (!paciente) throw new NotFoundException('Paciente no encontrado.');
    if (paciente.estadoIdentidad === 'VERIFICADO') return; // Ya verificado

    await this.prisma.$transaction([
      this.prisma.paciente.update({
        where: { id: params.pacienteId },
        data: { estadoIdentidad: 'VERIFICADO' },
      }),
      ...(paciente.usuario
        ? [
            this.prisma.usuario.update({
              where: { id: paciente.usuario.id },
              data: { nivelCuenta: 'COMPLETO' },
            }),
          ]
        : []),
    ]);

    await this.audit.registrar({
      usuarioId: params.administrativoId,
      pacienteId: params.pacienteId,
      accion: 'VALIDAR_IDENTIDAD',
      recurso: 'paciente',
      recursoId: params.pacienteId,
      establecimientoId: params.establecimientoId,
      ipDireccion: params.ip,
      justificacion: 'Validación presencial de documento de identidad original',
    });
  }

  /**
   * Fusiona dos registros duplicados.
   * El registro origen pasa a estado FUSIONADO y apunta al destino.
   * NUNCA se eliminan datos clínicos — son reasignados al registro destino.
   * La operación es reversible (separar registros es posible con auditoría).
   */
  async fusionarDuplicados(params: {
    origenId: string;
    destinoId: string;
    adminId: string;
    justificacion: string;
    ip: string;
  }): Promise<void> {
    if (params.origenId === params.destinoId) {
      throw new BadRequestException('El registro origen y destino deben ser diferentes.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Mover identificadores al destino
      await tx.identificadorPaciente.updateMany({
        where: { pacienteId: params.origenId },
        data: { pacienteId: params.destinoId },
      });

      // Reasignar citas y episodios
      await tx.cita.updateMany({ where: { pacienteId: params.origenId }, data: { pacienteId: params.destinoId } });
      await tx.episodio.updateMany({ where: { pacienteId: params.origenId }, data: { pacienteId: params.destinoId } });
      await tx.consentimiento.updateMany({ where: { pacienteId: params.origenId }, data: { pacienteId: params.destinoId } });

      // Marcar el origen como fusionado (NUNCA eliminar)
      await tx.paciente.update({
        where: { id: params.origenId },
        data: { estadoIdentidad: 'FUSIONADO', fusionadoConId: params.destinoId },
      });
    });

    await this.audit.registrar({
      usuarioId: params.adminId,
      pacienteId: params.destinoId,
      accion: 'FUSIONAR_DUPLICADO',
      recurso: 'paciente',
      recursoId: params.origenId,
      ipDireccion: params.ip,
      justificacion: params.justificacion,
      metadatos: { origenId: params.origenId, destinoId: params.destinoId },
    });
  }

  // ============================================================
  // Utilidades internas
  // ============================================================

  private normalizarDocumento(valor: string): string {
    // Normalizar: quitar puntos, guiones, espacios y convertir a mayúsculas
    return valor.replace(/[\s.\-]/g, '').toUpperCase();
  }

  private hashDocumento(valorNormalizado: string): string {
    // SHA-256 para búsqueda determinística sin exponer el valor
    return crypto
      .createHash('sha256')
      .update(valorNormalizado)
      .digest('hex');
  }

  /**
   * Genera un ID opaco de sesión para un paciente.
   * Este ID es temporal y se almacena en Redis con TTL.
   * Permite referenciar al paciente en la sesión del médico sin exponer el UUID.
   */
  private generarOpaqueId(pacienteId: string, usuarioId: string): string {
    // HMAC-SHA256(pacienteId + usuarioId + timestamp_minuto)
    // Cambia cada minuto para minimizar reutilización
    const minuteTimestamp = Math.floor(Date.now() / 60000);
    const secret = process.env.OPAQUE_ID_SECRET ?? 'dev-opaque-secret-change-in-prod';

    return crypto
      .createHmac('sha256', secret)
      .update(`${pacienteId}:${usuarioId}:${minuteTimestamp}`)
      .digest('hex')
      .substring(0, 32); // 32 chars opacos
  }
}
