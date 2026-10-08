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

