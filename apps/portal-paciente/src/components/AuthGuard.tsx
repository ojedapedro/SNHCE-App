import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface AuthGuardProps {
  rolesPermitidos?: string[];
  redirectTo?: string;
}

/**
 * Protege rutas que requieren autenticación.
 * Opcionalmente verifica que el usuario tenga uno de los roles permitidos.
 */
export function AuthGuard({
  rolesPermitidos,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { usuario, isAuthenticated } = useAuthStore();

  // No autenticado → redirigir al login
  if (!isAuthenticated || !usuario) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar rol si se especificaron roles requeridos
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (!rolesPermitidos.includes(usuario.rol)) {
      // Redirigir a página de acceso denegado o inicio
      return <Navigate to="/acceso-denegado" replace />;
    }
  }

  return <Outlet />;
}
