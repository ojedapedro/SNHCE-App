import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { Spinner } from '@snhce/ui';

const LoginClinica = lazy(() => import('./pages/LoginClinica'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const BuscarPacientePage = lazy(() => import('./pages/BuscarPacientePage'));
const ResumenClinicoPage = lazy(() => import('./pages/ResumenClinicoPage'));
const NuevaConsultaPage = lazy(() => import('./pages/NuevaConsultaPage'));
const PrescripcionPage = lazy(() => import('./pages/PrescripcionPage'));
const ReposoPage = lazy(() => import('./pages/ReposoPage'));
const OrdenesPage = lazy(() => import('./pages/OrdenesPage'));
const HistorialEpisodiosPage = lazy(() => import('./pages/HistorialEpisodiosPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos — datos clínicos más frescos
      retry: (failureCount, error: any) => {
        if ([401, 403].includes(error?.response?.status)) return false;
        return failureCount < 1;
      },
    },
  },
});

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <Spinner size="lg" aria-label="Cargando..." />
  </div>
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginClinica />} />

            {/* Rutas protegidas para personal médico y de enfermería */}
            <Route element={<AuthGuard rolesPermitidos={['MEDICO', 'ENFERMERIA']} />}>
              {/* Agenda del día — pantalla principal */}
              <Route path="/" element={<AgendaPage />} />

              {/* Búsqueda — siempre por POST (documento nunca en URL) */}
              <Route path="/paciente/buscar" element={<BuscarPacientePage />} />

              {/* Historia del paciente — usar ID opaco de sesión, nunca UUID ni cédula */}
              <Route path="/paciente/:opaqueId/resumen" element={<ResumenClinicoPage />} />
              <Route path="/paciente/:opaqueId/nueva-consulta" element={<NuevaConsultaPage />} />
              <Route path="/paciente/:opaqueId/prescripcion" element={<PrescripcionPage />} />
              <Route path="/paciente/:opaqueId/reposo" element={<ReposoPage />} />
              <Route path="/paciente/:opaqueId/ordenes" element={<OrdenesPage />} />
              <Route path="/paciente/:opaqueId/historial" element={<HistorialEpisodiosPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
