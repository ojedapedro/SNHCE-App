import { Injectable } from '@nestjs/common';
import { SmsSimulatorAdapter } from './adapters/sms.adapter';
import { EmailSimulatorAdapter } from './adapters/email.adapter';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly sms: SmsSimulatorAdapter,
    private readonly email: EmailSimulatorAdapter,
  ) {}

  async enviarRecordatorioCita(pacienteNombre: string, telefono: string, fechaHora: Date, centro: string) {
    const fecha = fechaHora.toLocaleDateString('es-VE');
    const hora = fechaHora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const mensaje = `SNHCE: Hola ${pacienteNombre}, recordatorio de cita médica el ${fecha} a las ${hora} en ${centro}. Asista con 15 min de anticipación.`;
    
    await this.sms.enviarSms(telefono, mensaje);
  }

  async notificarRegistro(correo: string, nombres: string) {
    const html = `<h2>Bienvenido al SNHCE</h2><p>Hola ${nombres}, su registro fue exitoso.</p>`;
    await this.email.enviarCorreo(correo, 'Registro Exitoso - SNHCE', html);
  }
}
