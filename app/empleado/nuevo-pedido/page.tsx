'use client';
// app/empleado/nuevo-pedido/page.tsx
// Formulario para crear pedidos presenciales desde la tienda

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Minus, Trash2, UserSearch,
  ShoppingBag, Package, CheckCircle2,
  MapPin, Home,
} from 'lucide-react';
import { empleadoApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { CatalogoPrenda } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

// ─── Tipos ────────────────────────────────────────────────────
type LineaPrenda = { tipo: string; cantidad: number; precio: number; precioExtra: number };
type ClienteSugerido = {
  id: string; nombre: string; apellido: string;
  email: string; telefono?: string;
};
type Direccion = {
  id: string; calle: string; numero: string;
  colonia: string; ciudad: string;
  estado?: string; codigoPostal?: string;
};

// ─── Estilos base ─────────────────────────────────────────────
const S = {
  card:   { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  label:  { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input:  { width: '100%', paddingTop: 9, paddingBottom: 9, paddingLeft: 12, paddingRight: 12, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  seccion:{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12 },
};

export default function NuevoPedidoPage() {
  const router = useRouter();

  // ── Catálogo ──────────────────────────────────────────────
  const [catalogo,      setCatalogo]      = useState<CatalogoPrenda[]>([]);
  const [loadingCat,    setLoadingCat]    = useState(true);

  // ── Cliente ───────────────────────────────────────────────
  const [modoCliente,   setModoCliente]   = useState<'presencial' | 'registrado'>('presencial');
  const [nombre,        setNombre]        = useState('');
  const [apellido,      setApellido]      = useState('');
  const [telefono,      setTelefono]      = useState('');
  const [busqueda,      setBusqueda]      = useState('');
  const [sugeridos,     setSugeridos]     = useState<ClienteSugerido[]>([]);
  const [clienteSel,    setClienteSel]    = useState<ClienteSugerido | null>(null);
  const [buscando,      setBuscando]      = useState(false);
  const [membresiaActiva, setMembresiaActiva] = useState<any>(null);

  // ── Dirección ─────────────────────────────────────────────
  const [requiereEntrega, setRequiereEntrega] = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSel, setDireccionSel] = useState<string | null>(null);
  const [modoDireccion, setModoDireccion] = useState<'existente' | 'nueva'>('existente');
  const [nuevaDireccion, setNuevaDireccion] = useState<Partial<Direccion>>({});
  const [cargandoDirecciones, setCargandoDirecciones] = useState(false);

  // ── Prendas ───────────────────────────────────────────────
  const [lineas,        setLineas]        = useState<LineaPrenda[]>([]);
  const [prendaSel,     setPrendaSel]     = useState('');

  // ── Pago y notas ──────────────────────────────────────────
  const [metodoPago,    setMetodoPago]    = useState<'EFECTIVO' | 'PAYPAL'>('EFECTIVO');
  const [notas,         setNotas]         = useState('');

  // ── Estado del form ───────────────────────────────────────
  const [guardando,     setGuardando]     = useState(false);
  const [pedidoCreado,  setPedidoCreado]  = useState<{ id: string; monto: number } | null>(null);

  // ── Cargar catálogo ───────────────────────────────────────
  useEffect(() => {
    empleadoApi.getCatalogo(false)
      .then(setCatalogo)
      .catch(() => toast.error('Error cargando catálogo'))
      .finally(() => setLoadingCat(false));
  }, []);

  // ── Cargar direcciones y membresía cuando se selecciona un cliente ─────
  useEffect(() => {
    if (clienteSel) {
      const fetchData = async () => {
        setCargandoDirecciones(true);
        try {
          const [direcciones, membresias] = await Promise.all([
            empleadoApi.getDireccionesCliente(clienteSel.id),
            empleadoApi.getMembresiasCliente(clienteSel.id)
          ]);
          setDirecciones(direcciones);
          if (direcciones.length > 0) setDireccionSel(direcciones[0].id);
          
          // Buscar membresía activa
          const activa = membresias.find((m: any) => m.estado === 'ACTIVA');
          setMembresiaActiva(activa);
        } catch {
          toast.error('Error al cargar datos del cliente');
        } finally {
          setCargandoDirecciones(false);
        }
      };
      fetchData();
    } else {
      setDirecciones([]);
      setDireccionSel(null);
      setMembresiaActiva(null);
    }
  }, [clienteSel]);

  // ── Buscar clientes registrados ───────────────────────────
  const buscarClientes = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSugeridos([]); return; }
    setBuscando(true);
    try {
      const res = await empleadoApi.buscarClientes(q);
      setSugeridos(res);
    } catch { /* silencioso */ }
    finally { setBuscando(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarClientes(busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda, buscarClientes]);

  // ── Cálculos ──────────────────────────────────────────────
  const totalPrendas = lineas.reduce((a, l) => a + l.cantidad, 0);
  const tienePrendasExtra = totalPrendas > 10;

  const montoBruto = lineas.reduce((acc, l) => {
    const precio = tienePrendasExtra ? l.precio + l.precioExtra : l.precio;
    return acc + precio * l.cantidad;
  }, 0);
  
  // Calculate discount
  const descuento = membresiaActiva ? membresiaActiva.descuento : 0;
  const montoTotal = montoBruto * (1 - descuento / 100);

  // ── Agregar prenda ─────────────────────────────────────────
  const agregarPrenda = () => {
    if (!prendaSel) return;
    const cat = catalogo.find(c => c.nombre === prendaSel);
    if (!cat) return;

    const existente = lineas.findIndex(l => l.tipo === prendaSel);
    if (existente >= 0) {
      setLineas(prev => prev.map((l, i) =>
        i === existente ? { ...l, cantidad: l.cantidad + 1 } : l
      ));
    } else {
      setLineas(prev => [...prev, {
        tipo: prendaSel,
        cantidad: 1,
        precio: cat.precioUnitario,
        precioExtra: cat.precioExtra,
      }]);
    }
    setPrendaSel('');
  };

  const cambiarCantidad = (idx: number, delta: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const nueva = l.cantidad + delta;
      return nueva < 1 ? l : { ...l, cantidad: nueva };
    }));
  };

  const quitarLinea = (idx: number) =>
    setLineas(prev => prev.filter((_, i) => i !== idx));

  // ── Enviar ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lineas.length === 0) {
      toast.error('Agrega al menos una prenda');
      return;
    }
    if (modoCliente === 'presencial' && !nombre.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (modoCliente === 'registrado' && !clienteSel) {
      toast.error('Selecciona un cliente registrado');
      return;
    }
    if (requiereEntrega) {
      if (modoDireccion === 'existente' && !direccionSel) {
        toast.error('Selecciona una dirección');
        return;
      }
      if (modoDireccion === 'nueva') {
        if (!nuevaDireccion.calle || !nuevaDireccion.numero || !nuevaDireccion.colonia || !nuevaDireccion.ciudad) {
          toast.error('Completa los campos de la dirección');
          return;
        }
      }
    }

    setGuardando(true);
    try {
      const payload: any = {
        ...(modoCliente === 'presencial'
          ? { clienteNombre: nombre.trim(), clienteApellido: apellido.trim(), clienteTelefono: telefono.trim() }
          : { clienteId: clienteSel!.id }),
        prendas: lineas.map(l => ({ tipo: l.tipo, cantidad: l.cantidad })),
        metodoPago,
        notasInternas: notas.trim() || undefined,
      };

      if (requiereEntrega) {
        if (modoDireccion === 'existente') {
          payload.direccionEntregaId = direccionSel;
        } else {
          payload.direccionNueva = nuevaDireccion;
        }
      }

      const res = await empleadoApi.crearPedidoPresencial(payload);
      setPedidoCreado({
        id: res.pedido.id,
        monto: res.pedido.pago?.monto ?? montoTotal,
      });
      toast.success('¡Pedido creado correctamente!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el pedido');
    } finally {
      setGuardando(false);
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────
  if (pedidoCreado) {
    return (
      <div style={{ flex: 1, backgroundColor: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...S.card, maxWidth: 440, width: '100%', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: '#14b8a6' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            ¡Pedido registrado!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
            #{pedidoCreado.id.slice(0, 8).toUpperCase()}
          </p>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed', margin: '0 0 24px' }}>
            {formatCurrency(pedidoCreado.monto)}
          </p>

          <div style={{ backgroundColor: 'var(--bg-muted)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {metodoPago === 'EFECTIVO'
              ? '💵 El cliente debe pagar en efectivo al momento de la entrega.'
              : '💳 El cliente pagará por PayPal cuando se le notifique.'}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                setPedidoCreado(null);
                setLineas([]); setNombre(''); setApellido('');
                setTelefono(''); setClienteSel(null); setNotas('');
                setRequiereEntrega(false); setDireccionSel(null); setNuevaDireccion({});
              }}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Nuevo pedido
            </button>
            <button
              onClick={() => router.push('/empleado/dashboard')}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Ir al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Nuevo pedido presencial"
        subtitle="Registra prendas de un cliente que llegó a la tienda"
      />

      <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720, width: '100%' }}>

        {/* ── Sección 1: Cliente ─────────────────────────────── */}
        <div>
          <p style={S.seccion}>1. Datos del cliente</p>
          <div style={S.card}>
            <div style={{ padding: 20 }}>
              {/* Toggle modo */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {(['presencial', 'registrado'] as const).map(modo => (
                  <button
                    key={modo}
                    type="button"
                    onClick={() => { setModoCliente(modo); setClienteSel(null); }}
                    style={{
                      padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: `1.5px solid ${modoCliente === modo ? '#7c3aed' : 'var(--border)'}`,
                      backgroundColor: modoCliente === modo ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                      color: modoCliente === modo ? '#7c3aed' : 'var(--text-secondary)',
                      fontWeight: modoCliente === modo ? 600 : 400,
                    }}
                  >
                    {modo === 'presencial' ? '🚶 Cliente nuevo / no registrado' : '🔍 Buscar cliente registrado'}
                  </button>
                ))}
              </div>

              {modoCliente === 'presencial' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={S.label}>Nombre *</label>
                    <input
                      required
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                      style={S.input}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Apellido</label>
                    <input
                      value={apellido}
                      onChange={e => setApellido(e.target.value)}
                      placeholder="Apellido"
                      style={S.input}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={S.label}>Teléfono (opcional)</label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      placeholder="+51 999 999 999"
                      style={S.input}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={S.label}>Buscar por nombre, email o teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <UserSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-hint)' }} />
                    <input
                      value={clienteSel ? `${clienteSel.nombre} ${clienteSel.apellido}` : busqueda}
                      onChange={e => { setBusqueda(e.target.value); setClienteSel(null); }}
                      placeholder="Escribe para buscar..."
                      style={{ ...S.input, paddingLeft: 36 }}
                    />
                    {buscando && (
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                        <Spinner className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Sugeridos */}
                  {sugeridos.length > 0 && !clienteSel && (
                    <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                      {sugeridos.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setClienteSel(c); setSugeridos([]); setBusqueda(''); }}
                          style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c.nombre} {c.apellido}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {c.email}{c.telefono ? ` · ${c.telefono}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cliente seleccionado */}
                  {clienteSel && (
                    <div style={{ marginTop: 8, padding: '10px 14px', backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {clienteSel.nombre[0]}{clienteSel.apellido[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {clienteSel.nombre} {clienteSel.apellido}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{clienteSel.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setClienteSel(null); setBusqueda(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1 }}
                      >×</button>
                    </div>
                  )}
                </div>
              )}

              {/* Toggle de entrega */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setRequiereEntrega(!requiereEntrega)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${requiereEntrega ? '#7c3aed' : 'var(--border)'}`,
                    backgroundColor: requiereEntrega ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, border: '2px solid var(--border)',
                    backgroundColor: requiereEntrega ? '#7c3aed' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 'bold'
                  }}>
                    {requiereEntrega && '✓'}
                  </div>
                  <span style={{ fontSize: 14, color: requiereEntrega ? '#7c3aed' : 'var(--text-secondary)', fontWeight: 600 }}>
                    ¿El cliente quiere entrega a domicilio?
                  </span>
                </button>

                {/* Dirección de entrega (si está activado) */}
                {requiereEntrega && (
                  <div style={{ marginTop: 16, padding: '14px 16px', backgroundColor: 'var(--bg-muted)', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} /> Datos de entrega
                    </p>

                    {modoCliente === 'registrado' && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {(['existente', 'nueva'] as const).map(modo => (
                            <button
                              key={modo}
                              type="button"
                              onClick={() => setModoDireccion(modo)}
                              style={{
                                flex: 1, padding: '7px 12px', borderRadius: 8, fontSize: 13,
                                border: `1.5px solid ${modoDireccion === modo ? '#7c3aed' : 'var(--border)'}`,
                                backgroundColor: modoDireccion === modo ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                                color: modoDireccion === modo ? '#7c3aed' : 'var(--text-secondary)',
                                fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              {modo === 'existente' ? 'Usar dirección registrada' : 'Agregar nueva dirección'}
                            </button>
                          ))}
                        </div>

                        {modoDireccion === 'existente' ? (
                          cargandoDirecciones ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spinner /></div>
                          ) : (
                            <div>
                              {direcciones.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
                                  No hay direcciones registradas para este cliente
                                </p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {direcciones.map(dir => (
                                    <button
                                      key={dir.id}
                                      type="button"
                                      onClick={() => setDireccionSel(dir.id)}
                                      style={{
                                        padding: '10px 14px', borderRadius: 8, border: '1.5px solid',
                                        borderColor: direccionSel === dir.id ? '#7c3aed' : 'var(--border)',
                                        backgroundColor: direccionSel === dir.id ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                                        color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: 13, lineHeight: 1.4
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Home size={14} color={direccionSel === dir.id ? '#7c3aed' : 'var(--text-secondary)'} />
                                        <span style={{ fontWeight: 600, color: direccionSel === dir.id ? '#7c3aed' : 'var(--text-primary)' }}>
                                          {dir.calle} {dir.numero}
                                        </span>
                                      </div>
                                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {dir.colonia}, {dir.ciudad}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={S.label}>Calle *</label>
                              <input
                                value={nuevaDireccion.calle || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, calle: e.target.value })}
                                placeholder="Calle"
                                style={S.input}
                              />
                            </div>
                            <div>
                              <label style={S.label}>Número *</label>
                              <input
                                value={nuevaDireccion.numero || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, numero: e.target.value })}
                                placeholder="Número"
                                style={S.input}
                              />
                            </div>
                            <div>
                              <label style={S.label}>Colonia *</label>
                              <input
                                value={nuevaDireccion.colonia || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, colonia: e.target.value })}
                                placeholder="Colonia"
                                style={S.input}
                              />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={S.label}>Ciudad *</label>
                              <input
                                value={nuevaDireccion.ciudad || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, ciudad: e.target.value })}
                                placeholder="Ciudad"
                                style={S.input}
                              />
                            </div>
                            <div>
                              <label style={S.label}>Estado</label>
                              <input
                                value={nuevaDireccion.estado || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, estado: e.target.value })}
                                placeholder="Estado"
                                style={S.input}
                              />
                            </div>
                            <div>
                              <label style={S.label}>Código postal</label>
                              <input
                                value={nuevaDireccion.codigoPostal || ''}
                                onChange={e => setNuevaDireccion({ ...nuevaDireccion, codigoPostal: e.target.value })}
                                placeholder="Código postal"
                                style={S.input}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {modoCliente === 'presencial' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={S.label}>Calle *</label>
                          <input
                            value={nuevaDireccion.calle || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, calle: e.target.value })}
                            placeholder="Calle"
                            style={S.input}
                          />
                        </div>
                        <div>
                          <label style={S.label}>Número *</label>
                          <input
                            value={nuevaDireccion.numero || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, numero: e.target.value })}
                            placeholder="Número"
                            style={S.input}
                          />
                        </div>
                        <div>
                          <label style={S.label}>Colonia *</label>
                          <input
                            value={nuevaDireccion.colonia || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, colonia: e.target.value })}
                            placeholder="Colonia"
                            style={S.input}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={S.label}>Ciudad *</label>
                          <input
                            value={nuevaDireccion.ciudad || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, ciudad: e.target.value })}
                            placeholder="Ciudad"
                            style={S.input}
                          />
                        </div>
                        <div>
                          <label style={S.label}>Estado</label>
                          <input
                            value={nuevaDireccion.estado || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, estado: e.target.value })}
                            placeholder="Estado"
                            style={S.input}
                          />
                        </div>
                        <div>
                          <label style={S.label}>Código postal</label>
                          <input
                            value={nuevaDireccion.codigoPostal || ''}
                            onChange={e => setNuevaDireccion({ ...nuevaDireccion, codigoPostal: e.target.value })}
                            placeholder="Código postal"
                            style={S.input}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sección 2: Prendas ─────────────────────────────── */}
        <div>
          <p style={S.seccion}>2. Prendas</p>
          <div style={S.card}>
            <div style={{ padding: 20 }}>
              {loadingCat ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Spinner /></div>
              ) : (
                <>
                  {/* Agregar prenda */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={S.label}>Tipo de prenda</label>
                      <select
                        value={prendaSel}
                        onChange={e => setPrendaSel(e.target.value)}
                        style={{ ...S.input }}
                      >
                        <option value="">Seleccionar prenda...</option>
                        {catalogo.map(c => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre[0].toUpperCase() + c.nombre.slice(1)} — {formatCurrency(c.precioUnitario)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={agregarPrenda}
                        disabled={!prendaSel}
                        style={{ padding: '9px 18px', borderRadius: 8, border: 'none', backgroundColor: prendaSel ? '#7c3aed' : 'var(--border)', color: prendaSel ? '#fff' : 'var(--text-hint)', fontSize: 13, fontWeight: 600, cursor: prendaSel ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus style={{ width: 15, height: 15 }} /> Agregar
                      </button>
                    </div>
                  </div>

                  {/* Lista de prendas */}
                  {lineas.length === 0 ? (
                    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-hint)' }}>
                      <ShoppingBag style={{ width: 32, height: 32, opacity: 0.4 }} />
                      <p style={{ fontSize: 13, margin: 0 }}>Selecciona prendas del catálogo</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {lineas.map((l, i) => {
                        const precio = tienePrendasExtra ? l.precio + l.precioExtra : l.precio;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'var(--bg-muted)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <Package style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                              {l.tipo}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 60, textAlign: 'right' }}>
                              {formatCurrency(precio)}/u
                            </span>
                            {/* Controles cantidad */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card)', borderRadius: 8, padding: '4px 8px', border: '1px solid var(--border)' }}>
                              <button type="button" onClick={() => cambiarCantidad(i, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}>
                                <Minus style={{ width: 13, height: 13 }} />
                              </button>
                              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center', color: 'var(--text-primary)' }}>
                                {l.cantidad}
                              </span>
                              <button type="button" onClick={() => cambiarCantidad(i, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}>
                                <Plus style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', minWidth: 64, textAlign: 'right' }}>
                              {formatCurrency(precio * l.cantidad)}
                            </span>
                            <button type="button" onClick={() => quitarLinea(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                              <Trash2 style={{ width: 15, height: 15 }} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Totales */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <span>Total prendas</span>
                          <span>{totalPrendas}</span>
                        </div>
                        {tienePrendasExtra && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#d97706' }}>
                            ⚠ Más de 10 prendas — se aplica cargo extra por prenda
                          </div>
                        )}
                        
                        {/* Membresía */}
                        {membresiaActiva && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: 'rgba(20,184,166,0.08)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.2)', fontSize: 12, color: '#14b8a6' }}>
                            🎉 Membresía {membresiaActiva.tipo} — {descuento}% de descuento aplicado!
                          </div>
                        )}
                        
                        {/* Bruto */}
                        {descuento > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                            <span>Bruto</span>
                            <span>{formatCurrency(montoBruto)}</span>
                          </div>
                        )}
                        
                        {/* Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                          <span style={{ color: 'var(--text-primary)' }}>Total</span>
                          <span style={{ color: '#7c3aed' }}>{formatCurrency(montoTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Sección 3: Pago y notas ────────────────────────── */}
        <div>
          <p style={S.seccion}>3. Pago y notas</p>
          <div style={S.card}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={S.label}>Método de pago</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['EFECTIVO', 'PAYPAL'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoPago(m)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${metodoPago === m ? '#7c3aed' : 'var(--border)'}`,
                        backgroundColor: metodoPago === m ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                        color: metodoPago === m ? '#7c3aed' : 'var(--text-secondary)',
                      }}
                    >
                      {m === 'EFECTIVO' ? '💵 Efectivo' : '💳 PayPal'}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {metodoPago === 'EFECTIVO'
                    ? 'El cliente paga en efectivo al recoger su ropa.'
                    : 'Se enviará un link de pago al cliente por WhatsApp o correo.'}
                </p>
              </div>

              <div>
                <label style={S.label}>Notas internas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Ej: manchas especiales, ropa delicada, instrucciones de lavado..."
                  style={{ ...S.input, resize: 'vertical', minHeight: 80 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Botón enviar ───────────────────────────────────── */}
        <button
          type="submit"
          disabled={guardando || lineas.length === 0}
          style={{
            padding: '14px 0', borderRadius: 10, border: 'none',
            backgroundColor: guardando || lineas.length === 0 ? 'var(--border)' : '#7c3aed',
            color: guardando || lineas.length === 0 ? 'var(--text-hint)' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: guardando || lineas.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {guardando
            ? <><Spinner className="w-5 h-5 border-white border-t-transparent" /> Registrando pedido...</>
            : <><CheckCircle2 style={{ width: 18, height: 18 }} /> Registrar pedido — {formatCurrency(montoTotal)}</>}
        </button>

      </form>
    </div>
  );
}
