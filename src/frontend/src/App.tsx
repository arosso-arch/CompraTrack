import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { PERMISOS, type Permiso } from '@/api/tipos'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { Cargando } from '@/components/Estados'
import { Layout } from '@/layout/Layout'
import { Login } from '@/pages/Login'

// Cada pantalla se descarga recién cuando se visita (code splitting): la carga inicial solo trae el login y el menú.
const Inicio = lazy(() => import('@/pages/Inicio').then((m) => ({ default: m.Inicio })))
const Ordenes = lazy(() => import('@/pages/Ordenes').then((m) => ({ default: m.Ordenes })))
const NuevaOrden = lazy(() => import('@/pages/NuevaOrden').then((m) => ({ default: m.NuevaOrden })))
const OrdenDetalle = lazy(() => import('@/pages/OrdenDetalle').then((m) => ({ default: m.OrdenDetalle })))
const Recepciones = lazy(() => import('@/pages/Recepciones').then((m) => ({ default: m.Recepciones })))
const Proveedores = lazy(() => import('@/pages/Proveedores').then((m) => ({ default: m.Proveedores })))
const ProveedorDetalle = lazy(() => import('@/pages/ProveedorDetalle').then((m) => ({ default: m.ProveedorDetalle })))
const Reportes = lazy(() => import('@/pages/Reportes').then((m) => ({ default: m.Reportes })))

/** Pantalla protegida por permiso, con indicador de carga mientras se descarga su código. */
function Pantalla({ permiso, children }: { permiso: Permiso; children: ReactNode }) {
  return (
    <RutaProtegida permiso={permiso}>
      <Suspense fallback={<Cargando />}>{children}</Suspense>
    </RutaProtegida>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RutaProtegida><Layout /></RutaProtegida>}>
          <Route index element={<Pantalla permiso={PERMISOS.ordenesVer}><Inicio /></Pantalla>} />
          <Route path="ordenes" element={<Pantalla permiso={PERMISOS.ordenesVer}><Ordenes /></Pantalla>} />
          <Route path="ordenes/nueva" element={<Pantalla permiso={PERMISOS.ordenesCrear}><NuevaOrden /></Pantalla>} />
          <Route path="ordenes/:id" element={<Pantalla permiso={PERMISOS.ordenesVer}><OrdenDetalle /></Pantalla>} />
          <Route path="recepciones" element={<Pantalla permiso={PERMISOS.ordenesVer}><Recepciones /></Pantalla>} />
          <Route path="proveedores" element={<Pantalla permiso={PERMISOS.proveedoresVer}><Proveedores /></Pantalla>} />
          <Route path="proveedores/:id" element={<Pantalla permiso={PERMISOS.proveedoresVer}><ProveedorDetalle /></Pantalla>} />
          <Route path="reportes" element={<Pantalla permiso={PERMISOS.reportesVer}><Reportes /></Pantalla>} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function NoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-marca-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-marca-700 hover:underline">Volver al inicio</Link>
    </div>
  )
}
