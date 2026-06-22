'use client';
// app/admin/usuarios/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { Search, UserPlus, ToggleLeft, ToggleRight, Star } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Usuario, Rol } from '@/types';
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
      // Mostrar el mensaje del backend si lo hay
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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
                  {usuarios.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
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
                        {u.membresias && u.membresias.length > 0
                          ? <Badge className="bg-amber-100 text-amber-800">{u.membresias[0].tipo}</Badge>
                          : <span style={{ color: 'var(--text-hint)' }}>—</span>}
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
                      <td style={S.td}>
                        <button onClick={() => toggleEstado(u)} title={u.activo ? 'Desactivar' : 'Activar'} className="p-1.5 rounded-lg transition-colors" style={{ color: u.activo ? '#16a34a' : '#ef4444' }}>
                          {u.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Modal Crear */}
      <Modal open={showCrear} onClose={() => { setShowCrear(false); setPassErrors([]); }} title="Nuevo usuario" size="sm">
        <form onSubmit={handleCrear} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Errores de validación */}
          {passErrors.length > 0 && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {passErrors.map((e, i) => (
                <p key={i} style={{ fontSize: 12, color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>•</span> {e}
                </p>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.label}>Nombre</label>
              <input required value={form.nombre} onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setPassErrors([]); }} style={S.formInput} />
            </div>
            <div>
              <label style={S.label}>Apellido</label>
              <input required value={form.apellido} onChange={e => { setForm(p => ({ ...p, apellido: e.target.value })); setPassErrors([]); }} style={S.formInput} />
            </div>
          </div>

          <div>
            <label style={S.label}>Email</label>
            <input type="email" required value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setPassErrors([]); }} style={S.formInput} />
          </div>

          <div>
            <label style={S.label}>Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setPassErrors([]); }}
              placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
              style={S.formInput}
            />
            {/* Indicador de fuerza en tiempo real */}
            {form.password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                  {[
                    form.password.length >= 8,
                    /[A-Z]/.test(form.password),
                    /[0-9]/.test(form.password),
                    /[^A-Za-z0-9]/.test(form.password),
                  ].map((ok, i) => (
                    <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, backgroundColor: ok ? (i < 2 ? '#f59e0b' : '#22c55e') : 'var(--border)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '2px 12px' }}>
                  {[
                    { ok: form.password.length >= 8,         label: '8+ caracteres' },
                    { ok: /[A-Z]/.test(form.password),        label: '1 mayúscula' },
                    { ok: /[0-9]/.test(form.password),        label: '1 número' },
                  ].map(req => (
                    <span key={req.label} style={{ fontSize: 11, color: req.ok ? '#16a34a' : 'var(--text-hint)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {req.ok ? '✓' : '○'} {req.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={S.label}>Teléfono (opcional)</label>
            <input type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+51 999 999 999" style={S.formInput} />
          </div>

          <div>
            <label style={S.label}>Rol</label>
           <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value as Rol }))} style={{ ...S.formInput }}>
              <option value="REPARTIDOR">Repartidor</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
            <button type="button" onClick={() => { setShowCrear(false); setPassErrors([]); }}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Crear usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
