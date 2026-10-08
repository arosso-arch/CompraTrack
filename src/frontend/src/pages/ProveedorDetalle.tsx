import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ClipboardList, Pencil, Plus, Power } from 'lucide-react'
import {
  useAgregarProductoProveedor, useCambiarEstadoProductoProveedor, useCambiarEstadoProveedor, useFormatos, useGramajes,
  useProductosProveedor, useProveedor, useTipos,
} from '@/api/consultas'
import { PERMISOS } from '@/api/tipos'
import { useAuth } from '@/auth/contexto'
import { Boton, EncabezadoPagina, Modal, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { cx } from '@/lib/cx'
import { ModalProveedor } from './Proveedores'

export function ProveedorDetalle() {
  const id = Number(useParams().id)
  const { tienePermiso } = useAuth()
  const proveedor = useProveedor(id)
  const cambiarEstado = useCambiarEstadoProveedor()
  const [editando, setEditando] = useState(false)

  if (proveedor.isPending) return <Cargando />
  if (proveedor.isError) return <MensajeError error={proveedor.error} />
  const p = proveedor.data
  const puedeGestionar = tienePermiso(PERMISOS.proveedoresGestionar)

  return (
    <>
      <Link to="/proveedores" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Proveedores
      </Link>
      <EncabezadoPagina
        titulo={<span className="flex items-center gap-3">{p.razonSocial}
          {!p.activo && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Dado de baja</span>}</span>}
        subtitulo={`Código ${p.codigo}`}
        acciones={<>
          <Link to={`/ordenes?proveedorId=${p.id}`}><Boton variante="secundario" icono={<ClipboardList className="size-4" />}>Ver órdenes</Boton></Link>
          {puedeGestionar && <>
            <Boton variante="secundario" icono={<Pencil className="size-4" />} onClick={() => setEditando(true)}>Editar</Boton>
            <Boton variante={p.activo ? 'peligro' : 'secundario'} icono={<Power className="size-4" />} cargando={cambiarEstado.isPending}
                   onClick={() => cambiarEstado.mutate({ id: p.id, activo: !p.activo })}>
              {p.activo ? 'Dar de baja' : 'Reactivar'}
            </Boton>
          </>}
        </>}
      />

      {cambiarEstado.isError && <div className="mb-4"><MensajeError error={cambiarEstado.error} /></div>}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Contacto">
          <dl className="space-y-3 text-sm">
            {[
              ['Persona de atención', p.contacto],
              ['Email', p.email && <a key="email" className="text-marca-700 hover:underline" href={`mailto:${p.email}`}>{p.email}</a>],
              ['Teléfono', p.telefono],
              ['Dirección', p.direccion],
              ['Órdenes abiertas', String(p.ordenesAbiertas)],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta as string}>
                <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
                <dd className="mt-0.5 text-slate-900">{valor || '—'}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
        <ProductosProveedor proveedorId={p.id} className="lg:col-span-2" />
      </div>

      {editando && <ModalProveedor proveedor={p} alCerrar={() => setEditando(false)} />}
    </>
  )
}

function ProductosProveedor({ proveedorId, className }: { proveedorId: number; className?: string }) {
  const { tienePermiso } = useAuth()
  const productos = useProductosProveedor(proveedorId)
  const cambiarEstado = useCambiarEstadoProductoProveedor(proveedorId)
  const [agregando, setAgregando] = useState(false)
  const puedeGestionar = tienePermiso(PERMISOS.productosGestionar)

  return (
    <Tarjeta
      titulo="Productos que ofrece"
      className={className}
      sinPadding
      acciones={puedeGestionar && <Boton variante="secundario" icono={<Plus className="size-4" />} onClick={() => setAgregando(true)}>Agregar</Boton>}
    >
      <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
        Solo las combinaciones activas aparecen al cargar una orden para este proveedor.
      </p>
      {cambiarEstado.isError && <div className="p-4"><MensajeError error={cambiarEstado.error} /></div>}
      {productos.isPending ? <Cargando /> : productos.isError ? <div className="p-5"><MensajeError error={productos.error} /></div>
        : productos.data.length === 0 ? <Vacio titulo="Todavía no tiene productos cargados" />
        : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-3 py-3">Gramaje</th>
                  <th className="px-3 py-3">Formato</th>
                  <th className="px-3 py-3 text-right" title="Cantidad de veces que se pidió">Pedidos</th>
                  <th className="px-5 py-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.data.map((pp) => (
                  <tr key={pp.id} className={cx(!pp.activo && 'text-slate-400')}>
                    <td className="px-5 py-2.5">{pp.tipo}</td>
                    <td className="tabular px-3 py-2.5">{pp.gramos} g/m²</td>
                    <td className="px-3 py-2.5">{pp.formato}</td>
                    <td className="tabular px-3 py-2.5 text-right">{pp.cantidadUsos}</td>
                    <td className="px-5 py-2.5 text-right">
                      {puedeGestionar ? (
                        <button
                          role="switch"
                          aria-checked={pp.activo}
                          aria-label={`${pp.activo ? 'Desactivar' : 'Activar'} ${pp.tipo} ${pp.gramos} g/m² ${pp.formato}`}
                          disabled={cambiarEstado.isPending}
                          onClick={() => cambiarEstado.mutate({ id: pp.id, activo: !pp.activo })}
                          className={cx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
                                        pp.activo ? 'bg-marca-600' : 'bg-slate-300')}
                        >
                          <span className={cx('inline-block size-4 rounded-full bg-white shadow transition-transform',
                                              pp.activo ? 'translate-x-4.5' : 'translate-x-0.5')} />
                        </button>
                      ) : (pp.activo ? 'Activo' : 'Inactivo')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {agregando && <ModalAgregarProducto proveedorId={proveedorId} alCerrar={() => setAgregando(false)} />}
    </Tarjeta>
  )
}

function ModalAgregarProducto({ proveedorId, alCerrar }: { proveedorId: number; alCerrar: () => void }) {
  const tipos = useTipos()
  const gramajes = useGramajes()
  const formatos = useFormatos()
  const agregar = useAgregarProductoProveedor(proveedorId)
  const [valor, setValor] = useState({ tipoProductoId: '', gramajeId: '', formatoId: '' })
  const completo = valor.tipoProductoId && valor.gramajeId && valor.formatoId

  const cambiar = (campo: keyof typeof valor) => (e: React.ChangeEvent<HTMLSelectElement>) => setValor({ ...valor, [campo]: e.target.value })

  return (
    <Modal abierto titulo="Agregar producto al proveedor" alCerrar={alCerrar}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Tipo
          <Select className="mt-1" value={valor.tipoProductoId} onChange={cambiar('tipoProductoId')}>
            <option value="">Elegí</option>
            {tipos.data?.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">Gramaje
          <Select className="mt-1" value={valor.gramajeId} onChange={cambiar('gramajeId')}>
            <option value="">Elegí</option>
            {gramajes.data?.map((g) => <option key={g.id} value={g.id}>{g.gramos} g/m²</option>)}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">Formato
          <Select className="mt-1" value={valor.formatoId} onChange={cambiar('formatoId')}>
            <option value="">Elegí</option>
            {formatos.data?.map((f) => <option key={f.id} value={f.id}>{f.descripcion}</option>)}
          </Select>
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Si la combinación ya existía dada de baja, se reactiva.</p>
      {agregar.isError && <div className="mt-3"><MensajeError error={agregar.error} /></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
        <Boton disabled={!completo} cargando={agregar.isPending}
               onClick={() => agregar.mutate(
                 { tipoProductoId: Number(valor.tipoProductoId), gramajeId: Number(valor.gramajeId), formatoId: Number(valor.formatoId) },
                 { onSuccess: alCerrar },
               )}>
          Agregar
        </Boton>
      </div>
    </Modal>
  )
}
