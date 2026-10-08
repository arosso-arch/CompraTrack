import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAniosReportes, useKilosPorMes, useKilosPorProveedor, useKilosPorTipo, useTipos } from '@/api/consultas'
import type { KilosPorGrupo } from '@/api/tipos'
import { EncabezadoPagina, Select, Tarjeta } from '@/components/ui'
import { Cargando, MensajeError, Vacio } from '@/components/Estados'
import { formatoEntero, formatoKg, formatoToneladas, hoyIso, MESES } from '@/lib/formato'

/**
 * Paleta categórica validada para daltonismo (orden fijo, nunca rotado).
 * El color se asigna por tipo de producto según su id, no por su posición en el ranking:
 * así "Kraft" tiene el mismo color en todos los gráficos y con cualquier filtro.
 */
const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const COLOR_MAGNITUD = '#2a78d6'

export function Reportes() {
  const anioActual = Number(hoyIso().slice(0, 4))
  const anios = useAniosReportes()
  const [anio, setAnio] = useState(anioActual)

  const desde = `${anio}-01-01`
  const hasta = anio === anioActual ? hoyIso() : `${anio}-12-31`

  const porMes = useKilosPorMes(anio)
  const porProveedor = useKilosPorProveedor(desde, hasta)
  const porTipo = useKilosPorTipo(desde, hasta)
  const tipos = useTipos()

  // Posición de cada tipo en la paleta, según su orden de alta en el catálogo (id).
  const { colorDeTipo, ordenDeTipo } = useMemo(() => {
    const posicion = new Map<string, number>()
    ;[...(tipos.data ?? [])].sort((a, b) => a.id - b.id).forEach((t, i) => posicion.set(t.nombre, i))
    return {
      colorDeTipo: (nombre: string) => PALETA[posicion.get(nombre) ?? -1] ?? '#8a8a85',
      ordenDeTipo: (nombre: string) => posicion.get(nombre) ?? Number.MAX_SAFE_INTEGER,
    }
  }, [tipos.data])

  const totalKg = porTipo.data?.reduce((s, f) => s + f.kgRecibidos, 0) ?? 0
  const totalIngresos = porTipo.data?.reduce((s, f) => s + f.recepciones, 0) ?? 0

  return (
    <>
      <EncabezadoPagina
        titulo="Reportes"
        subtitulo="Mercadería recibida según los ingresos registrados por el depósito."
        acciones={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Año
            <Select className="w-28" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {(anios.data?.length ? anios.data : [anioActual]).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </label>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cifra etiqueta={`Recibido en ${anio}`} valor={porTipo.data && formatoToneladas(totalKg)} detalle={porTipo.data && formatoKg(totalKg)} />
        <Cifra etiqueta="Ingresos registrados" valor={porTipo.data && formatoEntero(totalIngresos)}
               detalle={porTipo.data && totalIngresos > 0 ? `${formatoKg(Math.round(totalKg / totalIngresos))} promedio` : undefined} />
        <Cifra etiqueta="Proveedores con entregas" valor={porProveedor.data && formatoEntero(porProveedor.data.length)} />
        <Cifra etiqueta="Tipos de producto recibidos" valor={porTipo.data && formatoEntero(porTipo.data.length)} />
      </div>

      <GraficoPorMes datos={porMes} anio={anio} colorDeTipo={colorDeTipo} ordenDeTipo={ordenDeTipo} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Por proveedor">
          <BarrasHorizontales consulta={porProveedor} color={() => COLOR_MAGNITUD} />
        </Tarjeta>
        <Tarjeta titulo="Por tipo de producto">
          <BarrasHorizontales consulta={porTipo} color={colorDeTipo} />
        </Tarjeta>
      </div>
    </>
  )
}

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor?: string; detalle?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{etiqueta}</p>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {valor ?? <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" />}
      </p>
      <p className="tabular mt-1 text-xs text-slate-500">{detalle ?? ' '}</p>
    </div>
  )
}

// ---------- Kilos por mes (barras apiladas por tipo) ----------

type FilaMes = { mes: string; total: number } & Record<string, number | string>

function GraficoPorMes({ datos, anio, colorDeTipo, ordenDeTipo }: {
  datos: ReturnType<typeof useKilosPorMes>
  anio: number
  colorDeTipo: (tipo: string) => string
  ordenDeTipo: (tipo: string) => number
}) {
  const [verTabla, setVerTabla] = useState(false)

  const { filas, tiposPresentes } = useMemo(() => {
    // Orden de apilado = orden de la paleta: así los colores vecinos son los pares validados para daltonismo.
    const presentes = [...new Set((datos.data ?? []).map((d) => d.tipo))].sort((a, b) => ordenDeTipo(a) - ordenDeTipo(b))
    const anioActual = Number(hoyIso().slice(0, 4))
    const meses = anio === anioActual ? Number(hoyIso().slice(5, 7)) : 12
    const filas: FilaMes[] = Array.from({ length: meses }, (_, i) => {
      const fila: FilaMes = { mes: MESES[i], total: 0 }
      for (const tipo of presentes) fila[tipo] = 0
      return fila
    })
    for (const d of datos.data ?? []) {
      const fila = filas[d.mes - 1]
      if (!fila) continue
      fila[d.tipo] = d.kgRecibidos
      fila.total += d.kgRecibidos
    }
    return { filas, tiposPresentes: presentes }
  }, [datos.data, anio, ordenDeTipo])

  return (
    <Tarjeta
      titulo="Kilos recibidos por mes"
      acciones={
        <button onClick={() => setVerTabla(!verTabla)} className="text-xs font-medium text-marca-700 hover:underline">
          {verTabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      }
    >
      {datos.isPending ? <Cargando /> : datos.isError ? <MensajeError error={datos.error} />
        : tiposPresentes.length === 0 ? <Vacio titulo={`No hay ingresos registrados en ${anio}`} />
        : (
          <>
            {/* Leyenda: con varias series, el color nunca es la única forma de identificar el tipo */}
            <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {tiposPresentes.map((tipo) => (
                <li key={tipo} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: colorDeTipo(tipo) }} /> {tipo}
                </li>
              ))}
            </ul>

            {verTabla ? <TablaPorMes filas={filas} tipos={tiposPresentes} /> : (
              <div className="h-72" role="img" aria-label={`Kilos recibidos por mes en ${anio}, apilados por tipo de producto`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filas} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke="#eef0f3" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={{ stroke: '#d4d7dd' }} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: '#64748b', fontSize: 12 }}
                           tickFormatter={(v: number) => formatoToneladas(v)} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} content={(props) => <TooltipMes {...props} tipos={tiposPresentes} colorDeTipo={colorDeTipo} />} />
                    {tiposPresentes.map((tipo, i) => (
                      <Bar key={tipo} dataKey={tipo} stackId="kilos" fill={colorDeTipo(tipo)}
                           stroke="#ffffff" strokeWidth={2}   // separación de 2px entre segmentos
                           radius={i === tiposPresentes.length - 1 ? [4, 4, 0, 0] : 0}
                           isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
    </Tarjeta>
  )
}

/** Props que Recharts le pasa al contenido del tooltip (solo las que se usan). */
interface PropsTooltip {
  active?: boolean
  payload?: readonly { payload?: unknown }[]
  label?: string | number
}

function TooltipMes({ active, payload, label, tipos, colorDeTipo }: PropsTooltip & {
  tipos: string[]
  colorDeTipo: (tipo: string) => string
}) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload as FilaMes
  const conValor = tipos.filter((t) => Number(fila[t]) > 0).sort((a, b) => Number(fila[b]) - Number(fila[a]))

  return (
    <div className="min-w-48 rounded-lg bg-white p-3 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="mb-2 font-semibold text-slate-900">{label} · {formatoKg(fila.total)}</p>
      {conValor.length === 0 ? <p className="text-slate-500">Sin ingresos</p> : (
        <ul className="space-y-1">
          {conValor.map((t) => (
            <li key={t} className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ backgroundColor: colorDeTipo(t) }} />{t}</span>
              <span className="tabular text-slate-900">{formatoKg(Number(fila[t]))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TablaPorMes({ filas, tipos }: { filas: FilaMes[]; tipos: string[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Mes</th>
            {tipos.map((t) => <th key={t} className="px-2 py-2 text-right font-medium">{t}</th>)}
            <th className="py-2 pl-3 text-right font-semibold text-slate-700">Total</th>
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-slate-100 text-slate-700">
          {filas.map((f) => (
            <tr key={f.mes}>
              <td className="py-1.5 pr-3 font-medium">{f.mes}</td>
              {tipos.map((t) => <td key={t} className="px-2 py-1.5 text-right">{Number(f[t]) ? formatoEntero(Number(f[t])) : '—'}</td>)}
              <td className="py-1.5 pl-3 text-right font-semibold text-slate-900">{formatoEntero(f.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">Valores en kg.</p>
    </div>
  )
}

// ---------- Ranking en barras horizontales ----------

function BarrasHorizontales({ consulta, color }: {
  consulta: { data?: KilosPorGrupo[]; isPending: boolean; isError: boolean; error: unknown }
  color: (grupo: string) => string
}) {
  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <MensajeError error={consulta.error} />
  if (!consulta.data?.length) return <Vacio titulo="Sin ingresos en el período" />

  const maximo = Math.max(...consulta.data.map((f) => f.kgRecibidos))
  const total = consulta.data.reduce((s, f) => s + f.kgRecibidos, 0)

  return (
    <ul className="space-y-3">
      {consulta.data.map((f) => (
        <li key={f.grupo} title={`${f.grupo}: ${formatoKg(f.kgRecibidos)} en ${f.recepciones} ingresos`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{f.grupo}</span>
            <span className="tabular shrink-0 text-slate-900">
              {formatoToneladas(f.kgRecibidos)}
              <span className="ml-1.5 text-xs text-slate-500">{Math.round((f.kgRecibidos / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(f.kgRecibidos / maximo) * 100}%`, backgroundColor: color(f.grupo) }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
