import { Fragment, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Ban, CheckCircle2, ChevronDown, ChevronUp, History, Lock, Pencil, Plus, RotateCcw, Trash2, Truck } from 'lucide-react'
import {
  useActualizarOrden, useAgregarItem, useAnularRecepcion, useCambiarEstadoOrden, useOrden, useQuitarItem,
  useRecepcionesItem, useRegistrarRecepcion,
} from '@/api/consultas'
import { PERMISOS, type OrdenDetalle as Orden, type OrdenItem } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import {
  BarraProgreso, Boton, Campo, EncabezadoPagina, Input, InsigniaEstadoEntrega, InsigniaEstadoOrden, Modal, Tarjeta, Textarea,
} from '@/components/ui'
import { Cargando, MensajeError } from '@/components/Estados'
import { SelectorProducto } from '@/components/SelectorProducto'
import { cx } from '@/lib/cx'
import { aNumeroOVacio, esquemaItem, numeroRequerido } from '@/lib/esquemas'
import { formatoFecha, formatoFechaHora, formatoKg, hoyIso } from '@/lib/formato'

type AccionEstado = 'cerrar' | 'reabrir' | 'anular'

const textosAccion: Record<AccionEstado, { titulo: string; mensaje: string; boton: string }> = {
  cerrar: {
    titulo: 'Cerrar orden',
    mensaje: 'La orden quedará cerrada: no se podrán editar ítems ni registrar ingresos. Se puede reabrir más adelante.',
    boton: 'Cerrar orden',
  },
  reabrir: {
    titulo: 'Reabrir orden',
    mensaje: 'La orden vuelve a quedar abierta para editarla o registrar ingresos.',
    boton: 'Reabrir',
  },
  anular: {
    titulo: 'Anular orden',
    mensaje: 'La orden quedará anulada definitivamente. Solo se puede anular si todavía no se recibió mercadería.',
    boton: 'Anular orden',
  },
}

