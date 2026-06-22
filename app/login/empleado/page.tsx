'use client';
// app/login/empleado/page.tsx
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Wrench, Mail, Lock, MessageCircle, ArrowLeft, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

type Mode = 'login' | 'forgot';

export default function EmpleadoLoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fEmail, setFEmail] = useState('');
  const [fStep, setFStep] = useState<1 | 2 | 3>(1); // 1: email, 2: code, 3: new password
  const [fCode, setFCode] = useState('');
  const [fNewPassword, setFNewPassword] = useState('');
  const [fConfirmPassword, setFConfirmPassword] = useState('');
  const [fResetting, setFResetting] = useState(false);
  const [fSending, setFSending] = useState(false);
  const [fVerifying, setFVerifying] = useState(false);

  // Handle password reset request (step 1)
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    setFSending(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/password/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar el correo');
      
      setFStep(2);
      toast.success('Se ha enviado el código de recuperación');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar el correo');
    } finally {
      setFSending(false);
    }
  };

  // Handle code verification (step 2)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fCode.length !== 6) {
      toast.error('El código debe tener 6 dígitos');
      return;
    }
    setFVerifying(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fEmail, codigo: fCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido o expirado');
      
      setFStep(3);
      toast.success('Código verificado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al verificar el código');
    } finally {
      setFVerifying(false);
    }
  };

  // Handle password reset (step 3)
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fNewPassword !== fConfirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (fNewPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setFResetting(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: fEmail,
          codigo: fCode, 
          nuevaPassword: fNewPassword 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña');
      toast.success('Contraseña actualizada correctamente');
      setMode('login');
      setFStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setFResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  };

  const INPUT = { width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #120a2e 0%, #2d1b5c 45%, #4a2080 70%, #1a0c3f 100%)' }}>

        {/* Decoración */}
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Panel izquierdo informativo */}
        <div style={{ flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', position: 'relative', zIndex: 1 }} className="hidden lg:flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, backgroundColor: '#7c3aed', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(124,58,237,0.5)' }}>
              <Wrench style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>LavaYa</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Portal de Empleados</p>
            </div>
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
            Tu centro de<br /><span style={{ color: '#a78bfa' }}>trabajo digital</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 36px', lineHeight: 1.6 }}>
            Gestiona pedidos, actualiza estados y coordina la lavandería desde un solo lugar.
          </p>

          {[
            { icon: ClipboardList, text: 'Ver pedidos asignados y pendientes' },
            { icon: Wrench,        text: 'Marcar prendas como lavadas o listas' },
            { icon: Mail,          text: 'Confirmar pagos en efectivo' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon style={{ width: 15, height: 15, color: '#c4b5fd' }} />
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Panel formulario */}
        <div style={{ width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.4s ease' }} key={mode}>

            {mode === 'login' ? (
              <div style={{ backgroundColor: 'rgba(18,10,46,0.85)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 36, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                  <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}>
                    <Wrench style={{ width: 28, height: 28, color: '#fff' }} />
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Portal Empleado</h1>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>LavaYa · Lavandería</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" style={INPUT} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                    <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" style={{ ...INPUT, paddingRight: 42 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                      {showPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#a78bfa', padding: 0 }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <button type="submit" disabled={loading}
                    style={{ padding: '13px', borderRadius: 11, border: 'none', background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.5)' }}>
                    {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                    {loading ? 'Verificando...' : 'Iniciar sesión'}
                  </button>
                </form>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 20 }}>
                  Acceso exclusivo · Empleados LavaYa
                </p>
              </div>

            ) : (
              <div style={{ backgroundColor: 'rgba(18,10,46,0.85)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 36, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
                {/* Back button */}
                <button 
                  onClick={() => { 
                    if (fStep === 1) {
                      setMode('login');
                    } else if (fStep === 2) {
                      setFStep(1);
                    } else if (fStep === 3) {
                      setFStep(2);
                    }
                  }} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 13, padding: 0, marginBottom: 20 }}
                >
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Volver
                </button>

                {/* Step 1: Enter email */}
                {fStep === 1 && (
                  <>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Recuperar contraseña</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>Ingresa tu correo y te enviaremos un código de recuperación.</p>
                    <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                        <input type="email" required value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="tu@correo.com" style={INPUT} />
                      </div>
                      <button type="submit" disabled={fSending} style={{ padding: '12px', borderRadius: 10, border: 'none', background: fSending ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {fSending && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                        {fSending ? 'Enviando...' : 'Enviar código'}
                      </button>
                    </form>
                    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>¿Problemas? Contacta a tu administrador o a soporte:</p>
                      <a href="mailto:soporte@lavaya.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a78bfa', textDecoration: 'none' }}>
                        <MessageCircle style={{ width: 13, height: 13 }} /> soporte@lavaya.com
                      </a>
                    </div>
                  </>
                )}

                {/* Step 2: Enter code */}
                {fStep === 2 && (
                  <>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Verifica tu correo</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>Ingresa el código de 6 dígitos que te enviamos.</p>
                    <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                        <input 
                          type="text" 
                          maxLength={6}
                          required 
                          value={fCode} 
                          onChange={e => setFCode(e.target.value.replace(/\D/g, ''))} 
                          placeholder="123456" 
                          style={{ ...INPUT, fontSize: 20, letterSpacing: 8, textAlign: 'center' }} 
                        />
                      </div>
                      <button type="submit" disabled={fVerifying} style={{ padding: '12px', borderRadius: 10, border: 'none', background: fVerifying ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fVerifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {fVerifying && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                        {fVerifying ? 'Verificando...' : 'Verificar código'}
                      </button>
                    </form>
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <button 
                        onClick={async () => {
                          setFSending(true);
                          try {
                            const base = process.env.NEXT_PUBLIC_API_URL;
                            const res = await fetch(`${base}/auth/password/reset-request`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: fEmail }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Error al enviar el correo');
                            toast.success('Código reenviado');
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : 'Error al enviar el correo');
                          } finally {
                            setFSending(false);
                          }
                        }} 
                        disabled={fSending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#a78bfa', padding: 0 }}
                      >
                        Reenviar código
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: Enter new password */}
                {fStep === 3 && (
                  <>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Restablece tu contraseña</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>Ingresa tu nueva contraseña.</p>
                    <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                        <input type="password" required value={fNewPassword} onChange={e => setFNewPassword(e.target.value)} placeholder="Nueva contraseña" style={{ ...INPUT, paddingRight: 42 }} />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                        <input type="password" required value={fConfirmPassword} onChange={e => setFConfirmPassword(e.target.value)} placeholder="Confirmar nueva contraseña" style={{ ...INPUT, paddingRight: 42 }} />
                      </div>
                      <button type="submit" disabled={fResetting} style={{ padding: '12px', borderRadius: 10, border: 'none', background: fResetting ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fResetting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {fResetting && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                        {fResetting ? 'Actualizando...' : 'Restablecer contraseña'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
