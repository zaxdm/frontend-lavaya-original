'use client';
// app/login/admin/page.tsx
import { useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Mail, Lock, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

type Mode = 'login' | 'forgot';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fEmail, setFEmail] = useState('');
  const [fSent, setFSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  };

  const INPUT = { width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'linear-gradient(145deg, #020817 0%, #0f2447 45%, #1a3a6b 70%, #0a1628 100%)', position: 'relative', overflow: 'hidden' }}>

        {/* Decoración de fondo */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease' }} key={mode}>

          {mode === 'login' ? (
            <div style={{ backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 36, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

              {/* Header */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 32px rgba(37,99,235,0.5)' }}>
                  <ShieldCheck style={{ width: 32, height: 32, color: '#fff' }} />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Panel Admin</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>LavaYa · Acceso de administrador</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.35)' }} />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" style={INPUT} />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.35)' }} />
                  <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" style={{ ...INPUT, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    {showPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#60a5fa', padding: 0 }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: '13px', borderRadius: 11, border: 'none', background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.5)' }}>
                  {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                  {loading ? 'Verificando...' : 'Iniciar sesión'}
                </button>
              </form>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 20 }}>
                Acceso exclusivo · Administradores LavaYa
              </p>
            </div>

          ) : (
            <div style={{ backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 36, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
              <button onClick={() => setMode('login')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: 0, marginBottom: 20 }}>
                <ArrowLeft style={{ width: 14, height: 14 }} /> Volver
              </button>
              {!fSent ? (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Recuperar acceso</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px' }}>Ingresa tu correo de administrador</p>
                  <form onSubmit={e => { e.preventDefault(); setFSent(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.35)' }} />
                      <input type="email" required value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="admin@lavaya.com" style={INPUT} />
                    </div>
                    <button type="submit" style={{ padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      Solicitar recuperación
                    </button>
                  </form>
                  <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>¿Problemas técnicos?</p>
                    <a href="mailto:soporte@lavaya.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#60a5fa', textDecoration: 'none' }}>
                      <MessageCircle style={{ width: 13, height: 13 }} /> soporte@lavaya.com
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <p style={{ fontSize: 36, margin: '0 0 12px' }}>✉️</p>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Solicitud enviada</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px' }}>Contacta a soporte si no recibes respuesta en 24h.</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '0 0 20px' }}>(Esta función estará disponible próximamente)</p>
                  <button onClick={() => setMode('login')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                    Volver
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
