import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { useOrdenes, usePendientes, useResumen } from '@/api/consultas'
import { PERMISOS } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { BarraProgreso, Boton, EncabezadoPagina, InsigniaEstadoEntrega, InsigniaEstadoOrden, Tarjeta } from '@/components/ui'
import { cx } from '@/lib/cx'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { formatoEntero, formatoFecha, formatoKg, formatoToneladas } from '@/lib/formato'

export function Inicio() {
  const { usuario, tienePermiso } = useAuth()
  const resumen = useResumen()

  return (
    <>
      <EncabezadoPagina
        titulo={`Hola, ${usuario?.nombreCompleto.split(' ')[0]}`}
        subtitulo="Así está la operación hoy."
        acciones={tienePermiso(PERMISOS.ordenesCrear) && (
          <Link to="/ordenes/nueva"><Boton icono={<Plus className="size-4" />}>Nueva orden</Boton></Link>
        )}
      />

      {resumen.isError ? <MensajeError error={resumen.error} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Indicador etiqueta="Órdenes abiertas" valor={resumen.data && formatoEntero(resumen.data.ordenesAbiertas)}
                     detalle={resumen.data && `${formatoEntero(resumen.data.ordenesCreadasMes)} creadas este mes`} />
          <Indicador etiqueta="Ítems por recibir" valor={resumen.data && formatoEntero(resumen.data.itemsPendientes)}
                     detalle="en espera o con entrega parcial" />
          <Indicador etiqueta="Pendiente de entrega" valor={resumen.data && formatoToneladas(resumen.data.kgPendientes)}
                     detalle={resumen.data && formatoKg(resumen.data.kgPendientes)} />
          <Indicador etiqueta="Recibido este mes" valor={resumen.data && formatoToneladas(resumen.data.kgRecibidosMes)}
                     detalle={resumen.data && `${formatoEntero(resumen.data.recepcionesHoy)} ingresos hoy`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <EntregasPendientes className="xl:col-span-3" />
        <UltimasOrdenes className="xl:col-span-2" />
      </div>
    </>
  )
}

function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor?: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{etiqueta}</p>
      <p className="tabular mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {valor ?? <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100" />}
      </p>
      <p className="tabular mt-1 truncate text-xs text-slate-500">{detalle ?? ' '}</p>
    </div>
  )
}

function EntregasPendientes({ className }: { className?: string }) {
  const { data, isPending, isError, error } = usePendientes()

  return (
    <Tarjeta titulo="Entregas pendientes" sinPadding className={className}
             acciones={data && <span className="text-xs text-slate-500">las más antiguas primero</span>}>
      {isPending ? <Cargando /> : isError ? <div className="p-5"><MensajeError error={error} /></div>
        : data.length === 0 ? <Vacio titulo="No hay entregas pendientes" />
        : (
          <ul className="divide-y divide-slate-100">
            {data.slice(0, 8).map((p) => (
              <li key={p.ordenCompraItemId}>
                <Link to={`/ordenes/${p.ordenCompraId}`} className="block px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.producto}</p>
                      <p className="truncate text-xs text-slate-500">
                        OC {p.numeroOrden} · {p.proveedor}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <InsigniaEstadoEntrega estado={p.estadoEntrega} />
                      <p className={cx('tabular mt-1 text-xs', p.diasAbierta > 60 ? 'font-medium text-rose-600' : 'text-slate-500')}>
                        hace {p.diasAbierta} días
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1"><BarraProgreso recibido={p.cantidadRecibidaKg} pedido={p.cantidadPedidaKg} /></div>
                    <span className="tabular shrink-0 text-xs text-slate-600">faltan {formatoKg(p.pendienteKg)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      {data && data.length > 8 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">y {data.length - 8} ítems más pendientes</p>
      )}
    </Tarjeta>
  )
}

function UltimasOrdenes({ className }: { className?: string }) {
  const { data, isPending, isError, error } = useOrdenes({ pagina: 1, tamanioPagina: 6 })

  return (
    <Tarjeta titulo="Últimas órdenes" sinPadding className={className}
             acciones={<Link to="/ordenes" className="inline-flex items-center gap-1 text-xs font-medium text-marca-700 hover:underline">
               Ver todas <ArrowRight className="size-3.5" /></Link>}>
      {isPending ? <Cargando /> : isError ? <div className="p-5"><MensajeError error={error} /></div> : (
        <ul className="divide-y divide-slate-100">
          {data.items.map((o) => (
            <li key={o.id}>
              <Link to={`/ordenes/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    OC {o.numero} <span className="font-normal text-slate-500">· {formatoFecha(o.fecha)}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{o.proveedor}</p>
                </div>
                <div className="shrink-0 text-right">
                  <InsigniaEstadoOrden estado={o.estado} />
                  <p className="tabular mt-1 text-xs text-slate-500">{formatoKg(o.totalPedidoKg)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
