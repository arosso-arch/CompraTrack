import { createContext, useContext } from 'react'
import type { Permiso, UsuarioSesion } from '@/api/tipos'

export interface AuthContextValor {
  usuario: UsuarioSesion | null
  iniciarSesion: (usuario: string, clave: string) => Promise<void>
  cerrarSesion: () => void
  tienePermiso: (permiso: Permiso) => boolean
}

export const AuthContext = createContext<AuthContextValor | null>(null)

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return contexto
}
