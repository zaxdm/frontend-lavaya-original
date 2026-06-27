'use client';
// app/admin/usuarios/page.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  Search, UserPlus, ToggleLeft, ToggleRight, Star,
  X, CreditCard, CheckCircle, Clock, Crown, ChevronRight,
} from 'lucide-react';
import { adminApi, empleadoApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Usuario, Rol, Membresia, TipoMembresia } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

const ROL_COLOR: Record<Rol, string> = {
  ADMIN: 'bg-red-100 text-red-800', EMPLEADO: 'bg-purple-100 text-purple-800',
  REPARTIDOR: 'bg-blue-100 text-blue-800', CLIENTE: 'bg-slate-100 text-slate-700',
};
const ROL_LABEL: Record<Rol, string> = { ADMIN: 'Admin', EMPLEADO: 'Empleado', REPARTIDOR: 'Repartidor', CLIENTE: 'Cliente' };

const PLANES: { tipo: TipoMembresia; label: string; precio: string; descuento: number; pedidosGratis: number; color: string; bg: string }[] = [
  { tipo: 'BASICO',      label: 'Básico',      precio: 'Gratis',    descuento: 0,  pedidosGratis: 0,    color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  { tipo: 'PREMIUM',     label: 'Premium',     precio: 'S/149/mes', descuento: 10, pedidosGratis: 3,    color: '#2563eb', bg: 'rgba(37,99,235,0.08)'   },
  { tipo: 'EMPRESARIAL', label: 'Empresarial', precio: 'S/499/mes', descuento: 20, pedidosGratis: 9999, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'  },
];

const MEMBRESIA_ESTADO_COLOR: Record<string, string> = {
  ACTIVA:    'bg-green-100 text-green-800',
  EXPIRADA:  'bg-gray-100 text-gray-600',
  CANCELADA: 'bg-red-100 text-red-700',
};

const S = {
  page:    { backgroundColor: 'var(--bg-base)', flex: 1, display: 'flex', flexDirection: 'column' as const },
  card:    { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  toolbar: { backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', flexWrap: 'wrap' as const, gap: 12, alignItems: 'center' },
  thead:   { backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' },
  th:      { padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const },
  td:      { padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 },
  select:  { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' },
  input:   { paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%' },
  formInput: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  label:   { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 },
  btnPage: { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' },
};

// ── Componente: Panel lateral de membresía ─────────────────────
function MembresiaPanel({
  usuario, onClose, onChanged,
}: {
  usuario: Usuario;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activando, setActivando] = useState<TipoMembresia | null>(null);

  const membresiaActiva = membresias.find(m => m.estado === 'ACTIVA');

  useEffect(() => {
    setLoading(true);
    empleadoApi.getMembresiasCliente(usuario.id)
      .then((data: Membresia[]) => setMembresias(data))
      .catch(() => toast.error('Error cargando membresías'))
      .finally(() => setLoading(false));
  }, [usuario.id]);

  const activarPlan = async (tipo: TipoMembresia) => {
    if (activando) return;
    if (membresiaActiva?.tipo === tipo) {
      toast('Este plan ya está activo', { icon: 'ℹ️' });
      return;
    }
    setActivando(tipo);
    try {
      await empleadoApi.activarMembresia(usuario.id, tipo);
      toast.success(`Plan ${tipo} activado para ${usuario.nombre}`);
      // Recargar membresías
      const data = await empleadoApi.getMembresiasCliente(usuario.id) as Membresia[];
      setMembresias(data);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al activar plan');
    } finally {
      setActivando(null);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', zIndex: 50,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {usuario.nombre[0]}{usuario.apellido[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario.nombre} {usuario.apellido}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.email}</p>
        </div>
        <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'var(--bg-muted)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Membresía activa */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Membresía actual
          </h3>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}><Spinner className="w-6 h-6" /></div>
          ) : membresiaActiva ? (() => {
            const plan = PLANES.find(p => p.tipo === membresiaActiva.tipo) ?? PLANES[0];
            return (
              <div style={{ padding: 16, borderRadius: 12, backgroundColor: plan.bg, border: `1.5px solid ${plan.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Crown style={{ width: 18, height: 18, color: plan.color }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: plan.color }}>{plan.label}</span>
                  <Badge className={MEMBRESIA_ESTADO_COLOR[membresiaActiva.estado]}>{membresiaActiva.estado}</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {membresiaActiva.descuento > 0 && (
                    <div style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: 'var(--bg-card)', fontSize: 12 }}>
                      <p style={{ color: 'var(--text-hint)', margin: '0 0 2px', fontSize: 10 }}>DESCUENTO</p>
                      <p style={{ fontWeight: 700, color: plan.color, margin: 0 }}>{membresiaActiva.descuento}%</p>
                    </div>
                  )}
                  {membresiaActiva.pedidosGratis > 0 && (
                    <div style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: 'var(--bg-card)', fontSize: 12 }}>
                      <p style={{ color: 'var(--text-hint)', margin: '0 0 2px', fontSize: 10 }}>PEDIDOS GRATIS</p>
                      <p style={{ fontWeight: 700, color: plan.color, margin: 0 }}>
                        {membresiaActiva.pedidosGratis >= 9999 ? '∞' : membresiaActiva.pedidosGratis}
                      </p>
                    </div>
                  )}
                  <div style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: 'var(--bg-card)', fontSize: 12 }}>
                    <p style={{ color: 'var(--text-hint)', margin: '0 0 2px', fontSize: 10 }}>INICIO</p>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{formatDate(membresiaActiva.fechaInicio)}</p>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: 'var(--bg-card)', fontSize: 12 }}>
                    <p style={{ color: 'var(--text-hint)', margin: '0 0 2px', fontSize: 10 }}>VENCE</p>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{formatDate(membresiaActiva.fechaFin)}</p>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CreditCard style={{ width: 18, height: 18, color: 'var(--text-hint)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sin membresía activa</p>
            </div>
          )}
        </div>

        {/* Cambiar plan — solo para CLIENTEs */}
        {usuario.rol === 'CLIENTE' && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Cambiar plan
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLANES.map(plan => {
                const esActivo = membresiaActiva?.tipo === plan.tipo;
                const cargando = activando === plan.tipo;
                return (
                  <button
                    key={plan.tipo}
                    onClick={() => activarPlan(plan.tipo)}
                    disabled={!!activando}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 10, border: `1.5px solid ${esActivo ? plan.color : 'var(--border)'}`,
                      backgroundColor: esActivo ? plan.bg : 'var(--bg-card)',
                      cursor: activando ? 'not-allowed' : 'pointer',
                      textAlign: 'left', width: '100%', transition: 'all 0.15s',
                      opacity: (activando && !cargando) ? 0.5 : 1,
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: plan.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Crown style={{ width: 16, height: 16, color: plan.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: plan.color }}>{plan.label}</span>
                        {esActivo && <CheckCircle style={{ width: 13, height: 13, color: plan.color }} />}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                        {plan.precio}
                        {plan.descuento > 0 && ` · ${plan.descuento}% desc.`}
                        {plan.pedidosGratis > 0 && ` · ${plan.pedidosGratis >= 9999 ? '∞' : plan.pedidosGratis} ped. gratis`}
                      </p>
                    </div>
                    {cargando
                      ? <Spinner className="w-4 h-4" style={{ flexShrink: 0 }} />
                      : <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-hint)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Historial de membresías */}
        {!loading && membresias.length > 0 && (
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Historial
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {membresias.map(m => {
                const plan = PLANES.find(p => p.tipo === m.tipo) ?? PLANES[0];
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                    <Crown style={{ width: 14, height: 14, color: plan.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: plan.color, margin: 0 }}>{plan.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0 }}>
                        <Clock style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {formatDate(m.fechaInicio)} – {formatDate(m.fechaFin)}
                      </p>
                    </div>
                    <Badge className={MEMBRESIA_ESTADO_COLOR[m.estado]} style={{ fontSize: 10 }}>{m.estado}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [buscar, setBuscar] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'EMPLEADO' as Rol });
  const [usuarioDetalle, setUsuarioDetalle] = useState<Usuario | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filtroRol) params.rol = filtroRol;
      if (filtroActivo) params.activo = filtroActivo;
      if (buscar) params.buscar = buscar;
      const res = await adminApi.getUsuarios(params);
      setUsuarios(res.usuarios); setTotal(res.paginacion.total); setTotalPages(res.paginacion.totalPaginas);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando usuarios');
    }
    finally { setLoading(false); }
  }, [page, filtroRol, filtroActivo, buscar]);

  useEffect(() => { load(); }, [load]);

  const toggleEstado = async (u: Usuario) => {
    try { await adminApi.toggleEstado(u.id, !u.activo); toast.success(`Usuario ${!u.activo ? 'activado' : 'desactivado'}`); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
  };

  const [passErrors, setPassErrors] = useState<string[]>([]);

  const validarForm = () => {
    const errs: string[] = [];
    if (!form.nombre.trim())   errs.push('El nombre es obligatorio');
    if (!form.apellido.trim()) errs.push('El apellido es obligatorio');
    if (!form.email.includes('@')) errs.push('El email no es válido');
    if (form.password.length < 8)           errs.push('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(form.password))       errs.push('La contraseña debe tener al menos una mayúscula');
    if (!/[0-9]/.test(form.password))       errs.push('La contraseña debe tener al menos un número');
    return errs;
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validarForm();
    setPassErrors(errs);
    if (errs.length > 0) return;
    setSaving(true);
    try {
      await adminApi.crearUsuario(form);
      toast.success('Usuario creado correctamente');
      setShowCrear(false);
      setForm({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'EMPLEADO' as Rol });
      setPassErrors([]);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally { setSaving(false); }
  };

  // Solo CLIENTE y REPARTIDOR pueden tener membresía
  const puedeHolderMembresia = (rol: string) => rol === 'CLIENTE' || rol === 'REPARTIDOR';

  // Membresía activa del usuario — el backend ya filtra por estado ACTIVA y trae solo 1
  const membresiaActivaDeUsuario = (u: Usuario) =>
    u.membresias?.[0] ?? undefined;

  const planConfig = (tipo?: string) => PLANES.find(p => p.tipo === tipo) ?? null;

  return (
    <div style={S.page}>
      <PageHeader title="Gestión de Usuarios" subtitle={`${total} usuarios registrados`}
        action={<button onClick={() => setShowCrear(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"><UserPlus className="w-4 h-4" />Nuevo usuario</button>}
      />

      <div style={S.toolbar}>
        <div className="relative" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-hint)' }} />
          <input value={buscar} onChange={e => { setBuscar(e.target.value); setPage(1); }} placeholder="Buscar nombre o email..." style={S.input} />
        </div>
        <select value={filtroRol} onChange={e => { setFiltroRol(e.target.value); setPage(1); }} style={S.select}>
          <option value="">Todos los roles</option>
          <option value="CLIENTE">Clientes</option>
          <option value="REPARTIDOR">Repartidores</option>
          <option value="EMPLEADO">Empleados</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select value={filtroActivo} onChange={e => { setFiltroActivo(e.target.value); setPage(1); }} style={S.select}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <div className="flex-1 p-6">
        <div style={S.card}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}><Spinner className="w-8 h-8" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={S.thead}>
                  <tr>{['Usuario','Rol','Estado','Puntos','Membresía','Repartidor','Registro',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {usuarios.map(u => {
                    const memActiva = membresiaActivaDeUsuario(u);
                    const plan = planConfig(memActiva?.tipo);
                    const esSeleccionado = usuarioDetalle?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', backgroundColor: esSeleccionado ? 'rgba(37,99,235,0.05)' : 'transparent' }}
                        onClick={() => setUsuarioDetalle(esSeleccionado ? null : u)}
                        onMouseEnter={e => { if (!esSeleccionado) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = esSeleccionado ? 'rgba(37,99,235,0.05)' : 'transparent'; }}
                      >
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {u.nombre[0]}{u.apellido[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: 500 }}>{u.nombre} {u.apellido}</p>
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><Badge className={ROL_COLOR[u.rol]}>{ROL_LABEL[u.rol]}</Badge></td>
                        <td style={S.td}><Badge className={u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                        <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{u.puntos?.saldo ?? 0} pts</td>
                        <td style={S.td}>
                          {memActiva && plan ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, backgroundColor: plan.bg, color: plan.color, fontSize: 12, fontWeight: 700 }}>
                                <Crown style={{ width: 11, height: 11 }} />
                                {plan.label}
                              </span>
                              {memActiva.descuento > 0 && (
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{memActiva.descuento}%</span>
                              )}
                            </div>
                          ) : puedeHolderMembresia(u.rol) ? (
                            <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>Sin plan</span>
                          ) : (
                            <span style={{ color: 'var(--text-hint)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {u.repartidor ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span>{u.repartidor.calificacionPromedio.toFixed(1)}</span>
                              <span style={{ color: 'var(--text-hint)' }}>({u.repartidor.totalServicios})</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-hint)' }}>—</span>}
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(u.createdAt)}</td>
                        <td style={S.td} onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleEstado(u)} title={u.activo ? 'Desactivar' : 'Activar'} className="p-1.5 rounded-lg transition-colors" style={{ color: u.activo ? '#16a34a' : '#ef4444' }}>
                            {u.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Página {page} de {totalPages} · {total} usuarios</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...S.btnPage, opacity: page <= 1 ? 0.4 : 1 }}>Anterior</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...S.btnPage, opacity: page >= totalPages ? 0.4 : 1 }}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Panel lateral de membresía */}
      {usuarioDetalle && (
        <>
          {/* Overlay */}
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 40 }}
            onClick={() => setUsuarioDetalle(null)}
          />
          <MembresiaPanel
            usuario={usuarioDetalle}
            onClose={() => setUsuarioDetalle(null)}
            onChanged={load}
          />
        </>
      )}

      {/* Modal Crear */}
      <Modal open={showCrear} onClose={() => { setShowCrear(false); setPassErrors([]); }} title="Nuevo usuario" size="sm">
        <form onSubmit={handleCrear} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {passErrors.length > 0 && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {passErrors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>• {e}</p>)}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Nombre</label><input required value={form.nombre} onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setPassErrors([]); }} style={S.formInput} /></div>
            <div><label style={S.label}>Apellido</label><input required value={form.apellido} onChange={e => { setForm(p => ({ ...p, apellido: e.target.value })); setPassErrors([]); }} style={S.formInput} /></div>
          </div>
          <div><label style={S.label}>Email</label><input type="email" required value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setPassErrors([]); }} style={S.formInput} /></div>
          <div>
            <label style={S.label}>Contraseña</label>
            <input type="password" required value={form.password} onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setPassErrors([]); }} placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número" style={S.formInput} />
            {form.password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                  {[form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].map((ok, i) => (
                    <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, backgroundColor: ok ? (i < 2 ? '#f59e0b' : '#22c55e') : 'var(--border)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '2px 12px' }}>
                  {[{ ok: form.password.length >= 8, label: '8+ caracteres' }, { ok: /[A-Z]/.test(form.password), label: '1 mayúscula' }, { ok: /[0-9]/.test(form.password), label: '1 número' }].map(req => (
                    <span key={req.label} style={{ fontSize: 11, color: req.ok ? '#16a34a' : 'var(--text-hint)' }}>{req.ok ? '✓' : '○'} {req.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div><label style={S.label}>Teléfono (opcional)</label><input type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} style={S.formInput} /></div>
          <div>
            <label style={S.label}>Rol</label>
            <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value as Rol }))} style={{ ...S.formInput }}>
              <option value="REPARTIDOR">Repartidor</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
            <button type="button" onClick={() => { setShowCrear(false); setPassErrors([]); }} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Crear usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
