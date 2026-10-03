import { Injectable, Logger } from '@nestjs/common';

export interface ValidacionIdentidadRespuesta {
  esValido: boolean;
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  sexo?: 'MASCULINO' | 'FEMENINO';
  motivoRechazo?: string;
}

@Injectable()
export class SaimeSimulatorAdapter {
  private readonly logger = new Logger(SaimeSimulatorAdapter.name);

  /**
   * Simula la conexión con la API del SAIME para validar una cédula.
   * En desarrollo, las cédulas que terminan en '000' fallan, el resto pasa.
   */
  async validarIdentidad(cedula: string, fechaNacimientoProporcionada: string): Promise<ValidacionIdentidadRespuesta> {
    this.logger.log(`[SIMULADOR SAIME] Validando identidad para cédula: ${cedula}`);
    
    // Simulamos latencia de red gubernamental
    await new Promise(resolve => setTimeout(resolve, 800));

    if (cedula.endsWith('000')) {
      return {
        esValido: false,
        motivoRechazo: 'Documento no encontrado o cancelado en los registros del SAIME',
      };
    }

    // Respuesta simulada exitosa
    return {
      esValido: true,
      // Retornamos datos simulados extraídos del servicio
      nombres: 'María Alejandra',
      apellidos: 'Pérez González',
      fechaNacimiento: fechaNacimientoProporcionada, 
      sexo: 'FEMENINO',
    };
  }
}
