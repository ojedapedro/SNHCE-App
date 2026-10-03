import { SetMetadata } from '@nestjs/common';

/**
 * Roles que pueden acceder a un endpoint.
 * Uso: @Roles('MEDICO', 'ENFERMERIA')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Marca un endpoint como público (sin autenticación).
 * Uso: @Public()
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Requiere que el paciente tenga nivel de cuenta COMPLETO.
 * Uso: @RequiereNivelCompleto()
 */
export const NIVEL_COMPLETO_KEY = 'nivelCompleto';
export const RequiereNivelCompleto = () => SetMetadata(NIVEL_COMPLETO_KEY, true);

/**
 * Indica que el endpoint requiere verificación de relación asistencial (ABAC).
 * Uso: @RequiereRelacionAsistencial()
 */
export const RELACION_ASISTENCIAL_KEY = 'relacionAsistencial';
export const RequiereRelacionAsistencial = () =>
  SetMetadata(RELACION_ASISTENCIAL_KEY, true);
