import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, Lock } from 'lucide-react'
import { ApiError } from '@/api/cliente'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" /> {texto}
    </div>
  )
}

export function MensajeError({ error }: { error: unknown }) {
  const mensajes = error instanceof ApiError ? error.mensajes : ['Ocurrió un error inesperado.']
  return (
    <div role="alert" className="flex gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
      <AlertTriangle className="size-5 shrink-0 text-rose-500" />
      <ul className="space-y-0.5">{mensajes.map((m) => <li key={m}>{m}</li>)}</ul>
    </div>
  )
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="size-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function SinPermiso() {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center">
      <Lock className="size-8 text-slate-300" />
      <p className="font-medium text-slate-700">No tenés permiso para ver esta sección</p>
      <p className="text-sm text-slate-500">Pedile acceso a un administrador.</p>
    </div>
  )
}
