import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { Spinner } from '@snhce/ui';

const LoginAdmin = lazy(() => import('./pages/LoginAdmin'));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));

// Recepción / Admisión
const BuscarPacienteAdmin = lazy(() => import('./pages/recepcion/BuscarPacienteAdmin'));
const ValidacionPresencialPage = lazy(() => import('./pages/recepcion/ValidacionPresencialPage'));
const GestionCitasPage = lazy(() => import('./pages/recepcion/GestionCitasPage'));
const RegistroProvisionalPage = lazy(() => import('./pages/recepcion/RegistroProvisionalPage'));
const VerificacionReposoPage = lazy(() => import('./pages/recepcion/VerificacionReposoPage'));

// Administración de datos
const UsuariosRolesPage = lazy(() => import('./pages/admin/UsuariosRolesPage'));
const EstablecimientosPage = lazy(() => import('./pages/admin/EstablecimientosPage'));
const CatalogosPage = lazy(() => import('./pages/admin/CatalogosPage'));
const DuplicadosMpiPage = lazy(() => import('./pages/admin/DuplicadosMpiPage'));

// Auditoría
const AuditoriaPage = lazy(() => import('./pages/auditoria/AuditoriaPage'));

// TI / Sistema
const EstadoSistemaPage = lazy(() => import('./pages/ti/EstadoSistemaPage'));

// Reportes
const TableroGestionPage = lazy(() => import('./pages/reportes/TableroGestionPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        if ([401, 403].includes(error?.response?.status)) return false;
        return failureCount < 2;
      },
    },
  },
});

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Spinner size="lg" aria-label="Cargando..." />
  </div>
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginAdmin />} />

            {/* Rutas de recepción/admisión */}
            <Route element={<AuthGuard rolesPermitidos={['ADMINISTRATIVO', 'ADMINISTRADOR_DATOS', 'AUDITOR', 'ADMIN_TI']} />}>
              <Route path="/" element={<DashboardAdmin />} />

              {/* Recepción */}
              <Route element={<AuthGuard rolesPermitidos={['ADMINISTRATIVO', 'ADMINISTRADOR_DATOS']} />}>
                <Route path="/recepcion/paciente" element={<BuscarPacienteAdmin />} />
                <Route path="/recepcion/validacion-presencial" element={<ValidacionPresencialPage />} />
                <Route path="/recepcion/citas" element={<GestionCitasPage />} />
                <Route path="/recepcion/registro-provisional" element={<RegistroProvisionalPage />} />
                <Route path="/recepcion/verificar-reposo" element={<VerificacionReposoPage />} />
              </Route>

              {/* Administración datos */}
              <Route element={<AuthGuard rolesPermitidos={['ADMINISTRADOR_DATOS', 'ADMIN_TI']} />}>
                <Route path="/admin/usuarios" element={<UsuariosRolesPage />} />
                <Route path="/admin/establecimientos" element={<EstablecimientosPage />} />
                <Route path="/admin/catalogos" element={<CatalogosPage />} />
                <Route path="/admin/duplicados-mpi" element={<DuplicadosMpiPage />} />
              </Route>

              {/* Auditoría */}
              <Route element={<AuthGuard rolesPermitidos={['AUDITOR', 'ADMINISTRADOR_DATOS']} />}>
                <Route path="/auditoria" element={<AuditoriaPage />} />
              </Route>

              {/* Reportes (datos seudónimizados) */}
              <Route path="/reportes" element={<TableroGestionPage />} />

              {/* TI */}
              <Route element={<AuthGuard rolesPermitidos={['ADMIN_TI']} />}>
                <Route path="/sistema/estado" element={<EstadoSistemaPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
