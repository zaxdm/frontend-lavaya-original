'use client';
// app/admin/cuenta/page.tsx
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  User, Shield, Palette, Bell,
  Camera, Save, Eye, EyeOff, Sun, Moon,
  CheckCircle2, AlertCircle, Lock, Upload, BellOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { getAvatarUrl } from '@/lib/avatar';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

// ─── Tipos de tab ─────────────────────────────────────────────
type Tab = 'perfil' | 'seguridad' | 'apariencia' | 'notificaciones';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',         label: 'Perfil',         icon: User    },
  { id: 'seguridad',      label: 'Seguridad',       icon: Shield  },
  { id: 'apariencia',     label: 'Apariencia',      icon: Palette },
  { id: 'notificaciones', label: 'Notificaciones',  icon: Bell    },
];

// ─── Componente Toggle ────────────────────────────────────────
function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}
      className="last:border-0">
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', backgroundColor: checked ? '#2563eb' : 'var(--border)', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

// ─── Avatares predefinidos ────────────────────────────────────
function buildPresetAvatars(nombre: string, apellido: string) {
  const SEEDS = ['LY','AX','MR','JK','PQ','ZN','WS','HB','TF','CV'];
  const COLORS = [
    ['6366f1','ffffff'],['8b5cf6','ffffff'],['ec4899','ffffff'],['f59e0b','ffffff'],
    ['10b981','ffffff'],['ef4444','ffffff'],['14b8a6','ffffff'],['f97316','ffffff'],
    ['06b6d4','ffffff'],['3b82f6','ffffff'],
  ];
  // El primero siempre es el avatar con las iniciales reales del usuario
  const real = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre[0]+apellido[0])}&size=120&background=${COLORS[0][0]}&color=${COLORS[0][1]}&bold=true&format=svg`;
  const presets = SEEDS.map((s, i) =>
    `https://ui-avatars.com/api/?name=${s}&size=120&background=${COLORS[i][0]}&color=${COLORS[i][1]}&bold=true&format=svg`
  );
  return [real, ...presets];
}

