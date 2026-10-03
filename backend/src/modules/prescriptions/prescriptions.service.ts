import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FirmaElectronicaSimulatorAdapter } from '../../common/crypto/firma.adapter';
import * as crypto from 'crypto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firmaAdapter: FirmaElectronicaSimulatorAdapter,
  ) {}

  /**
   * Genera prescripción comprobando interacciones/alergias y la firma electrónicamente.
   */
  async crearPrescripcion(params: {
    episodioId: string;
    pacienteId: string;
    medicoId: string;
    medicamentoRxNorm: string;
    nombreMedicamento: string;
    dosis: string;
    frecuencia: string;
  }) {
    // 1. Motor de Alertas Clínicas (Verificar alergias del paciente)
    const alergias = await this.prisma.alergiaAntecedente.findMany({
      where: { pacienteId: params.pacienteId, tipo: 'ALERGIA', activa: true }
    });

    const tieneAlergia = alergias.some(a => 
      params.nombreMedicamento.toLowerCase().includes(a.agente.toLowerCase()) ||
      a.agente.toLowerCase().includes(params.nombreMedicamento.toLowerCase())
    );

    if (tieneAlergia) {
      throw new ConflictException('ALERTA_CLINICA: El paciente presenta una alergia activa registrada a este agente o compuesto cruzado.');
    }

    // 2. Firmar Electrónicamente la prescripción
    const hash = crypto.createHash('sha256').update(`${params.medicamentoRxNorm}-${params.dosis}`).digest('hex');
    const firma = await this.firmaAdapter.firmarDocumento(params.medicoId, hash);

    // 3. Crear código QR público para la farmacia
    const codigoQr = `SNHCE-RX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const urlVerificacion = `https://snhce.gob.ve/verificar/rx/${codigoQr}`; // Dummy domain

    // 4. Persistir en DB
    return this.prisma.prescripcion.create({
      data: {
        episodioId: params.episodioId,
        rxnormCui: params.medicamentoRxNorm,
        nombreMedicamento: params.nombreMedicamento,
        dosis: params.dosis,
        via: 'Oral',
        frecuencia: params.frecuencia,
        firmaRef: firma.referenciaFirma,
        firmado: firma.firmado,
        codigoQr,
        urlVerificacion,
        creadoPor: params.medicoId,
      }
    });
  }

  /**
   * Crea un reposo médico validado y enmascarado para empleadores.
   */
  async crearReposo(params: {
    episodioId: string;
    medicoId: string;
    fechaInicio: Date;
    diasReposo: number;
    diagnosticoId?: string;
  }) {
    const fechaFin = new Date(params.fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + params.diasReposo);

    // Firma electrónica del reposo
    const hash = crypto.createHash('sha256').update(`REPOSO-${params.episodioId}-${params.diasReposo}`).digest('hex');
    const firma = await this.firmaAdapter.firmarDocumento(params.medicoId, hash);

    const codigoVerificacion = crypto.randomBytes(8).toString('hex').toUpperCase();

    return this.prisma.reposoMedico.create({
      data: {
        episodioId: params.episodioId,
        fechaInicio: params.fechaInicio,
        fechaFin,
        diasReposo: params.diasReposo,
        diagnosticoId: params.diagnosticoId,
        firmaRef: firma.referenciaFirma,
        firmado: firma.firmado,
        codigoVerificacion,
        urlVerificacion: `https://snhce.gob.ve/verificar/reposo/${codigoVerificacion}`,
        creadoPor: params.medicoId,
      }
    });
  }

  /**
   * Endpoint PÚBLICO para patronos/empleadores.
   * Verifica la autenticidad del reposo pero NO devuelve el diagnóstico.
   */
  async verificarReposoPublico(codigoVerificacion: string) {
    const reposo = await this.prisma.reposoMedico.findUnique({
      where: { codigoVerificacion },
      include: {
        episodio: {
          include: { 
            paciente: true, 
            establecimiento: true 
          }
        }
      }
    });

    if (!reposo || reposo.estado === 'ANULADO') {
      throw new NotFoundException('El código de reposo ingresado es inválido, no existe o fue anulado.');
    }

    // NUNCA devolver el diagnóstico aquí (Privacidad Ley Datos Personales)
    return {
      valido: true,
      paciente: `${reposo.episodio.paciente.nombresCifrado[0]}. ${reposo.episodio.paciente.apellidosCifrado}`,
      cedulaOculta: `V-*****${reposo.episodio.paciente.id.slice(-3)}`,
      diasOtorgados: reposo.diasReposo,
      fechaInicio: reposo.fechaInicio,
      fechaFin: reposo.fechaFin,
      establecimientoEmisor: reposo.episodio.establecimiento.nombre,
      estado: reposo.estado,
      firma: reposo.firmaRef,
    };
  }
}
