import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { useGuardarProveedor, useProveedores } from '@/api/consultas'
import { PERMISOS, type Proveedor } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { Boton, Campo, EncabezadoPagina, Input, Modal, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { aNumeroOVacio, numeroRequerido } from '@/lib/esquemas'
import { cx } from '@/lib/cx'
import { plural } from '@/lib/formato'

export function Proveedores() {
  const { tienePermiso } = useAuth()
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [creando, setCreando] = useState(false)

  const proveedores = useProveedores({ activo: estado === 'todos' ? undefined : estado === 'activos' })
  const texto = buscar.trim().toLowerCase()
  const filtrados = proveedores.data?.filter((p) =>
    !texto || p.razonSocial.toLowerCase().includes(texto) || String(p.codigo) === texto || p.contacto?.toLowerCase().includes(texto))

  return (
    <>
      <EncabezadoPagina
        titulo="Proveedores"
        subtitulo="Datos de contacto y productos que ofrece cada proveedor."
        acciones={tienePermiso(PERMISOS.proveedoresGestionar) && (
          <Boton icono={<Plus className="size-4" />} onClick={() => setCreando(true)}>Nuevo proveedor</Boton>
        )}
      />

      <Tarjeta sinPadding>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por razón social, código o contacto" aria-label="Buscar"
                   value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <Select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Dados de baja</option>
            <option value="todos">Todos</option>
          </Select>
        </div>

        {proveedores.isPending ? <Cargando /> : proveedores.isError ? <div className="p-5"><MensajeError error={proveedores.error} /></div>
          : filtrados!.length === 0 ? <Vacio titulo="No hay proveedores para mostrar" />
          : (
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
              {filtrados!.map((p) => (
                <li key={p.id} className="border-b border-slate-100 sm:border-r">
                  <Link to={`/proveedores/${p.id}`} className="flex h-full flex-col gap-2 p-5 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{p.razonSocial}</p>
                        <p className="text-xs text-slate-500">Código {p.codigo}</p>
                      </div>
                      {!p.activo && <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Baja</span>}
                    </div>
                    <p className="truncate text-sm text-slate-600">{p.contacto ?? 'Sin contacto'}{p.email && ` · ${p.email}`}</p>
                    <p className={cx('mt-auto text-xs', p.ordenesAbiertas > 0 ? 'text-sky-700' : 'text-slate-400')}>
                      {p.ordenesAbiertas > 0 ? plural(p.ordenesAbiertas, 'orden abierta', 'órdenes abiertas') : 'Sin órdenes abiertas'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </Tarjeta>

      {creando && <ModalProveedor alCerrar={() => setCreando(false)} />}
    </>
  )
}

const esquemaProveedor = z.object({
  codigo: numeroRequerido('Ingresá el código').pipe(z.number().int('Debe ser un número entero').min(1, 'Debe ser mayor a 0').max(999999, 'Máximo 6 dígitos')),
  razonSocial: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150, 'Máximo 150 caracteres'),
  contacto: z.string().max(100, 'Máximo 100 caracteres').optional(),
  email: z.union([z.literal(''), z.email('Email inválido').max(150)]).optional(),
  telefono: z.string().max(30, 'Máximo 30 caracteres').optional(),
  direccion: z.string().max(200, 'Máximo 200 caracteres').optional(),
})

/** Alta (sin proveedor) o edición (con proveedor) de un proveedor. */
export function ModalProveedor({ proveedor, alCerrar }: { proveedor?: Proveedor; alCerrar: () => void }) {
  const guardar = useGuardarProveedor(proveedor?.id)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquemaProveedor),
    defaultValues: {
      codigo: proveedor?.codigo,
      razonSocial: proveedor?.razonSocial ?? '',
      contacto: proveedor?.contacto ?? '',
      email: proveedor?.email ?? '',
      telefono: proveedor?.telefono ?? '',
      direccion: proveedor?.direccion ?? '',
    },
  })

  const vacioANull = (v?: string) => (v?.trim() ? v.trim() : null)
  const alEnviar = handleSubmit((d) => guardar.mutate(
    { ...d, contacto: vacioANull(d.contacto), email: vacioANull(d.email), telefono: vacioANull(d.telefono), direccion: vacioANull(d.direccion) },
    { onSuccess: alCerrar },
  ))

  return (
    <Modal abierto titulo={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'} alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Código" error={errors.codigo?.message}>
            {(id) => <Input id={id} type="number" invalido={!!errors.codigo} {...register('codigo', { setValueAs: aNumeroOVacio })} />}
          </Campo>
          <Campo etiqueta="Razón social" error={errors.razonSocial?.message} className="sm:col-span-2">
            {(id) => <Input id={id} invalido={!!errors.razonSocial} {...register('razonSocial')} />}
          </Campo>
          <Campo etiqueta="Contacto" error={errors.contacto?.message} className="sm:col-span-3">
            {(id) => <Input id={id} placeholder="Persona de atención" {...register('contacto')} />}
          </Campo>
          <Campo etiqueta="Email" error={errors.email?.message} ayuda="Se usa para enviar las órdenes." className="sm:col-span-2">
            {(id) => <Input id={id} type="email" invalido={!!errors.email} {...register('email')} />}
          </Campo>
          <Campo etiqueta="Teléfono" error={errors.telefono?.message}>
            {(id) => <Input id={id} {...register('telefono')} />}
          </Campo>
          <Campo etiqueta="Dirección" error={errors.direccion?.message} className="sm:col-span-3">
            {(id) => <Input id={id} {...register('direccion')} />}
          </Campo>
        </div>
        {guardar.isError && <MensajeError error={guardar.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{proveedor ? 'Guardar cambios' : 'Crear proveedor'}</Boton>
        </div>
      </form>
    </Modal>
  )
}
