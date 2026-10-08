using CompraTrack.Api.Infrastructure.Data;
using Dapper;

namespace CompraTrack.Api.Features.Reportes;

public sealed class ResumenDto
{
    public int OrdenesAbiertas { get; init; }
    public int ItemsPendientes { get; init; }
    public decimal KgPendientes { get; init; }
    public int OrdenesCreadasMes { get; init; }
    public decimal KgRecibidosMes { get; init; }
    public int RecepcionesHoy { get; init; }
}

public sealed class PendienteDto
{
    public int OrdenCompraId { get; init; }
    public int NumeroOrden { get; init; }
    public DateOnly FechaOrden { get; init; }
    public int DiasAbierta { get; init; }
    public string Proveedor { get; init; } = "";
    public int OrdenCompraItemId { get; init; }
    public string Producto { get; init; } = "";
    public decimal CantidadPedidaKg { get; init; }
    public decimal CantidadRecibidaKg { get; init; }
    public decimal PendienteKg { get; init; }
    public string EstadoEntrega { get; init; } = "";
}

public sealed class KilosPorGrupoDto
{
    public string Grupo { get; init; } = "";
    public decimal KgRecibidos { get; init; }
    public int Recepciones { get; init; }
}

public sealed class KilosPorMesDto
{
    public int Mes { get; init; }
    public string Tipo { get; init; } = "";
    public decimal KgRecibidos { get; init; }
}

public sealed class ReporteRepository(IDbConnectionFactory db)
{
    public async Task<ResumenDto> ResumenAsync(DateOnly hoy, CancellationToken ct)
    {
        const string sql = """
            DECLARE @inicioMes DATE = DATEFROMPARTS(YEAR(@hoy), MONTH(@hoy), 1);

            SELECT
                (SELECT COUNT(*) FROM dbo.OrdenCompra WHERE Estado = 'ABIERTA') AS OrdenesAbiertas,
                (SELECT COUNT(*) FROM dbo.vw_EstadoEntregaItem v JOIN dbo.OrdenCompra o ON o.Id = v.OrdenCompraId
                  WHERE o.Estado = 'ABIERTA' AND v.EstadoEntrega IN ('EN ESPERA', 'ENTREGA PARCIAL')) AS ItemsPendientes,
                (SELECT ISNULL(SUM(v.DiferenciaKg), 0) FROM dbo.vw_EstadoEntregaItem v JOIN dbo.OrdenCompra o ON o.Id = v.OrdenCompraId
                  WHERE o.Estado = 'ABIERTA' AND v.DiferenciaKg > 0) AS KgPendientes,
                (SELECT COUNT(*) FROM dbo.OrdenCompra WHERE Fecha >= @inicioMes AND Estado <> 'ANULADA') AS OrdenesCreadasMes,
                (SELECT ISNULL(SUM(CantidadKg), 0) FROM dbo.Recepcion WHERE Activo = 1 AND Fecha >= @inicioMes) AS KgRecibidosMes,
                (SELECT COUNT(*) FROM dbo.Recepcion WHERE Activo = 1 AND Fecha = @hoy) AS RecepcionesHoy;
            """;

        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleAsync<ResumenDto>(new CommandDefinition(sql, new { hoy }, cancellationToken: ct));
    }

