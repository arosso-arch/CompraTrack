using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Recepciones;

[ApiController]
public sealed class RecepcionesController(RecepcionRepository repo, RecepcionService service, TimeProvider reloj) : ControllerBase
{
    /// <summary>Ingresos registrados para un ítem, incluidos los anulados.</summary>
    [HttpGet("api/ordenes/{ordenId:int}/items/{itemId:int}/recepciones")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<RecepcionDto>> ListarPorItem(int ordenId, int itemId, CancellationToken ct) =>
        repo.ListarPorItemAsync(ordenId, itemId, ct);

    /// <summary>Registra un ingreso de mercadería (total o parcial) contra un ítem de una orden abierta.</summary>
    [HttpPost("api/ordenes/{ordenId:int}/items/{itemId:int}/recepciones")]
    [RequierePermiso(Permisos.RecepcionesRegistrar)]
    public async Task<ActionResult<RecepcionDto>> Registrar(int ordenId, int itemId, RegistrarRecepcionRequest request, CancellationToken ct)
    {
        var id = await service.RegistrarAsync(ordenId, itemId, request, User.ObtenerUsuarioId(), ct);
        return CreatedAtAction(nameof(Obtener), new { id }, await repo.ObtenerAsync(id, ct));
    }

    /// <summary>Historial de ingresos. Por defecto, los últimos 30 días.</summary>
    [HttpGet("api/recepciones")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<RecepcionDto>> Listar([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta,
                                                    [FromQuery] int? proveedorId, CancellationToken ct)
    {
        var hoy = DateOnly.FromDateTime(reloj.GetLocalNow().DateTime);
        return repo.ListarAsync(desde ?? hoy.AddDays(-30), hasta ?? hoy, proveedorId, ct);
    }

    [HttpGet("api/recepciones/{id:int}")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<RecepcionDto> Obtener(int id, CancellationToken ct) => repo.ObtenerAsync(id, ct);

    /// <summary>Baja lógica de un ingreso (por ejemplo, si se cargó por error). Solo en órdenes abiertas.</summary>
    [HttpDelete("api/recepciones/{id:int}")]
    [RequierePermiso(Permisos.RecepcionesAnular)]
    public async Task<IActionResult> Anular(int id, CancellationToken ct)
    {
        await service.AnularAsync(id, ct);
        return NoContent();
    }
}
