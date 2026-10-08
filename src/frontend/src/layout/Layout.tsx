import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { BarChart3, ClipboardList, Home, LogOut, Menu, PackageCheck, Truck, X } from 'lucide-react'
import { PERMISOS, type Permiso } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { cx } from '@/lib/cx'
import { Logo } from './Logo'

const secciones: { a: string; texto: string; icono: typeof Home; permiso: Permiso }[] = [
  { a: '/', texto: 'Inicio', icono: Home, permiso: PERMISOS.ordenesVer },
  { a: '/ordenes', texto: 'Órdenes de compra', icono: ClipboardList, permiso: PERMISOS.ordenesVer },
  { a: '/recepciones', texto: 'Recepciones', icono: PackageCheck, permiso: PERMISOS.ordenesVer },
  { a: '/proveedores', texto: 'Proveedores', icono: Truck, permiso: PERMISOS.proveedoresVer },
  { a: '/reportes', texto: 'Reportes', icono: BarChart3, permiso: PERMISOS.reportesVer },
]

export function Layout() {
  const { usuario, cerrarSesion, tienePermiso } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const navegacion = (
    <nav className="flex flex-1 flex-col gap-1">
      {secciones.filter((s) => tienePermiso(s.permiso)).map(({ a, texto, icono: Icono }) => (
        <NavLink
          key={a}
          to={a}
          end={a === '/'}
          onClick={() => setMenuAbierto(false)}
          className={({ isActive }) => cx(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )}
        >
          <Icono className="size-4.5" />
          {texto}
        </NavLink>
      ))}
    </nav>
  )

  const pieUsuario = usuario && (
    <div className="border-t border-slate-200 pt-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-100 text-sm font-semibold text-marca-700">
          {usuario.nombreCompleto.split(' ').map((p) => p[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{usuario.nombreCompleto}</p>
          <p className="truncate text-xs text-slate-500">{usuario.rol}</p>
        </div>
        <button
          onClick={cerrarSesion}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Menú lateral fijo en pantallas grandes */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Logo />
        {navegacion}
        {pieUsuario}
      </aside>

      {/* Barra superior + menú desplegable en celulares */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setMenuAbierto(!menuAbierto)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Menú">
          {menuAbierto ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {menuAbierto && (
        <div className="fixed inset-x-0 top-[57px] z-10 flex flex-col gap-4 border-b border-slate-200 bg-white p-4 shadow-lg lg:hidden">
          {navegacion}
          {pieUsuario}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
