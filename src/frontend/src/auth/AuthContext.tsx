import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, configurarCliente } from '@/api/cliente'
import type { LoginResponse, UsuarioSesion } from '@/api/tipos'
import { AuthContext, type AuthContextValor } from './contexto'

const CLAVE_STORAGE = 'compratrack.sesion'

interface Sesion {
  token: string
  expira: string
  usuario: UsuarioSesion
}

/** Lee la sesión guardada y la descarta si el token ya venció. */
function leerSesionGuardada(): Sesion | null {
  try {
    const guardada = localStorage.getItem(CLAVE_STORAGE)
    if (!guardada) return null
    const sesion = JSON.parse(guardada) as Sesion
    return new Date(sesion.expira) > new Date() ? sesion : null
  } catch {
    return null
  }
}

// La sesión vive fuera de React para que el cliente HTTP pueda leer el token sin depender de un render.
let sesionActual: Sesion | null = leerSesionGuardada()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(sesionActual)
  const queryClient = useQueryClient()

  const guardar = useCallback((nueva: Sesion | null) => {
    sesionActual = nueva
    if (nueva) localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nueva))
    else localStorage.removeItem(CLAVE_STORAGE)
    setSesion(nueva)
  }, [])

  const cerrarSesion = useCallback(() => {
    guardar(null)
    queryClient.clear()   // no dejar datos del usuario anterior en caché
  }, [guardar, queryClient])

  configurarCliente({ obtenerToken: () => sesionActual?.token ?? null, alExpirarSesion: cerrarSesion })

  const iniciarSesion = useCallback(
    async (usuario: string, clave: string) => {
      const respuesta = await api<LoginResponse>('/api/auth/login', { metodo: 'POST', cuerpo: { usuario, clave } })
      guardar({ token: respuesta.token, expira: respuesta.expira, usuario: respuesta.usuario })
    },
    [guardar],
  )

  const valor = useMemo<AuthContextValor>(
    () => ({
      usuario: sesion?.usuario ?? null,
      iniciarSesion,
      cerrarSesion,
      tienePermiso: (permiso) => sesion?.usuario.permisos.includes(permiso) ?? false,
    }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
