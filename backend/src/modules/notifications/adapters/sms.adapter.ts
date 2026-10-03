import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsSimulatorAdapter {
  private readonly logger = new Logger(SmsSimulatorAdapter.name);

  async enviarSms(telefono: string, mensaje: string): Promise<boolean> {
    this.logger.log(`[SIMULADOR SMS] Enviando a ${telefono}: "${mensaje}"`);
    // Simulamos latencia del Gateway SMS (ej. Movilnet/Digitel/Movistar)
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}
