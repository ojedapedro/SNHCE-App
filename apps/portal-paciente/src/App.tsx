import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { NivelCompletoGuard } from './components/NivelCompletoGuard';
import { Spinner } from '@snhce/ui';

// Lazy loading de páginas para reducir bundle inicial (crítico en conexiones lentas)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegistroPage = lazy(() => import('./pages/RegistroPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MisCitasPage = lazy(() => import('./pages/MisCitasPage'));
const NuevaCitaPage = lazy(() => import('./pages/NuevaCitaPage'));
const MiHistoriaPage = lazy(() => import('./pages/MiHistoriaPage'));
const AccesosHistoriaPage = lazy(() => import('./pages/AccesosHistoriaPage'));
const ConsentimientosPage = lazy(() => import('./pages/ConsentimientosPage'));
const PerfilPage = lazy(() => import('./pages/PerfilPage'));
const AyudaPage = lazy(() => import('./pages/AyudaPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: (failureCount, error: any) => {
        // No reintentar en errores de autenticación/autorización
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
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/ayuda" element={<AyudaPage />} />

            {/* Rutas protegidas (requieren autenticación) */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/citas" element={<MisCitasPage />} />
              <Route path="/citas/nueva" element={<NuevaCitaPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/accesos" element={<AccesosHistoriaPage />} />
              <Route path="/consentimientos" element={<ConsentimientosPage />} />

              {/* Requiere nivel COMPLETO (validación presencial) */}
              <Route element={<NivelCompletoGuard />}>
                <Route path="/historia" element={<MiHistoriaPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
