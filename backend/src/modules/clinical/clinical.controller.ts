import { Controller, Get, Post, Body, Param, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ClinicalService } from './clinical.service';
import { Roles, RequiereRelacionAsistencial } from '../../common/auth/decorators';
import { RelacionAsistencialGuard } from '../../common/auth/relacion-asistencial.guard';

@ApiTags('Módulo Clínico (Historia)')
@ApiBearerAuth()
@Controller('clinical')
export class ClinicalController {
  constructor(private readonly clinicalService: ClinicalService) {}

  @Get('pacientes/:opaqueId/resumen')
  @Roles('MEDICO', 'ENFERMERIA') // ABAC Guard protege aquí
  @UseGuards(RelacionAsistencialGuard)
  @RequiereRelacionAsistencial()
  @UseInterceptors(CacheInterceptor) // Caché de Redis para garantizar < 1 segundo
  @CacheTTL(15000) // 15 segundos de caché táctico durante la consulta
  @ApiOperation({
    summary: 'Obtener resumen clínico del paciente unificado',
    description: 'Aplica Relación Asistencial o Acceso de Emergencia (Break-glass).',
  })
  async obtenerResumen(@Param('opaqueId') opaqueId: string, @Request() req: any) {
    const pacienteId = req.pacienteIdAutorizado || opaqueId; 
    
    return this.clinicalService.obtenerResumen(
      pacienteId,
      req.user.sub,
      req.user.establecimientoId,
      req.ip,
      req.esAccesoEmergencia || false,
    );
  }

  @Post('episodios/:id/anexar')
  @Roles('MEDICO')
  @ApiOperation({ summary: 'Anexar notas a una evolución existente (Solo anexar, versionado)' })
  async anexarEvolucion(@Param('id') episodioId: string, @Body() dto: any, @Request() req: any) {
    return this.clinicalService.anexarEvolucion(
      episodioId,
      req.user.sub,
      req.user.establecimientoId,
      dto.evolucionCifrada,
      req.ip
    );
  }
}
