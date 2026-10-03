import { Injectable, Logger } from '@nestjs/common';

export interface LivenessRespuesta {
  esHumanoVivo: boolean;
  nivelConfianza: number;
  motivoRechazo?: string;
}

@Injectable()
export class LivenessSimulatorAdapter {
  private readonly logger = new Logger(LivenessSimulatorAdapter.name);

  /**
   * Simula la conexión con un servicio de prueba de vida (Biometría facial pasiva/activa).
   * Valida si el payload biométrico (foto/video) corresponde a una persona viva real.
   */
  async validarPruebaDeVida(payloadBiometricoBase64: string): Promise<LivenessRespuesta> {
    this.logger.log(`[SIMULADOR LIVENESS] Procesando biometría para prueba de vida...`);
    
    // Simulamos procesamiento de IA
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Lógica de simulación simple para desarrollo
    if (payloadBiometricoBase64.includes('FAIL_LIVENESS')) {
      return {
        esHumanoVivo: false,
        nivelConfianza: 0.12,
        motivoRechazo: 'Se detectó ataque de presentación (posible foto impresa o pantalla)',
      };
    }

    // Validación exitosa simulada
    return {
      esHumanoVivo: true,
      nivelConfianza: 0.98,
    };
  }
}
