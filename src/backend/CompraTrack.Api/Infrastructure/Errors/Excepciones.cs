namespace CompraTrack.Api.Infrastructure.Errors;

/// <summary>El recurso pedido no existe. Se responde con 404.</summary>
public sealed class NoEncontradoException(string mensaje) : Exception(mensaje);

/// <summary>La operación viola una regla de negocio (ej: editar una orden cerrada). Se responde con 409.</summary>
public sealed class ReglaNegocioException(string mensaje) : Exception(mensaje);
