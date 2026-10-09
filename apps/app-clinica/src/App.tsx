import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { Spinner } from '@snhce/ui';

// Páginas existentes
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const BuscarPacientePage = lazy(() => import('./pages/BuscarPacientePage'));
const ResumenClinicoPage = lazy(() => import('./pages/ResumenClinicoPage'));
const NuevaConsultaPage = lazy(() => import('./pages/NuevaConsultaPage'));
const NuevaPrescripcionPage = lazy(() => import('./pages/NuevaPrescripcionPage'));
const NuevoReposoPage = lazy(() => import('./pages/NuevoReposoPage'));
const TableroCronicosPage = lazy(() => import('./pages/TableroCronicosPage'));

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
            <Route element={<AuthGuard rolesPermitidos={['MEDICO', 'ENFERMERIA']} />}>
              <Route path="/" element={<AgendaPage />} />
              <Route path="/paciente/buscar" element={<BuscarPacientePage />} />
              <Route path="/paciente/:opaqueId/resumen" element={<ResumenClinicoPage />} />
              <Route path="/paciente/:opaqueId/nueva-consulta" element={<NuevaConsultaPage />} />
              <Route path="/paciente/:opaqueId/prescripcion" element={<NuevaPrescripcionPage />} />
              <Route path="/paciente/:opaqueId/reposo" element={<NuevoReposoPage />} />
              <Route path="/cronicos" element={<TableroCronicosPage />} />
            </Route>

            {/* Fallback general */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
