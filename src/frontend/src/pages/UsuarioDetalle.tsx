import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, KeyRound, Pencil, Power, ShieldCheck } from 'lucide-react'
import {
  useActualizarUsuario, useCambiarEstadoUsuario, useGuardarPermisosExtra, usePermisos, useRestablecerClave, useRoles, useUsuario,
} from '@/api/consultas'
import type { UsuarioDetalle as Usuario } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { Boton, Campo, EncabezadoPagina, Input, Modal, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError } from '@/components/Estados'
import { CampoClave } from '@/components/CampoClave'
import { cx } from '@/lib/cx'
import { aNumeroOVacio, esquemaClave, idRequerido } from '@/lib/esquemas'
import { formatoFechaHora } from '@/lib/formato'

export function UsuarioDetalle() {
  const id = Number(useParams().id)
  const { usuario: sesion } = useAuth()
  const usuario = useUsuario(id)
  const [modal, setModal] = useState<'editar' | 'clave' | 'estado' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (usuario.isPending) return <Cargando />
  if (usuario.isError) return <MensajeError error={usuario.error} />
  const u = usuario.data
  const esUnoMismo = sesion?.id === u.id

  return (
    <>
      <Link to="/usuarios" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Usuarios
      </Link>
      <EncabezadoPagina
        titulo={<span className="flex flex-wrap items-center gap-3">{u.nombreCompleto}
          {!u.activo && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Dado de baja</span>}
          {esUnoMismo && <span className="rounded-md bg-marca-50 px-2 py-0.5 text-xs font-medium text-marca-700">Sos vos</span>}</span>}
        subtitulo={`${u.nombreUsuario} · ${u.email}`}
        acciones={<>
          <Boton variante="secundario" icono={<Pencil className="size-4" />} onClick={() => setModal('editar')}>Editar</Boton>
          <Boton variante="secundario" icono={<KeyRound className="size-4" />} onClick={() => setModal('clave')}>Restablecer contraseña</Boton>
          {!esUnoMismo && (
            <Boton variante={u.activo ? 'peligro' : 'secundario'} icono={<Power className="size-4" />} onClick={() => setModal('estado')}>
              {u.activo ? 'Dar de baja' : 'Reactivar'}
            </Boton>
          )}
        </>}
      />

      {aviso && (
        <div role="status" className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {aviso}
          <button onClick={() => setAviso(null)} className="text-xs font-medium hover:underline">Cerrar</button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Datos">
          <dl className="space-y-3 text-sm">
            <Dato etiqueta="Rol">
              <span className="inline-flex items-center gap-1.5">
                {u.esAdministrador && <ShieldCheck className="size-4 text-marca-600" />}{u.rol}
              </span>
            </Dato>
            <Dato etiqueta="Usuario">{u.nombreUsuario}</Dato>
            <Dato etiqueta="Email">{u.email}</Dato>
            <Dato etiqueta="Alta">{formatoFechaHora(u.fechaAlta)}</Dato>
            <Dato etiqueta="Último acceso">{u.ultimoAcceso ? formatoFechaHora(u.ultimoAcceso) : 'Nunca ingresó'}</Dato>
          </dl>
        </Tarjeta>
        <PermisosUsuario key={`${u.rolId}-${u.permisosExtra.join(",")}`} usuario={u} className="lg:col-span-2" alGuardar={() => setAviso('Permisos guardados. Rigen desde el próximo inicio de sesión del usuario.')} />
      </div>

      {modal === 'editar' && <ModalEditar usuario={u} esUnoMismo={esUnoMismo} alCerrar={() => setModal(null)} />}
      {modal === 'clave' && (
        <ModalRestablecerClave usuario={u} alCerrar={() => setModal(null)}
                               alGuardar={() => { setModal(null); setAviso(`Contraseña de ${u.nombreUsuario} restablecida. Comunicásela al usuario.`) }} />
      )}
      {modal === 'estado' && <ModalEstado usuario={u} alCerrar={() => setModal(null)} />}
    </>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-slate-900">{children}</dd>
    </div>
  )
}

// ---------- Permisos ----------

function PermisosUsuario({ usuario, className, alGuardar }: { usuario: Usuario; className?: string; alGuardar: () => void }) {
  const permisos = usePermisos()
  const guardar = useGuardarPermisosExtra(usuario.id)
  const [extra, setExtra] = useState<Set<number>>(() => new Set(usuario.permisosExtra))

  const porRol = useMemo(() => new Set(usuario.permisosRol), [usuario.permisosRol])
  const modulos = useMemo(() => {
    const grupos = new Map<string, NonNullable<typeof permisos.data>>()
    for (const p of permisos.data ?? []) grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p])
    return [...grupos.entries()]
  }, [permisos.data])

  const cambio = extra.size !== usuario.permisosExtra.length || usuario.permisosExtra.some((p) => !extra.has(p))
  const alternar = (id: number) => {
    const nuevo = new Set(extra)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    setExtra(nuevo)
  }

  return (
    <Tarjeta
      titulo="Permisos"
      className={className}
      acciones={!usuario.esAdministrador && (
        <Boton disabled={!cambio} cargando={guardar.isPending} onClick={() => guardar.mutate([...extra], { onSuccess: alGuardar })}>
          Guardar permisos
        </Boton>
      )}
    >
      {usuario.esAdministrador ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-marca-50 px-3 py-2 text-sm text-marca-900">
          <ShieldCheck className="size-4 shrink-0" /> El rol <strong className="font-medium">{usuario.rol}</strong> tiene todos los permisos.
        </p>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          Los permisos marcados <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">por rol</span> vienen
          con el rol {usuario.rol}. Podés otorgar permisos extra a este usuario sin cambiarle el rol.
        </p>
      )}
      {guardar.isError && <div className="mb-4"><MensajeError error={guardar.error} /></div>}

      {permisos.isPending ? <Cargando /> : permisos.isError ? <MensajeError error={permisos.error} /> : (
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {modulos.map(([modulo, lista]) => (
            <fieldset key={modulo}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{modulo}</legend>
              <ul className="space-y-1.5">
                {lista.map((p) => {
                  const delRol = porRol.has(p.id)
                  const marcado = delRol || extra.has(p.id)
                  const fijo = delRol || usuario.esAdministrador
                  return (
                    <li key={p.id}>
                      <label className={cx('flex items-start gap-2.5 text-sm', fijo ? 'text-slate-500' : 'cursor-pointer text-slate-800')}>
                        <input type="checkbox" checked={marcado} disabled={fijo} onChange={() => alternar(p.id)}
                               className="mt-0.5 size-4 rounded border-slate-300 accent-marca-600" />
                        <span className="flex-1">{p.descripcion}</span>
                        {delRol && !usuario.esAdministrador && <span className="shrink-0 rounded bg-slate-100 px-1.5 text-xs text-slate-600">por rol</span>}
                        {!delRol && extra.has(p.id) && <span className="shrink-0 rounded bg-marca-50 px-1.5 text-xs text-marca-700">extra</span>}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          ))}
        </div>
      )}
    </Tarjeta>
  )
}

// ---------- Modales ----------

const esquemaEditar = z.object({
  nombreCompleto: z.string().trim().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  email: z.email('Email inválido').max(150),
  rolId: idRequerido('Elegí un rol'),
})

function ModalEditar({ usuario, esUnoMismo, alCerrar }: { usuario: Usuario; esUnoMismo: boolean; alCerrar: () => void }) {
  const roles = useRoles()
  const actualizar = useActualizarUsuario(usuario.id)
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(esquemaEditar),
    defaultValues: { nombreCompleto: usuario.nombreCompleto, email: usuario.email, rolId: usuario.rolId },
  })
  const rolId = useWatch({ control, name: 'rolId' })
  const rolElegido = roles.data?.find((r) => r.id === Number(rolId))
  const pierdeAdmin = usuario.esAdministrador && rolElegido && !rolElegido.esAdministrador

  return (
    <Modal abierto titulo="Editar usuario" alCerrar={alCerrar}>
      <form onSubmit={handleSubmit((d) => actualizar.mutate(d, { onSuccess: alCerrar }))} noValidate className="space-y-4">
        <Campo etiqueta="Nombre completo" error={errors.nombreCompleto?.message}>
          {(id) => <Input id={id} invalido={!!errors.nombreCompleto} {...register('nombreCompleto')} />}
        </Campo>
        <Campo etiqueta="Email" error={errors.email?.message}>
          {(id) => <Input id={id} type="email" invalido={!!errors.email} {...register('email')} />}
        </Campo>
        <Campo etiqueta="Rol" error={errors.rolId?.message}
               ayuda={rolElegido?.descripcion ?? undefined}>
          {(id) => (
            <Select id={id} invalido={!!errors.rolId} {...register('rolId', { setValueAs: aNumeroOVacio })}>
              {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </Select>
          )}
        </Campo>
        {pierdeAdmin && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            {esUnoMismo
              ? 'No podés quitarte tu propio rol de administrador: pedíselo a otro administrador.'
              : 'El usuario dejará de ser administrador. El sistema no permite quedarse sin administradores activos.'}
          </p>
        )}
        <p className="text-xs text-slate-500">El nombre de usuario no se puede cambiar. Un cambio de rol rige desde el próximo inicio de sesión.</p>
        {actualizar.isError && <MensajeError error={actualizar.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={actualizar.isPending}>Guardar cambios</Boton>
        </div>
      </form>
    </Modal>
  )
}

function ModalRestablecerClave({ usuario, alCerrar, alGuardar }: { usuario: Usuario; alCerrar: () => void; alGuardar: () => void }) {
  const restablecer = useRestablecerClave(usuario.id)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({ clave: esquemaClave })),
    defaultValues: { clave: '' },
  })

  return (
    <Modal abierto titulo={`Restablecer contraseña de ${usuario.nombreUsuario}`} alCerrar={alCerrar}>
      <form onSubmit={handleSubmit((d) => restablecer.mutate(d.clave, { onSuccess: alGuardar }))} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">Usalo si el usuario olvidó su contraseña. Después la puede cambiar desde su cuenta.</p>
        <Campo etiqueta="Contraseña nueva" error={errors.clave?.message} ayuda="Mínimo 8 caracteres, con letras y números.">
          {(id) => <CampoClave id={id} autoFocus autoComplete="new-password" invalido={!!errors.clave} {...register('clave')}
                               alGenerar={(clave) => setValue('clave', clave, { shouldValidate: true })} />}
        </Campo>
        {restablecer.isError && <MensajeError error={restablecer.error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={restablecer.isPending}>Restablecer</Boton>
        </div>
      </form>
    </Modal>
  )
}

function ModalEstado({ usuario, alCerrar }: { usuario: Usuario; alCerrar: () => void }) {
  const cambiar = useCambiarEstadoUsuario(usuario.id)
  const baja = usuario.activo

  return (
    <Modal abierto titulo={baja ? `Dar de baja a ${usuario.nombreUsuario}` : `Reactivar a ${usuario.nombreUsuario}`} alCerrar={alCerrar}>
      <p className="text-sm text-slate-600">
        {baja
          ? 'No va a poder iniciar sesión y, si tiene una sesión abierta, se cierra de inmediato. Su historial (órdenes, ingresos) se conserva.'
          : 'Va a poder volver a iniciar sesión con su contraseña actual.'}
      </p>
      {cambiar.isError && <div className="mt-4"><MensajeError error={cambiar.error} /></div>}
      <div className="mt-6 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>Volver</Boton>
        <Boton variante={baja ? 'peligro' : 'primario'} cargando={cambiar.isPending}
               onClick={() => cambiar.mutate(!baja, { onSuccess: alCerrar })}>
          {baja ? 'Dar de baja' : 'Reactivar'}
        </Boton>
      </div>
    </Modal>
  )
}
