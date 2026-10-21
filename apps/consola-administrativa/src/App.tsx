import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { Spinner } from '@snhce/ui';

const ConsolaAdminPage = lazy(() => import('./pages/ConsolaAdminPage'));
const GestionCitasPage = lazy(() => import('./pages/GestionCitasPage'));
const ValidacionPresencialPage = lazy(() => import('./pages/ValidacionPresencialPage'));
const RegistroProvisionalPage = lazy(() => import('./pages/RegistroProvisionalPage'));

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
            {/* Rutas protegidas */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<ConsolaAdminPage />} />
              <Route path="/citas" element={<GestionCitasPage />} />
              <Route path="/validacion-presencial" element={<ValidacionPresencialPage />} />
              <Route path="/registro-provisional" element={<RegistroProvisionalPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
