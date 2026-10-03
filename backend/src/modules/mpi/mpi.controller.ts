import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { MpiService } from './mpi.service';
import { Roles } from '../../common/auth/decorators';

class BuscarPacienteDto {
  @IsIn(['CEDULA_VE', 'RNE', 'PASAPORTE', 'CEDULA_MADRE_HIJO', 'PROVISIONAL'])
  tipo: string;

  @IsString()
  @IsNotEmpty()
  valor: string;
}

class ValidarPresencialDto {
  @IsString()
  @IsNotEmpty()
  pacienteId: string;
}

/**
 * Controlador MPI — Índice Maestro de Pacientes.
 *
 * Seguridad crítica:
 * - La búsqueda de pacientes usa POST (documento NUNCA en URL ni query params)
 * - Las respuestas usan IDs opacos de sesión, nunca el UUID real ni la cédula
 * - Los datos clínicos no están en este controlador (ver módulo clinical)
 */
@ApiTags('MPI — Índice Maestro de Pacientes')
@ApiBearerAuth()
@Controller('pacientes')
export class MpiController {
  constructor(private readonly mpiService: MpiService) {}

  /**
   * Búsqueda de paciente por documento.
   * Usa POST para evitar que el número de documento aparezca en URL o logs.
   */
  @Post('buscar')
  @Roles('MEDICO', 'ENFERMERIA', 'ADMINISTRATIVO', 'ADMINISTRADOR_DATOS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar paciente por documento (POST)',
    description:
      'El documento va en el BODY, nunca en la URL. Devuelve ID opaco de sesión.',
  })
  async buscar(
    @Body() dto: BuscarPacienteDto,
    @Request() req: any,
  ) {
    return this.mpiService.buscarPorDocumento({
      tipo: dto.tipo,
      valor: dto.valor,
      usuarioId: req.user.sub,
      establecimientoId: req.user.establecimientoId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Datos de identificación del paciente (sin datos clínicos).
   * Accesible para ADMINISTRATIVO (solo identificación y citas).
   */
  @Get(':opaqueId/identificacion')
  @Roles('MEDICO', 'ENFERMERIA', 'ADMINISTRATIVO', 'ADMINISTRADOR_DATOS')
  @ApiOperation({
    summary: 'Obtener datos de identificación (sin historia clínica)',
  })
  async identificacion(
    @Param('opaqueId') opaqueId: string,
    @Request() req: any,
  ) {
    // TODO: Resolver opaqueId → pacienteId desde Redis
    const pacienteId = opaqueId;

    return this.mpiService.obtenerIdentificacion(
      pacienteId,
      req.user.sub,
      req.ip,
    );
  }

  /**
   * Validación presencial de identidad → pasa la cuenta a nivel COMPLETO.
   * Solo para ADMINISTRATIVO.
   */
  @Post('validar-presencialmente')
  @Roles('ADMINISTRATIVO')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar identidad presencialmente',
    description:
      'El personal administrativo confirma el documento original y eleva la cuenta a nivel COMPLETO.',
  })
  async validarPresencialmente(
    @Body() dto: ValidarPresencialDto,
    @Request() req: any,
  ) {
    if (!req.user.establecimientoId) {
      throw new ForbiddenException(
        'Debe tener un establecimiento asignado para realizar validaciones presenciales.',
      );
    }

    await this.mpiService.validarPresencialmente({
      pacienteId: dto.pacienteId,
      administrativoId: req.user.sub,
      establecimientoId: req.user.establecimientoId,
      ip: req.ip,
    });

    return { mensaje: 'Identidad validada correctamente. La cuenta del paciente ha sido elevada a nivel Completo.' };
  }

  /**
   * Mis datos — el propio paciente consulta su información.
   */
  @Get('me')
  @Roles('PACIENTE')
  @ApiOperation({ summary: 'Obtener mis datos de paciente (para el portal del paciente)' })
  async misDatos(@Request() req: any) {
    if (!req.user.pacienteId) {
      throw new ForbiddenException('Su cuenta no está asociada a un registro de paciente.');
    }

    return this.mpiService.obtenerIdentificacion(
      req.user.pacienteId,
      req.user.sub,
      req.ip,
    );
  }
}
