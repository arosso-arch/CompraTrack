import { useOpcionesFormatos, useOpcionesGramajes, useOpcionesTipos } from '@/api/consultas'
import { Campo, Select } from './ui'

export interface ProductoElegido {
  tipoProductoId?: number
  gramajeId?: number
  formatoId?: number
}

/**
 * Tres combos en cascada: tipo → gramaje → formato.
 * Solo ofrece las combinaciones que el proveedor tiene cargadas, y al cambiar un nivel se limpian los siguientes.
 */
export function SelectorProducto({ proveedorId, valor, alCambiar, error }: {
  proveedorId: number | undefined
  valor: ProductoElegido
  alCambiar: (valor: ProductoElegido) => void
  error?: string
}) {
  const tipos = useOpcionesTipos(proveedorId)
  const gramajes = useOpcionesGramajes(proveedorId, valor.tipoProductoId)
  const formatos = useOpcionesFormatos(proveedorId, valor.tipoProductoId, valor.gramajeId)

  const aNumero = (texto: string) => (texto ? Number(texto) : undefined)
  const marcador = (cargando: boolean, habilitado: boolean, texto: string) =>
    !habilitado ? '—' : cargando ? 'Cargando…' : texto

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Campo etiqueta="Tipo" error={error && !valor.tipoProductoId ? error : undefined}>
        {(id) => (
          <Select id={id} value={valor.tipoProductoId ?? ''} disabled={!proveedorId} invalido={!!error && !valor.tipoProductoId}
                  onChange={(e) => alCambiar({ tipoProductoId: aNumero(e.target.value) })}>
            <option value="">{marcador(tipos.isFetching, !!proveedorId, 'Elegí un tipo')}</option>
            {tipos.data?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </Select>
        )}
      </Campo>
      <Campo etiqueta="Gramaje" error={error && valor.tipoProductoId && !valor.gramajeId ? error : undefined}>
        {(id) => (
          <Select id={id} value={valor.gramajeId ?? ''} disabled={!valor.tipoProductoId} invalido={!!error && !!valor.tipoProductoId && !valor.gramajeId}
                  onChange={(e) => alCambiar({ tipoProductoId: valor.tipoProductoId, gramajeId: aNumero(e.target.value) })}>
            <option value="">{marcador(gramajes.isFetching, !!valor.tipoProductoId, 'Elegí un gramaje')}</option>
            {gramajes.data?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </Select>
        )}
      </Campo>
      <Campo etiqueta="Formato" error={error && valor.gramajeId && !valor.formatoId ? error : undefined}>
        {(id) => (
          <Select id={id} value={valor.formatoId ?? ''} disabled={!valor.gramajeId} invalido={!!error && !!valor.gramajeId && !valor.formatoId}
                  onChange={(e) => alCambiar({ ...valor, formatoId: aNumero(e.target.value) })}>
            <option value="">{marcador(formatos.isFetching, !!valor.gramajeId, 'Elegí un formato')}</option>
            {formatos.data?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </Select>
        )}
      </Campo>
    </div>
  )
}
