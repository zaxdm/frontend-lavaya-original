'use client';
// app/cliente/perfil/page.tsx — Perfil con tabs: Perfil | Direcciones | Seguridad | Configuración
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  User, MapPin, Shield, Settings, Save,
  Upload, Plus, Trash2, Navigation, Search,
  Eye, EyeOff, Loader2, Lock, Bell, Moon, Sun,
  AlertTriangle, CheckCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import Avatar from '@/components/ui/Avatar';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import { clienteApi } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Tipos ────────────────────────────────────────────────────
type Tab = 'perfil' | 'direcciones' | 'seguridad' | 'configuracion';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',        label: 'Perfil',         icon: User     },
  { id: 'direcciones',   label: 'Direcciones',     icon: MapPin   },
  { id: 'seguridad',     label: 'Seguridad',       icon: Shield   },
  { id: 'configuracion', label: 'Configuración',   icon: Settings },
];

// ─── Mapa Leaflet (lazy) ──────────────────────────────────────
function MapaLeaflet({ lat, lng, onSelect }: {
  lat: number | null; lng: number | null;
  onSelect: (lat: number, lng: number, label: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current || mapRef.current) return;
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(ref.current!, { center: [lat ?? -12.0464, lng ?? -77.0428], zoom: lat ? 16 : 12 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      if (lat && lng) markerRef.current = L.marker([lat, lng]).addTo(map);
      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: la, lng: lo } = e.latlng;
        if (markerRef.current) (markerRef.current as L.Marker).setLatLng([la, lo]);
        else markerRef.current = L.marker([la, lo]).addTo(map);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=es`);
          const d = await r.json();
          onSelect(la, lo, d.display_name ?? `${la.toFixed(5)}, ${lo.toFixed(5)}`);
        } catch { onSelect(la, lo, `${la.toFixed(5)}, ${lo.toFixed(5)}`); }
      });
      mapRef.current = map;
      setReady(true);
    });
    return () => { if (mapRef.current) { (mapRef.current as L.Map).remove(); mapRef.current = null; markerRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    import('leaflet').then((L) => {
      const map = mapRef.current as L.Map;
      if (markerRef.current) (markerRef.current as L.Marker).setLatLng([lat, lng]);
      else markerRef.current = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 16, { animate: true });
    });
  }, [lat, lng]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-muted)', borderRadius: 12 }}>
          <Loader2 style={{ width: 20, height: 20, color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Toca el mapa para colocar el pin
      </div>
    </div>
  );
}

// ─── Tab Direcciones ──────────────────────────────────────────
function TabDirecciones() {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('lavaya_access_token') : '';
  const base = process.env.NEXT_PUBLIC_API_URL;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [dirs, setDirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mapTab, setMapTab] = useState<'mapa' | 'manual'>('mapa');

  const [form, setForm] = useState({
    calle: '', numero: '', colonia: '', ciudad: '', estado: '',
    codigoPostal: '', referencia: '', esPrincipal: false,
    lat: null as number | null, lng: null as number | null, displayName: '',
  });

  const loadDirs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${base}/clientes/direcciones`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setDirs(await r.json());
    } finally { setLoading(false); }
  }, [base, token]);

  useEffect(() => { loadDirs(); }, [loadDirs]);

  const usarGPS = () => {
    if (!navigator.geolocation) { toast.error('Geolocalización no soportada'); return; }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=es`);
        const d = await r.json();
        const { address, display_name } = d;
        setForm(p => ({
          ...p, lat: la, lng: lo, displayName: display_name,
          calle: address?.road ?? p.calle,
          numero: address?.house_number ?? p.numero,
          colonia: address?.neighbourhood ?? address?.suburb ?? p.colonia,
          ciudad: address?.city ?? address?.town ?? address?.village ?? p.ciudad,
          estado: address?.state ?? p.estado,
          codigoPostal: address?.postcode ?? p.codigoPostal,
        }));
        toast.success('Ubicación detectada');
      } catch { setForm(p => ({ ...p, lat: la, lng: lo })); }
      setLocalizando(false);
    }, () => { setLocalizando(false); toast.error('No se pudo obtener la ubicación'); }, { enableHighAccuracy: true });
  };

  const buscarDireccion = useCallback(async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(busqueda)}&format=json&limit=1&countrycodes=pe&accept-language=es`);
      const d = await r.json();
      if (!d.length) { toast.error('No encontrada'); return; }
      const { lat, lon, display_name, address } = d[0];
      setForm(p => ({
        ...p, lat: parseFloat(lat), lng: parseFloat(lon), displayName: display_name,
        calle: address?.road ?? p.calle,
        colonia: address?.neighbourhood ?? address?.suburb ?? p.colonia,
        ciudad: address?.city ?? address?.town ?? address?.village ?? p.ciudad,
        estado: address?.state ?? p.estado,
        codigoPostal: address?.postcode ?? p.codigoPostal,
      }));
    } catch { toast.error('Error al buscar'); }
    finally { setBuscando(false); }
  }, [busqueda]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mapTab === 'mapa' && !form.lat && !form.calle) { toast.error('Coloca un pin en el mapa o escribe la dirección'); return; }
    setSaving(true);
    try {
      const body = {
        calle: form.calle || 'Sin calle', numero: form.numero || 'S/N',
        colonia: form.colonia || 'Sin colonia', ciudad: form.ciudad || 'Sin ciudad',
        estado: form.estado || 'Sin estado', codigoPostal: form.codigoPostal || '00000',
        referencia: form.referencia || null, esPrincipal: form.esPrincipal,
        latitud: form.lat, longitud: form.lng,
      };
      const r = await fetch(`${base}/clientes/direcciones`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Error');
      toast.success('Dirección guardada');
      setShowForm(false);
      setForm({ calle:'',numero:'',colonia:'',ciudad:'',estado:'',codigoPostal:'',referencia:'',esPrincipal:false,lat:null,lng:null,displayName:'' });
      setBusqueda('');
      loadDirs();
    } catch { toast.error('Error al guardar dirección'); }
    finally { setSaving(false); }
  };

  const eliminar = async (id: string) => {
    try {
      await fetch(`${base}/clientes/direcciones/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setDirs(p => p.filter((d: any) => d.id !== id));
      toast.success('Dirección eliminada');
    } catch { toast.error('No puedes eliminar esta dirección (tiene pedidos activos)'); }
  };

  const INPUT = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
  const ACCENT = '#0ea5e9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Lista */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Mis direcciones</p>
          <button onClick={() => setShowForm(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> {showForm ? 'Cancelar' : 'Nueva dirección'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : dirs.length === 0 && !showForm ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <MapPin style={{ width: 36, height: 36, margin: '0 auto 10px', opacity: 0.25 }} />
            <p style={{ fontSize: 14, margin: 0 }}>Sin direcciones guardadas</p>
          </div>
        ) : dirs.map((d: any, i: number) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: i < dirs.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: d.esPrincipal ? `${ACCENT}15` : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin style={{ width: 15, height: 15, color: d.esPrincipal ? ACCENT : 'var(--text-secondary)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {d.esPrincipal && <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Principal · </span>}
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '1px 0 0' }}>{d.calle} {d.numero}, {d.colonia}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '1px 0 0' }}>{d.ciudad}, {d.estado} Código postal {d.codigoPostal}</p>
              {d.referencia && <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '1px 0 0' }}>{d.referencia}</p>}
              {d.latitud && d.longitud && (
                <p style={{ fontSize: 10, color: 'var(--text-hint)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                  📍 {parseFloat(d.latitud).toFixed(5)}, {parseFloat(d.longitud).toFixed(5)}
                </p>
              )}
            </div>
            <button onClick={() => eliminar(d.id)}
              style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: 'var(--text-hint)', cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}>
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ))}
      </div>

      {/* Formulario nueva dirección */}
      {showForm && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus style={{ width: 15, height: 15, color: ACCENT }} /> Agregar dirección
          </p>

          {/* GPS */}
          <button onClick={usarGPS} disabled={localizando}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: `1.5px solid ${ACCENT}50`, backgroundColor: `${ACCENT}10`, color: ACCENT, fontSize: 13, fontWeight: 600, cursor: localizando ? 'not-allowed' : 'pointer' }}>
            {localizando ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Navigation style={{ width: 15, height: 15 }} />}
            {localizando ? 'Detectando...' : 'Usar mi ubicación actual (GPS)'}
          </button>

          {/* Buscar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-hint)' }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarDireccion()} placeholder="Buscar dirección en el mapa..." style={{ ...INPUT, paddingLeft: 30 }} />
            </div>
            <button onClick={buscarDireccion} disabled={buscando || !busqueda.trim()}
              style={{ padding: '9px 13px', borderRadius: 9, border: 'none', backgroundColor: buscando || !busqueda.trim() ? 'var(--border)' : ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              {buscando ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : 'Buscar'}
            </button>
          </div>

          {/* Tabs mapa / manual */}
          <div style={{ display: 'flex', gap: 3, backgroundColor: 'var(--bg-muted)', borderRadius: 9, padding: 3 }}>
            {([['mapa','🗺 Mapa']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setMapTab(v as 'mapa')}
                style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: mapTab === v ? 600 : 400, backgroundColor: mapTab === v ? ACCENT : 'transparent', color: mapTab === v ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Mapa */}
          {mapTab === 'mapa' && (
            <>
              <MapaLeaflet lat={form.lat} lng={form.lng}
                onSelect={(la, lo, label) => setForm(p => ({ ...p, lat: la, lng: lo, displayName: label }))} />
              {form.displayName && (
                <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: `${ACCENT}10`, border: `1px solid ${ACCENT}30`, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <MapPin style={{ width: 13, height: 13, color: ACCENT, marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{form.displayName}</p>
                </div>
              )}
            </>
          )}

          {/* Manual */}
          {mapTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                <input value={form.calle} onChange={e => setForm(p => ({ ...p, calle: e.target.value }))} placeholder="Calle *" style={INPUT} />
                <input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Núm." style={INPUT} />
              </div>
              <input value={form.colonia} onChange={e => setForm(p => ({ ...p, colonia: e.target.value }))} placeholder="Distrito *" style={INPUT} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ciudad *" style={INPUT} />
                <input value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} placeholder="Departamento *" style={INPUT} />
              </div>
              <input value={form.codigoPostal} onChange={e => setForm(p => ({ ...p, codigoPostal: e.target.value }))} placeholder="Código postal *" style={INPUT} />
            </div>
          )}

          {/* Referencia + principal */}
          <input value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} placeholder="Referencia (color de puerta, entre calles...)" style={INPUT} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.esPrincipal} onChange={e => setForm(p => ({ ...p, esPrincipal: e.target.checked }))} /> Establecer como dirección principal
          </label>

          <form onSubmit={guardar} style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', backgroundColor: saving ? `${ACCENT}80` : ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
              Guardar dirección
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Toggle reutilizable ──────────────────────────────────────
function Toggle({ checked, onChange, label, desc, accent = '#0ea5e9' }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: checked ? accent : 'var(--border)', flexShrink: 0, transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function ClientePerfil() {
  const { user, updateUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { prefs, setPrefs, permiso, solicitarPermiso } = useNotifications();
  const [tab, setTab] = useState<Tab>('perfil');

  // Perfil
  const [perfil, setPerfil] = useState({ nombre: '', apellido: '', telefono: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seguridad
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [showPass, setShowPass] = useState({ actual: false, nueva: false });
  const [savingPass, setSavingPass] = useState(false);
  const [passErrors, setPassErrors] = useState<string[]>([]);

  // Borrar cuenta
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('lavaya_access_token') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (user) setPerfil({ nombre: user.nombre, apellido: user.apellido, telefono: user.telefono ?? '' });
  }, [user]);

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerfil(true);
    try {
      const r = await fetch(`${base}/clientes/perfil`, { method: 'PATCH', headers, body: JSON.stringify({ nombre: perfil.nombre, apellido: perfil.apellido, telefono: perfil.telefono || null }) });
      if (!r.ok) throw new Error();
      updateUser(await r.json());
      toast.success('Perfil actualizado');
    } catch { toast.error('Error al guardar'); }
    finally { setSavingPerfil(false); }
  };

  const cambiarPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!passForm.actual) errs.push('Ingresa tu contraseña actual');
    if (passForm.nueva.length < 8) errs.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(passForm.nueva)) errs.push('Debe tener una mayúscula');
    if (!/[0-9]/.test(passForm.nueva)) errs.push('Debe tener un número');
    if (passForm.nueva !== passForm.confirmar) errs.push('Las contraseñas no coinciden');
    setPassErrors(errs);
    if (errs.length > 0) return;
    setSavingPass(true);
    try {
      const r = await fetch(`${base}/clientes/password`, { method: 'PATCH', headers, body: JSON.stringify({ passwordActual: passForm.actual, passwordNueva: passForm.nueva }) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Error'); }
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      toast.success('Contraseña actualizada');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setSavingPass(false); }
  };

  const borrarCuenta = async () => {
    if (deleteText !== 'BORRAR MI CUENTA') { toast.error('Escribe exactamente: BORRAR MI CUENTA'); return; }
    setDeletingAccount(true);
    try {
      await clienteApi.eliminarCuenta();
      await logout();
      toast.success('Cuenta eliminada. Hasta luego.');
    } catch (err: unknown) {
      // El endpoint puede no existir aún — solo hacer logout
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta');
    } finally { setDeletingAccount(false); }
  };

  const ACCENT = '#0ea5e9';
  const S = {
    card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' as const },
    input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    btn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
        <PageHeader title="Mi perfil" subtitle="Gestiona tu cuenta y configuración" />

        <div style={{ padding: 24, maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── Hero con avatar ─── */}
          <div style={{ ...S.card, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <AvatarUpload
                currentUrl={user?.fotoPerfil}
                initials={`${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`}
                gradient="linear-gradient(135deg,#0ea5e9,#6366f1)"
                size={64}
                onSuccess={url => updateUser({ ...user!, fotoPerfil: url })}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{user?.nombre} {user?.apellido}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{user?.email}</p>
              </div>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.15s', backgroundColor: active ? ACCENT : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', boxShadow: active ? `0 2px 8px ${ACCENT}40` : 'none' }}>
                  <t.icon style={{ width: 16, height: 16 }} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ══ TAB: Perfil ══ */}
          {tab === 'perfil' && (
            <div style={S.card}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Datos personales</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Actualiza tu información de contacto</p>
              </div>
              <form onSubmit={guardarPerfil} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={S.label}>Nombre</label><input required value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} style={S.input} /></div>
                  <div><label style={S.label}>Apellido</label><input required value={perfil.apellido} onChange={e => setPerfil(p => ({ ...p, apellido: e.target.value }))} style={S.input} /></div>
                </div>
                <div><label style={S.label}>Email</label><input disabled value={user?.email ?? ''} style={{ ...S.input, opacity: 0.5, cursor: 'not-allowed' }} /></div>
                <div><label style={S.label}>Teléfono</label><input type="tel" value={perfil.telefono} onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} placeholder="+51 999 999 999" style={S.input} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={savingPerfil} style={S.btn}>
                    {savingPerfil ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Save style={{ width: 15, height: 15 }} />}
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ TAB: Direcciones ══ */}
          {tab === 'direcciones' && <TabDirecciones />}

          {/* ══ TAB: Seguridad ══ */}
          {tab === 'seguridad' && (
            <div style={S.card}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cambiar contraseña</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Al cambiar tu contraseña se cerrarán otras sesiones</p>
              </div>
              <form onSubmit={cambiarPass} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {passErrors.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    {passErrors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#dc2626', margin: '1px 0', display: 'flex', alignItems: 'center', gap: 5 }}><span>•</span>{e}</p>)}
                  </div>
                )}
                {([{ k: 'actual' as const, l: 'Contraseña actual', s: showPass.actual }, { k: 'nueva' as const, l: 'Nueva contraseña', s: showPass.nueva }, { k: 'confirmar' as const, l: 'Confirmar nueva', s: false }]).map(f => (
                  <div key={f.k}>
                    <label style={S.label}>{f.l}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={f.k !== 'confirmar' && f.s ? 'text' : 'password'} value={passForm[f.k]} onChange={e => { setPassForm(p => ({ ...p, [f.k]: e.target.value })); setPassErrors([]); }} style={{ ...S.input, paddingRight: f.k !== 'confirmar' ? 42 : 14 }} />
                      {f.k !== 'confirmar' && (
                        <button type="button" onClick={() => setShowPass(p => ({ ...p, [f.k]: !p[f.k as 'actual' | 'nueva'] }))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: 0 }}>
                          {f.s ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {passForm.nueva.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[passForm.nueva.length >= 8, /[A-Z]/.test(passForm.nueva), /[0-9]/.test(passForm.nueva), /[^A-Za-z0-9]/.test(passForm.nueva)].map((ok, i) => (
                        <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, backgroundColor: ok ? (i < 2 ? '#f59e0b' : '#22c55e') : 'var(--border)', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                      {[{ ok: passForm.nueva.length >= 8, l: '8+ chars' }, { ok: /[A-Z]/.test(passForm.nueva), l: 'Mayúscula' }, { ok: /[0-9]/.test(passForm.nueva), l: 'Número' }].map(r => (
                        <span key={r.l} style={{ fontSize: 11, color: r.ok ? '#22c55e' : 'var(--text-hint)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {r.ok ? <CheckCircle style={{ width: 11, height: 11 }} /> : '○'} {r.l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={savingPass || !passForm.actual || !passForm.nueva} style={{ ...S.btn, opacity: (savingPass || !passForm.actual || !passForm.nueva) ? 0.5 : 1 }}>
                    {savingPass ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : <Lock style={{ width: 15, height: 15 }} />}
                    Cambiar contraseña
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ TAB: Configuración ══ */}
          {tab === 'configuracion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Apariencia */}
              <div style={S.card}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isDark ? <Moon style={{ width: 16, height: 16, color: ACCENT }} /> : <Sun style={{ width: 16, height: 16, color: ACCENT }} />}
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Apariencia</p>
                </div>
                <div style={{ padding: '0 18px' }}>
                  <Toggle checked={isDark} onChange={() => toggleTheme()} label={isDark ? 'Modo oscuro activo' : 'Modo claro activo'} desc="Cambia entre tema claro y oscuro" accent={ACCENT} />
                </div>
              </div>

              {/* Notificaciones */}
              <div style={S.card}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell style={{ width: 16, height: 16, color: ACCENT }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notificaciones</p>
                </div>
                {permiso !== 'granted' && (
                  <div style={{ margin: '12px 18px 0', padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: '#d97706', margin: 0, flex: 1 }}>Activa las notificaciones para saber cuándo tu ropa está lista.</p>
                    {permiso === 'default' && <button onClick={solicitarPermiso} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Activar</button>}
                  </div>
                )}
                <div style={{ padding: '0 18px' }}>
                  <Toggle checked={prefs.pedidoEntregado} onChange={v => { setPrefs({ pedidoEntregado: v }); toast.success('Preferencia guardada'); }} label="Mi pedido fue entregado" desc="Notificación cuando tu ropa llegue a tu puerta" accent={ACCENT} />
                  <Toggle checked={prefs.nuevoPedido} onChange={v => { setPrefs({ nuevoPedido: v }); toast.success('Preferencia guardada'); }} label="Confirmación de pedido" desc="Cuando un repartidor acepte tu pedido" accent={ACCENT} />
                  <Toggle checked={prefs.sonido} onChange={v => { setPrefs({ sonido: v }); toast.success('Preferencia guardada'); }} label="Sonido" desc="Reproducir sonido al recibir notificaciones" accent={ACCENT} />
                </div>
              </div>

              {/* Zona de peligro */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: '#ef4444' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>Zona de peligro</p>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Eliminar mi cuenta</p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0', lineHeight: 1.5 }}>
                        Esta acción es permanente. Solo se permite si no tienes pedidos pendientes o activos.
                      </p>
                    </div>
                    <button onClick={() => setShowDeleteConfirm(true)}
                      style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                      Eliminar cuenta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal confirmar borrar cuenta ─── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'var(--bg-card)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <AlertTriangle style={{ width: 24, height: 24, color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>¿Eliminar tu cuenta?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Esta acción <strong>no se puede deshacer</strong>. Si tienes pedidos pendientes o activos, primero debes terminarlos o cancelarlos. Para confirmar, escribe exactamente:
            </p>
            <div style={{ padding: '8px 14px', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 12, textAlign: 'center' }}>
              <code style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', letterSpacing: '0.03em' }}>BORRAR MI CUENTA</code>
            </div>
            <input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Escribe aquí para confirmar..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${deleteText === 'BORRAR MI CUENTA' ? '#ef4444' : 'var(--border)'}`, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button
                onClick={borrarCuenta}
                disabled={deletingAccount || deleteText !== 'BORRAR MI CUENTA'}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', backgroundColor: deleteText === 'BORRAR MI CUENTA' ? '#ef4444' : 'var(--border)', color: deleteText === 'BORRAR MI CUENTA' ? '#fff' : 'var(--text-hint)', fontSize: 14, cursor: deleteText === 'BORRAR MI CUENTA' ? 'pointer' : 'not-allowed', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {deletingAccount ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ width: 15, height: 15 }} />}
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
