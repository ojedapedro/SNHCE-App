import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  rolesPermitidos?: string[];
}

export function AuthGuard({ rolesPermitidos }: AuthGuardProps) {
  const location = useLocation();
  // TODO: Integrar con el store de autenticación real (Zustand/Context)
  // Mock para que pase compilación.
  const isAuthenticated = true;
  const userRole = 'MEDICO'; 

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (!rolesPermitidos.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
