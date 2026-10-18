import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import * as crypto from 'crypto';

/**
 * Servicio de Auditoría — Bitácora append-only con hash encadenado.
 *
 * REGLAS INMUTABLES:
 * - NUNCA se actualiza ni elimina un registro de auditoría.
 * - Cada registro incluye el SHA-256 del registro anterior (hash-chain).
 * - Toda lectura Y escritura de datos clínicos debe registrarse.
 *
 * El hash_actual = SHA256(JSON.stringify(payload) + hash_anterior)
 * Esto permite detectar manipulaciones verificando toda la cadena.
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private lastHash: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Cargar el hash del último registro al iniciar el servicio
    await this.refreshLastHash();
  }

  /**
   * Registra un evento de auditoría.
   * CRÍTICO: Esta función debe llamarse en cada acceso a datos clínicos.
   */
  async registrar(params: {
    usuarioId: string;
    pacienteId?: string;
    accion: string;
    recurso: string;
    recursoId?: string;
    establecimientoId?: string;
    ipDireccion: string;
    userAgent?: string;
    justificacion?: string;
    metadatos?: Record<string, unknown>;
  }): Promise<void> {
    const payload = {
      usuarioId: params.usuarioId,
      pacienteId: params.pacienteId ?? null,
      accion: params.accion,
      recurso: params.recurso,
      recursoId: params.recursoId ?? null,
      establecimientoId: params.establecimientoId ?? null,
      ipDireccion: params.ipDireccion,
      justificacion: params.justificacion ?? null,
      timestamp: new Date().toISOString(),
    };

    // Hash encadenado: SHA256(payload_json + hash_anterior)
    const contenidoParaHash =
      JSON.stringify(payload) + (this.lastHash ?? 'GENESIS');
    const hashActual = crypto
      .createHash('sha256')
      .update(contenidoParaHash)
      .digest('hex');

    await this.prisma.auditoriaAcceso.create({
      data: {
        hashAnterior: this.lastHash,
        hashActual,
        usuarioId: params.usuarioId,
        pacienteId: params.pacienteId,
        accion: params.accion as any,
        recurso: params.recurso,
        recursoId: params.recursoId,
        establecimientoId: params.establecimientoId,
        ipDireccion: params.ipDireccion,
        userAgent: params.userAgent,
        justificacion: params.justificacion,
        metadatos: (params.metadatos ?? {}) as any,
      },
    });

    // Actualizar el último hash en memoria para el próximo registro
    this.lastHash = hashActual;
  }

  /**
   * Verifica la integridad de toda la cadena de hash.
   * Recorre todos los registros en orden y verifica que cada hash sea correcto.
   * Devuelve: { integro: true } o { integro: false, primerRegistroInvalido: BigInt }
   */
  async verificarIntegridadCadena(): Promise<{
    integro: boolean;
    totalRegistros: number;
    primerRegistroInvalido?: bigint;
    mensaje: string;
  }> {
    const registros = await this.prisma.auditoriaAcceso.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        hashAnterior: true,
        hashActual: true,
        usuarioId: true,
        pacienteId: true,
        accion: true,
        recurso: true,
        recursoId: true,
        establecimientoId: true,
        ipDireccion: true,
        justificacion: true,
        creadoEn: true,
      },
    });

    let hashAnteriorEsperado: string | null = null;

    for (const registro of registros) {
      const payload = {
        usuarioId: registro.usuarioId,
        pacienteId: registro.pacienteId,
        accion: registro.accion,
        recurso: registro.recurso,
        recursoId: registro.recursoId,
        establecimientoId: registro.establecimientoId,
        ipDireccion: registro.ipDireccion,
        justificacion: registro.justificacion,
        timestamp: registro.creadoEn.toISOString(),
      };

      const contenidoParaHash: string =
        JSON.stringify(payload) + (hashAnteriorEsperado ?? 'GENESIS');
      const hashCalculado: string = crypto
        .createHash('sha256')
        .update(contenidoParaHash)
        .digest('hex');

      if (hashCalculado !== registro.hashActual) {
        return {
          integro: false,
          totalRegistros: registros.length,
          primerRegistroInvalido: registro.id,
          mensaje: `⚠️ Integridad comprometida en el registro ID ${registro.id}. Se detectó manipulación de la cadena de auditoría.`,
        };
      }

      hashAnteriorEsperado = registro.hashActual;
    }

    return {
      integro: true,
      totalRegistros: registros.length,
      mensaje: `✅ Cadena de auditoría íntegra. ${registros.length} registros verificados correctamente.`,
    };
  }

  /**
   * Consulta la bitácora con filtros (solo para AUDITOR y ADMINISTRADOR_DATOS).
   * IMPORTANTE: No devuelve datos clínicos, solo metadatos de acceso.
   */
  async consultar(params: {
    usuarioId?: string;
    pacienteId?: string;
    accion?: string;
    desde?: Date;
    hasta?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    registros: any[];
    total: number;
    pagina: number;
  }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200); // Max 200 por página
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.usuarioId) where.usuarioId = params.usuarioId;
    if (params.pacienteId) where.pacienteId = params.pacienteId;
    if (params.accion) where.accion = params.accion;
    if (params.desde || params.hasta) {
      where.creadoEn = {};
      if (params.desde) where.creadoEn.gte = params.desde;
      if (params.hasta) where.creadoEn.lte = params.hasta;
    }

    const [registros, total] = await Promise.all([
      this.prisma.auditoriaAcceso.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          accion: true,
          recurso: true,
          recursoId: true,
          establecimientoId: true,
          ipDireccion: true,
          userAgent: true,
          justificacion: true,
          creadoEn: true,
          hashActual: true,
          usuario: {
            select: { rol: true, keycloakId: true },
          },
          // Nota: NO incluir datos clínicos del paciente
        },
      }),
      this.prisma.auditoriaAcceso.count({ where }),
    ]);

    return { registros, total, pagina: page };
  }

  private async refreshLastHash(): Promise<void> {
    const ultimo = await this.prisma.auditoriaAcceso.findFirst({
      orderBy: { id: 'desc' },
      select: { hashActual: true },
    });
    this.lastHash = ultimo?.hashActual ?? null;
  }
}
