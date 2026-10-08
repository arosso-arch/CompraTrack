import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Permiso } from '@/api/tipos'
import { useAuth } from './contexto'
import { SinPermiso } from '@/components/Estados'

/** Exige sesión iniciada y, opcionalmente, un permiso. Sin sesión, redirige al login recordando la página. */
export function RutaProtegida({ permiso, children }: { permiso?: Permiso; children: ReactNode }) {
  const { usuario, tienePermiso } = useAuth()
  const ubicacion = useLocation()

  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  if (permiso && !tienePermiso(permiso)) return <SinPermiso />
  return children
}
