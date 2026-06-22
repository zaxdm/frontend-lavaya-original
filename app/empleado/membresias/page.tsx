'use client';
// app/empleado/membresias/page.tsx — Gestionar membresías de clientes

import { useCallback, useEffect, useState } from 'react';
import { Search, Crown, CheckCircle, X, Star, Gift } from 'lucide-react';
import { empleadoApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type ClienteSugerido = { id: string; nombre: string; apellido: string; email: string; telefono?: string };
type Membresia = {
  id: string;
  tipo: 'BASICO' | 'PREMIUM' | 'EMPRESARIAL';
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  descuento: number;
  pedidosGratis: number;
};

const S = {
  card:   { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  label:  { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input:  { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  section:{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 14 },
};

const PLANES = [
  { tipo: 'BASICO', nombre: 'Básico', precio: 'Gratis', color: '#64748b', bg: 'rgba(100,116,139,0.1)', beneficios: ['1 punto por prenda'], descuento: 0, pedidosGratis: 0 },
  { tipo: 'PREMIUM', nombre: 'Premium', precio: 'S/149/mes', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', beneficios: ['x2 puntos por prenda', '10% descuento', '3 pedidos gratis/mes'], descuento: 10, pedidosGratis: 3 },
  { tipo: 'EMPRESARIAL', nombre: 'Empresarial', precio: 'S/499/mes', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', beneficios: ['x2 puntos', '20% descuento', 'Pedidos ilimitados', 'Contrato B2B'], descuento: 20, pedidosGratis: 9999 },
];

export default function EmpleadoMembresiasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [sugeridos, setSugeridos] = useState<ClienteSugerido[]>([]);
  const [clienteSel, setClienteSel] = useState<ClienteSugerido | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [loadingMembresias, setLoadingMembresias] = useState(false);
  const [activando, setActivando] = useState(false);

  const buscarClientes = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSugeridos([]); return; }
    setBuscando(true);
    try {
      const res = await empleadoApi.buscarClientes(q);
      setSugeridos(res);
    } catch {
      toast.error('Error buscando clientes');
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => buscarClientes(busqueda), 400);
    return () => clearTimeout(timeout);
  }, [busqueda, buscarClientes]);

  const cargarCliente = async (cliente: ClienteSugerido) => {
    setClienteSel(cliente);
    setBusqueda('');
    setSugeridos([]);
    setLoadingMembresias(true);
    try {
      const res = await empleadoApi.getMembresiasCliente(cliente.id);
      setMembresias(res);
    } catch {
      toast.error('Error cargando membresías');
      setMembresias([]);
    } finally {
      setLoadingMembresias(false);
    }
  };

  const limpiarSeleccion = () => {
    setClienteSel(null);
    setMembresias([]);
    setBusqueda('');
    setSugeridos([]);
  };

  const activarMembresia = async (tipo: string) => {
    if (!clienteSel) return;
    setActivando(true);
    try {
      await empleadoApi.activarMembresia(clienteSel.id, tipo);
      toast.success('Membresía activada correctamente');
      await cargarCliente(clienteSel);
    } catch {
      toast.error('Error activando membresía');
    } finally {
      setActivando(false);
    }
  };

  const membresiaActiva = membresias.find(m => m.estado === 'ACTIVA');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Membresías"
        subtitle="Gestionar membresías de clientes (activar, ver estado y beneficios)"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 1040, margin: '0 auto' }}>
        {/* Search card */}
        <div style={S.card}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Buscar cliente por nombre, email o teléfono
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                value={clienteSel ? `${clienteSel.nombre} ${clienteSel.apellido}` : busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  if (clienteSel) limpiarSeleccion();
                }}
                placeholder="Escribe al menos 2 caracteres..."
                style={{ ...S.input, paddingLeft: 38 }}
              />
              {buscando && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <Spinner className="w-4 h-4" />
                </div>
              )}
            </div>

            {!clienteSel && sugeridos.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                {sugeridos.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => cargarCliente(cliente)}
                    style={{
                      width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cliente.nombre} {cliente.apellido}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {cliente.email}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {clienteSel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, backgroundColor: 'var(--bg-muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {clienteSel.nombre} {clienteSel.apellido}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSel.email}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSel.telefono || 'Teléfono no registrado'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarSeleccion}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, border: 'none', backgroundColor: 'rgba(124,58,237,0.08)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {loadingMembresias ? (
                  <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                ) : membresiaActiva ? (
                  <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <CheckCircle style={{ width: 18, height: 18, color: '#22c55e' }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                        Membresía {membresiaActiva.tipo.charAt(0) + membresiaActiva.tipo.slice(1).toLowerCase()} activa
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-card)' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Descuento</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{membresiaActiva.descuento}%</p>
                      </div>
                      <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-card)' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Pedidos gratis</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{membresiaActiva.pedidosGratis}</p>
                      </div>
                      <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-card)' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Válido hasta</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(membresiaActiva.fechaFin).toLocaleDateString('es-PE')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Este cliente no tiene una membresía activa. Activa una desde los planes a continuación.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {clienteSel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Planes */}
            <div style={S.card}>
              <div style={{ padding: 20 }}>
                <p style={S.section}>Planes disponibles</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {PLANES.map((plan) => (
                    <div key={plan.tipo} style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: `2px solid ${membresiaActiva?.tipo === plan.tipo ? plan.color : 'var(--border)'}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: plan.color }}>{plan.nombre}</p>
                        {membresiaActiva?.tipo === plan.tipo && (
                          <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: plan.bg, color: plan.color, padding: '3px 8px', borderRadius: 999 }}>ACTIVA</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.precio}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        {plan.beneficios.map((b, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{b}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        disabled={activando || membresiaActiva?.tipo === plan.tipo}
                        onClick={() => activarMembresia(plan.tipo)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          borderRadius: 10,
                          border: `1.5px solid ${plan.color}`,
                          backgroundColor: membresiaActiva?.tipo === plan.tipo ? plan.bg : 'transparent',
                          color: plan.color,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: activando || membresiaActiva?.tipo === plan.tipo ? 'not-allowed' : 'pointer',
                          opacity: activando || membresiaActiva?.tipo === plan.tipo ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {activando ? <Spinner className="w-4 h-4" /> : <Gift style={{ width: 14, height: 14 }} />}
                        {membresiaActiva?.tipo === plan.tipo ? 'Activa' : 'Activar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Historial de membresías */}
            {membresias.length > 0 && (
              <div style={S.card}>
                <div style={{ padding: 20 }}>
                  <p style={S.section}>Historial de membresías</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {membresias.map((m) => (
                      <div key={m.id} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase()}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {new Date(m.fechaInicio).toLocaleDateString('es-PE')} - {new Date(m.fechaFin).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: m.estado === 'ACTIVA' ? '#22c55e' : '#64748b', backgroundColor: m.estado === 'ACTIVA' ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', padding: '3px 8px', borderRadius: 999 }}>
                            {m.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
