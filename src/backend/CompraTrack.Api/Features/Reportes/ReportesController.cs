using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Reportes;

[ApiController]
[Route("api/reportes")]
public sealed class ReportesController(ReporteRepository repo, TimeProvider reloj) : ControllerBase
{
    private DateOnly Hoy => DateOnly.FromDateTime(reloj.GetLocalNow().DateTime);

    /// <summary>Indicadores para la pantalla de inicio.</summary>
    [HttpGet("resumen")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<ResumenDto> Resumen(CancellationToken ct) => repo.ResumenAsync(Hoy, ct);

    /// <summary>Ítems de órdenes abiertas pendientes de entrega, del más antiguo al más nuevo.</summary>
    [HttpGet("pendientes")]
    [RequierePermiso(Permisos.OrdenesVer)]
    public Task<IReadOnlyList<PendienteDto>> Pendientes(CancellationToken ct) => repo.PendientesAsync(Hoy, ct);

    /// <summary>Kilos recibidos por proveedor. Por defecto, el año en curso.</summary>
    [HttpGet("kilos-por-proveedor")]
    [RequierePermiso(Permisos.ReportesVer)]
    public Task<IReadOnlyList<KilosPorGrupoDto>> KilosPorProveedor([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken ct) =>
        repo.KilosPorProveedorAsync(desde ?? new DateOnly(Hoy.Year, 1, 1), hasta ?? Hoy, ct);

    /// <summary>Kilos recibidos por tipo de producto. Por defecto, el año en curso.</summary>
    [HttpGet("kilos-por-tipo")]
    [RequierePermiso(Permisos.ReportesVer)]
    public Task<IReadOnlyList<KilosPorGrupoDto>> KilosPorTipo([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken ct) =>
        repo.KilosPorTipoAsync(desde ?? new DateOnly(Hoy.Year, 1, 1), hasta ?? Hoy, ct);

    /// <summary>Kilos recibidos por mes y tipo de producto en un año.</summary>
    [HttpGet("kilos-por-mes")]
    [RequierePermiso(Permisos.ReportesVer)]
    public Task<IReadOnlyList<KilosPorMesDto>> KilosPorMes([FromQuery] int? anio, CancellationToken ct) =>
        repo.KilosPorMesAsync(anio ?? Hoy.Year, ct);

    [HttpGet("anios")]
    [RequierePermiso(Permisos.ReportesVer)]
    public Task<IReadOnlyList<int>> Anios(CancellationToken ct) => repo.AniosConDatosAsync(ct);
}
