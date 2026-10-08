using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Catalogo;

[ApiController]
[Route("api/catalogo")]
public sealed class CatalogoController(CatalogoRepository repo) : ControllerBase
{
    [HttpGet("tipos")]
    public Task<IReadOnlyList<TipoProductoDto>> Tipos(CancellationToken ct) => repo.ListarTiposAsync(ct);

    [HttpGet("gramajes")]
    public Task<IReadOnlyList<GramajeDto>> Gramajes(CancellationToken ct) => repo.ListarGramajesAsync(ct);

    [HttpGet("formatos")]
    public Task<IReadOnlyList<FormatoDto>> Formatos(CancellationToken ct) => repo.ListarFormatosAsync(ct);

    [HttpPost("tipos")]
    [RequierePermiso(Permisos.ProductosGestionar)]
    public async Task<IActionResult> CrearTipo(CrearTipoRequest request, CancellationToken ct) =>
        Ok(new { id = await repo.CrearTipoAsync(request.Nombre, ct) });

    [HttpPost("gramajes")]
    [RequierePermiso(Permisos.ProductosGestionar)]
    public async Task<IActionResult> CrearGramaje(CrearGramajeRequest request, CancellationToken ct) =>
        Ok(new { id = await repo.CrearGramajeAsync(request.Gramos, ct) });

    [HttpPost("formatos")]
    [RequierePermiso(Permisos.ProductosGestionar)]
    public async Task<IActionResult> CrearFormato(CrearFormatoRequest request, CancellationToken ct) =>
        Ok(new { id = await repo.CrearFormatoAsync(request.Descripcion, ct) });
}
