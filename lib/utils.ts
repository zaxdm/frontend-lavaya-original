// lib/utils.ts — Utilidades compartidas
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EstadoPedido, EstadoPago, EstadoRepartidor } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formateo de moneda ───────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Formateo de fechas ───────────────────────────────────────
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

// ─── Labels de estados ────────────────────────────────────────
export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  PENDIENTE:   'Pendiente',
  CONFIRMADO:  'Confirmado',
  RECOLECTADO: 'Por lavar',
  EN_PROCESO:  'En lavado',
  LISTO:       'Listo para entrega',
  EN_CAMINO:   'En camino',
  ENTREGADO:   'Entregado',
  CANCELADO:   'Cancelado',
};

// ── 4 estados que VE EL CLIENTE (simplificados) ───────────────
//   Por recoger  = PENDIENTE + CONFIRMADO
//   En lavandería = RECOLECTADO + EN_PROCESO + LISTO
//   En camino   = EN_CAMINO
//   Entregado   = ENTREGADO
export const ESTADO_PEDIDO_LABEL_CLIENTE: Record<EstadoPedido, string> = {
  PENDIENTE:   'Por recoger',
  CONFIRMADO:  'Por recoger',
  RECOLECTADO: 'En lavandería',
  EN_PROCESO:  'En lavandería',
  LISTO:       'En lavandería',
  EN_CAMINO:   'En camino',
  ENTREGADO:   'Entregado',
  CANCELADO:   'Cancelado',
};

export const ESTADO_PEDIDO_COLOR_CLIENTE: Record<EstadoPedido, string> = {
  PENDIENTE:   'bg-yellow-100 text-yellow-800',
  CONFIRMADO:  'bg-blue-100 text-blue-800',
  RECOLECTADO: 'bg-purple-100 text-purple-800',
  EN_PROCESO:  'bg-purple-100 text-purple-800',
  LISTO:       'bg-purple-100 text-purple-800',
  EN_CAMINO:   'bg-orange-100 text-orange-800',
  ENTREGADO:   'bg-green-100 text-green-800',
  CANCELADO:   'bg-red-100 text-red-800',
};

// Descripción amigable para el cliente (lo que le importa saber)
export const ESTADO_PEDIDO_DESC_CLIENTE: Record<EstadoPedido, string> = {
  PENDIENTE:   'Recibimos tu pedido y estamos coordinando la recolección',
  CONFIRMADO:  'Un repartidor va a recoger tus prendas',
  RECOLECTADO: 'Tus prendas están en la lavandería',
  EN_PROCESO:  'Tus prendas se están lavando',
  LISTO:       'Tus prendas están listas',
  EN_CAMINO:   'Tus prendas están en camino hacia ti',
  ENTREGADO:   '¡Tus prendas fueron entregadas!',
  CANCELADO:   'El pedido fue cancelado',
};

// Etiquetas del empleado/admin
export const ESTADO_PEDIDO_LABEL_SIMPLE: Record<EstadoPedido, string> = {
  PENDIENTE:   'Por recoger',
  CONFIRMADO:  'Por recoger',
  RECOLECTADO: 'En lavandería',
  EN_PROCESO:  'En lavandería',
  LISTO:       'En lavandería',
  EN_CAMINO:   'En camino',
  ENTREGADO:   'Entregado',
  CANCELADO:   'Cancelado',
};

// Grupo interno para filtros — 4 grupos visibles
export const GRUPO_ESTADO: Record<EstadoPedido, string> = {
  PENDIENTE:   'por_recoger',
  CONFIRMADO:  'por_recoger',
  RECOLECTADO: 'en_lavanderia',
  EN_PROCESO:  'en_lavanderia',
  LISTO:       'en_lavanderia',
  EN_CAMINO:   'camino',
  ENTREGADO:   'entregado',
  CANCELADO:   'cancelado',
};

export const ESTADO_PEDIDO_COLOR: Record<EstadoPedido, string> = {
  PENDIENTE:   'bg-yellow-100 text-yellow-800',
  CONFIRMADO:  'bg-blue-100 text-blue-800',
  RECOLECTADO: 'bg-purple-100 text-purple-800',
  EN_PROCESO:  'bg-purple-100 text-purple-800',
  LISTO:       'bg-teal-100 text-teal-800',
  EN_CAMINO:   'bg-orange-100 text-orange-800',
  ENTREGADO:   'bg-green-100 text-green-800',
  CANCELADO:   'bg-red-100 text-red-800',
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  PENDIENTE:   'Pendiente',
  COMPLETADO:  'Completado',
  FALLIDO:     'Fallido',
  REEMBOLSADO: 'Reembolsado',
};

export const ESTADO_PAGO_COLOR: Record<EstadoPago, string> = {
  PENDIENTE:   'bg-yellow-100 text-yellow-800',
  COMPLETADO:  'bg-green-100 text-green-800',
  FALLIDO:     'bg-red-100 text-red-800',
  REEMBOLSADO: 'bg-gray-100 text-gray-800',
};

export const ESTADO_REPARTIDOR_LABEL: Record<EstadoRepartidor, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADO:    'Ocupado',
  INACTIVO:   'Inactivo',
};

export const ESTADO_REPARTIDOR_COLOR: Record<EstadoRepartidor, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800',
  OCUPADO:    'bg-yellow-100 text-yellow-800',
  INACTIVO:   'bg-gray-100 text-gray-800',
};
