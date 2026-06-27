// app/page.tsx — Redirige al portal correcto según sesión activa
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, homeRouteForRole } from '@/hooks/useAuth';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(homeRouteForRole(user.rol));
    } else {
      router.replace('/ingresar');
    }
  }, [user, loading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}
