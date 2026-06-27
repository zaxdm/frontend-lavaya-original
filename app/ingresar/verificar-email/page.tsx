'use client';
// app/ingresar/verificar-email/page.tsx

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { tokenStorage } from '@/lib/api';

const INPUT = {
  width: '100%', padding: '11px 14px 11px 38px', borderRadius: 10,
  border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box' as const,
};

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailQuery = searchParams.get('email');

  const [email, setEmail] = useState(emailQuery || '');
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { updateUser } = useAuth();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Falta el correo electrónico'); return; }
    if (codigo.length !== 6) { toast.error('El código debe tener 6 dígitos'); return; }

    setVerificando(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'https://backend-lavaya.onrender.com/api';
      const res = await fetch(`${base}/auth/verificar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido o expirado');

      // Guardar tokens y usuario
      tokenStorage.set(data.accessToken, data.refreshToken);
      updateUser(data.usuario);
      toast.success('¡Correo verificado correctamente!');

      // Enviar dirección pendiente si existe
      const pendingDirStr = sessionStorage.getItem('pendingDireccion');
      if (pendingDirStr) {
        try {
          const dirPayload = JSON.parse(pendingDirStr);
          await fetch(`${base}/clientes/direcciones`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.accessToken}`
            },
            body: JSON.stringify(dirPayload),
          });
        } catch (dirErr) {
          console.error('Error guardando dirección:', dirErr);
          toast.error('Se verificó tu cuenta, pero hubo un error guardando tu dirección.');
        } finally {
          sessionStorage.removeItem('pendingDireccion');
        }
      }

      router.push('/cliente/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al verificar el código');
    } finally {
      setVerificando(false);
    }
  };

  const handleResend = async () => {
    if (!email) { toast.error('Falta el correo electrónico'); return; }
    setReenviando(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'https://backend-lavaya.onrender.com/api';
      const res = await fetch(`${base}/auth/reenviar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar el código');
      toast.success('Nuevo código enviado');
      setCooldown(45);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reenviar el código');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 32, boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)', width: '100%', maxWidth: 440 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Mail style={{ width: 22, height: 22, color: '#0ea5e9' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Verifica tu correo</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
        Ingresa el código de 6 dígitos que enviamos a <strong>{email}</strong> para activar tu cuenta.
      </p>
      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
          <input
            type="text"
            maxLength={6}
            required
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={{ ...INPUT, fontSize: 20, letterSpacing: 8, textAlign: 'center', paddingLeft: 14 }}
            className="login-input"
          />
        </div>
        <button type="submit" disabled={verificando || codigo.length !== 6} style={{ padding: '12px', borderRadius: 10, border: 'none', backgroundColor: (verificando || codigo.length !== 6) ? 'var(--border)' : '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: (verificando || codigo.length !== 6) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {verificando && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
          {verificando ? 'Verificando...' : 'Verificar código'}
        </button>
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={handleResend}
          disabled={reenviando || cooldown > 0}
          style={{ background: 'none', border: 'none', cursor: (reenviando || cooldown > 0) ? 'not-allowed' : 'pointer', fontSize: 13, color: (reenviando || cooldown > 0) ? 'var(--text-hint)' : '#0ea5e9', padding: 0, fontWeight: 600 }}
        >
          {reenviando ? 'Reenviando...' : cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={() => router.push('/ingresar')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: 0 }}>
          Volver al inicio de sesión
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .login-input::placeholder { color: var(--text-hint); }`}</style>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg,#0c1a2e 0%,#0c3b5c 40%,#0e4d7b 60%,#0c1a2e 100%)' }}>
      <Suspense fallback={<div style={{ color: '#fff' }}><Loader2 style={{ animation: 'spin 1s linear infinite' }} /></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
