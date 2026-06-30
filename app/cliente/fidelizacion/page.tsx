'use client';
// app/cliente/fidelizacion/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { Star, TrendingUp, Gift, RefreshCw, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import PayPalButton from '@/components/ui/PayPalButton';
import { clienteApi } from '@/lib/api';
import { convertirPenAUsd } from '@/lib/currency';
import toast from 'react-hot-toast';

export default function ClienteFidelizacion() {
  const [puntos, setPuntos] = useState<any>(null);
  const [membresias, setMembresias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [puntosData, membresiasData] = await Promise.all([
        clienteApi.getPuntos(),
        clienteApi.getMembresias(),
      ]);
      setPuntos(puntosData);
      setMembresias(membresiasData);
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recargar cuando el usuario vuelve a esta pestaña/ventana
  // (ej: completó un pedido en otra pestaña o vuelve de la app móvil)
  useEffect(() => {
    const handleFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const activeMembership = membresias.find(m => m.estado === 'ACTIVA');
  const tieneMultiplicador = activeMembership?.tipo === 'PREMIUM' || activeMembership?.tipo === 'EMPRESARIAL';

  const handleActivatePlan = async (tipo: string) => {
    try {
      if (tipo === 'BASICO') {
        await clienteApi.crearOrdenPaypalMembresia(tipo);
        await loadData();
        toast.success('Membresía básica activada');
        return;
      }

      const config = await clienteApi.crearOrdenPaypalMembresia(tipo);
      setPaypalConfig(config);
      setSelectedPlan(tipo);
    } catch {
      toast.error('Error al crear la orden de pago');
    }
  };

  const handleApprove = async (paypalData: any) => {
    try {
      await clienteApi.capturarPagoPaypalMembresia({
        pagoMembresiaId: paypalConfig.pagoMembresiaId,
        paypalOrderId: paypalData.orderID,
        paypalCaptureId: paypalData.orderID,
      });
      setPaypalConfig(null);
      setSelectedPlan(null);
      await loadData();
    } catch {
      toast.error('Error al confirmar el pago');
    }
  };

  const PLANES = [
    {
      nombre: 'Básico',
      tipo: 'BASICO',
      precio: 'Gratis',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.1)',
      beneficios: ['1 punto por prenda', 'Historial de pedidos'],
      activo: !activeMembership || activeMembership.tipo === 'BASICO'
    },
    {
      nombre: 'Premium',
      tipo: 'PREMIUM',
      precio: 'S/149/mes',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
      beneficios: ['x2 puntos por prenda', '10% descuento', '3 pedidos gratis/mes'],
      activo: activeMembership?.tipo === 'PREMIUM'
    },
    {
      nombre: 'Empresarial',
      tipo: 'EMPRESARIAL',
      precio: 'S/499/mes',
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
      beneficios: ['x2 puntos', '20% descuento', 'Pedidos ilimitados', 'Contrato B2B'],
      activo: activeMembership?.tipo === 'EMPRESARIAL'
    },
  ];

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Puntos y membresías" subtitle="Gana puntos en cada pedido" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Tarjeta de puntos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 18, padding: 24, boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Star style={{ width: 18, height: 18, color: '#fff' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, flex: 1 }}>MIS PUNTOS</p>
              {/* Botón de actualizar */}
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Actualizar puntos"
                style={{ background: 'none', border: 'none', cursor: refreshing ? 'default' : 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw
                  style={{
                    width: 16, height: 16, color: 'rgba(255,255,255,0.8)',
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>
              {/* Badge x2 activo */}
              {tieneMultiplicador && (
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', padding: '3px 10px', borderRadius: 999 }}>
                  ⚡ x2 activo
                </span>
              )}
            </div>
            <p style={{ fontSize: 52, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{puntos?.saldo ?? 0}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>puntos disponibles</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {[{ l: `${puntos?.totalGanados ?? 0} ganados` }, { l: `${puntos?.totalCanjeados ?? 0} canjeados` }].map(s => (
                <span key={s.l} style={{ fontSize: 12, fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: 999 }}>{s.l}</span>
              ))}
            </div>
          </div>

          {activeMembership && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CheckCircle style={{ width: 20, height: 20, color: '#22c55e' }} />
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Membresía {activeMembership.tipo.charAt(0) + activeMembership.tipo.slice(1).toLowerCase()} activa
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Descuento</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{activeMembership.descuento}%</p>
                </div>
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Válida hasta</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(activeMembership.fechaFin).toLocaleDateString('es-PE')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cómo ganar puntos */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>¿Cómo gano puntos?</p>
          {[
            { icon: TrendingUp, text: '1 punto por cada prenda lavada', color: '#22c55e' },
            { icon: Star, text: 'x2 puntos con membresía Premium o Empresarial', color: '#f59e0b' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <item.icon style={{ width: 16, height: 16, color: item.color, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Membresías disponibles */}
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Membresías disponibles</p>
        {PLANES.map(plan => (
          <div key={plan.nombre} style={{ backgroundColor: 'var(--bg-card)', border: `1.5px solid ${plan.activo ? plan.color : 'var(--border)'}`, borderRadius: 14, padding: 18, opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: plan.color, margin: 0 }}>{plan.nombre}</p>
                {plan.activo && <span style={{ fontSize: 11, backgroundColor: plan.bg, color: plan.color, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>ACTUAL</span>}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: plan.color, margin: 0 }}>{plan.precio}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: (plan.precio !== 'Gratis' && !(selectedPlan === plan.tipo)) ? 14 : 0 }}>
              {plan.beneficios.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{b}</p>
                </div>
              ))}
            </div>
            {!plan.activo && selectedPlan === plan.tipo && paypalConfig ? (
              <div style={{ marginTop: 12 }}>
                <PayPalButton
                  clientId={paypalConfig.paypalClientId}
                  currency="USD"
                  amount={convertirPenAUsd(paypalConfig.monto)}
                  description={paypalConfig.descripcion}
                  onApprove={handleApprove}
                />
                <button
                  onClick={() => {
                    setPaypalConfig(null);
                    setSelectedPlan(null);
                  }}
                  style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancelar
                </button>
              </div>
            ) : plan.precio !== 'Gratis' && !plan.activo ? (
              <button
                onClick={() => handleActivatePlan(plan.tipo)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${plan.color}`, backgroundColor: 'transparent', color: plan.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Gift style={{ width: 14, height: 14 }} /> Suscribirse
              </button>
            ) : plan.precio === 'Gratis' && !plan.activo ? (
              <button
                onClick={() => handleActivatePlan('BASICO')}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${plan.color}`, backgroundColor: 'transparent', color: plan.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Activar
              </button>
            ) : null}
          </div>
        ))}

        {/* Movimientos recientes */}
        {puntos?.movimientos?.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Movimientos recientes</p>
            </div>
            {puntos.movimientos.slice(0, 10).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: m.cantidad > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, color: m.cantidad > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{m.cantidad > 0 ? '+' : ''}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.concepto}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{new Date(m.createdAt).toLocaleDateString('es-PE')}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: m.cantidad > 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sin movimientos aún */}
        {(!puntos?.movimientos || puntos.movimientos.length === 0) && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <Star style={{ width: 36, height: 36, color: 'var(--text-hint)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Aún no tienes movimientos de puntos.</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Completa un pedido para comenzar a ganar.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const activeMembership = membresias.find(m => m.estado === 'ACTIVA');

  const handleActivatePlan = async (tipo: string) => {
    try {
      if (tipo === 'BASICO') {
        await clienteApi.crearOrdenPaypalMembresia(tipo);
        await loadData();
        toast.success('Membresía básica activada');
        return;
      }

      const config = await clienteApi.crearOrdenPaypalMembresia(tipo);
      setPaypalConfig(config);
      setSelectedPlan(tipo);
    } catch {
      toast.error('Error al crear la orden de pago');
    }
  };

  const handleApprove = async (paypalData: any) => {
    try {
      await clienteApi.capturarPagoPaypalMembresia({
        pagoMembresiaId: paypalConfig.pagoMembresiaId,
        paypalOrderId: paypalData.orderID,
        paypalCaptureId: paypalData.orderID,
      });
      setPaypalConfig(null);
      setSelectedPlan(null);
      await loadData();
    } catch {
      toast.error('Error al confirmar el pago');
    }
  };

  const PLANES = [
    {
      nombre: 'Básico',
      tipo: 'BASICO',
      precio: 'Gratis',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.1)',
      beneficios: ['1 punto por prenda', 'Historial de pedidos'],
      activo: !activeMembership || activeMembership.tipo === 'BASICO'
    },
    {
      nombre: 'Premium',
      tipo: 'PREMIUM',
      precio: 'S/149/mes',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
      beneficios: ['x2 puntos por prenda', '10% descuento', '3 pedidos gratis/mes'],
      activo: activeMembership?.tipo === 'PREMIUM'
    },
    {
      nombre: 'Empresarial',
      tipo: 'EMPRESARIAL',
      precio: 'S/499/mes',
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
      beneficios: ['x2 puntos', '20% descuento', 'Pedidos ilimitados', 'Contrato B2B'],
      activo: activeMembership?.tipo === 'EMPRESARIAL'
    },
  ];

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Puntos y membresías" subtitle="Gana puntos en cada pedido" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Tarjeta de puntos y membresía */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 18, padding: 24, boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Star style={{ width: 18, height: 18, color: '#fff' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600 }}>MIS PUNTOS</p>
            </div>
            <p style={{ fontSize: 52, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{puntos?.saldo ?? 0}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>puntos disponibles</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {[{ l: `${puntos?.totalGanados ?? 0} ganados`, }, { l: `${puntos?.totalCanjeados ?? 0} canjeados` }].map(s => (
                <span key={s.l} style={{ fontSize: 12, fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: 999 }}>{s.l}</span>
              ))}
            </div>
          </div>

          {activeMembership && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CheckCircle style={{ width: 20, height: 20, color: '#22c55e' }} />
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Membresía {activeMembership.tipo.charAt(0) + activeMembership.tipo.slice(1).toLowerCase()} activa
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Descuento</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{activeMembership.descuento}%</p>
                </div>
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Válida hasta</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(activeMembership.fechaFin).toLocaleDateString('es-PE')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cómo ganar */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>¿Cómo gano puntos?</p>
          {[
            { icon: TrendingUp, text: '1 punto por cada prenda lavada', color: '#22c55e' },
            { icon: Star, text: 'x2 puntos con membresía Premium o Empresarial', color: '#f59e0b' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <item.icon style={{ width: 16, height: 16, color: item.color, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Membresías disponibles */}
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Membresías disponibles</p>
        {PLANES.map(plan => (
          <div key={plan.nombre} style={{ backgroundColor: 'var(--bg-card)', border: `1.5px solid ${plan.activo ? plan.color : 'var(--border)'}`, borderRadius: 14, padding: 18, opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: plan.color, margin: 0 }}>{plan.nombre}</p>
                {plan.activo && <span style={{ fontSize: 11, backgroundColor: plan.bg, color: plan.color, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>ACTUAL</span>}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: plan.color, margin: 0 }}>{plan.precio}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: (plan.precio !== 'Gratis' && !(selectedPlan === plan.tipo)) ? 14 : 0 }}>
              {plan.beneficios.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{b}</p>
                </div>
              ))}
            </div>
            {!plan.activo && selectedPlan === plan.tipo && paypalConfig ? (
              <div style={{ marginTop: 12 }}>
                <PayPalButton
                  clientId={paypalConfig.paypalClientId}
                  currency="USD"
                  amount={convertirPenAUsd(paypalConfig.monto)}
                  description={paypalConfig.descripcion}
                  onApprove={handleApprove}
                />
                <button
                  onClick={() => {
                    setPaypalConfig(null);
                    setSelectedPlan(null);
                  }}
                  style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancelar
                </button>
              </div>
            ) : plan.precio !== 'Gratis' && !plan.activo ? (
              <button
                onClick={() => handleActivatePlan(plan.tipo)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${plan.color}`, backgroundColor: 'transparent', color: plan.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Gift style={{ width: 14, height: 14 }} /> Suscribirse
              </button>
            ) : plan.precio === 'Gratis' && !plan.activo ? (
              <button
                onClick={() => handleActivatePlan('BASICO')}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${plan.color}`, backgroundColor: 'transparent', color: plan.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Activar
              </button>
            ) : null}
          </div>
        ))}

        {/* Movimientos recientes */}
        {puntos?.movimientos?.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Movimientos recientes</p>
            </div>
            {puntos.movimientos.slice(0, 10).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: m.cantidad > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, color: m.cantidad > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{m.cantidad > 0 ? '+' : ''}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.concepto}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{new Date(m.createdAt).toLocaleDateString('es-PE')}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: m.cantidad > 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
