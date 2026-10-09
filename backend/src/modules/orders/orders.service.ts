import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una orden de laboratorio o imagenología basada en LOINC.
   */
  async crearOrden(params: {
    episodioId: string;
    tipo: 'LABORATORIO' | 'IMAGEN' | 'PROCEDIMIENTO';
    codigoLoinc?: string;
    descripcion: string;
    prioridad: 'RUTINA' | 'URGENTE' | 'STAT';
    medicoId: string;
  }) {
    return this.prisma.ordenResultado.create({
      data: {
        episodioId: params.episodioId,
        tipo: params.tipo,
        codigoLoinc: params.codigoLoinc,
        descripcion: params.descripcion,
        prioridad: params.prioridad,
        creadoPor: params.medicoId,
      }
    });
  }

  /**
   * Carga los resultados de una orden.
   * La subida física a MinIO se maneja en otro microservicio de Storage,
   * aquí guardamos la referencia en la BD.
   */
  async reportarResultado(ordenId: string, resultadoTextoBase64: string, archivosMinioKeys: string[]) {
    // ... Lógica de actualización de orden ...
    return { status: 'OK', ordenId };
  }
}
