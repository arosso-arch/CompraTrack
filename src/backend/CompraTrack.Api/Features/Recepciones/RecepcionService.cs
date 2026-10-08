using CompraTrack.Api.Features.Ordenes;
using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Features.Recepciones;

public sealed class RecepcionService(RecepcionRepository repo, TimeProvider reloj)
{
    private DateOnly Hoy => DateOnly.FromDateTime(reloj.GetLocalNow().DateTime);

    public async Task<int> RegistrarAsync(int ordenId, int itemId, RegistrarRecepcionRequest request, int usuarioId, CancellationToken ct)
    {
        var contexto = await repo.ObtenerContextoItemAsync(ordenId, itemId, ct);
        ReglasOrden.ValidarRecepcion(contexto.EstadoOrden, contexto.FechaOrden, request.Fecha, Hoy);

        return await repo.RegistrarAsync(itemId, request, usuarioId, ct)
               ?? throw new ReglaNegocioException("La orden cambió de estado mientras se registraba el ingreso. Actualizá y volvé a intentar.");
    }

    public async Task AnularAsync(int recepcionId, CancellationToken ct)
    {
        var contexto = await repo.ObtenerContextoRecepcionAsync(recepcionId, ct);
        ReglasOrden.AsegurarPuedeAnularRecepcion(contexto.EstadoOrden, contexto.RecepcionActiva);

        if (!await repo.AnularAsync(recepcionId, ct))
            throw new ReglaNegocioException("La recepción o su orden cambiaron mientras se procesaba la operación. Actualizá y volvé a intentar.");
    }
}
