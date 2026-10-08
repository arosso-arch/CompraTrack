const kg = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const entero = new Intl.NumberFormat('es-AR')

/** 12500 → "12.500 kg" */
export const formatoKg = (valor: number) => `${kg.format(valor)} kg`

/** Kilos grandes en toneladas: 125000 → "125 t" */
export const formatoToneladas = (valorKg: number) =>
  `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(valorKg / 1000)} t`

export const formatoEntero = (valor: number) => entero.format(valor)

/**
 * "2026-10-08" → "08/10/2026".
 * Las fechas sin hora (DateOnly) se formatean a mano para evitar corrimientos por zona horaria.
 */
export function formatoFecha(iso: string | null | undefined) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** "2026-10-08T14:35:45" → "08/10/2026 14:35" */
export function formatoFechaHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return `${formatoFecha(iso)} ${iso.slice(11, 16)}`
}

/** Fecha de hoy en formato yyyy-mm-dd, en hora local. */
export function hoyIso() {
  const d = new Date()
  const dosDigitos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
}

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
