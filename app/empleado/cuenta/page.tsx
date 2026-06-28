// app/empleado/cuenta/page.tsx — Cuenta del empleado (redirige al componente compartido)
// El empleado tiene las mismas secciones que el admin: perfil, seguridad, apariencia, notificaciones
// Solo cambia el portal visual
'use client';
import { useEffect, useRef, useState } from 'react';
import { User, Shield, Palette, Bell, Save, Eye, EyeOff, Sun, Moon, Lock, CheckCircle2, BellOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { getAvatarUrl, buildPresetAvatars } from '@/lib/avatar';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import AvatarUpload from '@/components/ui/AvatarUpload';
import toast from 'react-hot-toast';

type Tab = 'perfil' | 'seguridad' | 'apariencia' | 'notificaciones';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',         label: 'Perfil',         icon: User    },
  { id: 'seguridad',      label: 'Seguridad',       icon: Shield  },
  { id: 'apariencia',     label: 'Apariencia',      icon: Palette },
  { id: 'notificaciones', label: 'Notificaciones',  icon: Bell    },
];

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: checked ? '#7c3aed' : 'var(--border)', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

export default function EmpleadoCuenta() {
  const { user, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { prefs, setPrefs, permiso, solicitarPermiso } = useNotifications();
  const [tab, setTab] = useState<Tab>('perfil');
  const [perfil, setPerfil] = useState({ nombre: '', apellido: '', telefono: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [showPass, setShowPass] = useState({ actual: false, nueva: false });
  const [savingPass, setSavingPass] = useState(false);
  const [passErrors, setPassErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('lavaya_access_token') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (user) { setPerfil({ nombre: user.nombre, apellido: user.apellido, telefono: user.telefono ?? '' }); setAvatarUrl(getAvatarUrl({ nombre: user.nombre, apellido: user.apellido, fotoPerfil: user.fotoPerfil })); }
  }, [user]);

  const presets = user ? buildPresetAvatars(user.nombre, user.apellido) : [];

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`${base}/clientes/perfil`, { method: 'PATCH', headers, body: JSON.stringify({ nombre: perfil.nombre, apellido: perfil.apellido, telefono: perfil.telefono || null }) });
      if (!res.ok) throw new Error('Error');
      updateUser(await res.json());
      toast.success('Perfil actualizado');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!passForm.actual) errs.push('Ingresa tu contraseña actual');
    if (passForm.nueva.length < 8) errs.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(passForm.nueva)) errs.push('Debe incluir una mayúscula');
    if (passForm.nueva !== passForm.confirmar) errs.push('No coinciden');
    setPassErrors(errs); if (errs.length > 0) return;
    setSavingPass(true);
    try {
      const res = await fetch(`${base}/clientes/password`, { method: 'PATCH', headers, body: JSON.stringify({ passwordActual: passForm.actual, passwordNueva: passForm.nueva }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      toast.success('Contraseña actualizada');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSavingPass(false); }
  };

  const ACCENT = '#7c3aed';
  const S = {
    card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' as const },
    input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    btn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Mi cuenta" subtitle="Gestiona tu perfil y preferencias" />
      <div style={{ padding: 24, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hero */}
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AvatarUpload
              currentUrl={user?.fotoPerfil}
              initials={`${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`}
              gradient={`linear-gradient(135deg,${ACCENT},#a855f7)`}
              size={72}
              onSuccess={url => { setAvatarUrl(url); updateUser({ ...user!, fotoPerfil: url }); }}
            />
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{user?.nombre} {user?.apellido}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{user?.email}</p>
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, backgroundColor: `${ACCENT}20`, color: ACCENT, padding: '2px 10px', borderRadius: 999 }}>Empleado LavaYa</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, backgroundColor: active ? ACCENT : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', boxShadow: active ? `0 2px 8px ${ACCENT}44` : 'none', transition: 'all 0.15s' }}>
                <t.icon style={{ width: 14, height: 14 }} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Perfil */}
        {tab === 'perfil' && (
          <div style={S.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Datos personales</p></div>
            <form onSubmit={guardarPerfil} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={S.label}>Nombre</label><input required value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} style={S.input} /></div>
                <div><label style={S.label}>Apellido</label><input required value={perfil.apellido} onChange={e => setPerfil(p => ({ ...p, apellido: e.target.value }))} style={S.input} /></div>
              </div>
              <div><label style={S.label}>Email</label><input disabled value={user?.email ?? ''} style={{ ...S.input, opacity: 0.5, cursor: 'not-allowed' }} /></div>
              <div><label style={S.label}>Teléfono</label><input type="tel" value={perfil.telefono} onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} placeholder="+51 999 999 999" style={S.input} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={S.btn}>{saving ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Save style={{ width: 15, height: 15 }} />}Guardar</button>
              </div>
            </form>
          </div>
        )}

        {/* Seguridad */}
        {tab === 'seguridad' && (
          <div style={S.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cambiar contraseña</p></div>
            <form onSubmit={cambiarPassword} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {passErrors.length > 0 && <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>{passErrors.map((e, i) => <p key={i} style={{ fontSize: 13, color: '#dc2626', margin: '2px 0' }}>• {e}</p>)}</div>}
              {[{k:'actual' as const,l:'Contraseña actual',s:showPass.actual},{k:'nueva' as const,l:'Nueva contraseña',s:showPass.nueva},{k:'confirmar' as const,l:'Confirmar nueva',s:false}].map(f => (
                <div key={f.k}><label style={S.label}>{f.l}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={f.k !== 'confirmar' && f.s ? 'text' : 'password'} value={passForm[f.k]} onChange={e => { setPassForm(p => ({ ...p, [f.k]: e.target.value })); setPassErrors([]); }} style={{ ...S.input, paddingRight: f.k !== 'confirmar' ? 40 : 14 }} />
                    {f.k !== 'confirmar' && <button type="button" onClick={() => setShowPass(p => ({ ...p, [f.k]: !p[f.k as 'actual'|'nueva'] }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: 0 }}>
                      {f.s ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                    </button>}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={savingPass || !passForm.actual || !passForm.nueva} style={{ ...S.btn, opacity: (savingPass || !passForm.actual || !passForm.nueva) ? 0.5 : 1 }}>
                  {savingPass ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Lock style={{ width: 15, height: 15 }} />}Cambiar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Apariencia */}
        {tab === 'apariencia' && (
          <div style={S.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Tema</p></div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[{ value: 'light', label: 'Claro', icon: Sun }, { value: 'dark', label: 'Oscuro', icon: Moon }].map(opt => {
                const active = (opt.value === 'dark') === isDark;
                return (
                  <button key={opt.value} onClick={() => { if (!active) toggleTheme(); }}
                    style={{ padding: 16, borderRadius: 12, border: `2px solid ${active ? ACCENT : 'var(--border)'}`, cursor: 'pointer', background: active ? `${ACCENT}08` : 'var(--bg-base)', boxShadow: active ? `0 0 0 3px ${ACCENT}22` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                    <opt.icon style={{ width: 20, height: 20, color: active ? ACCENT : 'var(--text-secondary)' }} />
                    <span style={{ fontSize: 14, fontWeight: active ? 700 : 400, color: active ? ACCENT : 'var(--text-primary)' }}>{opt.label}</span>
                    {active && <CheckCircle2 style={{ width: 14, height: 14, color: ACCENT }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notificaciones */}
        {tab === 'notificaciones' && (
          <div style={S.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notificaciones</p></div>
            {permiso !== 'granted' && (
              <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <BellOff style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#d97706', margin: 0, flex: 1 }}>Activa las notificaciones del navegador para recibir alertas en tiempo real.</p>
                {permiso === 'default' && <button onClick={solicitarPermiso} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Activar</button>}
              </div>
            )}
            <div style={{ padding: '4px 20px 0' }}>
              <Toggle checked={prefs.nuevoPedido} onChange={v => { setPrefs({ nuevoPedido: v }); toast.success('Preferencia guardada'); }} label="Nuevo pedido pendiente" description="Alerta cuando hay pedidos sin asignar" />
              <Toggle checked={prefs.pedidoEntregado} onChange={v => { setPrefs({ pedidoEntregado: v }); toast.success('Preferencia guardada'); }} label="Pedido entregado" description="Alerta cuando un pedido es entregado" />
              <Toggle checked={prefs.sonido} onChange={v => { setPrefs({ sonido: v }); toast.success('Preferencia guardada'); }} label="Sonido" description="Beep al recibir notificaciones" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
