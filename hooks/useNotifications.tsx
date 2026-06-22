'use client';
/**
 * hooks/useNotifications.tsx
 *
 * Sistema de notificaciones real para LavaYa Admin:
 *
 * 1. Polling cada 30 s contra /api/admin/reportes/stats para detectar
 *    pedidos nuevos pendientes.
 * 2. Web Notifications API (notificación nativa del navegador) cuando
 *    aparecen pedidos nuevos y el toggle está activo.
 * 3. Web Audio API (beep sintético) para el sonido.
 * 4. Cola interna de alertas visibles en el panel de notificaciones.
 * 5. Los toggles de la página de cuenta conectan con este hook
 *    a través del contexto.
 */
import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback,
} from 'react';
import { tokenStorage } from '@/lib/api';

// ─── Tipos ────────────────────────────────────────────────────
export interface NotifItem {
  id: string;
  tipo: 'pedido_nuevo' | 'pedido_entregado' | 'info';
  titulo: string;
  mensaje: string;
  timestamp: Date;
  leida: boolean;
  href?: string;
}

export interface NotifPrefs {
  nuevoPedido: boolean;
  pedidoEntregado: boolean;
  reporteDiario: boolean;
  sonido: boolean;
}

interface NotifContextValue {
  notificaciones: NotifItem[];
  noLeidas: number;
  prefs: NotifPrefs;
  permiso: NotificationPermission | 'unsupported';
  setPrefs: (p: Partial<NotifPrefs>) => void;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  limpiarTodas: () => void;
  solicitarPermiso: () => Promise<void>;
}

const NotifContext = createContext<NotifContextValue | null>(null);

const PREFS_KEY = 'lavaya_notif_v2';
const NOTIF_KEY = 'lavaya_notif_items';
const MAX_ITEMS = 30;

const DEFAULT_PREFS: NotifPrefs = {
  nuevoPedido: true,
  pedidoEntregado: true,
  reporteDiario: false,
  sonido: true,
};

// ─── Sonido sintético con Web Audio API ──────────────────────
function playBeep(type: 'nuevo' | 'entregado' = 'nuevo') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'nuevo') {
      // Dos tonos ascendentes (notificación nueva)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    } else {
      // Tres tonos suaves (entregado)
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.16);
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close(), 500);
  } catch { /* AudioContext bloqueado hasta interacción del usuario */ }
}

