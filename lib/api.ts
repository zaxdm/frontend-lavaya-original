// lib/api.ts — Cliente HTTP centralizado con manejo automático de JWT
import type {
  LoginResponse, AuthUser, DashboardStats, Rol,
  Pedido, Usuario, Repartidor, Direccion, EmpresaB2B, ContratoB2B,
  CatalogoPrenda, Pago, PedidosPorDia, IngresosPorDia,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-lavaya.onrender.com/api';

// ─── Token storage helpers ────────────────────────────────────
const TOKEN_KEY = 'lavaya_access_token';
const REFRESH_KEY = 'lavaya_refresh_token';

export const tokenStorage = {
  getAccess: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  getRefresh: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ─── Fetch core con refresh automático ───────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    tokenStorage.clear();
    return null;
  }
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  return data.accessToken as string;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.getAccess();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expirado → intentar refresh una sola vez
  if (res.status === 401 && tokenStorage.getRefresh()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken ?? ''));
      refreshQueue = [];

      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } else {
        // Refresh falló: redirigir al login
        if (typeof window !== 'undefined') {
          window.location.href = '/ingresar';
        }
        throw new Error('Sesión expirada');
      }
    } else {
      // Otra petición ya está haciendo refresh: encolar
      await new Promise<void>((resolve) => {
        refreshQueue.push((t) => {
          headers['Authorization'] = `Bearer ${t}`;
          resolve();
        });
      });
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error ?? 'Error de red'), {
      status: res.status,
      detalle: body.detalle,
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── API helpers ──────────────────────────────────────────────
const get = <T>(path: string) => apiFetch<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
export const authApi = {
  login: (email: string, password: string) =>
    post<LoginResponse>('/auth/login', { email, password }),
  loginGoogle: (idToken: string) =>
    post<LoginResponse>('/auth/login/google', { idToken }),
  logout: (refreshToken: string) =>
    post<void>('/auth/logout', { refreshToken }),
  me: () => get<AuthUser>('/auth/me'),
};

// ═══════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════
export const adminApi = {
  // Stats
  getStats: () => get<DashboardStats>('/admin/reportes/stats'),
  getPedidosPorDia: (dias = 30) =>
    get<PedidosPorDia[]>(`/admin/reportes/pedidos-por-dia?dias=${dias}`),
  getIngresosPorDia: (dias = 30) =>
    get<IngresosPorDia[]>(`/admin/reportes/ingresos-por-dia?dias=${dias}`),
  getPrendasPopulares: () =>
    get<{ tipo: string; totalLavadas: number; aparicionEnPedidos: number }[]>(
      '/admin/reportes/prendas-populares',
    ),

  // Usuarios
  getUsuarios: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<{
      usuarios: Usuario[];
      paginacion: { total: number; pagina: number; porPagina: number; totalPaginas: number };
    }>(`/admin/usuarios${qs}`);
  },
  getUsuario: (id: string) => get<Usuario>(`/admin/usuarios/${id}`),
  crearUsuario: (data: {
    nombre: string; apellido: string; email: string;
    password: string; telefono?: string; rol: Rol;
  }) => post<Usuario>('/admin/usuarios', data),
  toggleEstado: (id: string, activo: boolean) =>
    patch<{ mensaje: string }>(`/admin/usuarios/${id}/estado`, { activo }),

  // Repartidores
  getRepartidores: (estado?: string) =>
    get<Repartidor[]>(`/admin/repartidores${estado ? `?estado=${estado}` : ''}`),

  // Pedidos
  getPedidos: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<{
      pedidos: Pedido[];
      paginacion: { total: number; pagina: number; porPagina: number; totalPaginas: number };
    }>(`/admin/pedidos${qs}`);
  },
  asignarRepartidor: (pedidoId: string, repartidorId: string, tipo: 'recoleccion' | 'entrega' = 'recoleccion') =>
    patch<{ mensaje: string; pedido: Pedido }>(`/admin/pedidos/${pedidoId}/asignar-repartidor`, { repartidorId, tipo }),

  // Catálogo
  getCatalogo: () => get<CatalogoPrenda[]>('/admin/catalogo'),
  crearPrenda: (data: Partial<CatalogoPrenda>) => post<CatalogoPrenda>('/admin/catalogo', data),
  actualizarPrenda: (id: string, data: Partial<CatalogoPrenda>) =>
    patch<CatalogoPrenda>(`/admin/catalogo/${id}`, data),
};

