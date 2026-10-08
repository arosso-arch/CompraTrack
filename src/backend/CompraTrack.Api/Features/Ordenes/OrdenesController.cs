using CompraTrack.Api.Common;
using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Ordenes;

[ApiController]
[Route("api/ordenes")]
public sealed class OrdenesController(OrdenRepository repo, OrdenService service) : ControllerBase
{
    /// <summary>Lista paginada de órdenes con totales de kilos pedidos y recibidos.</summary>
    [HttpGet]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<ResultadoPaginado<OrdenResumenDto>> Listar([FromQuery] FiltroOrdenes filtro, CancellationToken ct) =>
        repo.ListarAsync(filtro, ct);

    /// <summary>Orden completa con sus ítems y el estado de entrega de cada uno.</summary>
    [HttpGet("{id:int}")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<OrdenDetalleDto> Obtener(int id, CancellationToken ct) => repo.ObtenerDetalleAsync(id, ct);

    [HttpPost]
    [RequierePermiso(Permisos.OrdenesCrear)]
    public async Task<ActionResult<OrdenDetalleDto>> Crear(CrearOrdenRequest request, CancellationToken ct)
    {
        var id = await service.CrearAsync(request, User.ObtenerUsuarioId(), ct);
        return CreatedAtAction(nameof(Obtener), new { id }, await repo.ObtenerDetalleAsync(id, ct));
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(Permisos.OrdenesEditar)]
    public async Task<OrdenDetalleDto> Actualizar(int id, ActualizarOrdenRequest request, CancellationToken ct)
    {
        await service.ActualizarAsync(id, request, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    // ---------- Ítems ----------

    [HttpPost("{id:int}/items")]
    [RequierePermiso(Permisos.OrdenesEditar)]
    public async Task<OrdenDetalleDto> AgregarItem(int id, ItemRequest request, CancellationToken ct)
    {
        await service.AgregarItemAsync(id, request, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    [HttpPut("{id:int}/items/{itemId:int}")]
    [RequierePermiso(Permisos.OrdenesEditar)]
    public async Task<OrdenDetalleDto> ActualizarItem(int id, int itemId, ActualizarItemRequest request, CancellationToken ct)
    {
        await service.ActualizarItemAsync(id, itemId, request, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    /// <summary>Baja lógica del ítem. No se permite si tiene recepciones o si es el único de la orden.</summary>
    [HttpDelete("{id:int}/items/{itemId:int}")]
    [RequierePermiso(Permisos.OrdenesEditar)]
    public async Task<OrdenDetalleDto> QuitarItem(int id, int itemId, CancellationToken ct)
    {
        await service.QuitarItemAsync(id, itemId, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    // ---------- Cambios de estado ----------

    [HttpPost("{id:int}/cerrar")]
    [RequierePermiso(Permisos.OrdenesCerrar)]
    public async Task<OrdenDetalleDto> Cerrar(int id, CancellationToken ct)
    {
        await service.CerrarAsync(id, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    [HttpPost("{id:int}/reabrir")]
    [RequierePermiso(Permisos.OrdenesCerrar)]
    public async Task<OrdenDetalleDto> Reabrir(int id, CancellationToken ct)
    {
        await service.ReabrirAsync(id, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }

    /// <summary>Anula una orden abierta que todavía no recibió mercadería.</summary>
    [HttpPost("{id:int}/anular")]
    [RequierePermiso(Permisos.OrdenesCerrar)]
    public async Task<OrdenDetalleDto> Anular(int id, CancellationToken ct)
    {
        await service.AnularAsync(id, ct);
        return await repo.ObtenerDetalleAsync(id, ct);
    }
}
