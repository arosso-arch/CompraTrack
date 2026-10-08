using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Proveedores;

[ApiController]
[Route("api/proveedores")]
public sealed class ProveedoresController(ProveedorRepository repo) : ControllerBase
{
    /// <summary>Lista proveedores. Filtros opcionales: activo, texto (razón social, código o contacto).</summary>
    [HttpGet]
    [RequierePermiso(Permisos.ProveedoresVer)]
    public Task<IReadOnlyList<ProveedorDto>> Listar([FromQuery] bool? activo, [FromQuery] string? buscar, CancellationToken ct) =>
        repo.ListarAsync(activo, buscar, ct);

    [HttpGet("{id:int}")]
    [RequierePermiso(Permisos.ProveedoresVer)]
    public Task<ProveedorDto> Obtener(int id, CancellationToken ct) => repo.ObtenerAsync(id, ct);

    [HttpPost]
    [RequierePermiso(Permisos.ProveedoresGestionar)]
    public async Task<ActionResult<ProveedorDto>> Crear(GuardarProveedorRequest request, CancellationToken ct)
    {
        var id = await repo.CrearAsync(request, ct);
        return CreatedAtAction(nameof(Obtener), new { id }, await repo.ObtenerAsync(id, ct));
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(Permisos.ProveedoresGestionar)]
    public async Task<ProveedorDto> Actualizar(int id, GuardarProveedorRequest request, CancellationToken ct)
    {
        await repo.ActualizarAsync(id, request, ct);
        return await repo.ObtenerAsync(id, ct);
    }

    /// <summary>Alta o baja lógica. No permite dar de baja un proveedor con órdenes abiertas.</summary>
    [HttpPatch("{id:int}/estado")]
    [RequierePermiso(Permisos.ProveedoresGestionar)]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoRequest request, CancellationToken ct)
    {
        await repo.CambiarEstadoAsync(id, request.Activo, ct);
        return NoContent();
    }

    // ---------- Productos del proveedor ----------

    [HttpGet("{id:int}/productos")]
    [RequierePermiso(Permisos.ProductosVer)]
    public Task<IReadOnlyList<ProveedorProductoDto>> ListarProductos(int id, CancellationToken ct) =>
        repo.ListarProductosAsync(id, ct);

    [HttpPost("{id:int}/productos")]
    [RequierePermiso(Permisos.ProductosGestionar)]
    public async Task<IActionResult> AgregarProducto(int id, AgregarProveedorProductoRequest request, CancellationToken ct)
    {
        var productoId = await repo.AgregarProductoAsync(id, request, ct);
        return Ok(new { id = productoId });
    }

    [HttpPatch("{id:int}/productos/{productoId:int}/estado")]
    [RequierePermiso(Permisos.ProductosGestionar)]
    public async Task<IActionResult> CambiarEstadoProducto(int id, int productoId, CambiarEstadoRequest request, CancellationToken ct)
    {
        await repo.CambiarEstadoProductoAsync(id, productoId, request.Activo, ct);
        return NoContent();
    }

    // ---------- Combos en cascada: tipo → gramaje → formato ----------

    [HttpGet("{id:int}/opciones/tipos")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<OpcionDto>> OpcionesTipos(int id, CancellationToken ct) =>
        repo.OpcionesTiposAsync(id, ct);

    [HttpGet("{id:int}/opciones/gramajes")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<OpcionDto>> OpcionesGramajes(int id, [FromQuery] int tipoProductoId, CancellationToken ct) =>
        repo.OpcionesGramajesAsync(id, tipoProductoId, ct);

    [HttpGet("{id:int}/opciones/formatos")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<OpcionDto>> OpcionesFormatos(int id, [FromQuery] int tipoProductoId, [FromQuery] int gramajeId, CancellationToken ct) =>
        repo.OpcionesFormatosAsync(id, tipoProductoId, gramajeId, ct);
}
