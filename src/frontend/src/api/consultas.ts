import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './cliente'
import type {
  ActualizarOrden, CrearOrden, FiltroOrdenes, Formato, Gramaje, GuardarProveedor, ItemNuevo, KilosPorGrupo,
  KilosPorMes, Opcion, OrdenDetalle, OrdenResumen, Pendiente, Proveedor, ProveedorProducto, Recepcion,
  RegistrarRecepcion, ResultadoPaginado, Resumen, TipoProducto,
} from './tipos'

/** Claves de caché centralizadas: invalidar "ordenes" refresca listados, detalles y tablero a la vez. */
export const claves = {
  ordenes: ['ordenes'] as const,
  orden: (id: number) => ['ordenes', id] as const,
  recepcionesItem: (ordenId: number, itemId: number) => ['ordenes', ordenId, 'items', itemId, 'recepciones'] as const,
  recepciones: ['recepciones'] as const,
  reportes: ['reportes'] as const,
  proveedores: ['proveedores'] as const,
  catalogo: ['catalogo'] as const,
}

// ---------- Órdenes ----------

export const useOrdenes = (filtro: FiltroOrdenes) =>
  useQuery({
    queryKey: [...claves.ordenes, 'lista', filtro],
    queryFn: () => api<ResultadoPaginado<OrdenResumen>>('/api/ordenes', { parametros: { ...filtro } }),
    placeholderData: keepPreviousData,   // al cambiar de página no parpadea la tabla
  })

export const useOrden = (id: number) =>
  useQuery({ queryKey: claves.orden(id), queryFn: () => api<OrdenDetalle>(`/api/ordenes/${id}`) })

/** Invalida todo lo que puede cambiar al modificar una orden o sus recepciones. */
function useInvalidarOrdenes() {
  const qc = useQueryClient()
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: claves.ordenes }),
    qc.invalidateQueries({ queryKey: claves.reportes }),
    qc.invalidateQueries({ queryKey: claves.recepciones }),
  ])
}

export function useCrearOrden() {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (orden: CrearOrden) => api<OrdenDetalle>('/api/ordenes', { metodo: 'POST', cuerpo: orden }),
    onSuccess: invalidar,
  })
}

export function useActualizarOrden(id: number) {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (datos: ActualizarOrden) => api<OrdenDetalle>(`/api/ordenes/${id}`, { metodo: 'PUT', cuerpo: datos }),
    onSuccess: invalidar,
  })
}

export function useCambiarEstadoOrden(id: number) {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (accion: 'cerrar' | 'reabrir' | 'anular') => api<OrdenDetalle>(`/api/ordenes/${id}/${accion}`, { metodo: 'POST' }),
    onSuccess: invalidar,
  })
}

export function useAgregarItem(ordenId: number) {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (item: ItemNuevo) => api<OrdenDetalle>(`/api/ordenes/${ordenId}/items`, { metodo: 'POST', cuerpo: item }),
    onSuccess: invalidar,
  })
}

export function useQuitarItem(ordenId: number) {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (itemId: number) => api<OrdenDetalle>(`/api/ordenes/${ordenId}/items/${itemId}`, { metodo: 'DELETE' }),
    onSuccess: invalidar,
  })
}

// ---------- Recepciones ----------

export const useRecepcionesItem = (ordenId: number, itemId: number, habilitado: boolean) =>
  useQuery({
    queryKey: claves.recepcionesItem(ordenId, itemId),
    queryFn: () => api<Recepcion[]>(`/api/ordenes/${ordenId}/items/${itemId}/recepciones`),
    enabled: habilitado,
  })

export const useRecepciones = (filtro: { desde?: string; hasta?: string; proveedorId?: number | '' }) =>
  useQuery({
    queryKey: [...claves.recepciones, filtro],
    queryFn: () => api<Recepcion[]>('/api/recepciones', { parametros: filtro }),
    placeholderData: keepPreviousData,
  })

export function useRegistrarRecepcion(ordenId: number) {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: ({ itemId, datos }: { itemId: number; datos: RegistrarRecepcion }) =>
      api<Recepcion>(`/api/ordenes/${ordenId}/items/${itemId}/recepciones`, { metodo: 'POST', cuerpo: datos }),
    onSuccess: invalidar,
  })
}

export function useAnularRecepcion() {
  const invalidar = useInvalidarOrdenes()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/recepciones/${id}`, { metodo: 'DELETE' }),
    onSuccess: invalidar,
  })
}

// ---------- Proveedores ----------

export const useProveedores = (filtro: { activo?: boolean; buscar?: string } = {}) =>
  useQuery({
    queryKey: [...claves.proveedores, 'lista', filtro],
    queryFn: () => api<Proveedor[]>('/api/proveedores', { parametros: filtro }),
  })

export const useProveedor = (id: number) =>
  useQuery({ queryKey: [...claves.proveedores, id], queryFn: () => api<Proveedor>(`/api/proveedores/${id}`) })

export function useGuardarProveedor(id?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: GuardarProveedor) =>
      id ? api<Proveedor>(`/api/proveedores/${id}`, { metodo: 'PUT', cuerpo: datos })
         : api<Proveedor>('/api/proveedores', { metodo: 'POST', cuerpo: datos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.proveedores }),
  })
}

export function useCambiarEstadoProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api<void>(`/api/proveedores/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.proveedores }),
  })
}