// ═══════════════════════════════════════════════════════════════
//  PEDIDOS
// ═══════════════════════════════════════════════════════════════
export const pedidosApi = {
  get: (id: string) => get<Pedido>(`/pedidos/${id}`),
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<{
      pedidos: Pedido[];
      paginacion: { total: number; pagina: number; porPagina: number; totalPaginas: number };
    }>(`/pedidos${qs}`);
  },
  cambiarEstado: (id: string, estado: string, nota?: string) =>
    patch<{ mensaje: string; pedido: Pedido }>(`/pedidos/${id}/estado`, { estado, nota }),
  cancelar: (id: string, motivo?: string) =>
    patch<{ mensaje: string; pedido: Pedido }>(`/pedidos/${id}/cancelar`, { motivo }),
};

// ═══════════════════════════════════════════════════════════════
//  EMPLEADO
// ═══════════════════════════════════════════════════════════════
export const empleadoApi = {
  // Pedidos en lavandería
  getPedidos: (estado?: string) => {
    const qs = estado ? `?estado=${estado}` : '';
    return get<Pedido[]>(`/empleados/pedidos/en-proceso${qs}`);
  },
  marcarEnProceso: (id: string) =>
    patch<{ mensaje: string; pedido: Pedido }>(`/empleados/pedidos/${id}/en-proceso`, {}),
  marcarListo: (id: string, nota?: string) =>
    patch<{ mensaje: string; pedido: Pedido }>(`/empleados/pedidos/${id}/listo`, { nota }),

  // Asignar repartidor de entrega (pedidos LISTO)
  asignarEntrega: (pedidoId: string, repartidorId: string) =>
    patch<{ mensaje: string; pedido: Pedido }>(
      `/empleados/pedidos/${pedidoId}/asignar-entrega`,
      { repartidorId },
    ),
  getPedidosAsignables: () => get<Pedido[]>('/empleados/pedidos/asignables'),
  asignarRepartidor: (
    pedidoId: string,
    repartidorId: string,
    tipo: 'recoleccion' | 'entrega' = 'recoleccion',
  ) =>
    patch<{ mensaje: string; pedido: Pedido }>(
      `/empleados/pedidos/${pedidoId}/asignar-repartidor`,
      { repartidorId, tipo },
    ),

  // Repartidores disponibles
  getRepartidores: (estado = 'DISPONIBLE') =>
    get<Repartidor[]>(`/empleados/repartidores?estado=${estado}`),

  // Catálogo (lectura + edición)
  getCatalogo: (todos = false) =>
    get<CatalogoPrenda[]>(`/empleados/catalogo${todos ? '?todos=true' : ''}`),
  crearPrenda: (data: Partial<CatalogoPrenda>) =>
    post<CatalogoPrenda>('/empleados/catalogo', data),
  actualizarPrenda: (id: string, data: Partial<CatalogoPrenda>) =>
    patch<CatalogoPrenda>(`/empleados/catalogo/${id}`, data),

  // Resumen del día
  getResumen: () =>
    get<{ recolectados: number; enProceso: number; listos: number; entregadosHoy: number }>(
      '/empleados/resumen',
    ),

  // Ventas diarias para el gráfico
  getVentasDiarias: (dias = 14) =>
    get<{ fecha: string; totalPedidos: number; entregados: number; ingresos: number }[]>(
      `/empleados/ventas-diarias?dias=${dias}`,
    ),

  // Buscar clientes registrados por nombre/email/teléfono
  buscarClientes: (q: string) =>
    get<{ id: string; nombre: string; apellido: string; email: string; telefono?: string }[]>(
      `/empleados/clientes?q=${encodeURIComponent(q)}`,
    ),

  // Obtener direcciones de un cliente
  getDireccionesCliente: (clienteId: string) =>
    get<Direccion[]>(`/empleados/clientes/${clienteId}/direcciones`),
  getHistorialCliente: (clienteId: string) =>
    get<Pedido[]>(`/empleados/clientes/${clienteId}/pedidos`),

  // Crea un pedido para un cliente que llega físicamente a la tienda (actualizado)
  crearPedidoPresencial: (data: {
    clienteNombre?: string;
    clienteApellido?: string;
    clienteTelefono?: string;
    clienteId?: string;
    prendas: { tipo: string; cantidad: number }[];
    metodoPago: 'EFECTIVO' | 'PAYPAL';
    notasInternas?: string;
    direccionEntregaId?: string;
    direccionNueva?: {
      calle: string;
      numero: string;
      colonia: string;
      ciudad: string;
      estado?: string;
      codigoPostal?: string;
    };
  }) => post<{ mensaje: string; pedido: Pedido }>('/empleados/pedidos', data),

  // Membresías
  getMembresias: () => get<any[]>('/empleados/membresias'),
  getMembresiasCliente: (clienteId: string) => get<any[]>(`/empleados/membresias/${clienteId}`),
  activarMembresia: (clienteId: string, tipo: string) =>
    post<{ mensaje: string; membresia: any }>(`/empleados/membresias/${clienteId}/activar`, { tipo }),
};

