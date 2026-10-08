import { useState } from 'react'
import { Link } from 'react-router'
import { useProveedores, useRecepciones } from '@/api/consultas'
import { EncabezadoPagina, Input, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { cx } from '@/lib/cx'
import { formatoFecha, formatoKg, hoyIso, plural } from '@/lib/formato'

function haceDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toLocaleDateString('sv-SE')   // yyyy-mm-dd en hora local
}

export function Recepciones() {
  const [desde, setDesde] = useState(haceDias(30))
  const [hasta, setHasta] = useState(hoyIso())
  const [proveedorId, setProveedorId] = useState<number | ''>('')

  const recepciones = useRecepciones({ desde, hasta, proveedorId })
  const proveedores = useProveedores()
  const totalKg = recepciones.data?.reduce((suma, r) => suma + r.cantidadKg, 0) ?? 0

  return (
    <>
      <EncabezadoPagina titulo="Recepciones" subtitulo="Ingresos de mercadería registrados por el depósito." />

      <Tarjeta sinPadding>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-500">Desde
            <Input type="date" className="mt-1" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-500">Hasta
            <Input type="date" className="mt-1" value={hasta} min={desde} max={hoyIso()} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-500">Proveedor
            <Select className="mt-1" value={proveedorId} onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos</option>
              {proveedores.data?.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </Select>
          </label>
        </div>

        {recepciones.isPending ? <Cargando /> : recepciones.isError ? <div className="p-5"><MensajeError error={recepciones.error} /></div>
          : recepciones.data.length === 0 ? <Vacio titulo="No hay ingresos en el período elegido" />
          : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
                <span className="tabular">{plural(recepciones.data.length, 'ingreso')}</span>
                <span className="tabular"><strong className="text-slate-900">{formatoKg(totalKg)}</strong> recibidos</span>
              </div>
              <div className={cx('relative overflow-x-auto', recepciones.isPlaceholderData && 'opacity-60')}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-3 py-3">Orden</th>
                      <th className="px-3 py-3">Proveedor</th>
                      <th className="hidden px-3 py-3 md:table-cell">Producto</th>
                      <th className="px-3 py-3 text-right">Cantidad</th>
                      <th className="hidden px-3 py-3 lg:table-cell">Remito</th>
                      <th className="hidden px-5 py-3 lg:table-cell">Registró</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recepciones.data.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="tabular px-5 py-3 text-slate-600">{formatoFecha(r.fecha)}</td>
                        <td className="px-3 py-3">
                          <Link to={`/ordenes/${r.ordenCompraId}`} className="font-medium text-marca-700 hover:underline">OC {r.numeroOrden}</Link>
                        </td>
                        <td className="max-w-56 truncate px-3 py-3 text-slate-700">{r.proveedor}</td>
                        <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{r.producto}</td>
                        <td className="tabular px-3 py-3 text-right font-medium text-slate-900">{formatoKg(r.cantidadKg)}</td>
                        <td className="hidden px-3 py-3 text-slate-500 lg:table-cell">{r.remito ?? '—'}</td>
                        <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">{r.registradaPor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recepciones.data.length === 500 && (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Se muestran los 500 ingresos más recientes. Acotá el período para ver el resto.</p>
              )}
            </>
          )}
      </Tarjeta>
    </>
  )
}
