/** Error devuelto por la API en formato ProblemDetails. */
export class ApiError extends Error {
  readonly status: number
  readonly titulo: string
  /** Errores de validación por campo (respuestas 400). */
  readonly errores: Record<string, string[]>

  constructor(status: number, titulo: string, detalle?: string, errores?: Record<string, string[]>) {
    super(detalle ?? titulo)
    this.status = status
    this.titulo = titulo
    this.errores = errores ?? {}
  }

  /** Todos los mensajes en una lista (para mostrar en un aviso). */
  get mensajes(): string[] {
    const deCampos = Object.values(this.errores).flat()
    return deCampos.length > 0 ? deCampos : [this.message]
  }
}

const URL_BASE = import.meta.env.VITE_API_URL ?? ''

let obtenerToken: () => string | null = () => null
let alExpirarSesion: () => void = () => {}

/** Lo configura el AuthProvider al iniciar, para no acoplar el cliente a React. */
export function configurarCliente(opciones: { obtenerToken: () => string | null; alExpirarSesion: () => void }) {
  obtenerToken = opciones.obtenerToken
  alExpirarSesion = opciones.alExpirarSesion
}

type Parametros = Record<string, string | number | boolean | null | undefined>

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo?: unknown
  parametros?: Parametros
}

/**
 * Descarga un archivo protegido (ej.: el PDF de una orden).
 * Un <a href> común no sirve porque no manda el token: se pide con fetch y se guarda desde un Blob.
 */
export async function descargarArchivo(ruta: string, nombrePorDefecto: string) {
  const token = obtenerToken()
  let respuesta: Response
  try {
    respuesta = await fetch(URL_BASE + ruta, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, 'Sin conexión', 'No se pudo conectar con el servidor.')
  }
  if (respuesta.status === 401 && token) alExpirarSesion()
  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => null)
    throw new ApiError(respuesta.status, problema?.title ?? `Error ${respuesta.status}`, problema?.detail)
  }

  // El nombre sale del header Content-Disposition que manda la API (ej.: OC-1061.pdf).
  const nombre = respuesta.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? nombrePorDefecto
  const url = URL.createObjectURL(await respuesta.blob())
  const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function api<T>(ruta: string, { metodo = 'GET', cuerpo, parametros }: Opciones = {}): Promise<T> {
  const url = new URL(URL_BASE + ruta, window.location.origin)
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== null && valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  const token = obtenerToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sin conexión', 'No se pudo conectar con el servidor. ¿Está corriendo la API?')
  }

  // Token vencido o inválido en un endpoint protegido: cerrar la sesión.
  if (respuesta.status === 401 && token) alExpirarSesion()

  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => null)
    throw new ApiError(
      respuesta.status,
      problema?.title ?? `Error ${respuesta.status}`,
      problema?.detail ?? (respuesta.status === 429 ? 'Demasiados intentos. Esperá un minuto.' : undefined),
      problema?.errors,
    )
  }

  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
