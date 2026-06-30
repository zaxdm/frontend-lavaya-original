// types/index.ts — Tipos TypeScript alineados con los modelos Prisma de LavaYa

// ─── Enums ────────────────────────────────────────────────────
export type Rol = 'CLIENTE' | 'REPARTIDOR' | 'ADMIN' | 'EMPLEADO';

export type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'RECOLECTADO'
  | 'EN_PROCESO'
  | 'LISTO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'RETRASADO'
  | 'REPROGRAMADO';

export type EstadoPago = 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO' | 'REEMBOLSADO';
export type MetodoPago = 'PAYPAL' | 'EFECTIVO';
export type EstadoRepartidor = 'DISPONIBLE' | 'OCUPADO' | 'INACTIVO';
export type TipoMembresia = 'BASICO' | 'PREMIUM' | 'EMPRESARIAL';
export type EstadoMembresia = 'ACTIVA' | 'EXPIRADA' | 'CANCELADA';

// ─── Entidades base ───────────────────────────────────────────
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  rol: Rol;
  activo: boolean;
  emailVerificado: boolean;
  fotoPerfil?: string | null;
  createdAt: string;
  updatedAt: string;
  // relaciones opcionales (se incluyen según endpoint)
  repartidor?: Repartidor | null;
  puntos?: { saldo: number } | null;
  membresias?: Membresia[];
  direcciones?: Direccion[];
}

export interface Repartidor {
  id: string;
  usuarioId: string;
  vehiculo?: string | null;
  placas?: string | null;
  licencia?: string | null;
  estado: EstadoRepartidor;
  latitudActual?: number | null;
  longitudActual?: number | null;
  calificacionPromedio: number;
  totalServicios: number;
  createdAt: string;
  updatedAt: string;
  usuario?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email' | 'telefono' | 'activo'>;
}

export interface Direccion {
  id: string;
  usuarioId: string;
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  referencia?: string | null;
  esPrincipal: boolean;
  latitud?: number | null;
  longitud?: number | null;
  createdAt: string;
}

export interface Prenda {
  id: string;
  pedidoId: string;
  tipo: string;
  cantidad: number;
  descripcion?: string | null;
  precio: number;
  createdAt: string;
}

export interface CatalogoPrenda {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioUnitario: number;
  precioExtra: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pago {
  id: string;
  pedidoId: string;
  monto: number;
  metodoPago: MetodoPago;
  estado: EstadoPago;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  recolectadoPor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistorialPedido {
  id: string;
  pedidoId: string;
  estado: EstadoPedido;
  nota?: string | null;
  creadoPor?: string | null;
  createdAt: string;
}

export interface Pedido {
  id: string;
  clienteId: string;
  direccionId: string;
  repartidorRecoleccionId?: string | null;
  repartidorEntregaId?: string | null;
  estado: EstadoPedido;
  totalPrendas: number;
  tienePrendasExtra: boolean;
  fechaRecoleccion?: string | null;
  fechaEntregaEstimada?: string | null;
  fechaEntregaReal?: string | null;
  notasCliente?: string | null;
  notasInternas?: string | null;
  createdAt: string;
  updatedAt: string;
  // relaciones
  cliente?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email' | 'telefono'>;
  direccion?: Direccion;
  prendas?: Prenda[];
  pago?: Pago | null;
  historial?: HistorialPedido[];
  repartidorRecoleccion?: { usuario: Pick<Usuario, 'nombre' | 'apellido' | 'telefono'> } | null;
  repartidorEntrega?: { usuario: Pick<Usuario, 'nombre' | 'apellido' | 'telefono'> } | null;
  calificacion?: Calificacion | null;
}

export interface Puntos {
  id: string;
  usuarioId: string;
  saldo: number;
  totalGanados: number;
  totalCanjeados: number;
  movimientos?: MovimientoPuntos[];
}

export interface MovimientoPuntos {
  id: string;
  puntosId: string;
  cantidad: number;
  concepto: string;
  pedidoId?: string | null;
  createdAt: string;
}

export interface Membresia {
  id: string;
  usuarioId: string;
  tipo: TipoMembresia;
  estado: EstadoMembresia;
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  descuento: number;
  pedidosGratis: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmpresaB2B {
  id: string;
  nombre: string;
  rfc?: string | null;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  duenoId: string;
  activa: boolean;
  descuentoFijo: number;
  limiteCredito: number;
  createdAt: string;
  updatedAt: string;
  dueno?: Pick<Usuario, 'nombre' | 'apellido' | 'email'>;
  contrato?: ContratoB2B | null;
  empleados?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email'>[];
}

export interface ContratoB2B {
  id: string;
  empresaId: string;
  fechaInicio: string;
  fechaFin: string;
  condiciones?: string | null;
  pedidosMensuales: number;
  activo: boolean;
  createdAt: string;
}

export interface Calificacion {
  id: string;
  pedidoId: string;
  repartidorId: string;
  estrellas: number;
  comentario?: string | null;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  // Campos opcionales que el backend incluye en /auth/me y /auth/login
  telefono?: string | null;
  fotoPerfil?: string | null;
  activo?: boolean;
}

export interface LoginResponse {
  usuario: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// ─── API responses genéricas ──────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  paginacion: {
    total: number;
    pagina: number;
    porPagina: number;
    totalPaginas: number;
  };
}

export interface ApiError {
  error: string;
  detalle?: { campo: string; mensaje: string }[];
}

// ─── Dashboard stats ──────────────────────────────────────────
export interface DashboardStats {
  usuarios: { total: number; clientes: number; repartidores: number };
  pedidos: {
    total: number;
    hoy: number;
    esteMes: number;
    pendientes: number;
    enProceso: number;
  };
  ingresos: { total: number; hoy: number; esteMes: number };
  repartidoresDisponibles: number;
}

export interface PedidosPorDia {
  fecha: string;
  total: number;
  entregados: number;
  cancelados: number;
}

export interface IngresosPorDia {
  fecha: string;
  totalPagos: number;
  ingresoTotal: number;
  ingresoPaypal: number;
  ingresoEfectivo: number;
}
