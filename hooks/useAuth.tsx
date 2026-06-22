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

// Devuelve el login correcto según rol
function loginRouteForRole(rol: Rol): string {
  if (rol === 'ADMIN')      return '/login/admin';
  if (rol === 'EMPLEADO')   return '/login/empleado';
  return '/login/cliente';
}

// Devuelve el home correcto según rol
function homeRouteForRole(rol: Rol): string {
  if (rol === 'ADMIN')      return '/admin/dashboard';
  if (rol === 'EMPLEADO')   return '/empleado/dashboard';
  if (rol === 'CLIENTE')    return '/cliente/dashboard';
  if (rol === 'REPARTIDOR') return '/cliente/dashboard'; // repartidor usa portal cliente por ahora
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
    tokenStorage.set(data.accessToken, data.refreshToken);
    setUser(data.usuario);
    router.push(homeRouteForRole(data.usuario.rol));
  }, [router]);

  const loginGoogle = useCallback(async (idToken: string) => {
    const data = await authApi.loginGoogle(idToken);
    tokenStorage.set(data.accessToken, data.refreshToken);
    setUser(data.usuario);
    router.push(homeRouteForRole(data.usuario.rol));
  }, [router]);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    const currentRole = user?.rol;
    if (refresh) {
      try { await authApi.logout(refresh); } catch { /* ignorar */ }
    }
    tokenStorage.clear();
    setUser(null);
    // Redirigir al login del portal que estaba usando
    router.push(currentRole ? loginRouteForRole(currentRole) : '/admin/login');
  }, [router, user]);

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
