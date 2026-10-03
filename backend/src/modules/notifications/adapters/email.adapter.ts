import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailSimulatorAdapter {
  private readonly logger = new Logger(EmailSimulatorAdapter.name);

  async enviarCorreo(correo: string, asunto: string, html: string): Promise<boolean> {
    this.logger.log(`[SIMULADOR EMAIL] Enviando a ${correo} | Asunto: ${asunto}`);
    // En desarrollo esto iría conectado a MailDev local
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }
}
