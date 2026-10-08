import { z } from 'zod'

/** Convierte el valor de un input a número; vacío → undefined. */
export const aNumeroOVacio = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))

/**
 * Número que puede estar vacío mientras se completa el formulario, pero es obligatorio al enviar.
 * El tipo de entrada es number | undefined y el de salida, number.
 */
export const numeroRequerido = (mensaje: string) => z.number().optional().pipe(z.number({ error: mensaje }))

export const idRequerido = (mensaje: string) => numeroRequerido(mensaje).pipe(z.number().int().positive(mensaje))

export const esquemaItem = z.object({
  tipoProductoId: idRequerido('Elegí el producto completo'),
  gramajeId: idRequerido('Elegí el producto completo'),
  formatoId: idRequerido('Elegí el producto completo'),
  detalle: z.string().max(200, 'Máximo 200 caracteres').optional(),
  cantidadKg: numeroRequerido('Ingresá la cantidad').pipe(z.number().positive('La cantidad debe ser mayor a 0').max(99_999_999)),
})


/** Misma regla que la API (ReglasUsuario.ValidarClave): 8 caracteres o más, con letras y números. */
export const esquemaClave = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(100, 'Máximo 100 caracteres')
  .refine((c) => /[a-zA-Z]/.test(c) && /\d/.test(c), 'Tiene que combinar letras y números')

/** Contraseña aleatoria de 12 caracteres que cumple la regla (sin caracteres ambiguos como 0/O o 1/l). */
export function generarClave() {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
  const numeros = '23456789'
  const todos = letras + numeros
  const azar = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const caracteres = [letras[azar(letras.length)], numeros[azar(numeros.length)],
    ...Array.from({ length: 10 }, () => todos[azar(todos.length)])]
  // Mezcla para que la letra y el número garantizados no queden siempre al principio.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = azar(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}
