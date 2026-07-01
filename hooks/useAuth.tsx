'use client';
// hooks/useAuth.tsx — Multi-portal: Admin, Empleado, Cliente
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, tokenStorage } from '@/lib/api';
import type { AuthUser, Rol } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: AuthUser) => void;
  isRole: (...roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Devuelve el login correcto según rol — ruta unificada /ingresar para todos
function loginRouteForRole(_rol?: Rol): string {
  return '/ingresar';
}

// Devuelve el home correcto según rol
function homeRouteForRole(rol: Rol): string {
  if (rol === 'ADMIN')    return '/admin/dashboard';
  if (rol === 'EMPLEADO') return '/empleado/dashboard';
  if (rol === 'CLIENTE')  return '/cliente/dashboard';
  // REPARTIDOR no tiene acceso a la web — solo usa la app Flutter
  return '/cliente/dashboard';
}

export { loginRouteForRole, homeRouteForRole };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const restore = async () => {
      const token = tokenStorage.getAccess();
      if (!token) { setLoading(false); return; }
      try {
        const me = await authApi.me();
        // Si el token guardado pertenece a un repartidor, limpiar sesión
        if (me.rol === 'REPARTIDOR') {
          tokenStorage.clear();
          setLoading(false);
          return;
        }
        setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    if (data.usuario.rol === 'REPARTIDOR') {
      // No guardar tokens ni sesión — bloquear acceso web
      throw new Error('Los repartidores solo pueden acceder desde la app móvil LavaYa.');
    }
    tokenStorage.set(data.accessToken, data.refreshToken);
    setUser(data.usuario);
    router.push(homeRouteForRole(data.usuario.rol));
  }, [router]);

  const loginGoogle = useCallback(async (idToken: string) => {
    const data = await authApi.loginGoogle(idToken);
    if (data.usuario.rol === 'REPARTIDOR') {
      throw new Error('Los repartidores solo pueden acceder desde la app móvil LavaYa.');
    }
    tokenStorage.set(data.accessToken, data.refreshToken);
    setUser(data.usuario);
    router.push(homeRouteForRole(data.usuario.rol));
  }, [router]);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      try { await authApi.logout(refresh); } catch { /* ignorar */ }
    }
    tokenStorage.clear();
    setUser(null);
    // Redirigir al login unificado
    router.push('/ingresar');
  }, [router]);

  const updateUser = useCallback((u: AuthUser) => setUser(u), []);

  const isRole = useCallback(
    (...roles: Rol[]) => !!user && roles.includes(user.rol),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, loginGoogle, logout, updateUser, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