    /// <summary>Ítems de órdenes abiertas que todavía no se recibieron completos, del más antiguo al más nuevo.</summary>
    public async Task<IReadOnlyList<PendienteDto>> PendientesAsync(DateOnly hoy, CancellationToken ct)
    {
        const string sql = """
            SELECT o.Id AS OrdenCompraId, o.Numero AS NumeroOrden, o.Fecha AS FechaOrden,
                   DATEDIFF(DAY, o.Fecha, @hoy) AS DiasAbierta, p.RazonSocial AS Proveedor,
                   v.OrdenCompraItemId,
                   t.Nombre + N' ' + CAST(g.Gramos AS NVARCHAR(10)) + N' g/m² · ' + f.Descripcion AS Producto,
                   v.CantidadPedidaKg, v.CantidadRecibidaKg, v.DiferenciaKg AS PendienteKg, v.EstadoEntrega
            FROM dbo.vw_EstadoEntregaItem v
            JOIN dbo.OrdenCompra     o ON o.Id = v.OrdenCompraId
            JOIN dbo.Proveedor       p ON p.Id = o.ProveedorId
            JOIN dbo.OrdenCompraItem i ON i.Id = v.OrdenCompraItemId
            JOIN dbo.TipoProducto    t ON t.Id = i.TipoProductoId
            JOIN dbo.Gramaje         g ON g.Id = i.GramajeId
            JOIN dbo.Formato         f ON f.Id = i.FormatoId
            WHERE o.Estado = 'ABIERTA' AND v.EstadoEntrega IN ('EN ESPERA', 'ENTREGA PARCIAL')
            ORDER BY o.Fecha, o.Numero, v.OrdenCompraItemId;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<PendienteDto>(new CommandDefinition(sql, new { hoy }, cancellationToken: ct));
        return filas.AsList();
    }

    public Task<IReadOnlyList<KilosPorGrupoDto>> KilosPorProveedorAsync(DateOnly desde, DateOnly hasta, CancellationToken ct) =>
        KilosAgrupadosAsync("p.RazonSocial", desde, hasta, ct);

    public Task<IReadOnlyList<KilosPorGrupoDto>> KilosPorTipoAsync(DateOnly desde, DateOnly hasta, CancellationToken ct) =>
        KilosAgrupadosAsync("t.Nombre", desde, hasta, ct);

    /// <param name="columnaGrupo">Columna fija definida en esta clase; nunca proviene del usuario.</param>
    private async Task<IReadOnlyList<KilosPorGrupoDto>> KilosAgrupadosAsync(string columnaGrupo, DateOnly desde, DateOnly hasta, CancellationToken ct)
    {
        var sql = $"""
            SELECT {columnaGrupo} AS Grupo, SUM(r.CantidadKg) AS KgRecibidos, COUNT(*) AS Recepciones
            FROM dbo.Recepcion r
            JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
            JOIN dbo.OrdenCompra     o ON o.Id = i.OrdenCompraId
            JOIN dbo.Proveedor       p ON p.Id = o.ProveedorId
            JOIN dbo.TipoProducto    t ON t.Id = i.TipoProductoId
            WHERE r.Activo = 1 AND r.Fecha BETWEEN @desde AND @hasta
            GROUP BY {columnaGrupo}
            ORDER BY KgRecibidos DESC;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<KilosPorGrupoDto>(new CommandDefinition(sql, new { desde, hasta }, cancellationToken: ct));
        return filas.AsList();
    }

    public async Task<IReadOnlyList<KilosPorMesDto>> KilosPorMesAsync(int anio, CancellationToken ct)
    {
        const string sql = """
            SELECT MONTH(r.Fecha) AS Mes, t.Nombre AS Tipo, SUM(r.CantidadKg) AS KgRecibidos
            FROM dbo.Recepcion r
            JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
            JOIN dbo.TipoProducto    t ON t.Id = i.TipoProductoId
            WHERE r.Activo = 1 AND r.Fecha >= DATEFROMPARTS(@anio, 1, 1) AND r.Fecha < DATEFROMPARTS(@anio + 1, 1, 1)
            GROUP BY MONTH(r.Fecha), t.Nombre
            ORDER BY Mes, Tipo;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<KilosPorMesDto>(new CommandDefinition(sql, new { anio }, cancellationToken: ct));
        return filas.AsList();
    }

    public async Task<IReadOnlyList<int>> AniosConDatosAsync(CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<int>(new CommandDefinition(
            "SELECT DISTINCT YEAR(Fecha) FROM dbo.Recepcion WHERE Activo = 1 ORDER BY 1 DESC;", cancellationToken: ct));
        return filas.AsList();
    }
}
