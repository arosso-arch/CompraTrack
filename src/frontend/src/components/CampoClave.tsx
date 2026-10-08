import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Wand2 } from 'lucide-react'
import { Input } from './ui'
import { generarClave } from '@/lib/esquemas'

/** Campo de contraseña con botón para mostrarla y, opcionalmente, para generar una al azar. */
export function CampoClave({ alGenerar, ...props }: ComponentProps<typeof Input> & { alGenerar?: (clave: string) => void }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input {...props} type={visible ? 'text' : 'password'} className="pr-10 font-mono" />
        <button type="button" onClick={() => setVisible(!visible)} tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {alGenerar && (
        <button type="button" onClick={() => { alGenerar(generarClave()); setVisible(true) }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-marca-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          <Wand2 className="size-4" /> Generar
        </button>
      )}
    </div>
  )
}