export function OrdenDetalle() {
  const id = Number(useParams().id)
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const { tienePermiso } = useAuth()
  const orden = useOrden(id)
  const cambiarEstado = useCambiarEstadoOrden(id)

  const [accion, setAccion] = useState<AccionEstado | null>(null)
  const [editando, setEditando] = useState(false)
  const [agregandoItem, setAgregandoItem] = useState(false)

  if (orden.isPending) return <Cargando />
  if (orden.isError) return <MensajeError error={orden.error} />

  const o = orden.data
  const abierta = o.estado === 'ABIERTA'
  const puede = {
    editar: abierta && tienePermiso(PERMISOS.ordenesEditar),
    cerrar: abierta && tienePermiso(PERMISOS.ordenesCerrar),
    reabrir: o.estado === 'CERRADA' && tienePermiso(PERMISOS.ordenesCerrar),
    anular: abierta && tienePermiso(PERMISOS.ordenesCerrar),
    recibir: abierta && tienePermiso(PERMISOS.recepcionesRegistrar),
    anularRecepcion: abierta && tienePermiso(PERMISOS.recepcionesAnular),
  }

  return (
    <>
      <Link to="/ordenes" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Órdenes
      </Link>

      <EncabezadoPagina
        titulo={<span className="flex items-center gap-3">Orden {o.numero} <InsigniaEstadoOrden estado={o.estado} /></span>}
        subtitulo={`${o.proveedor} · ${formatoFecha(o.fecha)}`}
        acciones={<>
          {puede.editar && <Boton variante="secundario" icono={<Pencil className="size-4" />} onClick={() => setEditando(true)}>Editar</Boton>}
          {puede.anular && <Boton variante="peligro" icono={<Ban className="size-4" />} onClick={() => setAccion('anular')}>Anular</Boton>}
          {puede.reabrir && <Boton variante="secundario" icono={<RotateCcw className="size-4" />} onClick={() => setAccion('reabrir')}>Reabrir</Boton>}
          {puede.cerrar && <Boton icono={<Lock className="size-4" />} onClick={() => setAccion('cerrar')}>Cerrar orden</Boton>}
        </>}
      />

      {aviso && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-4" /> {aviso}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Datos de la orden" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Dato etiqueta="Concepto">{o.concepto}</Dato>
            <Dato etiqueta="Forma de pago">{o.formaPago ?? '—'}</Dato>
            <Dato etiqueta="Creada por">{o.creadaPor} · {formatoFechaHora(o.fechaCreacion)}</Dato>
            <Dato etiqueta={o.estado === 'ANULADA' ? 'Anulada' : 'Cerrada'}>{formatoFechaHora(o.fechaCierre)}</Dato>
            {o.observaciones && <Dato etiqueta="Observaciones" className="sm:col-span-2">{o.observaciones}</Dato>}
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Proveedor">
          <dl className="space-y-3 text-sm">
            <Dato etiqueta="Razón social">{o.proveedor}</Dato>
            <Dato etiqueta="Contacto">{o.proveedorContacto ?? '—'}</Dato>
            <Dato etiqueta="Email">{o.proveedorEmail ? <a className="text-marca-700 hover:underline" href={`mailto:${o.proveedorEmail}`}>{o.proveedorEmail}</a> : '—'}</Dato>
            <Dato etiqueta="Teléfono">{o.proveedorTelefono ?? '—'}</Dato>
          </dl>
        </Tarjeta>
      </div>

      <Tarjeta
        className="mt-6"
        sinPadding
        titulo={<span>Ítems <span className="tabular ml-2 font-normal text-slate-500">{formatoKg(o.totalRecibidoKg)} recibidos de {formatoKg(o.totalPedidoKg)}</span></span>}
        acciones={puede.editar && (
          <Boton variante="secundario" icono={<Plus className="size-4" />} onClick={() => setAgregandoItem(true)}>Agregar ítem</Boton>
        )}
      >
        <TablaItems orden={o} puede={puede} />
      </Tarjeta>

      {accion && (
        <Modal abierto titulo={textosAccion[accion].titulo} alCerrar={() => { setAccion(null); cambiarEstado.reset() }}>
          <p className="text-sm text-slate-600">{textosAccion[accion].mensaje}</p>
          {cambiarEstado.isError && <div className="mt-4"><MensajeError error={cambiarEstado.error} /></div>}
          <div className="mt-6 flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => { setAccion(null); cambiarEstado.reset() }}>Volver</Boton>
            <Boton variante={accion === 'anular' ? 'peligro' : 'primario'} cargando={cambiarEstado.isPending}
                   onClick={() => cambiarEstado.mutate(accion, { onSuccess: () => setAccion(null) })}>
              {textosAccion[accion].boton}
            </Boton>
          </div>
        </Modal>
      )}

      {editando && <ModalEditarOrden orden={o} alCerrar={() => setEditando(false)} />}
      {agregandoItem && <ModalAgregarItem orden={o} alCerrar={() => setAgregandoItem(false)} />}
    </>
  )
}

function Dato({ etiqueta, children, className }: { etiqueta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-slate-900">{children}</dd>
    </div>
  )
}

// ---------- Tabla de ítems ----------

type Permisos = { editar: boolean; recibir: boolean; anularRecepcion: boolean }

function TablaItems({ orden, puede }: { orden: Orden; puede: Permisos }) {
  const [expandido, setExpandido] = useState<number | null>(null)
  const [recibiendo, setRecibiendo] = useState<OrdenItem | null>(null)
  const quitar = useQuitarItem(orden.id)

  return (
    <>
      {quitar.isError && <div className="p-4"><MensajeError error={quitar.error} /></div>}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Producto</th>
              <th className="px-3 py-3 text-right">Pedido</th>
              <th className="px-3 py-3 text-right">Recibido</th>
              <th className="hidden px-3 py-3 text-right sm:table-cell">Falta</th>
              <th className="px-3 py-3">Entrega</th>
              <th className="px-5 py-3 text-right"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orden.items.map((item) => (
              <Fragment key={item.id}>
                <tr className={cx(expandido === item.id && 'bg-slate-50')}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{item.tipo} {item.gramos} g/m²</p>
                    <p className="text-xs text-slate-500">{item.formato}{item.detalle && ` · ${item.detalle}`}</p>
                  </td>
                  <td className="tabular px-3 py-3 text-right text-slate-700">{formatoKg(item.cantidadKg)}</td>
                  <td className="tabular px-3 py-3 text-right text-slate-700">{formatoKg(item.recibidoKg)}</td>
                  <td className="tabular hidden px-3 py-3 text-right text-slate-500 sm:table-cell">
                    {item.diferenciaKg > 0 ? formatoKg(item.diferenciaKg) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-36 flex-col gap-1.5">
                      <div><InsigniaEstadoEntrega estado={item.estadoEntrega} /></div>
                      <BarraProgreso recibido={item.recibidoKg} pedido={item.cantidadKg} />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {puede.recibir && (
                        <Boton variante="secundario" icono={<Truck className="size-4" />} onClick={() => setRecibiendo(item)}>Recibir</Boton>
                      )}
                      <Boton variante="fantasma" onClick={() => setExpandido(expandido === item.id ? null : item.id)}
                             aria-expanded={expandido === item.id} title="Historial de ingresos" icono={<History className="size-4" />}>
                        {expandido === item.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </Boton>
                      {puede.editar && orden.items.length > 1 && item.recibidoKg === 0 && (
                        <Boton variante="fantasma" title="Quitar ítem" aria-label="Quitar ítem" cargando={quitar.isPending && quitar.variables === item.id}
                               onClick={() => confirm('¿Quitar este ítem de la orden?') && quitar.mutate(item.id)}
                               icono={<Trash2 className="size-4 text-rose-600" />} />
                      )}
                    </div>
                  </td>
                </tr>
                {expandido === item.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-5 pb-4 pt-1">
                      <HistorialIngresos ordenId={orden.id} itemId={item.id} puedeAnular={puede.anularRecepcion} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {recibiendo && <ModalRecepcion orden={orden} item={recibiendo} alCerrar={() => setRecibiendo(null)} />}
    </>
  )
}

function HistorialIngresos({ ordenId, itemId, puedeAnular }: { ordenId: number; itemId: number; puedeAnular: boolean }) {
  const { data, isPending, isError, error } = useRecepcionesItem(ordenId, itemId, true)
  const anular = useAnularRecepcion()

  if (isPending) return <Cargando texto="Cargando ingresos…" />
  if (isError) return <MensajeError error={error} />
  if (data.length === 0) return <p className="py-3 text-sm text-slate-500">Todavía no se registraron ingresos para este ítem.</p>

  return (
    <div className="rounded-lg bg-white ring-1 ring-slate-200">
      {anular.isError && <div className="p-3"><MensajeError error={anular.error} /></div>}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 text-right font-medium">Cantidad</th>
            <th className="px-3 py-2 font-medium">Remito</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">Observaciones</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">Registró</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((r) => (
            <tr key={r.id} className={cx(!r.activo && 'text-slate-400 line-through')}>
              <td className="tabular px-4 py-2">{formatoFecha(r.fecha)}</td>
              <td className="tabular px-3 py-2 text-right">{formatoKg(r.cantidadKg)}</td>
              <td className="px-3 py-2">{r.remito ?? '—'}</td>
              <td className="hidden px-3 py-2 md:table-cell">{r.observaciones ?? '—'}</td>
              <td className="hidden px-3 py-2 sm:table-cell">{r.registradaPor}</td>
              <td className="px-4 py-2 text-right">
                {!r.activo ? <span className="text-xs no-underline">anulado</span>
                  : puedeAnular && (
                    <button className="text-xs text-rose-600 hover:underline disabled:opacity-50" disabled={anular.isPending}
                            onClick={() => confirm(`¿Anular el ingreso de ${formatoKg(r.cantidadKg)}?`) && anular.mutate(r.id)}>
                      Anular
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Modales ----------

function ModalRecepcion({ orden, item, alCerrar }: { orden: Orden; item: OrdenItem; alCerrar: () => void }) {
  const registrar = useRegistrarRecepcion(orden.id)
  const esquema = z.object({
    fecha: z.string().min(1, 'Ingresá la fecha')
      .refine((f) => f >= orden.fecha, `No puede ser anterior a la orden (${formatoFecha(orden.fecha)})`)
      .refine((f) => f <= hoyIso(), 'No puede ser posterior a hoy'),
    cantidadKg: numeroRequerido('Ingresá la cantidad recibida').pipe(z.number().positive('Debe ser mayor a 0')),
    remito: z.string().max(30, 'Máximo 30 caracteres').optional(),
    observaciones: z.string().max(300, 'Máximo 300 caracteres').optional(),
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoyIso(), cantidadKg: item.diferenciaKg > 0 ? item.diferenciaKg : undefined, remito: '', observaciones: '' },
  })
  const cantidad = Number(useWatch({ control, name: 'cantidadKg' })) || 0
  const excede = cantidad > item.diferenciaKg

  const alEnviar = handleSubmit((d) =>
    registrar.mutate(
      { itemId: item.id, datos: { ...d, remito: d.remito || null, observaciones: d.observaciones || null } },
      { onSuccess: alCerrar },
    ),
  )

  return (
    <Modal abierto titulo="Registrar ingreso de mercadería" alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-900">{item.tipo} {item.gramos} g/m² · {item.formato}</p>
          <p className="tabular mt-0.5 text-slate-600">
            Pedido {formatoKg(item.cantidadKg)} · Recibido {formatoKg(item.recibidoKg)} · <strong>Falta {formatoKg(Math.max(item.diferenciaKg, 0))}</strong>
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha de recepción" error={errors.fecha?.message}>
            {(id) => <Input id={id} type="date" min={orden.fecha} max={hoyIso()} invalido={!!errors.fecha} {...register('fecha')} />}
          </Campo>
          <Campo etiqueta="Cantidad recibida (kg)" error={errors.cantidadKg?.message}
                 ayuda={excede && cantidad > 0 ? 'Supera lo pendiente: quedará como cantidad excedida.' : undefined}>
            {(id) => <Input id={id} type="number" min={0} step="any" inputMode="decimal" autoFocus invalido={!!errors.cantidadKg}
                            {...register('cantidadKg', { setValueAs: aNumeroOVacio })} />}
          </Campo>
          <Campo etiqueta="N° de remito" error={errors.remito?.message}>
            {(id) => <Input id={id} placeholder="Ej.: R-0001-00012345" {...register('remito')} />}
          </Campo>
          <Campo etiqueta="Observaciones" error={errors.observaciones?.message}>
            {(id) => <Input id={id} {...register('observaciones')} />}
          </Campo>
        </div>
        {registrar.isError && <MensajeError error={registrar.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={registrar.isPending}>Registrar ingreso</Boton>
        </div>
      </form>
    </Modal>
  )
}

function ModalEditarOrden({ orden, alCerrar }: { orden: Orden; alCerrar: () => void }) {
  const actualizar = useActualizarOrden(orden.id)
  const esquema = z.object({
    fecha: z.string().min(1, 'Ingresá la fecha').refine((f) => f <= hoyIso(), 'No puede ser posterior a hoy'),
    concepto: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
    formaPago: z.string().max(100, 'Máximo 100 caracteres').optional(),
    observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  })
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: orden.fecha, concepto: orden.concepto, formaPago: orden.formaPago ?? '', observaciones: orden.observaciones ?? '' },
  })

  const alEnviar = handleSubmit((d) =>
    actualizar.mutate({ ...d, formaPago: d.formaPago || null, observaciones: d.observaciones || null }, { onSuccess: alCerrar }),
  )

  return (
    <Modal abierto titulo={`Editar orden ${orden.numero}`} alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha" error={errors.fecha?.message}>
            {(id) => <Input id={id} type="date" max={hoyIso()} invalido={!!errors.fecha} {...register('fecha')} />}
          </Campo>
          <Campo etiqueta="Forma de pago" error={errors.formaPago?.message}>
            {(id) => <Input id={id} {...register('formaPago')} />}
          </Campo>
          <Campo etiqueta="Concepto" error={errors.concepto?.message} className="sm:col-span-2">
            {(id) => <Input id={id} invalido={!!errors.concepto} {...register('concepto')} />}
          </Campo>
          <Campo etiqueta="Observaciones" error={errors.observaciones?.message} className="sm:col-span-2">
            {(id) => <Textarea id={id} {...register('observaciones')} />}
          </Campo>
        </div>
        <p className="text-xs text-slate-500">El proveedor no se puede cambiar: si es otro, anulá esta orden y creá una nueva.</p>
        {actualizar.isError && <MensajeError error={actualizar.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={actualizar.isPending}>Guardar cambios</Boton>
        </div>
      </form>
    </Modal>
  )
}

function ModalAgregarItem({ orden, alCerrar }: { orden: Orden; alCerrar: () => void }) {
  const agregar = useAgregarItem(orden.id)
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitted } } = useForm({
    resolver: zodResolver(esquemaItem),
    defaultValues: { detalle: '' },
  })
  const [tipoProductoId, gramajeId, formatoId] = useWatch({ control, name: ['tipoProductoId', 'gramajeId', 'formatoId'] })
  const producto = { tipoProductoId, gramajeId, formatoId }
  const errorProducto = errors.tipoProductoId?.message ?? errors.gramajeId?.message ?? errors.formatoId?.message

  const alEnviar = handleSubmit((d) => agregar.mutate({ ...d, detalle: d.detalle || null }, { onSuccess: alCerrar }))

  return (
    <Modal abierto titulo="Agregar ítem" alCerrar={alCerrar} ancho="max-w-2xl">
      <form onSubmit={alEnviar} noValidate className="space-y-4">
        <SelectorProducto
          proveedorId={orden.proveedorId}
          valor={producto}
          error={errorProducto}
          alCambiar={(v) => {
            setValue('tipoProductoId', v.tipoProductoId, { shouldValidate: isSubmitted })
            setValue('gramajeId', v.gramajeId, { shouldValidate: isSubmitted })
            setValue('formatoId', v.formatoId, { shouldValidate: isSubmitted })
          }}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Cantidad (kg)" error={errors.cantidadKg?.message}>
            {(id) => <Input id={id} type="number" min={0} step="any" invalido={!!errors.cantidadKg} {...register('cantidadKg', { setValueAs: aNumeroOVacio })} />}
          </Campo>
          <Campo etiqueta="Detalle (opcional)" error={errors.detalle?.message} className="sm:col-span-2">
            {(id) => <Input id={id} {...register('detalle')} />}
          </Campo>
        </div>
        {agregar.isError && <MensajeError error={agregar.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={agregar.isPending}>Agregar</Boton>
        </div>
      </form>
    </Modal>
  )
}
