import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { PERMISOS } from '@/api/tipos'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { Layout } from '@/layout/Layout'
import { Inicio } from '@/pages/Inicio'
import { Login } from '@/pages/Login'
import { NuevaOrden } from '@/pages/NuevaOrden'
import { OrdenDetalle } from '@/pages/OrdenDetalle'
import { Ordenes } from '@/pages/Ordenes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RutaProtegida><Layout /></RutaProtegida>}>
          <Route index element={<RutaProtegida permiso={PERMISOS.ordenesVer}><Inicio /></RutaProtegida>} />
          <Route path="ordenes" element={<RutaProtegida permiso={PERMISOS.ordenesVer}><Ordenes /></RutaProtegida>} />
          <Route path="ordenes/nueva" element={<RutaProtegida permiso={PERMISOS.ordenesCrear}><NuevaOrden /></RutaProtegida>} />
          <Route path="ordenes/:id" element={<RutaProtegida permiso={PERMISOS.ordenesVer}><OrdenDetalle /></RutaProtegida>} />
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
