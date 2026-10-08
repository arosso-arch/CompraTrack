import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileDown, Info, Mail, Paperclip, Send } from 'lucide-react'
import { descargarArchivo } from '@/api/cliente'
import { useBorradorEnvio, useEnviarOrden } from '@/api/consultas'
import type { OrdenDetalle } from '@/api/tipos'
import { Boton, Campo, Input, Modal, Tarjeta, Textarea } from './ui'
import { Cargando, MensajeError } from './Estados'
import { formatoFechaHora } from '@/lib/formato'

/** Descarga el PDF de la orden (el pedido lleva el token, por eso no es un link común). */
export function BotonPdf({ orden }: { orden: OrdenDetalle }) {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const descargar = async () => {
    setDescargando(true)
    setError(null)
    try {
      await descargarArchivo(`/api/ordenes/${orden.id}/pdf`, `OC-${orden.numero}.pdf`)
    } catch (e) {
      setError(e)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <>
      <Boton variante="secundario" icono={<FileDown className="size-4" />} cargando={descargando} onClick={descargar}>PDF</Boton>
      {error !== null && (
        <Modal abierto titulo="No se pudo descargar el PDF" alCerrar={() => setError(null)}>
          <MensajeError error={error} />
        </Modal>
      )}
    </>
  )
}

const esquema = z.object({
  destinatario: z.email('Ingresá un email válido').max(150),
  asunto: z.string().trim().min(1, 'Ingresá el asunto').max(200, 'Máximo 200 caracteres'),
  mensaje: z.string().trim().min(1, 'Ingresá el mensaje').max(2000, 'Máximo 2000 caracteres'),
})

/** Envío de la orden por mail al proveedor, con el texto sugerido por la API y editable. */
export function ModalEnviarOrden({ orden, alCerrar, alEnviar }: {
  orden: OrdenDetalle
  alCerrar: () => void
  alEnviar: (mensaje: string, envioReal: boolean) => void
}) {
  const borrador = useBorradorEnvio(orden.id, true)

  return (
    <Modal abierto titulo={`Enviar orden ${orden.numero} al proveedor`} alCerrar={alCerrar} ancho="max-w-2xl">
      {borrador.isPending ? <Cargando texto="Preparando el mail…" />
        : borrador.isError ? <MensajeError error={borrador.error} />
        : <FormularioEnvio orden={orden} valores={borrador.data} alCerrar={alCerrar} alEnviar={alEnviar} />}
    </Modal>
  )
}

function FormularioEnvio({ orden, valores, alCerrar, alEnviar }: {
  orden: OrdenDetalle
  valores: { destinatario: string | null; asunto: string; mensaje: string }
  alCerrar: () => void
  alEnviar: (mensaje: string, envioReal: boolean) => void
}) {
  const enviar = useEnviarOrden(orden.id)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { destinatario: valores.destinatario ?? '', asunto: valores.asunto, mensaje: valores.mensaje },
  })

  const alEnviarFormulario = handleSubmit((d) =>
    enviar.mutate(d, { onSuccess: (r) => alEnviar(r.mensaje, r.envioReal) }),
  )

  return (
    <form onSubmit={alEnviarFormulario} noValidate className="space-y-4">
      <Campo etiqueta="Para" error={errors.destinatario?.message}
             ayuda={valores.destinatario ? 'Email cargado en el proveedor.' : 'El proveedor no tiene email cargado: ingresalo a mano.'}>
        {(id) => <Input id={id} type="email" invalido={!!errors.destinatario} {...register('destinatario')} />}
      </Campo>
      <Campo etiqueta="Asunto" error={errors.asunto?.message}>
        {(id) => <Input id={id} invalido={!!errors.asunto} {...register('asunto')} />}
      </Campo>
      <Campo etiqueta="Mensaje" error={errors.mensaje?.message}>
        {(id) => <Textarea id={id} rows={9} {...register('mensaje')} />}
      </Campo>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <Paperclip className="size-4 text-slate-400" /> Se adjunta <strong className="font-medium">OC-{orden.numero}.pdf</strong>
      </div>

      {enviar.isError && <MensajeError error={enviar.error} />}
      <div className="flex justify-end gap-2 pt-2">
        <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
        <Boton type="submit" cargando={enviar.isPending} icono={<Send className="size-4" />}>Enviar</Boton>
      </div>
    </form>
  )
}

/** Historial de envíos de la orden. */
export function TarjetaEnvios({ orden, className }: { orden: OrdenDetalle; className?: string }) {
  return (
    <Tarjeta titulo="Envíos al proveedor" className={className}>
      {orden.envios.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Mail className="size-4" /> Todavía no se envió esta orden.</p>
      ) : (
        <ul className="space-y-3">
          {orden.envios.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="truncate text-slate-900">{e.destinatario}</p>
              <p className="text-xs text-slate-500">{formatoFechaHora(e.fechaEnvio)} · {e.enviadoPor}</p>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

/** Aviso que queda visible después de enviar. En modo demostración aclara que el mail no salió. */
export function AvisoEnvio({ mensaje, envioReal, alCerrar }: { mensaje: string; envioReal: boolean; alCerrar: () => void }) {
  return (
    <div role="status" className={envioReal
      ? 'mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200'
      : 'mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200'}>
      {envioReal ? <Send className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
      <span className="flex-1">{mensaje}</span>
      <button onClick={alCerrar} className="text-xs font-medium underline-offset-2 hover:underline">Cerrar</button>
    </div>
  )
}
