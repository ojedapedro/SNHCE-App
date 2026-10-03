import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Usuario {
  sub: string;
  rol: string;
  nivelCuenta: 'BASICO' | 'COMPLETO';
  pacienteId?: string;
  establecimientoId?: string;
}

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  // Acciones
  setAuth: (usuario: Usuario, accessToken: string) => void;
  clearAuth: () => void;
}

/**
 * Store de autenticación.
 *
 * Seguridad:
 * - El accessToken se guarda solo en memoria (sessionStorage) — NO en localStorage
 * - Se limpia completamente al cerrar sesión
 * - Los datos clínicos NUNCA se almacenan aquí
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      accessToken: null,

      setAuth: (usuario, accessToken) =>
        set({ usuario, accessToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ usuario: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'snhce-auth',
      // sessionStorage: se limpia al cerrar el navegador (más seguro que localStorage)
      storage: createJSONStorage(() => sessionStorage),
      // Solo persistir datos de sesión no sensibles, NUNCA el accessToken en storage
      partialize: (state) => ({
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
        // accessToken queda fuera — se re-obtiene via refresh token en Keycloak
      }),
    },
  ),
);