export const useProductosProveedor = (proveedorId: number) =>
  useQuery({
    queryKey: [...claves.proveedores, proveedorId, 'productos'],
    queryFn: () => api<ProveedorProducto[]>(`/api/proveedores/${proveedorId}/productos`),
  })

export function useAgregarProductoProveedor(proveedorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: { tipoProductoId: number; gramajeId: number; formatoId: number }) =>
      api<{ id: number }>(`/api/proveedores/${proveedorId}/productos`, { metodo: 'POST', cuerpo: datos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.proveedores }),
  })
}

export function useCambiarEstadoProductoProveedor(proveedorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api<void>(`/api/proveedores/${proveedorId}/productos/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.proveedores }),
  })
}

// Combos en cascada: cada nivel se pide solo cuando el anterior está elegido.
export const useOpcionesTipos = (proveedorId: number | undefined) =>
  useQuery({
    queryKey: [...claves.proveedores, proveedorId, 'opciones', 'tipos'],
    queryFn: () => api<Opcion[]>(`/api/proveedores/${proveedorId}/opciones/tipos`),
    enabled: !!proveedorId,
  })

export const useOpcionesGramajes = (proveedorId: number | undefined, tipoProductoId: number | undefined) =>
  useQuery({
    queryKey: [...claves.proveedores, proveedorId, 'opciones', 'gramajes', tipoProductoId],
    queryFn: () => api<Opcion[]>(`/api/proveedores/${proveedorId}/opciones/gramajes`, { parametros: { tipoProductoId } }),
    enabled: !!proveedorId && !!tipoProductoId,
  })

export const useOpcionesFormatos = (proveedorId: number | undefined, tipoProductoId: number | undefined, gramajeId: number | undefined) =>
  useQuery({
    queryKey: [...claves.proveedores, proveedorId, 'opciones', 'formatos', tipoProductoId, gramajeId],
    queryFn: () => api<Opcion[]>(`/api/proveedores/${proveedorId}/opciones/formatos`, { parametros: { tipoProductoId, gramajeId } }),
    enabled: !!proveedorId && !!tipoProductoId && !!gramajeId,
  })

// ---------- Catálogo ----------

const DIEZ_MINUTOS = 10 * 60 * 1000   // el catálogo casi no cambia

export const useTipos = () =>
  useQuery({ queryKey: [...claves.catalogo, 'tipos'], queryFn: () => api<TipoProducto[]>('/api/catalogo/tipos'), staleTime: DIEZ_MINUTOS })
export const useGramajes = () =>
  useQuery({ queryKey: [...claves.catalogo, 'gramajes'], queryFn: () => api<Gramaje[]>('/api/catalogo/gramajes'), staleTime: DIEZ_MINUTOS })
export const useFormatos = () =>
  useQuery({ queryKey: [...claves.catalogo, 'formatos'], queryFn: () => api<Formato[]>('/api/catalogo/formatos'), staleTime: DIEZ_MINUTOS })

// ---------- Reportes ----------

export const useResumen = () =>
  useQuery({ queryKey: [...claves.reportes, 'resumen'], queryFn: () => api<Resumen>('/api/reportes/resumen') })

export const usePendientes = () =>
  useQuery({ queryKey: [...claves.reportes, 'pendientes'], queryFn: () => api<Pendiente[]>('/api/reportes/pendientes') })

export const useKilosPorProveedor = (desde: string, hasta: string) =>
  useQuery({
    queryKey: [...claves.reportes, 'kilos-proveedor', desde, hasta],
    queryFn: () => api<KilosPorGrupo[]>('/api/reportes/kilos-por-proveedor', { parametros: { desde, hasta } }),
  })

export const useKilosPorTipo = (desde: string, hasta: string) =>
  useQuery({
    queryKey: [...claves.reportes, 'kilos-tipo', desde, hasta],
    queryFn: () => api<KilosPorGrupo[]>('/api/reportes/kilos-por-tipo', { parametros: { desde, hasta } }),
  })

export const useKilosPorMes = (anio: number) =>
  useQuery({
    queryKey: [...claves.reportes, 'kilos-mes', anio],
    queryFn: () => api<KilosPorMes[]>('/api/reportes/kilos-por-mes', { parametros: { anio } }),
  })

export const useAniosReportes = () =>
  useQuery({ queryKey: [...claves.reportes, 'anios'], queryFn: () => api<number[]>('/api/reportes/anios') })
