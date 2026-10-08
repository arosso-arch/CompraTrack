using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Features.Ordenes;

/// <summary>Aplica las reglas de negocio (ReglasOrden) antes de delegar en el repositorio.</summary>
public sealed class OrdenService(OrdenRepository repo, TimeProvider reloj)
{
    private DateOnly Hoy => DateOnly.FromDateTime(reloj.GetLocalNow().DateTime);

    private const string CambioConcurrente =
        "La orden fue modificada por otro usuario mientras se procesaba la operación. Actualizá y volvé a intentar.";

    public async Task<int> CrearAsync(CrearOrdenRequest request, int usuarioId, CancellationToken ct)
    {
        ReglasOrden.ValidarFechaOrden(request.Fecha, Hoy);
        return await repo.CrearAsync(request, usuarioId, ct);
    }

    public async Task ActualizarAsync(int id, ActualizarOrdenRequest request, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarEditable(orden.Estado);
        ReglasOrden.ValidarFechaOrden(request.Fecha, Hoy);

        if (!await repo.ActualizarCabeceraAsync(id, request, ct))
            throw new ReglaNegocioException(CambioConcurrente);
    }

    public async Task<int> AgregarItemAsync(int id, ItemRequest item, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarEditable(orden.Estado);
        return await repo.AgregarItemAsync(id, orden.ProveedorId, item, ct);
    }

    public async Task ActualizarItemAsync(int id, int itemId, ActualizarItemRequest request, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarEditable(orden.Estado);
        await repo.ItemTieneRecepcionesAsync(id, itemId, ct);   // valida que el ítem exista en la orden

        if (!await repo.ActualizarItemAsync(id, itemId, request, ct))
            throw new ReglaNegocioException(CambioConcurrente);
    }

    public async Task QuitarItemAsync(int id, int itemId, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        var tieneRecepciones = await repo.ItemTieneRecepcionesAsync(id, itemId, ct);
        ReglasOrden.AsegurarPuedeQuitarItem(orden.Estado, tieneRecepciones, orden.ItemsActivos);

        if (!await repo.QuitarItemAsync(id, itemId, ct))
            throw new ReglaNegocioException(CambioConcurrente);
    }

    public async Task CerrarAsync(int id, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarPuedeCerrar(orden.Estado);
        await CambiarEstadoAsync(id, EstadoOrden.Abierta, EstadoOrden.Cerrada, ct);
    }

    public async Task ReabrirAsync(int id, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarPuedeReabrir(orden.Estado);
        await CambiarEstadoAsync(id, EstadoOrden.Cerrada, EstadoOrden.Abierta, ct);
    }

    public async Task AnularAsync(int id, CancellationToken ct)
    {
        var orden = await repo.ObtenerEstadoAsync(id, ct);
        ReglasOrden.AsegurarPuedeAnular(orden.Estado, orden.TieneRecepciones);
        await CambiarEstadoAsync(id, EstadoOrden.Abierta, EstadoOrden.Anulada, ct);
    }

    private async Task CambiarEstadoAsync(int id, string desde, string hacia, CancellationToken ct)
    {
        if (!await repo.CambiarEstadoAsync(id, desde, hacia, ct))
            throw new ReglaNegocioException(CambioConcurrente);
    }
}
