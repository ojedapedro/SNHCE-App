import { Controller, Get, Post, Body, Query, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CitasService } from './citas.service';
import { Roles } from '../../common/auth/decorators';

@ApiTags('Citas y Agenda')
@ApiBearerAuth()
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get('agenda')
  @Roles('MEDICO', 'ENFERMERIA', 'ADMINISTRATIVO')
  @ApiOperation({ summary: 'Obtener agenda del día para el centro de salud del usuario' })
  async obtenerAgenda(@Query('fecha') fecha: string, @Request() req: any) {
    return this.citasService.obtenerAgenda(
      req.user.establecimientoId,
      fecha || new Date().toISOString().split('T')[0],
      req.ip,
      req.user.sub,
    );
  }

  @Post('solicitar')
  @Roles('PACIENTE')
  @Throttle({ default: { limit: 2, ttl: 60000 } }) // Anti-abuso: Max 2 citas por minuto
  @ApiOperation({ summary: 'Solicitar una nueva cita médica desde el portal del paciente' })
  async solicitarCita(@Body() dto: any, @Request() req: any) {
    
    // Simulación de validación de CAPTCHA anti-abuso (bots)
    if (!dto.captchaToken) {
      throw new BadRequestException('Se requiere validación CAPTCHA para solicitar citas.');
    }

    return this.citasService.solicitarCita({
      pacienteId: req.user.pacienteId,
      establecimientoId: dto.establecimientoId,
      especialidad: dto.especialidad,
      fechaPreferida: new Date(dto.fecha),
      motivoConsulta: dto.motivo,
      ip: req.ip,
    });
  }
}
