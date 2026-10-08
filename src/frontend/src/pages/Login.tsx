import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/contexto'
import { Boton, Campo, Input } from '@/components/ui'
import { MensajeError } from '@/components/Estados'
import { Logo } from '@/layout/Logo'

const USUARIOS_DEMO = [
  { usuario: 'admin', rol: 'Administrador', descripcion: 'Acceso total' },
  { usuario: 'compras', rol: 'Comprador', descripcion: 'Crea y gestiona órdenes' },
  { usuario: 'deposito', rol: 'Depósito', descripcion: 'Registra ingresos' },
  { usuario: 'consulta', rol: 'Consulta', descripcion: 'Solo lectura' },
]
const CLAVE_DEMO = 'Demo1234!'

export function Login() {
  const { usuario: sesion, iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const destino = (useLocation().state as { desde?: string } | null)?.desde ?? '/'

  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)
  const [demora, setDemora] = useState(false)

  if (sesion) return <Navigate to={destino} replace />

  async function ingresar(u: string, c: string) {
    setEnviando(true)
    setError(null)
    // En el demo, la API y la base se suspenden sin uso: el primer ingreso puede tardar hasta un minuto.
    const aviso = setTimeout(() => setDemora(true), 4000)
    try {
      await iniciarSesion(u, c)
      navegar(destino, { replace: true })
    } catch (e) {
      setError(e)
    } finally {
      clearTimeout(aviso)
      setDemora(false)
      setEnviando(false)
    }
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    void ingresar(usuario.trim(), clave)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-marca-50 via-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de órdenes de compra y recepción de mercadería.</p>

          <form onSubmit={alEnviar} className="mt-6 space-y-4">
            <Campo etiqueta="Usuario">
              {(id) => <Input id={id} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoFocus required />}
            </Campo>
            <Campo etiqueta="Contraseña">
              {(id) => <Input id={id} type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />}
            </Campo>
            {error !== null && <MensajeError error={error} />}
            {demora && (
              <p role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-200">
                Despertando el demo… El servidor estaba en reposo y el primer ingreso puede tardar hasta un minuto.
              </p>
            )}
            <Boton type="submit" cargando={enviando} className="w-full">Ingresar</Boton>
          </form>
        </div>

        {/* Accesos rápidos para quien prueba el demo del portafolio */}
        <div className="mt-6 rounded-2xl bg-white/70 p-5 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo · entrar como</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {USUARIOS_DEMO.map((d) => (
              <button
                key={d.usuario}
                onClick={() => void ingresar(d.usuario, CLAVE_DEMO)}
                disabled={enviando}
                className="rounded-lg bg-white px-3 py-2 text-left ring-1 ring-slate-200 transition hover:ring-marca-500 disabled:opacity-50"
              >
                <span className="block text-sm font-medium text-slate-800">{d.rol}</span>
                <span className="block text-xs text-slate-500">{d.descripcion}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Datos ficticios. Usuario: <code>admin</code>, <code>compras</code>, <code>deposito</code> o <code>consulta</code> · clave <code>{CLAVE_DEMO}</code></p>
        </div>
      </div>
    </div>
  )
}
