import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/auth/decorators';

/**
 * Controlador de Auditoría.
 *
 * Acceso restringido:
 * - GET /auditoria → AUDITOR y ADMINISTRADOR_DATOS (solo metadatos, sin datos clínicos)
 * - GET /auditoria/verificar-integridad → AUDITOR y ADMIN_TI
 * - GET /auditoria/mis-accesos → PACIENTE (solo sus propios accesos)
 */
@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('AUDITOR', 'ADMINISTRADOR_DATOS')
  @ApiOperation({
    summary: 'Consultar bitácora de auditoría',
    description: 'Devuelve metadatos de acceso. Nunca incluye datos clínicos del paciente.',
  })
  async consultar(
    @Query('usuarioId') usuarioId?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('accion') accion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.auditService.consultar({
      usuarioId,
      pacienteId,
      accion,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  @Get('verificar-integridad')
  @Roles('AUDITOR', 'ADMIN_TI')
  @ApiOperation({
    summary: 'Verificar integridad de la cadena de hash',
    description:
      'Recorre toda la cadena de auditoría y verifica que ningún registro haya sido manipulado.',
  })
  async verificarIntegridad() {
    return this.auditService.verificarIntegridadCadena();
  }

  @Get('mis-accesos')
  @Roles('PACIENTE')
  @ApiOperation({
    summary: 'Ver quién accedió a mi historia clínica',
    description:
      'El paciente puede ver todos los accesos a su propia historia: usuario, centro, rol, fecha y motivo.',
  })
  async misAccesos(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pacienteId = req.user?.pacienteId;
    if (!pacienteId) {
      throw new ForbiddenException(
        'Su cuenta no está asociada a un registro de paciente.',
      );
    }

    return this.auditService.consultar({
      pacienteId,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
    });
  }
}