// ─── Provider ────────────────────────────────────────────────
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<NotifItem[]>([]);
  const [prefs, setPrefsState] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [permiso, setPermiso] = useState<NotificationPermission | 'unsupported'>('default');

  // Ref para comparar conteo anterior de pedidos pendientes
  const prevPendientes = useRef<number | null>(null);
  const prevEntregadosHoy = useRef<number | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Cargar prefs y notifs guardadas ─────────────────────
  useEffect(() => {
    try {
      const p = localStorage.getItem(PREFS_KEY);
      if (p) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(p) });

      const n = localStorage.getItem(NOTIF_KEY);
      if (n) {
        const parsed: NotifItem[] = JSON.parse(n);
        // Rehidratar fechas
        setNotificaciones(parsed.map(item => ({ ...item, timestamp: new Date(item.timestamp) })));
      }
    } catch { /* ignorar */ }

    // Permiso actual
    if ('Notification' in window) {
      setPermiso(Notification.permission);
    } else {
      setPermiso('unsupported');
    }
  }, []);

  // ─── Persistir notificaciones en localStorage ─────────────
  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notificaciones.slice(0, MAX_ITEMS)));
    } catch { /* ignorar */ }
  }, [notificaciones]);

  // ─── Agregar notificación ─────────────────────────────────
  const push = useCallback((item: Omit<NotifItem, 'id' | 'timestamp' | 'leida'>) => {
    const nueva: NotifItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      leida: false,
    };
    setNotificaciones(prev => [nueva, ...prev].slice(0, MAX_ITEMS));
    return nueva;
  }, []);

  // ─── Disparar notificación nativa del navegador ───────────
  const notify = useCallback((titulo: string, mensaje: string, href?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(titulo, {
        body: mensaje,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'lavaya-admin',
      });
      if (href) n.onclick = () => { window.focus(); window.location.href = href; };
    }
  }, []);

  // ─── Polling de pedidos ─────────────────────────────────────
  // Detecta el rol del usuario y llama al endpoint correcto.
  // ADMIN → /admin/reportes/stats
  // EMPLEADO → /empleados/resumen
  // CLIENTE → /clientes/pedidos (busca pedidos activos del cliente)
  const poll = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) return;

    try {
      // Detectar rol del usuario desde el token decodificado (sin librerías)
      let rol = 'CLIENTE';
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        rol = payload.rol ?? 'CLIENTE';
      } catch { /* ignorar error de decode */ }

      const BASE = process.env.NEXT_PUBLIC_API_URL;
      const hdrs = { Authorization: `Bearer ${token}` };

      if (rol === 'ADMIN') {
        // ── Admin: stats globales ──────────────────
        const res = await fetch(`${BASE}/admin/reportes/stats`, { headers: hdrs });
        if (!res.ok) return;
        const data = await res.json();

        const pendientes: number = data.pedidos?.pendientes ?? 0;
        const entregadosHoy: number = data.pedidos?.hoy ?? 0;

        if (prevPendientes.current !== null && pendientes > prevPendientes.current && prefs.nuevoPedido) {
          const diff = pendientes - prevPendientes.current;
          const titulo = diff === 1 ? 'Nuevo pedido' : `${diff} pedidos nuevos`;
          const mensaje = diff === 1 ? 'Hay un pedido pendiente de asignación' : `Hay ${diff} pedidos nuevos esperando asignación`;
          push({ tipo: 'pedido_nuevo', titulo, mensaje, href: '/admin/pedidos' });
          notify(titulo, mensaje, '/admin/pedidos');
          if (prefs.sonido) playBeep('nuevo');
        }
        prevPendientes.current = pendientes;

        if (prevEntregadosHoy.current !== null && entregadosHoy > prevEntregadosHoy.current && prefs.pedidoEntregado) {
          const diff = entregadosHoy - prevEntregadosHoy.current;
          const titulo = diff === 1 ? 'Pedido entregado' : `${diff} pedidos entregados`;
          const mensaje = diff === 1 ? 'Un pedido fue entregado exitosamente' : `${diff} pedidos fueron entregados hoy`;
          push({ tipo: 'pedido_entregado', titulo, mensaje, href: '/admin/pedidos?estado=ENTREGADO' });
          notify(titulo, mensaje);
          if (prefs.sonido) playBeep('entregado');
        }
        prevEntregadosHoy.current = entregadosHoy;

      } else if (rol === 'EMPLEADO') {
        // ── Empleado: stats del local ──────────────────
        const res = await fetch(`${BASE}/empleados/resumen`, { headers: hdrs });
        if (!res.ok) return;
        const data = await res.json();

        const pendientes: number = data.recolectados ?? 0; // RECOLECTADO is waiting for washing
        const entregadosHoy: number = data.entregadosHoy ?? 0;

        if (prevPendientes.current !== null && pendientes > prevPendientes.current && prefs.nuevoPedido) {
          const diff = pendientes - prevPendientes.current;
          const titulo = diff === 1 ? 'Nuevo pedido en local' : `${diff} pedidos nuevos en local`;
          const mensaje = diff === 1 ? 'Hay un nuevo pedido listo para lavar' : `Hay ${diff} pedidos nuevos listos para lavar`;
          push({ tipo: 'pedido_nuevo', titulo, mensaje, href: '/empleado/pedidos' });
          notify(titulo, mensaje, '/empleado/pedidos');
          if (prefs.sonido) playBeep('nuevo');
        }
        prevPendientes.current = pendientes;

        if (prevEntregadosHoy.current !== null && entregadosHoy > prevEntregadosHoy.current && prefs.pedidoEntregado) {
          const diff = entregadosHoy - prevEntregadosHoy.current;
          const titulo = diff === 1 ? 'Pedido entregado' : `${diff} pedidos entregados`;
          const mensaje = diff === 1 ? 'Un pedido fue entregado exitosamente' : `${diff} pedidos fueron entregados hoy`;
          push({ tipo: 'pedido_entregado', titulo, mensaje, href: '/empleado/pedidos' });
          notify(titulo, mensaje);
          if (prefs.sonido) playBeep('entregado');
        }
        prevEntregadosHoy.current = entregadosHoy;

      } else {
        // ── Cliente: solo sus propios pedidos activos ───────
        const res = await fetch(`${BASE}/clientes/pedidos?limit=5`, { headers: hdrs });
        if (!res.ok) return;
        const data = await res.json();
        const pedidos: { estado: string }[] = data.pedidos ?? [];

        // Contar pedidos activos del cliente
        const activos = pedidos.filter(p => !['ENTREGADO', 'CANCELADO'].includes(p.estado)).length;
        const entregados = pedidos.filter(p => p.estado === 'ENTREGADO').length;

        // Notificar si un pedido fue entregado
        if (prevEntregadosHoy.current !== null && entregados > prevEntregadosHoy.current && prefs.pedidoEntregado) {
          push({ tipo: 'pedido_entregado', titulo: '¡Tu pedido llegó!', mensaje: 'Tu ropa limpia fue entregada.', href: '/cliente/historial' });
          notify('¡Tu pedido llegó!', 'Tu ropa limpia fue entregada.');
          if (prefs.sonido) playBeep('entregado');
        }
        prevEntregadosHoy.current = entregados;

        // Notificar cambio de estado (pedido confirmado por repartidor)
        if (prevPendientes.current !== null && activos !== prevPendientes.current && prefs.nuevoPedido) {
          // Solo notificar si hay pedidos activos y el conteo cambió
          if (activos > 0) {
            push({ tipo: 'info', titulo: 'Estado actualizado', mensaje: 'El estado de tu pedido ha cambiado.', href: '/cliente/historial' });
          }
        }
        prevPendientes.current = activos;
      }

    } catch { /* red/auth — ignorar silenciosamente */ }
  }, [prefs, push, notify]);

  // ─── Iniciar / detener polling ────────────────────────────
  useEffect(() => {
    // Primera carga: guardar baseline sin notificar
    const baseline = async () => {
      const token = tokenStorage.getAccess();
      if (!token) return;
      try {
        let rol = 'CLIENTE';
        try { rol = JSON.parse(atob(token.split('.')[1])).rol ?? 'CLIENTE'; } catch { /* ignorar */ }

        const BASE = process.env.NEXT_PUBLIC_API_URL;
        const hdrs = { Authorization: `Bearer ${token}` };

        if (rol === 'ADMIN') {
          const res = await fetch(`${BASE}/admin/reportes/stats`, { headers: hdrs });
          if (!res.ok) return;
          const data = await res.json();
          prevPendientes.current    = data.pedidos?.pendientes ?? 0;
          prevEntregadosHoy.current = data.pedidos?.hoy ?? 0;
        } else if (rol === 'EMPLEADO') {
          const res = await fetch(`${BASE}/empleados/resumen`, { headers: hdrs });
          if (!res.ok) return;
          const data = await res.json();
          prevPendientes.current    = data.recolectados ?? 0;
          prevEntregadosHoy.current = data.entregadosHoy ?? 0;
        } else {
          const res = await fetch(`${BASE}/clientes/pedidos?limit=5`, { headers: hdrs });
          if (!res.ok) return;
          const data = await res.json();
          const pedidos: { estado: string }[] = data.pedidos ?? [];
          prevPendientes.current    = pedidos.filter(p => !['ENTREGADO','CANCELADO'].includes(p.estado)).length;
          prevEntregadosHoy.current = pedidos.filter(p => p.estado === 'ENTREGADO').length;
        }
      } catch { /* ignorar */ }
    };
    baseline();

    pollingRef.current = setInterval(poll, 30_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [poll]);

  // ─── Reporte diario (una vez al día a las 20:00) ──────────
  useEffect(() => {
    if (!prefs.reporteDiario) return;
    const now = new Date();
    const target = new Date();
    target.setHours(20, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();

    const t = setTimeout(() => {
      push({
        tipo: 'info',
        titulo: 'Reporte del día',
        mensaje: 'Revisa el dashboard para ver el resumen de pedidos e ingresos de hoy.',
        href: '/admin/dashboard',
      });
      notify('Reporte diario LavaYa', 'Resumen de pedidos e ingresos disponible.');
    }, ms);

    return () => clearTimeout(t);
  }, [prefs.reporteDiario, push, notify]);

  // ─── API pública ──────────────────────────────────────────
  const setPrefs = useCallback((partial: Partial<NotifPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const solicitarPermiso = useCallback(async () => {
    if (!('Notification' in window)) { setPermiso('unsupported'); return; }
    const result = await Notification.requestPermission();
    setPermiso(result);
  }, []);

  const marcarLeida        = useCallback((id: string) => setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n)), []);
  const marcarTodasLeidas  = useCallback(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true }))), []);
  const limpiarTodas       = useCallback(() => setNotificaciones([]), []);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <NotifContext.Provider value={{ notificaciones, noLeidas, prefs, permiso, setPrefs, marcarLeida, marcarTodasLeidas, limpiarTodas, solicitarPermiso }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications(): NotifContextValue {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
  return ctx;
}