export default function CuentaPage() {
  const { user, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { prefs, setPrefs, permiso, solicitarPermiso } = useNotifications();
  const [tab, setTab] = useState<Tab>('perfil');

  // ─── Perfil ────────────────────────────────────────────────
  const [perfil, setPerfil] = useState({ nombre: '', apellido: '', telefono: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Contraseña ────────────────────────────────────────────
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [showPass, setShowPass] = useState({ actual: false, nueva: false });
  const [savingPass, setSavingPass] = useState(false);
  const [passErrors, setPassErrors] = useState<string[]>([]);


  
  useEffect(() => {
    if (user) {
      setPerfil({ nombre: user.nombre, apellido: user.apellido, telefono: user.telefono ?? '' });
      setAvatarUrl(getAvatarUrl({ nombre: user.nombre, apellido: user.apellido, fotoPerfil: user.fotoPerfil }));
    }
  }, [user]);

  // ─── Seleccionar preset ────────────────────────────────────
  const presets = user ? buildPresetAvatars(user.nombre, user.apellido) : [];
  const selectPreset = (url: string) => { setAvatarUrl(url); setShowAvatarPicker(false); };

  // ─── Subir imagen ──────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no puede superar 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setAvatarUrl(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  // ─── Guardar perfil ────────────────────────────────────────
  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerfil(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clientes/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('lavaya_access_token')}` },
        body: JSON.stringify({ nombre: perfil.nombre, apellido: perfil.apellido, telefono: perfil.telefono || null, fotoPerfil: avatarUrl.startsWith('data:') ? null : avatarUrl }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const data = await res.json();
      updateUser(data);
      toast.success('Perfil actualizado');
    } catch { toast.error('Error al guardar el perfil'); }
    finally { setSavingPerfil(false); }
  };

  // ─── Cambiar contraseña ────────────────────────────────────
  const validarPass = () => {
    const e: string[] = [];
    if (!passForm.actual) e.push('Ingresa tu contraseña actual');
    if (passForm.nueva.length < 8) e.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(passForm.nueva)) e.push('Debe incluir una mayúscula');
    if (!/[0-9]/.test(passForm.nueva)) e.push('Debe incluir un número');
    if (passForm.nueva !== passForm.confirmar) e.push('Las contraseñas no coinciden');
    return e;
  };
  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validarPass();
    setPassErrors(errors);
    if (errors.length > 0) return;
    setSavingPass(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clientes/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('lavaya_access_token')}` },
        body: JSON.stringify({ passwordActual: passForm.actual, passwordNueva: passForm.nueva }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      toast.success('Contraseña actualizada. Otras sesiones cerradas.');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSavingPass(false); }
  };

  // ─── Notif helpers — ahora conectados al hook real ─────────
  const saveNotif = (k: keyof typeof prefs, v: boolean) => {
    setPrefs({ [k]: v });
    toast.success('Preferencia guardada');
    // Si activan notificaciones del navegador por primera vez, pedir permiso
    if ((k === 'nuevoPedido' || k === 'pedidoEntregado') && v && permiso === 'default') {
      solicitarPermiso();
    }
  };

  // ─── Estilos base ──────────────────────────────────────────
  const S = {
    card:   { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
    label:  { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    input:  { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  const ROL_LABEL: Record<string, string> = { ADMIN: 'Administrador', EMPLEADO: 'Empleado', REPARTIDOR: 'Repartidor', CLIENTE: 'Cliente' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Mi cuenta" subtitle="Gestiona tu perfil, seguridad y preferencias" />

      <div style={{ flex: 1, padding: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>

        {/* ─── Hero con avatar ─────────────────────────────── */}
        <div style={{ ...S.card, marginBottom: 24, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* Avatar con botón de edición */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent)', boxShadow: '0 0 0 4px var(--bg-card)' }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700 }}>
                    {user?.nombre?.[0]}{user?.apellido?.[0]}
                  </div>
                )}
              </div>
              {/* Botón editar avatar */}
              <button
                onClick={() => setShowAvatarPicker(true)}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', backgroundColor: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Camera style={{ width: 12, height: 12, color: '#fff' }} />
              </button>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {user?.nombre} {user?.apellido}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{user?.email}</p>
              <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                {ROL_LABEL[user?.rol ?? ''] ?? user?.rol}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Avatar picker modal ──────────────────────────── */}
        {showAvatarPicker && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAvatarPicker(false)} />
            <div style={{ ...S.card, position: 'relative', width: '100%', maxWidth: 440, padding: 24, zIndex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Elige tu avatar</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Selecciona uno de los predefinidos o sube tu propia imagen</p>

              {/* Grid de presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
                {presets.map((url, i) => (
                  <button key={i} onClick={() => selectPreset(url)}
                    style={{ padding: 0, border: avatarUrl === url ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'none', boxShadow: avatarUrl === url ? '0 0 0 3px rgba(59,130,246,0.25)' : 'none', transition: 'all 0.15s' }}>
                    <Image src={url} alt={`Avatar ${i+1}`} width={72} height={72} style={{ display: 'block', width: '100%', aspectRatio: '1', borderRadius: 10 }} unoptimized />
                  </button>
                ))}
              </div>

              {/* Subir imagen */}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1.5px dashed var(--border)', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload style={{ width: 16, height: 16 }} />
                Subir imagen propia (máx. 2MB)
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setShowAvatarPicker(false)}
                  style={{ flex: 1, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => { setShowAvatarPicker(false); toast.success('Avatar seleccionado — guarda los cambios para aplicarlo'); }}
                  style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center' }}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tabs ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.15s',
                  backgroundColor: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  boxShadow: active ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                }}>
                <t.icon style={{ width: 14, height: 14 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB: Perfil ─────────────────────────────────── */}
        {tab === 'perfil' && (
          <div style={S.card}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Datos personales</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Actualiza tu información de contacto</p>
            </div>
            <form onSubmit={guardarPerfil} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Nombre</label>
                  <input required value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Apellido</label>
                  <input required value={perfil.apellido} onChange={e => setPerfil(p => ({ ...p, apellido: e.target.value }))} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.label}>Correo electrónico</label>
                <input disabled value={user?.email ?? ''} style={{ ...S.input, opacity: 0.5, cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>El correo no se puede cambiar desde aquí</p>
              </div>
              <div>
                <label style={S.label}>Teléfono (opcional)</label>
                <input type="tel" value={perfil.telefono} onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} placeholder="+51 999 999 999" style={S.input} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="submit" disabled={savingPerfil} style={S.btnPrimary}>
                  {savingPerfil ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Save style={{ width: 16, height: 16 }} />}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB: Seguridad ──────────────────────────────── */}
        {tab === 'seguridad' && (
          <div style={S.card}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cambiar contraseña</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Al cambiar tu contraseña se cerrarán todas las demás sesiones</p>
            </div>
            <form onSubmit={cambiarPassword} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {passErrors.length > 0 && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  {passErrors.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#dc2626' }}>
                      <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                      {e}
                    </div>
                  ))}
                </div>
              )}
              {[
                { k: 'actual' as const,    l: 'Contraseña actual',            show: showPass.actual },
                { k: 'nueva' as const,     l: 'Nueva contraseña',             show: showPass.nueva  },
                { k: 'confirmar' as const, l: 'Confirmar nueva contraseña',   show: false            },
              ].map(f => (
                <div key={f.k}>
                  <label style={S.label}>{f.l}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={(f.k !== 'confirmar' && f.show) ? 'text' : 'password'}
                      value={passForm[f.k]}
                      onChange={e => { setPassForm(p => ({ ...p, [f.k]: e.target.value })); setPassErrors([]); }}
                      style={{ ...S.input, paddingRight: f.k !== 'confirmar' ? 44 : 14 }}
                    />
                    {f.k !== 'confirmar' && (
                      <button type="button"
                        onClick={() => setShowPass(p => ({ ...p, [f.k]: !p[f.k as 'actual' | 'nueva'] }))}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: 0 }}>
                        {f.show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Indicador de fuerza */}
              {passForm.nueva.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fortaleza:</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[passForm.nueva.length>=8, /[A-Z]/.test(passForm.nueva), /[0-9]/.test(passForm.nueva), /[^A-Za-z0-9]/.test(passForm.nueva)].map((ok, i) => (
                      <div key={i} style={{ height: 6, flex: 1, borderRadius: 999, backgroundColor: ok ? (i < 2 ? '#f59e0b' : '#22c55e') : 'var(--border)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>Mínimo 8 chars · Mayúscula · Número · Símbolo (opcional)</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="submit" disabled={savingPass || !passForm.actual || !passForm.nueva} style={{ ...S.btnPrimary, opacity: (savingPass || !passForm.actual || !passForm.nueva) ? 0.5 : 1 }}>
                  {savingPass ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Lock style={{ width: 16, height: 16 }} />}
                  Cambiar contraseña
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB: Apariencia ─────────────────────────────── */}
        {tab === 'apariencia' && (
          <div style={S.card}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Tema de la interfaz</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Elige entre modo claro u oscuro</p>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { value: 'light', label: 'Modo claro', icon: Sun, desc: 'Fondo blanco, texto oscuro', previewBg: '#f8fafc', previewCard: '#ffffff', previewText: '#0f172a', previewSidebar: '#0f172a' },
                  { value: 'dark',  label: 'Modo oscuro', icon: Moon, desc: 'Fondo oscuro, texto claro', previewBg: '#0f172a', previewCard: '#1e293b', previewText: '#f1f5f9', previewSidebar: '#020617' },
                ].map(opt => {
                  const active = (opt.value === 'dark') === isDark;
                  return (
                    <button key={opt.value} onClick={() => { if (!active) toggleTheme(); }}
                      style={{ padding: 0, border: active ? '2px solid var(--accent)' : '2px solid var(--border)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', background: 'none', boxShadow: active ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none', transition: 'all 0.2s' }}>

                      {/* Preview mini UI */}
                      <div style={{ backgroundColor: opt.previewBg, padding: 12, display: 'flex', gap: 8, height: 90 }}>
                        {/* mini sidebar */}
                        <div style={{ width: 28, backgroundColor: opt.previewSidebar, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
                          {[1,2,3,4].map(i => <div key={i} style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />)}
                        </div>
                        {/* mini content */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ height: 16, backgroundColor: opt.previewCard, borderRadius: 4, border: `1px solid ${opt.value === 'dark' ? '#334155' : '#e2e8f0'}` }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
                            {[1,2,3,4].map(i => <div key={i} style={{ backgroundColor: opt.previewCard, borderRadius: 4, border: `1px solid ${opt.value === 'dark' ? '#334155' : '#e2e8f0'}` }} />)}
                          </div>
                        </div>
                      </div>

                      {/* Label */}
                      <div style={{ padding: '10px 14px', backgroundColor: opt.previewCard, borderTop: `1px solid ${opt.value === 'dark' ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <opt.icon style={{ width: 14, height: 14, color: active ? 'var(--accent)' : opt.previewText, opacity: active ? 1 : 0.6 }} />
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent)' : opt.previewText, margin: 0 }}>{opt.label}</p>
                          <p style={{ fontSize: 11, color: opt.value === 'dark' ? '#94a3b8' : '#64748b', margin: 0 }}>{opt.desc}</p>
                        </div>
                        {active && <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--accent)', marginLeft: 'auto' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: 'var(--bg-muted)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>ℹ</span>
                Tu preferencia se guarda en el navegador. El toggle del sidebar también cambia el tema al instante.
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Notificaciones ─────────────────────────── */}
        {tab === 'notificaciones' && (
          <div style={S.card}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notificaciones en tiempo real</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>El sistema detecta cambios cada 30 segundos vía polling</p>
            </div>

            {/* Banner de permiso del navegador */}
            {permiso !== 'granted' && (
              <div style={{ margin: '16px 24px 0', padding: '12px 16px', borderRadius: 10, backgroundColor: permiso === 'denied' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${permiso === 'denied' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                {permiso === 'denied'
                  ? <BellOff style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0 }} />
                  : <Bell style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: permiso === 'denied' ? '#dc2626' : '#d97706', margin: 0 }}>
                    {permiso === 'denied' ? 'Notificaciones bloqueadas' : permiso === 'unsupported' ? 'Navegador no compatible' : 'Activa las notificaciones del navegador'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    {permiso === 'denied'
                      ? 'Ve a Configuración del navegador → Privacidad → Notificaciones y permite este sitio.'
                      : permiso === 'unsupported'
                      ? 'Tu navegador no soporta notificaciones push nativas.'
                      : 'Para recibir alertas aunque el panel esté minimizado.'}
                  </p>
                </div>
                {permiso === 'default' && (
                  <button onClick={solicitarPermiso}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    Permitir
                  </button>
                )}
              </div>
            )}

            {permiso === 'granted' && (
              <div style={{ margin: '16px 24px 0', padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#15803d', margin: 0 }}>Notificaciones del navegador activas — recibirás alertas aunque el panel esté en segundo plano.</p>
              </div>
            )}

            <div style={{ padding: '8px 24px 0' }}>
              <Toggle
                checked={prefs.nuevoPedido}
                onChange={v => saveNotif('nuevoPedido', v)}
                label="Nuevo pedido pendiente"
                description="Alerta + sonido cuando hay pedidos sin asignar repartidor"
              />
              <Toggle
                checked={prefs.pedidoEntregado}
                onChange={v => saveNotif('pedidoEntregado', v)}
                label="Pedido entregado"
                description="Alerta + sonido cuando un pedido cambia a ENTREGADO"
              />
              <Toggle
                checked={prefs.reporteDiario}
                onChange={v => saveNotif('reporteDiario', v)}
                label="Reporte diario a las 20:00"
                description="Recordatorio diario para revisar el resumen del día"
              />
              <Toggle
                checked={prefs.sonido}
                onChange={v => saveNotif('sonido', v)}
                label="Sonido de notificaciones"
                description="Beep audible al recibir alertas (Web Audio API)"
              />
            </div>

            <div style={{ padding: '12px 24px 20px', marginTop: 4 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>¿Cómo funciona?</strong> El sistema consulta el backend cada 30 segundos.
                Si detecta pedidos nuevos o entregas comparando con la última consulta, dispara la alerta en el navegador y un beep (si el sonido está activo).
                El historial de notificaciones se guarda en el navegador y está visible en la campana 🔔 del menú lateral.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
