// components/layout/RouteGuard.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, loginRouteForRole } from '@/hooks/useAuth';
import type { Rol } from '@/types';

interface RouteGuardProps {
  allowedRoles: Rol[];
  children: React.ReactNode;
  loginHref?: string; // override del login si se necesita
}

export default function RouteGuard({ allowedRoles, children, loginHref }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Redirigir al login del portal apropiado
      router.replace(loginHref ?? loginRouteForRole(allowedRoles[0]));
      return;
    }
    if (!allowedRoles.includes(user.rol)) {
      // Tiene sesión pero de otro portal → mandarlo a su home
      router.replace(loginHref ?? loginRouteForRole(user.rol));
    }
  }, [user, loading, allowedRoles, loginHref, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Verificando sesión...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.rol)) return null;
  return <>{children}</>;
}
