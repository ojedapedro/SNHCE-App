import { Injectable, Logger } from '@nestjs/common';

export interface ResultadoFirma {
  firmado: boolean;
  referenciaFirma: string;
  selloDeTiempo: string;
}

@Injectable()
export class FirmaElectronicaSimulatorAdapter {
  private readonly logger = new Logger(FirmaElectronicaSimulatorAdapter.name);

  /**
   * Simula la firma electrónica cualificada de un documento médico.
   * Representa la integración futura con el proveedor acreditado en Venezuela (SUSCERTE u otro).
   */
  async firmarDocumento(idMedico: string, payloadHash: string): Promise<ResultadoFirma> {
    this.logger.log(`[SIMULADOR FIRMA] Solicitando firma para médico ${idMedico} sobre hash ${payloadHash}`);
    
    // Simula retardo criptográfico y de red
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      firmado: true,
      referenciaFirma: `FIRMA-SIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      selloDeTiempo: new Date().toISOString(),
    };
  }
}
