'use client';
// app/empleado/clientes/page.tsx

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Home, Archive, X, ChevronRight,
  CheckCircle, Crown,
} from 'lucide-react';
import { empleadoApi } from '@/lib/api';
import { ESTADO_PAGO_LABEL, formatCurrency, formatDate } from '@/lib/utils';
import type { Direccion, Pedido } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type ClienteSugerido = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
};

const PLANES: Record<string, { label: string; color: string; bg: string }> = {
  BASICO:      { label: 'Básico',      color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  PREMIUM:     { label: 'Premium',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)'   },
  EMPRESARIAL: { label: 'Empresarial', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
};

const S = {
  card:    { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  input:   { width: '100%', paddingTop: 9, paddingBottom: 9, paddingLeft: 12, paddingRight: 12, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  section: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 14 },
};

export default function EmpleadoClientesPage() {
  const [busqueda, setBusqueda]       = useState('');
  const [sugeridos, setSugeridos]     = useState<ClienteSugerido[]>([]);
  const [clienteSel, setClienteSel]   = useState<ClienteSugerido | null>(null);
  const [buscando, setBuscando]       = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [historial, setHistorial]     = useState<Pedido[]>([]);
  const [membresias, setMembresias]   = useState<any[]>([]);
  const [loadingDir, setLoadingDir]   = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [loadingMem, setLoadingMem]   = useState(false);

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
    const t = setTimeout(() => buscarClientes(busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda, buscarClientes]);

  const cargarCliente = async (cliente: ClienteSugerido) => {
    setClienteSel(cliente);
    setBusqueda(''); setSugeridos([]);
    setLoadingDir(true); setLoadingHist(true); setLoadingMem(true);
    try {
      const [dirs, pedidos, mems] = await Promise.all([
        empleadoApi.getDireccionesCliente(cliente.id),
        empleadoApi.getHistorialCliente(cliente.id),
        empleadoApi.getMembresiasCliente(cliente.id),
      ]);
      setDirecciones(dirs); setHistorial(pedidos); setMembresias(mems);
    } catch {
      toast.error('Error cargando datos del cliente');
      setDirecciones([]); setHistorial([]); setMembresias([]);
    } finally {
      setLoadingDir(false); setLoadingHist(false); setLoadingMem(false);
    }
  };

  const limpiar = () => {
    setClienteSel(null); setDirecciones([]); setHistorial([]);
    setBusqueda(''); setSugeridos([]);
  };

  const notasRecientes = useMemo(() =>
    historial
      .flatMap(p => [p.notasCliente, p.notasInternas].filter(Boolean) as string[])
      .slice(0, 4),
  [historial]);

  const pedidosRecientes = useMemo(() => historial.slice(0, 8), [historial]);

  const membresiaActiva = useMemo(() => {
    if (!membresias.length) return null;
    const ahora = new Date();
    return (
      membresias.find(m => m.estado === 'ACTIVA' && new Date(m.fechaFin) > ahora) ??
      membresias.find(m => m.estado === 'ACTIVA') ??
      null
    );
  }, [membresias]);

  const planActivo = membresiaActiva ? (PLANES[membresiaActiva.tipo] ?? null) : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Clientes"
        subtitle="Busca un cliente para ver su historial, membresía y direcciones"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 1040, margin: '0 auto' }}>

        {/* ── Buscador ── */}
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
                onChange={e => { setBusqueda(e.target.value); if (clienteSel) limpiar(); }}
                placeholder="Escribe al menos 2 caracteres..."
                style={{ ...S.input, paddingLeft: 38 }}
              />
              {buscando && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <Spinner className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Dropdown sugeridos */}
            {!clienteSel && sugeridos.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                {sugeridos.map(c => (
                  <button key={c.id} type="button" onClick={() => cargarCliente(c)}
                    style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* El endpoint de empleado solo devuelve clientes activos */}
                    <CheckCircle style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.nombre} {c.apellido}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {c.email}{c.telefono ? ` · ${c.telefono}` : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!clienteSel && busqueda.trim().length >= 2 && sugeridos.length === 0 && !buscando && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                No se encontraron clientes con ese criterio.
              </p>
            )}

            {/* Panel cliente seleccionado */}
            {clienteSel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, backgroundColor: 'var(--bg-muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {clienteSel.nombre} {clienteSel.apellido}
                      </p>
                      {/* El endpoint de empleado solo trae activos, siempre mostramos Activo */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a',
                      }}>
                        <CheckCircle style={{ width: 11, height: 11 }} /> Activo
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSel.email}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSel.telefono || 'Sin teléfono registrado'}</p>
                  </div>
                  <button type="button" onClick={limpiar}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, border: 'none', backgroundColor: 'rgba(124,58,237,0.08)', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {/* Stats rápidas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Direcciones',        value: loadingDir  ? '…' : String(direcciones.length) },
                    { label: 'Pedidos registrados', value: loadingHist ? '…' : String(historial.length) },
                    {
                      label: 'Membresía',
                      value: loadingMem ? '…' : planActivo ? planActivo.label : 'Sin plan',
                      color: planActivo?.color,
                    },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-secondary)' }}>{stat.label}</p>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: stat.color ?? 'var(--text-primary)' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Detalle ── */}
        {clienteSel ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

            {/* Columna izquierda */}
            <div style={S.card}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Historial de pedidos */}
                <div>
                  <p style={S.section}>Historial de pedidos</p>
                  {loadingHist ? (
                    <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : historial.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Este cliente aún no tiene pedidos registrados.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {pedidosRecientes.map(pedido => (
                        <div key={pedido.id} style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>#{pedido.id.slice(0, 8)}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                                Recolección: {formatDate(pedido.fechaRecoleccion)}
                              </p>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', backgroundColor: 'rgba(124,58,237,0.1)', padding: '5px 10px', borderRadius: 999 }}>
                              {ESTADO_PAGO_LABEL[pedido.pago?.estado ?? 'PENDIENTE']}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{pedido.totalPrendas}</p>
                              <p style={{ margin: '4px 0 0' }}>Prendas</p>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(pedido.pago?.monto ?? 0)}</p>
                              <p style={{ margin: '4px 0 0' }}>Monto</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pedido.estado ?? 'Desconocido'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                              Ver detalle <ChevronRight style={{ width: 13, height: 13 }} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Membresía */}
                <div>
                  <p style={S.section}>Membresía</p>
                  {loadingMem ? (
                    <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : membresiaActiva ? (
                    <>
                      <div style={{ padding: 14, borderRadius: 12, backgroundColor: planActivo?.bg ?? 'var(--bg-muted)', border: `1px solid ${planActivo?.color ?? 'var(--border)'}30`, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Crown style={{ width: 16, height: 16, color: planActivo?.color ?? 'var(--text-primary)' }} />
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: planActivo?.color ?? 'var(--text-primary)' }}>
                            {planActivo?.label ?? membresiaActiva.tipo}
                          </p>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                            ACTIVA
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {membresiaActiva.descuento > 0 && `${membresiaActiva.descuento}% descuento · `}
                          Válida hasta: {new Date(membresiaActiva.fechaFin).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                      <Link href={`/empleado/membresias?clienteId=${clienteSel.id}&clienteNombre=${encodeURIComponent(`${clienteSel.nombre} ${clienteSel.apellido}`)}`}>
                        <button style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1.5px solid #7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Gestionar membresía →
                        </button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        Sin membresía activa.
                      </p>
                      <Link href={`/empleado/membresias?clienteId=${clienteSel.id}&clienteNombre=${encodeURIComponent(`${clienteSel.nombre} ${clienteSel.apellido}`)}`}>
                        <button style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1.5px solid #7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Asignar membresía →
                        </button>
                      </Link>
                    </>
                  )}
                </div>

                {/* Notas / preferencias */}
                <div>
                  <p style={S.section}>Notas / preferencias</p>
                  {loadingHist ? (
                    <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : notasRecientes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      No hay notas registradas. Aparecen aquí cuando un pedido contiene notas del cliente o internas.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notasRecientes.map((nota, i) => (
                        <div key={i} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{nota}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columna derecha: direcciones */}
            <div style={S.card}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={S.section}>Direcciones del cliente</p>
                {loadingDir ? (
                  <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                ) : direcciones.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    No hay direcciones guardadas para este cliente.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {direcciones.map(d => (
                      <div key={d.id} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Home style={{ width: 16, height: 16, color: '#7c3aed' }} />
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d.calle} {d.numero}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {d.colonia}, {d.ciudad}{d.estado ? `, ${d.estado}` : ''}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {d.codigoPostal || 'Sin código postal'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Estado vacío */
          <div style={S.card}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Archive style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Busca un cliente para ver su información
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Aquí puedes consultar el historial de pedidos, membresía activa, notas y direcciones de cualquier cliente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
