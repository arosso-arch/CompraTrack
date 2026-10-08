// Tipos que reflejan los DTOs de la API (CompraTrack.Api/Features/*).

export type EstadoOrden = 'ABIERTA' | 'CERRADA' | 'ANULADA'
export type EstadoEntrega = 'EN ESPERA' | 'ENTREGA PARCIAL' | 'ENTREGA COMPLETA' | 'CANTIDAD SUPERADA'

export const PERMISOS = {
  ordenesVer: 'ordenes.ver',
  ordenesCrear: 'ordenes.crear',
  ordenesEditar: 'ordenes.editar',
  ordenesCerrar: 'ordenes.cerrar',
  ordenesEnviar: 'ordenes.enviar',
  recepcionesRegistrar: 'recepciones.registrar',
  recepcionesAnular: 'recepciones.anular',
  proveedoresVer: 'proveedores.ver',
  proveedoresGestionar: 'proveedores.gestionar',
  productosVer: 'productos.ver',
  productosGestionar: 'productos.gestionar',
  reportesVer: 'reportes.ver',
} as const
export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

// ---------- Auth ----------

export interface UsuarioSesion {
  id: number
  nombreUsuario: string
  nombreCompleto: string
  email: string
  rol: string
  permisos: string[]
}

export interface LoginResponse {
  token: string
  expira: string
  usuario: UsuarioSesion
}

// ---------- Comunes ----------

export interface ResultadoPaginado<T> {
  items: T[]
  total: number
  pagina: number
  tamanioPagina: number
  totalPaginas: number
}

export interface Opcion {
  id: number
  nombre: string
}

// ---------- Proveedores y catálogo ----------

export interface Proveedor {
  id: number
  codigo: number
  razonSocial: string
  contacto: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  activo: boolean
  ordenesAbiertas: number
}

export interface GuardarProveedor {
  codigo: number
  razonSocial: string
  contacto: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
}

export interface ProveedorProducto {
  id: number
  tipoProductoId: number
  tipo: string
  gramajeId: number
  gramos: number
  formatoId: number
  formato: string
  cantidadUsos: number
  activo: boolean
}

export interface TipoProducto {
  id: number
  nombre: string
  activo: boolean
}

export interface Gramaje {
  id: number
  gramos: number
}

export interface Formato {
  id: number
  descripcion: string
}

// ---------- Órdenes ----------

export interface OrdenResumen {
  id: number
  numero: number
  fecha: string
  proveedorId: number
  proveedor: string
  concepto: string
  estado: EstadoOrden
  creadaPor: string
  cantidadItems: number
  itemsPendientes: number
  totalPedidoKg: number
  totalRecibidoKg: number
}

export interface OrdenItem {
  id: number
  tipoProductoId: number
  tipo: string
  gramajeId: number
  gramos: number
  formatoId: number
  formato: string
  detalle: string | null
  cantidadKg: number
  recibidoKg: number
  diferenciaKg: number
  estadoEntrega: EstadoEntrega
}

export interface OrdenDetalle {
  id: number
  numero: number
  fecha: string
  proveedorId: number
  proveedor: string
  proveedorContacto: string | null
  proveedorEmail: string | null
  proveedorTelefono: string | null
  concepto: string
  formaPago: string | null
  observaciones: string | null
  estado: EstadoOrden
  creadaPor: string
  fechaCreacion: string
  fechaCierre: string | null
  items: OrdenItem[]
  envios: EnvioOrden[]
  totalPedidoKg: number
  totalRecibidoKg: number
}

export interface EnvioOrden {
  id: number
  destinatario: string
  asunto: string
  enviadoPor: string
  fechaEnvio: string
}

export interface BorradorEnvio {
  destinatario: string | null
  asunto: string
  mensaje: string
}

export interface EnviarOrden {
  destinatario: string
  asunto: string | null
  mensaje: string | null
}

export interface ResultadoEnvio {
  /** false en modo demostración: el mail se generó pero no se envió. */
  envioReal: boolean
  mensaje: string
  orden: OrdenDetalle
}

export interface FiltroOrdenes {
  estado?: EstadoOrden | ''
  proveedorId?: number | ''
  desde?: string
  hasta?: string
  buscar?: string
  pagina: number
  tamanioPagina: number
}

export interface ItemNuevo {
  tipoProductoId: number
  gramajeId: number
  formatoId: number
  detalle: string | null
  cantidadKg: number
}

export interface CrearOrden {
  fecha: string
  proveedorId: number
  concepto: string
  formaPago: string | null
  observaciones: string | null
  items: ItemNuevo[]
}

export interface ActualizarOrden {
  fecha: string
  concepto: string
  formaPago: string | null
  observaciones: string | null
}

// ---------- Recepciones ----------

export interface Recepcion {
  id: number
  ordenCompraItemId: number
  ordenCompraId: number
  numeroOrden: number
  proveedor: string
  producto: string
  fecha: string
  cantidadKg: number
  remito: string | null
  observaciones: string | null
  registradaPor: string
  activo: boolean
  fechaRegistro: string
}

export interface RegistrarRecepcion {
  fecha: string
  cantidadKg: number
  remito: string | null
  observaciones: string | null
}

// ---------- Reportes ----------

export interface Resumen {
  ordenesAbiertas: number
  itemsPendientes: number
  kgPendientes: number
  ordenesCreadasMes: number
  kgRecibidosMes: number
  recepcionesHoy: number
}

export interface Pendiente {
  ordenCompraId: number
  numeroOrden: number
  fechaOrden: string
  diasAbierta: number
  proveedor: string
  ordenCompraItemId: number
  producto: string
  cantidadPedidaKg: number
  cantidadRecibidaKg: number
  pendienteKg: number
  estadoEntrega: EstadoEntrega
}

export interface KilosPorGrupo {
  grupo: string
  kgRecibidos: number
  recepciones: number
}

export interface KilosPorMes {
  mes: number
  tipo: string
  kgRecibidos: number
}
