import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCambiarMiClave } from '@/api/consultas'
import { Boton, Campo, Modal } from '@/components/ui'
import { MensajeError } from '@/components/Estados'
import { CampoClave } from '@/components/CampoClave'
import { esquemaClave } from '@/lib/esquemas'

const esquema = z.object({
  claveActual: z.string().min(1, 'Ingresá tu contraseña actual'),
  claveNueva: esquemaClave,
  confirmacion: z.string(),
})
  .refine((d) => d.claveNueva === d.confirmacion, { path: ['confirmacion'], message: 'No coincide con la contraseña nueva' })
  .refine((d) => d.claveNueva !== d.claveActual, { path: ['claveNueva'], message: 'Tiene que ser distinta de la actual' })

/** El usuario logueado cambia su propia contraseña. */
export function ModalMiClave({ alCerrar }: { alCerrar: () => void }) {
  const cambiar = useCambiarMiClave()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { claveActual: '', claveNueva: '', confirmacion: '' },
  })

  return (
    <Modal abierto titulo="Cambiar mi contraseña" alCerrar={alCerrar}>
      {cambiar.isSuccess ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Listo: tu contraseña fue cambiada. Usala la próxima vez que inicies sesión.
          </p>
          <div className="flex justify-end"><Boton onClick={alCerrar}>Cerrar</Boton></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => cambiar.mutate({ claveActual: d.claveActual, claveNueva: d.claveNueva }))} noValidate className="space-y-4">
          <Campo etiqueta="Contraseña actual" error={errors.claveActual?.message}>
            {(id) => <CampoClave id={id} autoFocus autoComplete="current-password" invalido={!!errors.claveActual} {...register('claveActual')} />}
          </Campo>
          <Campo etiqueta="Contraseña nueva" error={errors.claveNueva?.message} ayuda="Mínimo 8 caracteres, con letras y números.">
            {(id) => <CampoClave id={id} autoComplete="new-password" invalido={!!errors.claveNueva} {...register('claveNueva')} />}
          </Campo>
          <Campo etiqueta="Repetir contraseña nueva" error={errors.confirmacion?.message}>
            {(id) => <CampoClave id={id} autoComplete="new-password" invalido={!!errors.confirmacion} {...register('confirmacion')} />}
          </Campo>
          {cambiar.isError && <MensajeError error={cambiar.error} />}
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
            <Boton type="submit" cargando={cambiar.isPending}>Cambiar contraseña</Boton>
          </div>
        </form>
      )}
    </Modal>
  )
}