// ═══════════════════════════════════════════════════════════════
//  PAGOS
// ═══════════════════════════════════════════════════════════════
export const pagosApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<{
      pagos: Pago[];
      resumen: { totalRegistros: number; montoTotal: number };
      paginacion: { total: number; pagina: number; porPagina: number; totalPaginas: number };
    }>(`/pagos${qs}`);
  },
  reembolsar: (id: string) =>
    patch<{ mensaje: string; pago: Pago }>(`/pagos/${id}/reembolsar`, {}),
};

// ═══════════════════════════════════════════════════════════════
//  CLIENTE
// ═══════════════════════════════════════════════════════════════
export const clienteApi = {
  getPerfil: () => get<any>('/clientes/perfil'),
  actualizarPerfil: (data: any) => patch<any>('/clientes/perfil', data),
  cambiarPassword: (data: any) => patch<any>('/clientes/password', data),
  getDirecciones: () => get<Direccion[]>('/clientes/direcciones'),
  crearDireccion: (data: any) => post<Direccion>('/clientes/direcciones', data),
  actualizarDireccion: (id: string, data: any) => patch<Direccion>(`/clientes/direcciones/${id}`, data),
  eliminarDireccion: (id: string) => apiFetch(`/clientes/direcciones/${id}`, { method: 'DELETE' }),
  eliminarCuenta: () => apiFetch<{ mensaje: string }>('/clientes/cuenta', { method: 'DELETE' }),
  getCatalogo: () => get<CatalogoPrenda[]>('/clientes/catalogo'),
  createOrder: (data: any) => post<{ pedido: Pedido }>('/pedidos', data),
  getPedidos: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<{ pedidos: Pedido[], paginacion: any }>(`/clientes/pedidos${qs}`);
  },
  calificarPedido: (id: string, data: any) => post<any>(`/clientes/pedidos/${id}/calificar`, data),
  getPuntos: () => get<any>('/clientes/puntos'),
  canjearPuntos: (data: any) => post<any>('/clientes/puntos/canjear', data),
  getMembresias: () => get<any[]>('/clientes/membresias'),
  crearOrdenPaypalMembresia: (tipo: string) => post<any>('/clientes/membresias/paypal/crear-orden', { tipo }),
  capturarPagoPaypalMembresia: (data: any) => post<any>('/clientes/membresias/paypal/capturar', data),
  // PayPal for orders
  crearOrdenPaypalPedido: (pedidoId: string) => post<any>('/pagos/paypal/crear-orden', { pedidoId }),
  capturarPagoPaypalPedido: (data: any) => post<any>('/pagos/paypal/capturar', data),
  // Cash
  registrarPagoEfectivo: (pedidoId: string) => post<any>('/pagos/efectivo/registrar', { pedidoId }),
};

// ═══════════════════════════════════════════════════════════════
//  B2B
// ═══════════════════════════════════════════════════════════════
export const b2bApi = {
  list: () => get<EmpresaB2B[]>('/admin/b2b'),
  get: (id: string) => get<EmpresaB2B>(`/admin/b2b/${id}`),
  crear: (data: Partial<EmpresaB2B>) => post<EmpresaB2B>('/admin/b2b', data),
  actualizar: (id: string, data: Partial<EmpresaB2B>) =>
    patch<EmpresaB2B>(`/admin/b2b/${id}`, data),
  toggleActiva: (id: string, activa: boolean) =>
    patch<{ mensaje: string }>(`/admin/b2b/${id}/estado`, { activa }),
  getContrato: (empresaId: string) => get<ContratoB2B>(`/admin/b2b/${empresaId}/contrato`),
  crearContrato: (empresaId: string, data: Partial<ContratoB2B>) =>
    post<ContratoB2B>(`/admin/b2b/${empresaId}/contrato`, data),
};
