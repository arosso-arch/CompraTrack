import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, ShieldCheck } from 'lucide-react'
import { useCrearUsuario, useRoles, useUsuarios } from '@/api/consultas'
import { Boton, Campo, EncabezadoPagina, Input, Modal, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { CampoClave } from '@/components/CampoClave'
import { cx } from '@/lib/cx'
import { aNumeroOVacio, esquemaClave, idRequerido } from '@/lib/esquemas'
import { formatoFechaHora } from '@/lib/formato'

export function Usuarios() {
  const navegar = useNavigate()
  const [buscar, setBuscar] = useState('')
  const [rolId, setRolId] = useState<number | ''>('')
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('todos')
  const [creando, setCreando] = useState(false)

  const roles = useRoles()
  const usuarios = useUsuarios({ rolId, activo: estado === 'todos' ? undefined : estado === 'activos' })

  // La lista de usuarios es chica: el texto se filtra en el navegador, sin un pedido por cada tecla.
  const texto = buscar.trim().toLowerCase()
  const visibles = usuarios.data?.filter((u) =>
    !texto || [u.nombreCompleto, u.nombreUsuario, u.email].some((campo) => campo.toLowerCase().includes(texto)))

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        subtitulo="Quién accede al sistema, con qué rol y qué permisos."
        acciones={<Boton icono={<Plus className="size-4" />} onClick={() => setCreando(true)}>Nuevo usuario</Boton>}
      />

      <Tarjeta sinPadding>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por nombre, usuario o email" aria-label="Buscar"
                   value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <Select aria-label="Rol" value={rolId} onChange={(e) => setRolId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos los roles</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </Select>
          <Select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
            <option value="todos">Activos y dados de baja</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo dados de baja</option>
          </Select>
        </div>

        {usuarios.isPending ? <Cargando /> : usuarios.isError ? <div className="p-5"><MensajeError error={usuarios.error} /></div>
          : !visibles?.length ? <Vacio titulo="No hay usuarios para mostrar" />
          : (
            <div className={cx('relative overflow-x-auto', usuarios.isPlaceholderData && 'opacity-60')}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="hidden px-3 py-3 md:table-cell">Email</th>
                    <th className="px-3 py-3">Rol</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="hidden px-5 py-3 lg:table-cell">Último acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((u) => (
                    <tr key={u.id} onClick={() => navegar(`/usuarios/${u.id}`)} className={cx('cursor-pointer hover:bg-slate-50', !u.activo && 'text-slate-400')}>
                      <td className="px-5 py-3">
                        <p className={cx('font-medium', u.activo ? 'text-slate-900' : 'text-slate-500')}>{u.nombreCompleto}</p>
                        <p className="text-xs text-slate-500">{u.nombreUsuario}</p>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          {u.esAdministrador && <ShieldCheck className="size-4 text-marca-600" aria-label="Administrador" />}
                          {u.rol}
                          {u.permisosExtra > 0 && (
                            <span className="rounded bg-marca-50 px-1.5 text-xs text-marca-700" title="Permisos extra además de los del rol">
                              +{u.permisosExtra}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                          u.activo ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20')}>
                          {u.activo ? 'Activo' : 'Dado de baja'}
                        </span>
                      </td>
                      <td className="tabular hidden px-5 py-3 text-slate-500 lg:table-cell">
                        {u.ultimoAcceso ? formatoFechaHora(u.ultimoAcceso) : 'Nunca ingresó'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Tarjeta>

      {creando && <ModalNuevoUsuario alCerrar={() => setCreando(false)} alCrear={(id) => navegar(`/usuarios/${id}`)} />}
    </>
  )
}

const esquemaNuevo = z.object({
  nombreCompleto: z.string().trim().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  nombreUsuario: z.string().trim().min(3, 'Mínimo 3 caracteres').max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo (sin espacios)'),
  email: z.email('Email inválido').max(150),
  rolId: idRequerido('Elegí un rol'),
  clave: esquemaClave,
})

function ModalNuevoUsuario({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (id: number) => void }) {
  const roles = useRoles()
  const crear = useCrearUsuario()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(esquemaNuevo),
    defaultValues: { nombreCompleto: '', nombreUsuario: '', email: '', clave: '' },
  })

  const alEnviar = handleSubmit((d) => crear.mutate(d, { onSuccess: (u) => alCrear(u.id) }))

  return (
    <Modal abierto titulo="Nuevo usuario" alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="space-y-4">
        <Campo etiqueta="Nombre completo" error={errors.nombreCompleto?.message}>
          {(id) => <Input id={id} autoFocus invalido={!!errors.nombreCompleto} {...register('nombreCompleto')} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Usuario" error={errors.nombreUsuario?.message} ayuda="Con el que inicia sesión.">
            {(id) => <Input id={id} autoComplete="off" invalido={!!errors.nombreUsuario} {...register('nombreUsuario')} />}
          </Campo>
          <Campo etiqueta="Rol" error={errors.rolId?.message}>
            {(id) => (
              <Select id={id} invalido={!!errors.rolId} {...register('rolId', { setValueAs: aNumeroOVacio })}>
                <option value="">Elegí un rol</option>
                {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </Select>
            )}
          </Campo>
        </div>
        <Campo etiqueta="Email" error={errors.email?.message}>
          {(id) => <Input id={id} type="email" invalido={!!errors.email} {...register('email')} />}
        </Campo>
        <Campo etiqueta="Contraseña inicial" error={errors.clave?.message}
               ayuda="Mínimo 8 caracteres, con letras y números. Comunicásela al usuario: después la puede cambiar desde su cuenta.">
          {(id) => <CampoClave id={id} autoComplete="new-password" invalido={!!errors.clave} {...register('clave')}
                               alGenerar={(clave) => setValue('clave', clave, { shouldValidate: true })} />}
        </Campo>
        {crear.isError && <MensajeError error={crear.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={crear.isPending}>Crear usuario</Boton>
        </div>
      </form>
    </Modal>
  )
}
