import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  NIVEL_COMPLETO_KEY,
} from './decorators';

/**
 * Guard de autenticación + RBAC (Role-Based Access Control).
 *
 * Verifica:
 * 1. Que el request tenga un token JWT válido (validado por Keycloak)
 * 2. Que el usuario tenga al menos uno de los roles requeridos
 * 3. Que si se requiere NivelCompleto, la cuenta del usuario lo sea
 *
 * En NODE_ENV=test acepta el header X-Test-Auth con payload base64
 * para simplificar los tests de autorización.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si el endpoint es público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Extraer usuario del token
    const user = await this.extractUser(request);
    if (!user) {
      throw new UnauthorizedException(
        'Se requiere autenticación para acceder a este recurso.',
      );
    }

    // Adjuntar usuario al request para uso posterior
    request.user = user;

    // Verificar roles requeridos (RBAC)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => user.rol === role);
      if (!hasRole) {
        throw new ForbiddenException(
          'No tiene permisos para realizar esta acción.',
        );
      }
    }

    // Verificar nivel de cuenta (para pacientes que necesitan COMPLETO)
    const requiereNivelCompleto = this.reflector.getAllAndOverride<boolean>(
      NIVEL_COMPLETO_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiereNivelCompleto && user.nivelCuenta !== 'COMPLETO') {
      throw new ForbiddenException(
        'Esta funcionalidad requiere validación presencial de identidad. ' +
          'Acuda a cualquier establecimiento de salud de la red pública con su documento original.',
      );
    }

    return true;
  }

  private async extractUser(request: any): Promise<any | null> {
    // En modo test: aceptar header X-Test-Auth con payload base64
    if (process.env.NODE_ENV === 'test') {
      const testAuth = request.headers['x-test-auth'];
      if (testAuth) {
        try {
          return JSON.parse(Buffer.from(testAuth, 'base64').toString('utf-8'));
        } catch {
          return null;
        }
      }
    }

    // En producción/desarrollo: extraer del token JWT de Keycloak
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // TODO: Verificar el token con la clave pública de Keycloak
    // Usar keycloak-connect o jose para verificación JWT RS256
    // Por ahora: decodificar sin verificar (SOLO para desarrollo inicial)
    // En producción: SIEMPRE verificar la firma
    try {
      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8'),
      );

      return {
        sub: payload.sub,
        keycloakId: payload.sub,
        rol: payload.realm_access?.roles?.find((r: string) =>
          [
            'PACIENTE', 'MEDICO', 'ENFERMERIA', 'ADMINISTRATIVO',
            'ADMINISTRADOR_DATOS', 'AUDITOR', 'ADMIN_TI',
          ].includes(r),
        ) ?? null,
        nivelCuenta: payload.nivel_cuenta ?? 'BASICO',
        establecimientoId: payload.establecimiento_id ?? null,
        pacienteId: payload.paciente_id ?? null,
      };
    } catch {
      return null;
    }
  }
}
