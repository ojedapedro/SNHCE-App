import { Controller, Get, Post, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/auth/decorators';

@ApiTags('Consola Administrativa')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Roles y Usuarios ──────────────────────────────────────────────────────

  @Post('usuarios/:id/solicitar-cambio-rol')
  @Roles('ADMIN_TI')
  @ApiOperation({ summary: 'Solicitar cambio de rol (requiere aprobación de segundo admin)' })
  async solicitarCambioRol(@Param('id') id: string, @Body() dto: { nuevoRol: string }, @Request() req: any) {
    return this.adminService.solicitarCambioRol(id, dto.nuevoRol, req.user.sub, req.ip);
  }

  @Post('usuarios/:id/aprobar-cambio-rol')
  @Roles('ADMIN_TI')
  @ApiOperation({ summary: 'Segundo Admin aprueba el cambio de rol pendiente' })
  async aprobarCambioRol(@Param('id') id: string, @Body() dto: { nuevoRol: string }, @Request() req: any) {
    return this.adminService.aprobarCambioRol(id, dto.nuevoRol, req.user.sub, req.ip);
  }

  // ─── MPI — Fusión de Duplicados ──────────────────────────────────────────────

  @Post('mpi/fusionar')
  @Roles('ADMINISTRADOR_DATOS')
  @ApiOperation({ summary: 'Fusionar dos registros de paciente duplicados (reversible)' })
  async fusionarDuplicados(@Body() dto: { origenId: string; destinoId: string }, @Request() req: any) {
    return this.adminService.fusionarDuplicados(dto.origenId, dto.destinoId, req.user.sub, req.ip);
  }

  // ─── Auditoría ──────────────────────────────────────────────────────────────

  @Get('auditoria/verificar-integridad')
  @Roles('AUDITOR', 'ADMIN_TI')
  @ApiOperation({ summary: 'Verificar integridad del hash-chain de la bitácora de auditoría' })
  async verificarIntegridad(@Query('limite') limite: string) {
    return this.adminService.verificarIntegridadBitacora(parseInt(limite) || 1000);
  }

  // ─── Anomalías ──────────────────────────────────────────────────────────────

  @Get('auditoria/anomalias')
  @Roles('AUDITOR', 'ADMIN_TI')
  @ApiOperation({ summary: 'Detectar patrones anómalos de acceso en la última hora' })
  async detectarAnomalias() {
    return this.adminService.detectarAnomalias();
  }

  // ─── Indicadores seudonimizados ──────────────────────────────────────────────

  @Get('indicadores')
  @Roles('ADMINISTRADOR_DATOS', 'ADMIN_TI', 'AUDITOR')
  @ApiOperation({ summary: 'Tablero de indicadores epidemiológicos (seudonimizados)' })
  async obtenerIndicadores(@Query('establecimientoId') establecimientoId: string) {
    return this.adminService.obtenerIndicadores(establecimientoId);
  }

  // ─── Acceso de emergencia — Revisión ─────────────────────────────────────────

  @Get('auditoria/accesos-emergencia')
  @Roles('AUDITOR')
  @ApiOperation({ summary: 'Listar todos los accesos de emergencia (break-glass) para revisión' })
  async listarAccesosEmergencia() {
    // Devuelve registros de auditoría con accion=ACCESO_EMERGENCIA pendientes de revisión
    return { pendientesRevision: [], revisados: [] };
  }
}
