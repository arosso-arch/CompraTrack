import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import type { EstadoEntrega, EstadoOrden } from '@/api/tipos'


import { cx } from '@/lib/cx'

// ---------- Botón ----------

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const estilosBoton: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 shadow-sm',
  secundario: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 shadow-sm',
  peligro: 'bg-white text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 shadow-sm',
  fantasma: 'text-slate-600 hover:bg-slate-100',
}

export function Boton({
  variante = 'primario',
  cargando = false,
  icono,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { variante?: Variante; cargando?: boolean; icono?: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        estilosBoton[variante],
        className,
      )}
      {...props}
    >
      {cargando ? <Loader2 className="size-4 animate-spin" /> : icono}
      {children}
    </button>
  )
}

// ---------- Campos de formulario ----------

const estiloControl =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-marca-600 disabled:bg-slate-50 disabled:text-slate-500'

export function Campo({ etiqueta, error, ayuda, children, className }: {
  etiqueta: string
  error?: string
  ayuda?: string
  children: (id: string) => ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</label>
      {children(id)}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p>
        : ayuda ? <p className="mt-1 text-xs text-slate-500">{ayuda}</p> : null}
    </div>
  )
}

export function Input({ className, invalido, ...props }: ComponentProps<'input'> & { invalido?: boolean }) {
  return <input className={cx(estiloControl, invalido && 'ring-rose-400', className)} {...props} />
}

export function Select({ className, invalido, ...props }: ComponentProps<'select'> & { invalido?: boolean }) {
  return <select className={cx(estiloControl, 'pr-8', invalido && 'ring-rose-400', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={3} className={cx(estiloControl, className)} {...props} />
}

// ---------- Contenedores ----------

export function Tarjeta({ titulo, acciones, children, className, sinPadding }: {
  titulo?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
  sinPadding?: boolean
}) {
  return (
    <section className={cx('rounded-xl bg-white shadow-sm ring-1 ring-slate-200', className)}>
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

export function EncabezadoPagina({ titulo, subtitulo, acciones }: { titulo: ReactNode; subtitulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

// ---------- Insignias de estado ----------

const estilosEstadoOrden: Record<EstadoOrden, string> = {
  ABIERTA: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  CERRADA: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  ANULADA: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

const estilosEstadoEntrega: Record<EstadoEntrega, string> = {
  'EN ESPERA': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'ENTREGA PARCIAL': 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'ENTREGA COMPLETA': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'CANTIDAD SUPERADA': 'bg-violet-50 text-violet-700 ring-violet-600/20',
}

const textoEstadoEntrega: Record<EstadoEntrega, string> = {
  'EN ESPERA': 'En espera',
  'ENTREGA PARCIAL': 'Parcial',
  'ENTREGA COMPLETA': 'Completa',
  'CANTIDAD SUPERADA': 'Excedida',
}

function Insignia({ clases, children }: { clases: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', clases)}>
      {children}
    </span>
  )
}

export function InsigniaEstadoOrden({ estado }: { estado: EstadoOrden }) {
  return <Insignia clases={estilosEstadoOrden[estado]}>{estado.charAt(0) + estado.slice(1).toLowerCase()}</Insignia>
}

export function InsigniaEstadoEntrega({ estado }: { estado: EstadoEntrega }) {
  return <Insignia clases={estilosEstadoEntrega[estado]}>{textoEstadoEntrega[estado]}</Insignia>
}

/** Barra de avance recibido / pedido. Si se recibió de más, se completa en violeta. */
export function BarraProgreso({ recibido, pedido }: { recibido: number; pedido: number }) {
  const porcentaje = pedido > 0 ? Math.round((recibido / pedido) * 100) : 0
  const color = porcentaje > 100 ? 'bg-violet-500' : porcentaje === 100 ? 'bg-emerald-500' : 'bg-sky-500'
  return (
    <div className="flex items-center gap-2" title={`${porcentaje}% recibido`}>
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cx('h-full rounded-full', color)} style={{ width: `${Math.min(porcentaje, 100)}%` }} />
      </div>
      <span className="tabular w-10 text-right text-xs text-slate-500">{porcentaje}%</span>
    </div>
  )
}

// ---------- Modal ----------

export function Modal({ abierto, alCerrar, titulo, children, ancho = 'max-w-lg' }: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
  ancho?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      onClick={(e) => e.target === ref.current && alCerrar()}   // clic en el fondo
      className={cx('m-auto w-[calc(100%-2rem)] rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40', ancho)}
    >
      {abierto && (
        <div>
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
            <button onClick={alCerrar} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </header>
          <div className="px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}

// ---------- Paginación ----------

export function Paginacion({ pagina, totalPaginas, total, alCambiar }: {
  pagina: number
  totalPaginas: number
  total: number
  alCambiar: (pagina: number) => void
}) {
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span className="tabular">{total} resultado{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-1">
        <Boton variante="fantasma" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)} aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </Boton>
        <span className="tabular px-2">Página {pagina} de {totalPaginas}</span>
        <Boton variante="fantasma" disabled={pagina >= totalPaginas} onClick={() => alCambiar(pagina + 1)} aria-label="Página siguiente">
          <ChevronRight className="size-4" />
        </Boton>
      </div>
    </div>
  )
}
