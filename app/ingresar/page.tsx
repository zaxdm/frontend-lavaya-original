'use client';
// app/ingresar/page.tsx — Login unificado para todos los roles
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye, EyeOff, Loader2, WashingMachine, CheckCircle,
  Star, Shield, Clock, Sparkles, Mail, Lock, User,
  Phone, ArrowLeft, MessageCircle, MapPin, Navigation,
  Search, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

// ─── Tipos ────────────────────────────────────────────────────
type Mode = 'login' | 'register' | 'forgot';
type RegStep = 1 | 2; // paso 1: datos; paso 2: dirección

interface DireccionForm {
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  referencia: string;
  lat: number | null;
  lng: number | null;
  displayName: string;
}

const DIR_VACIA: DireccionForm = {
  calle: '', numero: '', colonia: '', ciudad: '', estado: '',
  codigoPostal: '', referencia: '', lat: null, lng: null, displayName: '',
};

// ─── Burbuja flotante ─────────────────────────────────────────
function Bubble({ size, x, delay, duration }: { size: number; x: number; delay: number; duration: number }) {
  return (
    <div style={{
      position: 'absolute', bottom: '-10%', left: `${x}%`,
      width: size, height: size, borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.05)',
      animation: `floatUp ${duration}s ${delay}s infinite ease-in`,
      pointerEvents: 'none',
    }} />
  );
}

