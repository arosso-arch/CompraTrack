import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { useOrdenes, useProveedores } from '@/api/consultas'
import { PERMISOS, type EstadoOrden, type FiltroOrdenes } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { BarraProgreso, Boton, EncabezadoPagina, Input, InsigniaEstadoOrden, Paginacion, Select, Tarjeta } from '@/components/ui'
import { cx } from '@/lib/cx'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { formatoFecha, formatoKg } from '@/lib/formato'

const TAMANIO_PAGINA = 15

export function Ordenes() {
  const { tienePermiso } = useAuth()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()

  // Los filtros viven en la URL (?estado=ABIERTA&pagina=2): se pueden compartir y el botón "atrás" los respeta.
  const filtro: FiltroOrdenes = {
    estado: (params.get('estado') ?? '') as EstadoOrden | '',
    proveedorId: params.get('proveedorId') ? Number(params.get('proveedorId')) : '',
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    buscar: params.get('buscar') ?? '',
    pagina: Number(params.get('pagina') ?? 1),
    tamanioPagina: TAMANIO_PAGINA,
  }

  const cambiarFiltro = (cambios: Partial<Record<keyof FiltroOrdenes, string | number>>) => {
    const nuevos = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === '' || valor === undefined) nuevos.delete(clave)
      else nuevos.set(clave, String(valor))
    }
    if (!('pagina' in cambios)) nuevos.delete('pagina')   // un filtro nuevo vuelve a la página 1
    setParams(nuevos, { replace: true })
  }

  const ordenes = useOrdenes(filtro)
  const proveedores = useProveedores()
  const hayFiltros = Boolean(filtro.estado || filtro.proveedorId || filtro.desde || filtro.hasta || filtro.buscar)

  return (
    <>
      <EncabezadoPagina
        titulo="Órdenes de compra"
        subtitulo="Seguimiento de pedidos a proveedores y de su entrega."
        acciones={tienePermiso(PERMISOS.ordenesCrear) && (
          <Link to="/ordenes/nueva"><Boton icono={<Plus className="size-4" />}>Nueva orden</Boton></Link>
        )}
      />

      <Tarjeta sinPadding>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12">
          <BuscadorDiferido valor={filtro.buscar ?? ''} alCambiar={(buscar) => cambiarFiltro({ buscar })} />
          <Select aria-label="Estado" className="xl:col-span-2" value={filtro.estado} onChange={(e) => cambiarFiltro({ estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abiertas</option>
            <option value="CERRADA">Cerradas</option>
            <option value="ANULADA">Anuladas</option>
          </Select>
          <Select aria-label="Proveedor" className="xl:col-span-3" value={filtro.proveedorId} onChange={(e) => cambiarFiltro({ proveedorId: e.target.value })}>
            <option value="">Todos los proveedores</option>
            {proveedores.data?.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </Select>
          <FiltroFecha etiqueta="Desde" valor={filtro.desde ?? ''} alCambiar={(desde) => cambiarFiltro({ desde })} />
          <FiltroFecha etiqueta="Hasta" valor={filtro.hasta ?? ''} alCambiar={(hasta) => cambiarFiltro({ hasta })} />
        </div>

        {ordenes.isPending ? <Cargando /> : ordenes.isError ? <div className="p-5"><MensajeError error={ordenes.error} /></div>
          : ordenes.data.items.length === 0 ? (
            <Vacio titulo="No hay órdenes para mostrar">
              {hayFiltros && <button className="text-marca-700 hover:underline" onClick={() => setParams({})}>Limpiar filtros</button>}
            </Vacio>
          ) : (
            <div className={cx('relative overflow-x-auto transition-opacity', ordenes.isPlaceholderData && 'opacity-60')}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Número</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Proveedor</th>
                    <th className="hidden px-3 py-3 md:table-cell">Concepto</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3 text-right">Pedido</th>
                    <th className="hidden w-44 px-5 py-3 lg:table-cell">Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordenes.data.items.map((o) => (
                    <tr key={o.id} onClick={() => navegar(`/ordenes/${o.id}`)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <Link to={`/ordenes/${o.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">OC {o.numero}</Link>
                      </td>
                      <td className="tabular px-3 py-3 text-slate-600">{formatoFecha(o.fecha)}</td>
                      <td className="max-w-56 truncate px-3 py-3 text-slate-700">{o.proveedor}</td>
                      <td className="hidden max-w-48 truncate px-3 py-3 text-slate-500 md:table-cell">{o.concepto}</td>
                      <td className="px-3 py-3">
                        <InsigniaEstadoOrden estado={o.estado} />
                        {o.estado === 'ABIERTA' && o.itemsPendientes > 0 && (
                          <span className="ml-2 text-xs text-amber-700">{o.itemsPendientes} pend.</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3 text-right text-slate-700">{formatoKg(o.totalPedidoKg)}</td>
                      <td className="hidden px-5 py-3 lg:table-cell">
                        {o.estado !== 'ANULADA' && <BarraProgreso recibido={o.totalRecibidoKg} pedido={o.totalPedidoKg} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {ordenes.data && (
          <Paginacion pagina={ordenes.data.pagina} totalPaginas={ordenes.data.totalPaginas} total={ordenes.data.total}
                      alCambiar={(pagina) => cambiarFiltro({ pagina })} />
        )}
      </Tarjeta>
    </>
  )
}

/** Campo de búsqueda que espera a que el usuario deje de escribir (300 ms) antes de filtrar. */
function BuscadorDiferido({ valor, alCambiar }: { valor: string; alCambiar: (valor: string) => void }) {
  const [texto, setTexto] = useState(valor)
  const [valorAnterior, setValorAnterior] = useState(valor)
  const alCambiarRef = useRef(alCambiar)
  useEffect(() => { alCambiarRef.current = alCambiar })

  // Si el filtro cambia desde afuera (ej.: "Limpiar filtros"), se refleja en el campo.
  // Se ajusta durante el render en lugar de en un efecto, como recomienda React.
  if (valor !== valorAnterior) {
    setValorAnterior(valor)
    setTexto(valor)
  }

  useEffect(() => {
    if (texto.trim() === valor) return
    const temporizador = setTimeout(() => alCambiarRef.current(texto.trim()), 300)
    return () => clearTimeout(temporizador)
  }, [texto, valor])

  return (
    <div className="relative sm:col-span-2 xl:col-span-3">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input className="pl-9" placeholder="Buscar por número, proveedor o concepto" aria-label="Buscar"
             value={texto} onChange={(e) => setTexto(e.target.value)} />
    </div>
  )
}

/** Campo de fecha con su etiqueta visible a la izquierda ("Desde", "Hasta"). */
function FiltroFecha({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (valor: string) => void }) {
  return (
    <label className="flex items-center rounded-lg bg-white shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-marca-600 xl:col-span-2">
      <span className="shrink-0 pl-3 text-xs font-medium text-slate-500">{etiqueta}</span>
      <input type="date" value={valor} onChange={(e) => alCambiar(e.target.value)}
             className="w-full min-w-0 border-0 bg-transparent px-2 py-2 text-sm text-slate-900 focus:outline-none" />
    </label>
  )
}
