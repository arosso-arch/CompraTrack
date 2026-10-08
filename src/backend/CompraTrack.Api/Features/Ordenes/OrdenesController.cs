using CompraTrack.Api.Common;
using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CompraTrack.Api.Features.Ordenes;

[ApiController]
[Route("api/ordenes")]
public sealed class OrdenesController(OrdenRepository repo, OrdenService service, DocumentoOrdenService documentos) : ControllerBase
{
    // ---------- PDF y envío por mail ----------

    /// <summary>PDF de la orden de compra.</summary>
    [HttpGet("{id:int}/pdf")]
    [RequierePermiso(Permisos.OrdenesVer)]
    [Produces("application/pdf")]
    public async Task<IActionResult> Pdf(int id, CancellationToken ct)
    {
        var pdf = await documentos.GenerarPdfAsync(id, ct);
        return File(pdf.Contenido, "application/pdf", pdf.NombreArchivo);
    }

    /// <summary>Destinatario, asunto y mensaje sugeridos para enviar la orden al proveedor.</summary>
    [HttpGet("{id:int}/envio/borrador")]
    [RequierePermiso(Permisos.OrdenesEnviar)]
    public async Task<BorradorEnvio> BorradorEnvio(int id, CancellationToken ct)
    {
        var orden = await repo.ObtenerDetalleAsync(id, ct);
        return new BorradorEnvio(orden.ProveedorEmail, documentos.AsuntoPorDefecto(orden), documentos.MensajePorDefecto(orden));
    }

    /// <summary>Envía la orden por mail con el PDF adjunto y registra el envío.</summary>
    [HttpPost("{id:int}/enviar")]
    [RequierePermiso(Permisos.OrdenesEnviar)]
    [EnableRateLimiting("envio")]
    public Task<ResultadoEnvio> Enviar(int id, EnviarOrdenRequest request, CancellationToken ct) =>
        documentos.EnviarAsync(id, request, User.ObtenerUsuarioId(), ct);

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
