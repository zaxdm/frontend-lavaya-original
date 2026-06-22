'use client';
// app/empleado/clientes/page.tsx — Clientes registrados y datos de clientes

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Home, MapPin, Clock11, Archive, X, ChevronRight } from 'lucide-react';
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

const S = {
  card:   { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  label:  { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input:  { width: '100%', paddingTop: 9, paddingBottom: 9, paddingLeft: 12, paddingRight: 12, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  section:{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 14 },
};

export default function EmpleadoClientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [sugeridos, setSugeridos] = useState<ClienteSugerido[]>([]);
  const [clienteSel, setClienteSel] = useState<ClienteSugerido | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [historial, setHistorial] = useState<Pedido[]>([]);
  const [membresias, setMembresias] = useState<any[]>([]);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [loadingMembresias, setLoadingMembresias] = useState(false);

  const buscarClientes = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSugeridos([]);
      return;
    }
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
    setLoadingDirecciones(true);
    setLoadingHistorial(true);
    setLoadingMembresias(true);
    try {
      const [dirs, pedidos, membresias] = await Promise.all([
        empleadoApi.getDireccionesCliente(cliente.id),
        empleadoApi.getHistorialCliente(cliente.id),
        empleadoApi.getMembresiasCliente(cliente.id),
      ]);
      setDirecciones(dirs);
      setHistorial(pedidos);
      setMembresias(membresias);
    } catch {
      toast.error('Error cargando datos del cliente');
      setDirecciones([]);
      setHistorial([]);
      setMembresias([]);
    } finally {
      setLoadingDirecciones(false);
      setLoadingHistorial(false);
      setLoadingMembresias(false);
    }
  };

  const limpiarSeleccion = () => {
    setClienteSel(null);
    setDirecciones([]);
    setHistorial([]);
    setBusqueda('');
    setSugeridos([]);
  };

  const notasRecientes = useMemo(() => {
    return historial
      .flatMap((pedido) => [pedido.notasCliente, pedido.notasInternas].filter(Boolean) as string[])
      .slice(0, 4);
  }, [historial]);

  const pedidosRecientes = useMemo(() => historial.slice(0, 8), [historial]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Clientes"
        subtitle="Buscar cliente, ver su historial, direcciones y notas/preferencias"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 1040, margin: '0 auto' }}>
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
                  if (clienteSel) {
                    limpiarSeleccion();
                  }
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

            {!clienteSel && busqueda.trim().length >= 2 && sugeridos.length === 0 && !buscando && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                No se encontraron clientes. Crea uno nuevo desde "Nuevo pedido" si no existe aún.
              </p>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-secondary)' }}>Direcciones</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{direcciones.length}</p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-secondary)' }}>Pedidos registrados</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{historial.length}</p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-secondary)' }}>Última nota</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{notasRecientes[0] ?? 'Sin notas recientes'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {clienteSel ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            <div style={S.card}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <p style={S.section}>Historial de pedidos</p>
                  {loadingHistorial ? (
                    <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : historial.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Este cliente aún no tiene pedidos registrados en el sistema.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {pedidosRecientes.map((pedido) => (
                        <div key={pedido.id} style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>#{pedido.id.slice(0, 8)}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Recolección: {formatDate(pedido.fechaRecoleccion)}</p>
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
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pedido.estado ? pedido.estado : 'Desconocido'}</span>
                            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                              Ver detalle <ChevronRight style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p style={S.section}>Membresías</p>
                  {loadingMembresias ? (
                    <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : (
                    <>
                      {membresias.some(m => m.estado === 'ACTIVA') && (
                        <div style={{ padding: 14, borderRadius: 12, backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', marginBottom: 10 }}>
                          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#14b8a6' }}>
                            ✅ Membresía activa: {membresias.find(m => m.estado === 'ACTIVA')?.tipo}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                            Descuento: {membresias.find(m => m.estado === 'ACTIVA')?.descuento}% · 
                            Válida hasta: {new Date(membresias.find(m => m.estado === 'ACTIVA')?.fechaFin).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                      )}
                      <Link href="/empleado/membresias">
                        <button style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1.5px solid #7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          🔑 Gestionar membresías
                        </button>
                      </Link>
                    </>
                  )}
                </div>

                <div>
                  <p style={S.section}>Notas / preferencias</p>
                  {loadingHistorial ? (
                    <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                  ) : notasRecientes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      No hay notas o preferencias guardadas en el sistema. Sólo se muestran notas cuando un pedido contiene información adicional.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notasRecientes.map((nota, index) => (
                        <div key={index} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{nota}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={S.section}>Direcciones del cliente</p>
                {loadingDirecciones ? (
                  <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                ) : direcciones.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    No hay direcciones guardadas para este cliente.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {direcciones.map((direccion) => (
                      <div key={direccion.id} style={{ padding: 14, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Home style={{ width: 16, height: 16, color: '#7c3aed' }} />
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {direccion.calle} {direccion.numero}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {direccion.colonia}, {direccion.ciudad}{direccion.estado ? `, ${direccion.estado}` : ''}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {direccion.codigoPostal || 'Sin código postal'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={S.card}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Archive style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Busca un cliente para ver su historial
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Por ahora el sistema sólo puede mostrar datos que estén registrados en pedidos existentes. Si no aparece información, prueba creando un pedido nuevo para ese cliente.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Clock11 style={{ width: 16, height: 16 }} />
                <span>Sin historial real todavía.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
