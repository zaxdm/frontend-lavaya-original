'use client';
// app/cliente/pedidos/page.tsx — Crear nuevo pedido
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, MapPin, Calendar, CreditCard, Plus, Minus, CheckCircle2, Star } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import PayPalButton from '@/components/ui/PayPalButton';
import { clienteApi } from '@/lib/api';
import { convertirPenAUsd } from '@/lib/currency';
import toast from 'react-hot-toast';

const S = {
  card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  section: { padding: '14px 18px', borderBottom: '1px solid var(--border)' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
};

export default function ClientePedidos() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [direcciones, setDirecciones] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [membresias, setMembresias] = useState<any[]>([]);
  const [puntos, setPuntos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  const [direccionId, setDireccionId] = useState('');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'PAYPAL' | 'EFECTIVO'>('EFECTIVO');
  const [fechaRecoleccion, setFechaRecoleccion] = useState('');
  const [franjaRecoleccion, setFranjaRecoleccion] = useState('');
  const [notas, setNotas] = useState('');
  const [puntosACanjear, setPuntosACanjear] = useState(0);

  const loadData = async () => {
    try {
      const [dRes, cRes, mRes, pRes] = await Promise.all([
        clienteApi.getDirecciones(),
        clienteApi.getCatalogo(),
        clienteApi.getMembresias(),
        clienteApi.getPuntos(),
      ]);
      setDirecciones(dRes);
      setCatalogo(cRes.filter((c: any) => c.activo));
      setMembresias(mRes);
      setPuntos(pRes);
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeMembership = membresias.find(m => m.estado === 'ACTIVA');
  const descuento = activeMembership ? activeMembership.descuento : 0;

  const totalPrendas = Object.values(cantidades).reduce((a, b) => a + b, 0);
  const hayExtra = totalPrendas > 10;
  const montoBruto = catalogo.reduce((acc, c) => {
    const cant = cantidades[c.nombre] ?? 0;
    if (!cant) return acc;
    const precio = hayExtra ? c.precioUnitario + c.precioExtra : c.precioUnitario;
    return acc + precio * cant;
  }, 0);
  const montoConMembresia = montoBruto * (1 - descuento / 100);

  // Puntos: 50 pts = S/5 de descuento
  const saldoPuntos = puntos?.saldo ?? 0;
  const maxPuntosAplicables = Math.floor(saldoPuntos / 50) * 50; // múltiplos de 50
  const descuentoPuntos = puntosACanjear / 10; // 50 pts = S/5 → 10 pts = S/1
  const montoFinal = Math.max(0.5, montoConMembresia - descuentoPuntos);

  const confirmar = async () => {
    if (!direccionId) { toast.error('Selecciona una dirección'); return; }
    if (totalPrendas === 0) { toast.error('Agrega al menos una prenda'); return; }

    if (fechaRecoleccion) {
      if (!franjaRecoleccion) { toast.error('Selecciona una franja horaria'); return; }
      // Verificar que la franja no haya terminado ya
      const horaFin = SLOTS.find(s => s.api === franjaRecoleccion)?.horaFin ?? 0;
      const finSlot = new Date(fechaRecoleccion + 'T00:00:00');
      finSlot.setHours(horaFin, 0, 0, 0);
      if (finSlot.getTime() <= Date.now()) { toast.error('Esta franja ya terminó, elige otra'); return; }
      const maxFutura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (finSlot > maxFutura) { toast.error('La fecha no puede ser más de 30 días en el futuro'); return; }
    }

    const prendas = Object.entries(cantidades).filter(([, v]) => v > 0).map(([tipo, cantidad]) => ({ tipo, cantidad }));
    // Construir la fecha en hora local (NO usar toISOString que convierte a UTC)
    // Formato: "2026-06-30T08:00:00" — el backend lo parsea como hora local del servidor
    const fechaISO = fechaRecoleccion && franjaRecoleccion
      ? `${fechaRecoleccion}T${franjaRecoleccion.split('-')[0]}:00`
      : null;
    const payload = {
      direccionId, prendas, metodoPago,
      fechaRecoleccion: fechaISO,
      franjaRecoleccion: franjaRecoleccion || undefined,
      notasCliente: notas || null,
      puntosACanjear: puntosACanjear > 0 ? puntosACanjear : undefined,
    };

    if (metodoPago === 'PAYPAL') {
      setPaso(4);
      setEnviando(true);
      try {
        const orderData = await clienteApi.createOrder(payload);
        const config = await clienteApi.crearOrdenPaypalPedido(orderData.pedido.id);
        setPedidoId(orderData.pedido.id);
        setPaypalConfig(config);
      } catch (err: any) {
        toast.error(err.message || 'Error al crear pedido');
        setPaso(3);
      } finally {
        setEnviando(false);
      }
    } else {
      setEnviando(true);
      try {
        await clienteApi.createOrder(payload);
        const msg = puntosACanjear > 0
          ? `¡Pedido creado! Canjeaste ${puntosACanjear} pts (−S/${descuentoPuntos.toFixed(2)}).`
          : '¡Pedido creado! Te notificaremos cuando un repartidor lo acepte.';
        toast.success(msg);
        router.push('/cliente/dashboard');
      } catch (err: any) {
        toast.error(err.message || 'Error al crear pedido');
      } finally {
        setEnviando(false);
      }
    }
  };

  const handleApprove = async (paypalData: any) => {
    try {
      await clienteApi.capturarPagoPaypalPedido({
        pedidoId, paypalOrderId: paypalData.orderID, paypalCaptureId: paypalData.orderID,
      });
      toast.success('Pago completado y pedido creado!');
      router.push('/cliente/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Error al confirmar pago');
    }
  };

  // ── Slots de franja horaria (2h cada uno, 08:00 → 20:00) ──────
  const SLOTS = [
    { label: '08:00 – 10:00', api: '08:00-10:00', horaInicio: 8,  horaFin: 10 },
    { label: '10:00 – 12:00', api: '10:00-12:00', horaInicio: 10, horaFin: 12 },
    { label: '12:00 – 14:00', api: '12:00-14:00', horaInicio: 12, horaFin: 14 },
    { label: '14:00 – 16:00', api: '14:00-16:00', horaInicio: 14, horaFin: 16 },
    { label: '16:00 – 18:00', api: '16:00-18:00', horaInicio: 16, horaFin: 18 },
    { label: '18:00 – 20:00', api: '18:00-20:00', horaInicio: 18, horaFin: 20 },
  ];

  // Un slot está deshabilitado solo si su franja YA TERMINÓ completamente.
  // Ej: son las 7:49 → el slot 08:00-10:00 termina a las 10:00, sigue disponible ✓
  //     son las 10:05 → el slot 08:00-10:00 terminó a las 10:00, no disponible ✗
  const slotPasado = (horaFin: number): boolean => {
    if (!fechaRecoleccion) return false;
    const ahora = new Date();
    const finSlot = new Date(fechaRecoleccion + 'T00:00:00');
    finSlot.setHours(horaFin, 0, 0, 0);
    return finSlot.getTime() <= ahora.getTime();
  };

  // La fecha mínima del picker siempre es hoy en hora local.
  const fechaMinPicker = (): string => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm   = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd   = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const slotsFiltrados = SLOTS.filter(s => !slotPasado(s.horaFin));



  const PASOS = ['Dirección', 'Prendas', 'Confirmar', metodoPago === 'PAYPAL' ? 'Pago' : ''];

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Nuevo pedido" subtitle="Selecciona dónde y qué vas a lavar" />

      <div style={{ padding: 24, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {PASOS.slice(0, metodoPago === 'PAYPAL' ? 4 : 3).map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', flex: i < (metodoPago === 'PAYPAL' ? 3 : 2) ? 1 : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => { if (i + 1 < paso) setPaso((i + 1) as any); }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, backgroundColor: paso > i + 1 ? '#22c55e' : paso === i + 1 ? 'var(--accent)' : 'var(--border)', color: paso >= i + 1 ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  {paso > i + 1 ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: paso === i + 1 ? 600 : 400, color: paso === i + 1 ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{p}</span>
              </div>
              {i < (metodoPago === 'PAYPAL' ? 3 : 2) && <div style={{ flex: 1, height: 2, backgroundColor: paso > i + 1 ? '#22c55e' : 'var(--border)', margin: '0 10px', transition: 'background 0.2s' }} />}
            </div>
          ))}
        </div>

        {/* Paso 1: Dirección */}
        {paso === 1 && (
          <div style={S.card}>
            <div style={{ ...S.section, borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin style={{ width: 16, height: 16, color: 'var(--accent)' }} /> Dirección de recolección
              </p>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {direcciones.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No tienes direcciones guardadas. Agrega una desde tu perfil.</p>
              ) : direcciones.map((d: any) => (
                <div key={d.id} onClick={() => setDireccionId(d.id)}
                  style={{ padding: 14, borderRadius: 10, border: `2px solid ${direccionId === d.id ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', backgroundColor: direccionId === d.id ? 'rgba(37,99,235,0.05)' : 'var(--bg-base)', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MapPin style={{ width: 16, height: 16, color: direccionId === d.id ? 'var(--accent)' : 'var(--text-secondary)', marginTop: 1, flexShrink: 0 }} />
                    <div>
                      {d.esPrincipal && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</span>}
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{d.calle} {d.numero}, {d.colonia}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{d.ciudad}, {d.estado} Código postal {d.codigoPostal}</p>
                    </div>
                  </div>
                </div>
              ))}
              <button disabled={!direccionId} onClick={() => setPaso(2)}
                style={{ marginTop: 4, padding: '11px 16px', borderRadius: 10, border: 'none', backgroundColor: direccionId ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: direccionId ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Prendas */}
        {paso === 2 && (
          <div style={S.card}>
            <div style={{ ...S.section }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag style={{ width: 16, height: 16, color: 'var(--accent)' }} /> Selecciona las prendas
              </p>
              {hayExtra && <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>⚠ Más de 10 prendas — se aplica cargo extra</p>}
              {activeMembership && <p style={{ fontSize: 12, color: '#22c55e', margin: '4px 0 0' }}>🎉 {descuento}% de descuento por membresía</p>}
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catalogo.map((c: any) => {
                const cant = cantidades[c.nombre] ?? 0;
                const precio = hayExtra ? c.precioUnitario + c.precioExtra : c.precioUnitario;
                const precioFinal = precio * (1 - descuento / 100);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${cant > 0 ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: cant > 0 ? 'rgba(37,99,235,0.04)' : 'var(--bg-base)', transition: 'all 0.15s' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize' }}>{c.nombre}</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {descuento > 0 && <p style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>S/{precio.toFixed(2)}/prenda</p>}
                        <p style={{ fontSize: 12, color: descuento > 0 ? 'var(--accent)' : 'var(--text-secondary)', margin: '2px 0 0', fontWeight: descuento > 0 ? 600 : 400 }}>S/{precioFinal.toFixed(2)}/prenda</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setCantidades(p => ({ ...p, [c.nombre]: Math.max(0, (p[c.nombre] ?? 0) - 1) }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: cant > 0 ? 'rgba(37,99,235,0.15)' : 'var(--border)', color: cant > 0 ? 'var(--accent)' : 'var(--text-hint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Minus style={{ width: 12, height: 12 }} />
                      </button>
                      <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{cant}</span>
                      <button onClick={() => setCantidades(p => ({ ...p, [c.nombre]: (p[c.nombre] ?? 0) + 1 }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(37,99,235,0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {totalPrendas > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{totalPrendas} prendas</span>
                    {descuento > 0 && <span style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>S/{montoBruto.toFixed(2)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>S/{montoConMembresia.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setPaso(1)} style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>← Atrás</button>
                <button disabled={totalPrendas === 0} onClick={() => setPaso(3)} style={{ flex: 2, padding: '11px 16px', borderRadius: 10, border: 'none', backgroundColor: totalPrendas > 0 ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: totalPrendas > 0 ? 'pointer' : 'not-allowed' }}>
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Confirmar */}
        {paso === 3 && (
          <div style={S.card}>
            <div style={{ ...S.section }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Confirma tu pedido</p>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Resumen de montos */}
              <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{totalPrendas} prendas</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>S/{montoBruto.toFixed(2)}</span>
                </div>
                {hayExtra && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>Cargo por +10 prendas</span>
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>incluido</span>
                  </div>
                )}
                {descuento > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#22c55e' }}>Descuento membresía {descuento}%</span>
                    <span style={{ fontSize: 13, color: '#22c55e' }}>−S/{(montoBruto - montoConMembresia).toFixed(2)}</span>
                  </div>
                )}
                {puntosACanjear > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>⭐ Descuento puntos ({puntosACanjear} pts)</span>
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>−S/{descuentoPuntos.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Total a pagar</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>S/{montoFinal.toFixed(2)}</span>
                </div>
              </div>

              {/* Canje de puntos */}
              {saldoPuntos >= 50 && (
                <div style={{ padding: '14px', borderRadius: 10, border: `1.5px solid ${puntosACanjear > 0 ? '#f59e0b' : 'var(--border)'}`, backgroundColor: puntosACanjear > 0 ? 'rgba(245,158,11,0.06)' : 'var(--bg-base)', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Star style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Usar puntos — tienes <span style={{ color: '#f59e0b' }}>{saldoPuntos} pts</span>
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                    50 puntos = S/5.00 de descuento. Mueve el slider para aplicar.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="range"
                      min={0}
                      max={maxPuntosAplicables}
                      step={50}
                      value={puntosACanjear}
                      onChange={e => setPuntosACanjear(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#f59e0b' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', minWidth: 64, textAlign: 'right' }}>
                      {puntosACanjear > 0 ? `−S/${descuentoPuntos.toFixed(2)}` : '0 pts'}
                    </span>
                  </div>
                  {puntosACanjear > 0 && (
                    <button onClick={() => setPuntosACanjear(0)}
                      style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Quitar descuento de puntos
                    </button>
                  )}
                </div>
              )}
              {saldoPuntos > 0 && saldoPuntos < 50 && (
                <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star style={{ width: 14, height: 14, color: 'var(--text-hint)', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Tienes {saldoPuntos} pts — necesitas al menos 50 para canjear.
                  </p>
                </div>
              )}

              {/* Fecha y franja de recolección */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={S.label}><Calendar style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Fecha de recolección (opcional)</label>

                {/* Selector de día */}
                <input
                  type="date"
                  value={fechaRecoleccion}
                  min={fechaMinPicker()}
                  max={(() => {
                    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  })()}
                  onChange={e => { setFechaRecoleccion(e.target.value); setFranjaRecoleccion(''); }}
                  style={S.input}
                />

                {/* Franjas horarias — solo aparecen al elegir fecha */}
                {fechaRecoleccion && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 600 }}>
                      ¿En qué franja horaria?
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {SLOTS.map(slot => {
                        const pasado  = slotPasado(slot.horaFin);
                        const activo  = franjaRecoleccion === slot.api;
                        return (
                          <button
                            key={slot.api}
                            disabled={pasado}
                            onClick={() => !pasado && setFranjaRecoleccion(activo ? '' : slot.api)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 10,
                              border: `${activo ? 2 : 1}px solid ${pasado ? 'var(--border)' : activo ? 'var(--accent)' : 'var(--border)'}`,
                              backgroundColor: pasado ? 'var(--bg-muted)' : activo ? 'var(--accent)' : 'var(--bg-base)',
                              color: pasado ? 'var(--text-hint)' : activo ? '#fff' : 'var(--text-primary)',
                              fontSize: 13,
                              fontWeight: activo ? 700 : 500,
                              cursor: pasado ? 'not-allowed' : 'pointer',
                              textDecoration: pasado ? 'line-through' : 'none',
                              opacity: pasado ? 0.5 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                    {slotsFiltrados.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>
                        No hay franjas disponibles para hoy. Elige otro día.
                      </p>
                    )}
                  </div>
                )}

                {fechaRecoleccion && (
                  <button
                    onClick={() => { setFechaRecoleccion(''); setFranjaRecoleccion(''); }}
                    style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ✕ Quitar fecha
                  </button>
                )}

                <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0 }}>
                  Opcional · Si no eliges fecha te contactaremos para coordinar
                </p>
              </div>

              {/* Método de pago */}
              <div>
                <label style={S.label}><CreditCard style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Método de pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: 'EFECTIVO', l: 'Efectivo', e: '💵' }, { v: 'PAYPAL', l: 'PayPal', e: '💳' }].map(opt => (
                    <div key={opt.v} onClick={() => setMetodoPago(opt.v as 'PAYPAL' | 'EFECTIVO')}
                      style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${metodoPago === opt.v ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'center', backgroundColor: metodoPago === opt.v ? 'rgba(37,99,235,0.05)' : 'var(--bg-base)', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.e}</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: metodoPago === opt.v ? 'var(--accent)' : 'var(--text-primary)', margin: 0 }}>{opt.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label style={S.label}>Instrucciones (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Ej: Tocar timbre, dejar en recepción..." style={{ ...S.input, resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPaso(2)} style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>← Atrás</button>
                <button disabled={enviando} onClick={confirmar}
                  style={{ flex: 2, padding: '11px 16px', borderRadius: 10, border: 'none', backgroundColor: enviando ? 'var(--border)' : 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {enviando && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
                  {enviando ? 'Preparando...' : `Confirmar — S/${montoFinal.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: PayPal */}
        {paso === 4 && paypalConfig && (
          <div style={S.card}>
            <div style={{ ...S.section }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Completa tu pago</p>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Total a pagar</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>S/{paypalConfig.monto?.toFixed(2) ?? montoFinal.toFixed(2)}</span>
                </div>
                {puntosACanjear > 0 && (
                  <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>
                    ⭐ Incluye descuento de {puntosACanjear} pts (−S/{descuentoPuntos.toFixed(2)})
                  </p>
                )}
              </div>
              <PayPalButton
                clientId={paypalConfig.paypalClientId}
                currency="USD"
                amount={convertirPenAUsd(paypalConfig.monto ?? montoFinal)}
                description={paypalConfig.descripcion}
                onApprove={handleApprove}
              />
              <button onClick={() => setPaso(3)}
                style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                ← Volver a la confirmación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
