import { Link, useNavigate } from 'react-router'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useCrearOrden, useProveedores } from '@/api/consultas'
import { Boton, Campo, EncabezadoPagina, Input, Select, Tarjeta, Textarea } from '@/components/ui'
import { MensajeError } from '@/components/Estados'
import { SelectorProducto } from '@/components/SelectorProducto'
import { aNumeroOVacio, esquemaItem, idRequerido } from '@/lib/esquemas'
import { formatoKg, hoyIso } from '@/lib/formato'

const esquema = z.object({
  proveedorId: idRequerido('Elegí un proveedor'),
  fecha: z.string().min(1, 'Ingresá la fecha').refine((f) => f <= hoyIso(), 'La fecha no puede ser posterior a hoy'),
  concepto: z.string().trim().min(2, 'Ingresá un concepto (mínimo 2 caracteres)').max(100, 'Máximo 100 caracteres'),
  formaPago: z.string().max(100, 'Máximo 100 caracteres').optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  items: z.array(esquemaItem).min(1, 'Agregá al menos un ítem'),
})

const itemVacio = { tipoProductoId: undefined, gramajeId: undefined, formatoId: undefined, detalle: '', cantidadKg: undefined }

export function NuevaOrden() {
  const navegar = useNavigate()
  const proveedores = useProveedores({ activo: true })
  const crear = useCrearOrden()

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitted } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoyIso(), concepto: '', formaPago: '', observaciones: '', items: [itemVacio] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const proveedorId = useWatch({ control, name: 'proveedorId' })
  const items = useWatch({ control, name: 'items' })
  const totalKg = items.reduce((suma, i) => suma + (Number(i.cantidadKg) || 0), 0)

  const alEnviar = handleSubmit((datos) =>
    crear.mutate(
      {
        ...datos,
        formaPago: datos.formaPago || null,
        observaciones: datos.observaciones || null,
        items: datos.items.map((i) => ({ ...i, detalle: i.detalle || null })),
      },
      { onSuccess: (orden) => navegar(`/ordenes/${orden.id}`, { state: { aviso: `Orden ${orden.numero} creada.` } }) },
    ),
  )

  return (
    <form onSubmit={alEnviar} noValidate>
      <Link to="/ordenes" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Órdenes
      </Link>
      <EncabezadoPagina titulo="Nueva orden de compra" subtitulo="El número se asigna automáticamente al guardar." />

      <div className="space-y-6">
        <Tarjeta titulo="Datos generales">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Proveedor" error={errors.proveedorId?.message}>
              {(idCampo) => (
                <Select id={idCampo} invalido={!!errors.proveedorId}
                        {...register('proveedorId', {
                          setValueAs: aNumeroOVacio,
                          // al cambiar de proveedor, los productos elegidos dejan de ser válidos
                          onChange: () => fields.forEach((_, i) => {
                            setValue(`items.${i}.tipoProductoId`, undefined)
                            setValue(`items.${i}.gramajeId`, undefined)
                            setValue(`items.${i}.formatoId`, undefined)
                          }),
                        })}>
                  <option value="">{proveedores.isPending ? 'Cargando…' : 'Elegí un proveedor'}</option>
                  {proveedores.data?.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                </Select>
              )}
            </Campo>
            <Campo etiqueta="Fecha" error={errors.fecha?.message}>
              {(idCampo) => <Input id={idCampo} type="date" max={hoyIso()} invalido={!!errors.fecha} {...register('fecha')} />}
            </Campo>
            <Campo etiqueta="Concepto" error={errors.concepto?.message} ayuda="Ej.: campaña, cliente u obra a la que corresponde.">
              {(idCampo) => <Input id={idCampo} invalido={!!errors.concepto} {...register('concepto')} />}
            </Campo>
            <Campo etiqueta="Forma de pago" error={errors.formaPago?.message}>
              {(idCampo) => <Input id={idCampo} placeholder="Ej.: Transferencia a 30 días" {...register('formaPago')} />}
            </Campo>
            <Campo etiqueta="Observaciones" error={errors.observaciones?.message} className="md:col-span-2">
              {(idCampo) => <Textarea id={idCampo} rows={2} placeholder="Instrucciones de entrega, etc." {...register('observaciones')} />}
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Ítems"
          acciones={<span className="tabular text-sm text-slate-600">Total: <strong>{formatoKg(totalKg)}</strong></span>}
        >
          {!proveedorId && <p className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">Elegí primero el proveedor: solo se muestran los productos que ofrece.</p>}

          <ol className="space-y-4">
            {fields.map((campo, i) => {
              const errorItem = errors.items?.[i]
              const errorProducto = errorItem?.tipoProductoId?.message ?? errorItem?.gramajeId?.message ?? errorItem?.formatoId?.message
              return (
                <li key={campo.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ítem {i + 1}</span>
                    {fields.length > 1 && (
                      <Boton variante="fantasma" onClick={() => remove(i)} icono={<Trash2 className="size-4" />} aria-label={`Quitar ítem ${i + 1}`}>
                        Quitar
                      </Boton>
                    )}
                  </div>
                  <SelectorProducto
                    proveedorId={proveedorId}
                    valor={items[i] ?? {}}
                    error={errorProducto}
                    alCambiar={(v) => {
                      const opciones = { shouldValidate: isSubmitted }
                      setValue(`items.${i}.tipoProductoId`, v.tipoProductoId, opciones)
                      setValue(`items.${i}.gramajeId`, v.gramajeId, opciones)
                      setValue(`items.${i}.formatoId`, v.formatoId, opciones)
                    }}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Campo etiqueta="Cantidad (kg)" error={errorItem?.cantidadKg?.message}>
                      {(idCampo) => <Input id={idCampo} type="number" min={0} step="any" inputMode="decimal" invalido={!!errorItem?.cantidadKg}
                                           {...register(`items.${i}.cantidadKg`, { setValueAs: aNumeroOVacio })} />}
                    </Campo>
                    <Campo etiqueta="Detalle (opcional)" error={errorItem?.detalle?.message} className="sm:col-span-2">
                      {(idCampo) => <Input id={idCampo} placeholder="Ej.: embalaje en pallets" {...register(`items.${i}.detalle`)} />}
                    </Campo>
                  </div>
                </li>
              )
            })}
          </ol>

          {errors.items?.root?.message && <p className="mt-2 text-sm text-rose-600">{errors.items.root.message}</p>}

          <Boton variante="secundario" className="mt-4" icono={<Plus className="size-4" />} onClick={() => append(itemVacio)}>
            Agregar ítem
          </Boton>
        </Tarjeta>

        {crear.isError && <MensajeError error={crear.error} />}

        <div className="flex justify-end gap-2">
          <Link to="/ordenes"><Boton variante="secundario">Cancelar</Boton></Link>
          <Boton type="submit" cargando={crear.isPending}>Crear orden</Boton>
        </div>
      </div>
    </form>
  )
}