// ─── Feature ──────────────────────────────────────────────────
function Feature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color: '#7dd3fc' }} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', lineHeight: 1.4 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Mapa con Leaflet (lazy-loaded) ───────────────────────────
function MapaPicker({ lat, lng, onSelect }: {
  lat: number | null;
  lng: number | null;
  onSelect: (lat: number, lng: number, label: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [mapReady, setMapReady] = useState(false);

  const DEFAULT_LAT = -12.0464;
  const DEFAULT_LNG = -77.0428;

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return;

    let cancelado = false;

    import('leaflet').then((L) => {
      if (cancelado || !mapRef.current || mapInstanceRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [lat ?? DEFAULT_LAT, lng ?? DEFAULT_LNG],
        zoom: lat ? 16 : 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: clLat, lng: clLng } = e.latlng;
        if (markerRef.current) {
          (markerRef.current as L.Marker).setLatLng([clLat, clLng]);
        } else {
          markerRef.current = L.marker([clLat, clLng]).addTo(map);
        }
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${clLat}&lon=${clLng}&format=json&accept-language=es`,
          );
          const data = await res.json();
          onSelect(clLat, clLng, data.display_name ?? `${clLat.toFixed(5)}, ${clLng.toFixed(5)}`);
        } catch {
          onSelect(clLat, clLng, `${clLat.toFixed(5)}, ${clLng.toFixed(5)}`);
        }
      });

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelado = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as L.Map).remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar marcador cuando cambian las coords externamente
  useEffect(() => {
    if (!mapInstanceRef.current || lat === null || lng === null) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as L.Map;
      if (markerRef.current) {
        (markerRef.current as L.Marker).setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
      map.setView([lat, lng], 16, { animate: true });
    });
  }, [lat, lng]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-muted)', borderRadius: 12 }}>
          <Loader2 style={{ width: 20, height: 20, color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Toca el mapa para colocar el pin
      </div>
    </div>
  );
}

// ─── Paso 2: Dirección ────────────────────────────────────────
function PasoDireccion({ dir, setDir, onBack, onConfirm, loading }: {
  dir: DireccionForm;
  setDir: React.Dispatch<React.SetStateAction<DireccionForm>>;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [tab, setTab] = useState<'mapa' | 'manual'>('mapa');

  const buscarDireccion = useCallback(async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(busqueda)}&format=json&limit=1&countrycodes=pe&accept-language=es`,
      );
      const data = await res.json();
      if (data.length === 0) { toast.error('No se encontró esa dirección'); return; }
      const { lat, lon, display_name, address } = data[0];
      setDir(prev => ({
        ...prev,
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        displayName: display_name,
        calle: address?.road ?? prev.calle,
        colonia: address?.neighbourhood ?? address?.suburb ?? prev.colonia,
        ciudad: address?.city ?? address?.town ?? address?.village ?? prev.ciudad,
        estado: address?.state ?? prev.estado,
        codigoPostal: address?.postcode ?? prev.codigoPostal,
      }));
    } catch { toast.error('Error al buscar la dirección'); }
    finally { setBuscando(false); }
  }, [busqueda, setDir]);

  const usarGPS = () => {
    if (!navigator.geolocation) { toast.error('Tu navegador no soporta geolocalización'); return; }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
          );
          const data = await res.json();
          const { address, display_name } = data;
          setDir(prev => ({
            ...prev,
            lat, lng,
            displayName: display_name,
            calle: address?.road ?? prev.calle,
            numero: address?.house_number ?? prev.numero,
            colonia: address?.neighbourhood ?? address?.suburb ?? prev.colonia,
            ciudad: address?.city ?? address?.town ?? address?.village ?? prev.ciudad,
            estado: address?.state ?? prev.estado,
            codigoPostal: address?.postcode ?? prev.codigoPostal,
          }));
          toast.success('Ubicación detectada');
        } catch {
          setDir(prev => ({ ...prev, lat, lng }));
          toast.success('Ubicación detectada (sin datos de dirección)');
        }
        setLocalizando(false);
      },
      (err) => {
        setLocalizando(false);
        toast.error(err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const INPUT = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 28, boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, marginBottom: 14 }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Volver
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin style={{ width: 20, height: 20, color: '#0ea5e9' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>¿Dónde vives?</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Para que podamos recoger tu ropa</p>
        </div>
      </div>

      <button onClick={usarGPS} disabled={localizando}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, border: '1.5px solid rgba(14,165,233,0.4)', backgroundColor: 'rgba(14,165,233,0.08)', color: '#0ea5e9', fontSize: 14, fontWeight: 600, cursor: localizando ? 'not-allowed' : 'pointer', marginBottom: 14, transition: 'all 0.15s' }}>
        {localizando ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Navigation style={{ width: 16, height: 16 }} />}
        {localizando ? 'Detectando ubicación...' : 'Usar mi ubicación actual (GPS)'}
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-hint)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarDireccion()}
            placeholder="Buscar dirección en el mapa..."
            style={{ ...INPUT, paddingLeft: 32 }}
          />
        </div>
        <button onClick={buscarDireccion} disabled={buscando || !busqueda.trim()}
          style={{ padding: '9px 14px', borderRadius: 9, border: 'none', backgroundColor: buscando || !busqueda.trim() ? 'var(--border)' : '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          {buscando ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'Buscar'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-muted)', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {(['mapa', 'manual'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, backgroundColor: tab === t ? '#0ea5e9' : 'transparent', color: tab === t ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {t === 'mapa' ? '🗺 Seleccionar en mapa' : '✏️ Ingresar manualmente'}
          </button>
        ))}
      </div>

      {tab === 'mapa' && (
        <>
          <MapaPicker
            lat={dir.lat} lng={dir.lng}
            onSelect={(lat, lng, label) => setDir(prev => ({ ...prev, lat, lng, displayName: label }))}
          />
          {dir.displayName && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <MapPin style={{ width: 14, height: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{dir.displayName}</p>
            </div>
          )}
        </>
      )}

      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input value={dir.calle} onChange={e => setDir(p => ({ ...p, calle: e.target.value }))} placeholder="Calle *" style={INPUT} />
            <input value={dir.numero} onChange={e => setDir(p => ({ ...p, numero: e.target.value }))} placeholder="Núm." style={{ ...INPUT, width: 70 }} />
          </div>
          <input value={dir.colonia} onChange={e => setDir(p => ({ ...p, colonia: e.target.value }))} placeholder="Distrito *" style={INPUT} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={dir.ciudad} onChange={e => setDir(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ciudad *" style={INPUT} />
            <input value={dir.estado} onChange={e => setDir(p => ({ ...p, estado: e.target.value }))} placeholder="Departamento *" style={INPUT} />
          </div>
          <input value={dir.codigoPostal} onChange={e => setDir(p => ({ ...p, codigoPostal: e.target.value }))} placeholder="Código postal *" style={INPUT} />
        </div>
      )}

      <input
        value={dir.referencia}
        onChange={e => setDir(p => ({ ...p, referencia: e.target.value }))}
        placeholder="Referencia (color de puerta, entre calles...)"
        style={{ ...INPUT, marginTop: 10 }}
      />

      {dir.lat && dir.lng && (
        <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '6px 0 0', textAlign: 'center' }}>
          📍 {dir.lat.toFixed(5)}, {dir.lng.toFixed(5)}
        </p>
      )}

      <button
        onClick={onConfirm}
        disabled={loading || (!dir.lat && !dir.calle)}
        style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, border: 'none', backgroundColor: (loading || (!dir.lat && !dir.calle)) ? 'var(--border)' : '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 700, cursor: (loading || (!dir.lat && !dir.calle)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 16, height: 16 }} />}
        {loading ? 'Creando tu cuenta...' : 'Crear cuenta y guardar dirección'}
      </button>

      <p style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', margin: '10px 0 0' }}>
        También puedes omitirla y agregarla después desde tu perfil
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function IngresarPage() {
  const { login, loginGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [regStep, setRegStep] = useState<RegStep>(1);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Registro paso 1
  const [rNombre, setRNombre] = useState('');
  const [rApellido, setRApellido] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rTelefono, setRTelefono] = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rShowPass, setRShowPass] = useState(false);
  // Verificación inline de email durante registro
  const [rEmailSending, setREmailSending] = useState(false);   // enviando código
  const [rEmailSent, setREmailSent] = useState(false);         // código enviado (mostrar input)
  const [rEmailVerified, setREmailVerified] = useState(false); // código correcto
  const [rEmailCode, setREmailCode] = useState('');            // código ingresado
  const [rEmailVerifying, setREmailVerifying] = useState(false);
  const [rEmailCooldown, setREmailCooldown] = useState(0);

  // Registro paso 2 — dirección
  const [dir, setDir] = useState<DireccionForm>(DIR_VACIA);
  const [rLoading, setRLoading] = useState(false);

  // Forgot
  const [fEmail, setFEmail] = useState('');
  const [fStep, setFStep] = useState<1 | 2 | 3>(1);
  const [fCode, setFCode] = useState('');
  const [fNewPassword, setFNewPassword] = useState('');
  const [fConfirmPassword, setFConfirmPassword] = useState('');
  const [fResetting, setFResetting] = useState(false);
  const [fSending, setFSending] = useState(false);
  const [fVerifying, setFVerifying] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fEmail.includes('@')) { toast.error('Email inválido'); return; }
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
    } finally { setFSending(false); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fCode.length !== 6) { toast.error('El código debe tener 6 dígitos'); return; }
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
    } finally { setFVerifying(false); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fNewPassword !== fConfirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (fNewPassword.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(fNewPassword)) { toast.error('La contraseña debe tener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(fNewPassword)) { toast.error('La contraseña debe tener al menos un número'); return; }
    setFResetting(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fEmail, codigo: fCode, nuevaPassword: fNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña');
      toast.success('Contraseña actualizada correctamente');
      resetMode('login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally { setFResetting(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>Tu correo no está verificado.</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = `/ingresar/verificar-email?email=${encodeURIComponent(email)}`;
              }}
              style={{ padding: '6px 12px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Verificar mi cuenta
            </button>
          </div>
        ), { duration: 8000 });
      } else {
        toast.error(err instanceof Error ? err.message : 'Credenciales incorrectas');
      }
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setGoogleLoading(true);
    try {
      await loginGoogle(credentialResponse.credential);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally { setGoogleLoading(false); }
  };

  // Cooldown para reenviar código de registro
  useEffect(() => {
    if (rEmailCooldown <= 0) return;
    const t = setTimeout(() => setREmailCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [rEmailCooldown]);

  // Enviar código al email antes de crear la cuenta
  const enviarCodigoRegistro = async () => {
    const emailTrim = rEmail.trim();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }
    setREmailSending(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/enviar-codigo-verificacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar el código');
      setREmailSent(true);
      setREmailCooldown(45);
      toast.success(`Código enviado a ${emailTrim}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar el código');
    } finally { setREmailSending(false); }
  };

  // Verificar el código ingresado
  const verificarCodigoRegistro = async (codigo: string) => {
    if (codigo.length !== 6) return;
    setREmailVerifying(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/verificar-codigo-previo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rEmail.trim(), codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido o expirado');
      setREmailVerified(true);
      toast.success('¡Correo verificado!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Código incorrecto');
      setREmailCode('');
    } finally { setREmailVerifying(false); }
  };

  const irAPasoDireccion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rEmailVerified) {
      toast.error('Debes verificar tu correo electrónico primero');
      return;
    }
    if (rPassword.length < 8 || !/[A-Z]/.test(rPassword) || !/[0-9]/.test(rPassword)) {
      toast.error('Contraseña: mínimo 8 caracteres, una mayúscula y un número');
      return;
    }
    setRegStep(2);
  };

  const confirmarRegistro = async (omitirDireccion = false) => {
    setRLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;

      // 1. Crear cuenta (el email ya fue pre-verificado inline, el backend lo marcará como verificado)
      const res = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: rNombre, apellido: rApellido,
          email: rEmail, password: rPassword,
          telefono: rTelefono || null, rol: 'CLIENTE',
          emailPreVerificado: true, // indica que el usuario ya verificó el email
        }),
      });
      const data = await res.json();
      if (!res.ok) { throw new Error(data.error || 'Error al registrarse'); }

      // 2. Iniciar sesión automáticamente con las credenciales recién creadas
      const loginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rEmail, password: rPassword }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        // Si el login falla por alguna razón, redirigir al login normal
        toast.success('¡Cuenta creada! Inicia sesión para continuar.');
        resetMode('login');
        return;
      }

      // 3. Guardar tokens y autenticar
      const { tokenStorage } = await import('@/lib/api');
      tokenStorage.set(loginData.accessToken, loginData.refreshToken);

      // 4. Si hay dirección, guardarla en sessionStorage
      if (!omitirDireccion && (dir.lat || dir.calle)) {
        const dirPayload = {
          calle: dir.calle || 'Sin calle',
          numero: dir.numero || 'S/N',
          colonia: dir.colonia || 'Sin colonia',
          ciudad: dir.ciudad || 'Sin ciudad',
          estado: dir.estado || 'Sin estado',
          codigoPostal: dir.codigoPostal || '00000',
          referencia: dir.referencia || null,
          esPrincipal: true, latitud: dir.lat, longitud: dir.lng,
        };
        try {
          await fetch(`${base}/clientes/direcciones`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.accessToken}`,
            },
            body: JSON.stringify(dirPayload),
          });
        } catch { /* dirección opcional, no bloquear */ }
      }

      toast.success('¡Bienvenido a LavaYa!');
      window.location.href = '/cliente/dashboard';
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear cuenta');
    } finally { setRLoading(false); }
  };

  const BUBBLES = [
    { size: 20, x: 10, delay: 0,   duration: 8  },
    { size: 35, x: 25, delay: 2,   duration: 11 },
    { size: 15, x: 42, delay: 4,   duration: 7  },
    { size: 50, x: 60, delay: 1,   duration: 13 },
    { size: 25, x: 75, delay: 3,   duration: 9  },
    { size: 18, x: 88, delay: 5,   duration: 10 },
    { size: 40, x: 5,  delay: 6,   duration: 12 },
    { size: 12, x: 93, delay: 2.5, duration: 6  },
  ];

  const INPUT = {
    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 10,
    border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const resetMode = (m: Mode) => {
    setMode(m); setRegStep(1); setDir(DIR_VACIA);
    setREmail(''); setREmailSent(false); setREmailVerified(false);
    setREmailCode(''); setREmailCooldown(0);
  };

  return (
    <>
      <style>{`
        @keyframes floatUp { 0% { transform:translateY(0) scale(1); opacity:.5; } 80% { opacity:.2; } 100% { transform:translateY(-110vh) scale(.4); opacity:0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
        .login-input::placeholder { color: var(--text-hint); }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg,#0c1a2e 0%,#0c3b5c 40%,#0e4d7b 60%,#0c1a2e 100%)' }}>
        {BUBBLES.map((b, i) => <Bubble key={i} {...b} />)}

        {/* ─── Panel izquierdo ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', position: 'relative', zIndex: 1 }} className="hidden lg:flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 52, height: 52, backgroundColor: '#0ea5e9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(14,165,233,0.5)', animation: 'pulse 3s ease-in-out infinite' }}>
              <WashingMachine style={{ width: 28, height: 28, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>LavaYa</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Lavandería a domicilio</p>
            </div>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>
            Tu ropa limpia,<br /><span style={{ color: '#38bdf8' }}>sin salir de casa</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 0 36px', lineHeight: 1.6 }}>Recogemos, lavamos y entregamos. Rápido, fácil y seguro.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 40 }}>
            <Feature icon={Clock}    title="Recojo en menos de 2 horas"   desc="Coordinamos el horario que más te convenga" />
            <Feature icon={Shield}   title="Seguimiento en tiempo real"    desc="Sigue tu pedido con GPS en vivo" />
            <Feature icon={Star}     title="Puntos y recompensas"          desc="1 punto por cada prenda. Canjéalos por descuentos" />
            <Feature icon={Sparkles} title="Calidad garantizada"           desc="Si no quedas satisfecho, lo hacemos de nuevo" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(s => <Star key={s} style={{ width: 15, height: 15, color: '#fbbf24', fill: '#fbbf24' }} />)}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}><strong style={{ color: '#fff' }}>4.9/5</strong> · +2,500 clientes</p>
          </div>
        </div>

        {/* ─── Panel derecho ─── */}
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24, position: 'relative', zIndex: 1, backdropFilter: 'blur(20px)', backgroundColor: 'rgba(8,18,34,0.55)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Logo móvil */}
          <div className="flex lg:hidden items-center gap-3 mb-4">
            <div style={{ width: 34, height: 34, backgroundColor: '#0ea5e9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WashingMachine style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>LavaYa</span>
          </div>

          {/* Formularios */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 440, animation: 'fadeSlide 0.35s ease' }} key={`${mode}-${regStep}`}>

              {/* ═══ LOGIN ═══ */}
              {mode === 'login' && (
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 32, boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Bienvenido</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 22px' }}>Inicia sesión para continuar</p>
                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" style={INPUT} className="login-input" />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
                      <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" style={{ ...INPUT, paddingRight: 40 }} className="login-input" />
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: 0 }}>
                        {showPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: -4 }}>
                      <button type="button" onClick={() => resetMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0ea5e9', padding: 0 }}>
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <button type="submit" disabled={loading}
                      style={{ padding: '12px', borderRadius: 10, border: 'none', backgroundColor: loading ? '#38bdf880' : '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                      {loading ? 'Iniciando...' : 'Iniciar sesión'}
                    </button>
                  </form>
                  <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>o</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {googleLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 8, backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                        <span>Iniciando con Google...</span>
                      </div>
                    ) : (
                      <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => toast.error('Error al iniciar sesión con Google')}
                        text="signin_with"
                        shape="pill"
                        theme="outline"
                      />
                    )}
                  </div>
                  <div style={{ marginTop: 18, textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      ¿No tienes cuenta?{' '}
                      <button onClick={() => resetMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontWeight: 700, fontSize: 14, padding: 0 }}>
                        Crear cuenta gratis
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ REGISTRO paso 1: datos ═══ */}
              {mode === 'register' && regStep === 1 && (
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 28, boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
                  <button onClick={() => resetMode('login')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, marginBottom: 14 }}>
                    <ArrowLeft style={{ width: 14, height: 14 }} /> Volver al login
                  </button>

                  {/* Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>1</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9' }}>Tus datos</span>
                    </div>
                    <div style={{ flex: 1, height: 2, backgroundColor: 'var(--border)', borderRadius: 99 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-hint)' }}>2</div>
                      <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>Dirección</span>
                    </div>
                  </div>

                  <form onSubmit={irAPasoDireccion} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {/* Nombre y Apellido */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-hint)' }} />
                        <input required value={rNombre} onChange={e => setRNombre(e.target.value)} placeholder="Nombre" style={INPUT} className="login-input" />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-hint)' }} />
                        <input required value={rApellido} onChange={e => setRApellido(e.target.value)} placeholder="Apellido" style={INPUT} className="login-input" />
                      </div>
                    </div>

                    {/* Email + botón enviar código */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: rEmailVerified ? '#22c55e' : 'var(--text-hint)' }} />
                        <input
                          type="email"
                          required
                          value={rEmail}
                          onChange={e => {
                            setREmail(e.target.value);
                            if (rEmailSent) { setREmailSent(false); setREmailVerified(false); setREmailCode(''); }
                          }}
                          placeholder="Correo electrónico"
                          disabled={rEmailVerified}
                          style={{ ...INPUT, paddingRight: rEmailVerified ? 36 : 14, borderColor: rEmailVerified ? '#22c55e' : undefined, backgroundColor: rEmailVerified ? 'rgba(34,197,94,0.05)' : undefined }}
                          className="login-input"
                        />
                        {rEmailVerified && (
                          <CheckCircle style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#22c55e' }} />
                        )}
                      </div>
                      {!rEmailVerified && (
                        <button
                          type="button"
                          onClick={enviarCodigoRegistro}
                          disabled={rEmailSending || rEmailCooldown > 0 || !rEmail.includes('@')}
                          style={{
                            padding: '0 14px', borderRadius: 10, border: 'none', flexShrink: 0,
                            backgroundColor: (rEmailSending || rEmailCooldown > 0 || !rEmail.includes('@')) ? 'var(--border)' : '#0ea5e9',
                            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {rEmailSending
                            ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />
                            : <Mail style={{ width: 13, height: 13 }} />}
                          {rEmailSending ? 'Enviando...' : rEmailCooldown > 0 ? `${rEmailCooldown}s` : rEmailSent ? 'Reenviar' : 'Enviar código'}
                        </button>
                      )}
                    </div>

                    {/* Campo de código (aparece tras enviar) */}
                    {rEmailSent && !rEmailVerified && (
                      <div style={{ animation: 'fadeSlide 0.25s ease' }}>
                        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.25)', marginBottom: 8 }}>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            Enviamos un código de 6 dígitos a <strong style={{ color: 'var(--text-primary)' }}>{rEmail}</strong>. Revisa también el spam.
                          </p>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            maxLength={6}
                            value={rEmailCode}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              setREmailCode(val);
                              if (val.length === 6) verificarCodigoRegistro(val);
                            }}
                            placeholder="Código de 6 dígitos"
                            autoFocus
                            style={{
                              ...INPUT, paddingLeft: 14,
                              fontSize: 20, letterSpacing: 10, textAlign: 'center',
                              borderColor: 'rgba(14,165,233,0.5)',
                            }}
                            className="login-input"
                          />
                          {rEmailVerifying && (
                            <Loader2 style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Teléfono */}
                    <div style={{ position: 'relative' }}>
                      <Phone style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-hint)' }} />
                      <input type="tel" value={rTelefono} onChange={e => setRTelefono(e.target.value)} placeholder="Teléfono (opcional)" style={INPUT} className="login-input" />
                    </div>

                    {/* Contraseña */}
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-hint)' }} />
                      <input type={rShowPass ? 'text' : 'password'} required value={rPassword} onChange={e => setRPassword(e.target.value)} placeholder="Contraseña" style={{ ...INPUT, paddingRight: 40 }} className="login-input" />
                      <button type="button" onClick={() => setRShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: 0 }}>
                        {rShowPass ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                      </button>
                    </div>
                    {rPassword.length > 0 && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                        {[{ ok: rPassword.length >= 8, l: '8+ chars' }, { ok: /[A-Z]/.test(rPassword), l: 'Mayúscula' }, { ok: /[0-9]/.test(rPassword), l: 'Número' }].map(r => (
                          <span key={r.l} style={{ fontSize: 11, color: r.ok ? '#22c55e' : 'var(--text-hint)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: r.ok ? 600 : 400 }}>
                            {r.ok ? '✓' : '○'} {r.l}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!rEmailVerified}
                      style={{
                        padding: '12px', borderRadius: 10, border: 'none', marginTop: 2,
                        backgroundColor: rEmailVerified ? '#0ea5e9' : 'var(--border)',
                        color: rEmailVerified ? '#fff' : 'var(--text-hint)',
                        fontSize: 14, fontWeight: 700,
                        cursor: rEmailVerified ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      Siguiente — Agregar dirección <ChevronRight style={{ width: 15, height: 15 }} />
                    </button>
                    {!rEmailVerified && (
                      <p style={{ fontSize: 11, color: '#f59e0b', textAlign: 'center', margin: 0 }}>
                        Verifica tu correo para continuar
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', margin: 0 }}>
                      Al registrarte aceptas nuestros <span style={{ color: '#0ea5e9' }}>Términos</span> y <span style={{ color: '#0ea5e9' }}>Privacidad</span>
                    </p>
                  </form>
                </div>
              )}

              {/* ═══ REGISTRO paso 2: dirección ═══ */}
              {mode === 'register' && regStep === 2 && (
                <PasoDireccion
                  dir={dir}
                  setDir={setDir}
                  onBack={() => setRegStep(1)}
                  onConfirm={() => confirmarRegistro(false)}
                  loading={rLoading}
                />
              )}

              {/* ═══ RECUPERAR CONTRASEÑA ═══ */}
              {mode === 'forgot' && (
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 32, boxShadow: '0 32px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => {
                      if (fStep === 1) resetMode('login');
                      else if (fStep === 2) setFStep(1);
                      else if (fStep === 3) setFStep(2);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, marginBottom: 16 }}
                  >
                    <ArrowLeft style={{ width: 14, height: 14 }} /> Volver
                  </button>

                  {fStep === 1 && (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Lock style={{ width: 22, height: 22, color: '#0ea5e9' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>¿Olvidaste tu contraseña?</h2>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>Ingresa tu correo y te enviaremos un código de recuperación.</p>
                      <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
                          <input type="email" required value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="tu@correo.com" style={INPUT} className="login-input" />
                        </div>
                        <button type="submit" disabled={fSending} style={{ padding: '12px', borderRadius: 10, border: 'none', backgroundColor: fSending ? '#38bdf880' : '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {fSending && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                          {fSending ? 'Enviando...' : 'Enviar código'}
                        </button>
                      </form>
                      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>¿No tienes acceso a tu correo?</p>
                        <a href="mailto:soporte@lavaya.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>
                          <MessageCircle style={{ width: 13, height: 13 }} /> soporte@lavaya.com
                        </a>
                      </div>
                    </>
                  )}

                  {fStep === 2 && (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(124, 58, 237, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Lock style={{ width: 22, height: 22, color: '#7c3aed' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Verifica tu correo</h2>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>Ingresa el código de 6 dígitos que te enviamos a <strong>{fEmail}</strong>.</p>
                      <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={fCode}
                          onChange={e => setFCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          style={{ ...INPUT, paddingLeft: 14, fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
                          className="login-input"
                        />
                        <button type="submit" disabled={fVerifying} style={{ padding: '12px', borderRadius: 10, border: 'none', backgroundColor: fVerifying ? '#7c3aed80' : '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fVerifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
                            } finally { setFSending(false); }
                          }}
                          disabled={fSending}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0ea5e9', padding: 0 }}
                        >
                          Reenviar código
                        </button>
                      </div>
                    </>
                  )}

                  {fStep === 3 && (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <CheckCircle style={{ width: 22, height: 22, color: '#22c55e' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Restablece tu contraseña</h2>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>Ingresa tu nueva contraseña.</p>
                      <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
                          <input type="password" required value={fNewPassword} onChange={e => setFNewPassword(e.target.value)} placeholder="Nueva contraseña" style={{ ...INPUT, paddingRight: 40 }} className="login-input" />
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-hint)' }} />
                          <input type="password" required value={fConfirmPassword} onChange={e => setFConfirmPassword(e.target.value)} placeholder="Confirmar nueva contraseña" style={{ ...INPUT, paddingRight: 40 }} className="login-input" />
                        </div>
                        {fNewPassword.length > 0 && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {[
                              { ok: fNewPassword.length >= 8, l: '8+ chars' },
                              { ok: /[A-Z]/.test(fNewPassword), l: 'Mayúscula' },
                              { ok: /[0-9]/.test(fNewPassword), l: 'Número' },
                              { ok: fConfirmPassword.length > 0 && fNewPassword === fConfirmPassword, l: 'Coincide' }
                            ].map(r => (
                              <span key={r.l} style={{ fontSize: 11, color: r.ok ? '#22c55e' : 'var(--text-hint)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: r.ok ? 600 : 400 }}>
                                {r.ok ? '✓' : '○'} {r.l}
                              </span>
                            ))}
                          </div>
                        )}
                        <button type="submit" disabled={fResetting} style={{ padding: '12px', borderRadius: 10, border: 'none', backgroundColor: fResetting ? '#38bdf880' : '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: fResetting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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

          {/* ─── Footer ─── */}
          <footer style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' as const }}>
              {['Inicio','Servicios','Precios','Contacto','Términos','Privacidad'].map(l => (
                <a key={l} href="#" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                  {l}
                </a>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
              © {new Date().getFullYear()} LavaYa · Todos los derechos reservados
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
