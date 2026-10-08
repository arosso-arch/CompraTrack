using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Features.Ordenes;

public static class EstadoOrden
{
    public const string Abierta = "ABIERTA";
    public const string Cerrada = "CERRADA";
    public const string Anulada = "ANULADA";
}

/// <summary>
/// Reglas de negocio de órdenes y recepciones. Son funciones puras (sin base de datos)
/// para poder probarlas con tests unitarios. Lanzan ReglaNegocioException si la operación no es válida.
/// </summary>
public static class ReglasOrden
{
    public static void ValidarFechaOrden(DateOnly fecha, DateOnly hoy)
    {
        if (fecha > hoy)
            throw new ReglaNegocioException("La fecha de la orden no puede ser posterior a hoy.");
    }

    public static void AsegurarEditable(string estado)
    {
        if (estado != EstadoOrden.Abierta)
            throw new ReglaNegocioException($"La orden está {estado}: solo se pueden modificar órdenes abiertas.");
    }

    public static void AsegurarPuedeCerrar(string estado)
    {
        if (estado != EstadoOrden.Abierta)
            throw new ReglaNegocioException($"Solo se puede cerrar una orden abierta (estado actual: {estado}).");
    }

    public static void AsegurarPuedeReabrir(string estado)
    {
        if (estado != EstadoOrden.Cerrada)
            throw new ReglaNegocioException($"Solo se puede reabrir una orden cerrada (estado actual: {estado}).");
    }

    /// <summary>Una orden con mercadería recibida no se anula: se cierra.</summary>
    public static void AsegurarPuedeAnular(string estado, bool tieneRecepciones)
    {
        if (estado != EstadoOrden.Abierta)
            throw new ReglaNegocioException($"Solo se puede anular una orden abierta (estado actual: {estado}).");
        if (tieneRecepciones)
            throw new ReglaNegocioException("La orden ya tiene mercadería recibida: no se puede anular, solo cerrar.");
    }

    public static void AsegurarPuedeQuitarItem(string estadoOrden, bool itemTieneRecepciones, int itemsActivos)
    {
        AsegurarEditable(estadoOrden);
        if (itemTieneRecepciones)
            throw new ReglaNegocioException("El ítem tiene recepciones registradas: anulá primero los ingresos.");
        if (itemsActivos <= 1)
            throw new ReglaNegocioException("La orden debe tener al menos un ítem. Si no se necesita, anulá la orden.");
    }

    public static void ValidarRecepcion(string estadoOrden, DateOnly fechaOrden, DateOnly fechaRecepcion, DateOnly hoy)
    {
        if (estadoOrden != EstadoOrden.Abierta)
            throw new ReglaNegocioException($"La orden está {estadoOrden}: solo se registran ingresos en órdenes abiertas.");
        if (fechaRecepcion < fechaOrden)
            throw new ReglaNegocioException("La fecha de recepción no puede ser anterior a la fecha de la orden.");
        if (fechaRecepcion > hoy)
            throw new ReglaNegocioException("La fecha de recepción no puede ser posterior a hoy.");
    }

    public static void AsegurarPuedeAnularRecepcion(string estadoOrden, bool recepcionActiva)
    {
        if (!recepcionActiva)
            throw new ReglaNegocioException("La recepción ya está anulada.");
        if (estadoOrden != EstadoOrden.Abierta)
            throw new ReglaNegocioException($"La orden está {estadoOrden}: reabrila para anular ingresos.");
    }
}
