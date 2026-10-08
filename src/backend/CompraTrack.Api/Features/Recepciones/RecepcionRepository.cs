using System.ComponentModel.DataAnnotations;
using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;

namespace CompraTrack.Api.Features.Recepciones;

public sealed class RecepcionDto
{
    public int Id { get; init; }
    public int OrdenCompraItemId { get; init; }
    public int OrdenCompraId { get; init; }
    public int NumeroOrden { get; init; }
    public string Proveedor { get; init; } = "";
    public string Producto { get; init; } = "";
    public DateOnly Fecha { get; init; }
    public decimal CantidadKg { get; init; }
    public string? Remito { get; init; }
    public string? Observaciones { get; init; }
    public string RegistradaPor { get; init; } = "";
    public bool Activo { get; init; }
    public DateTime FechaRegistro { get; init; }
}

public sealed record RegistrarRecepcionRequest(
    DateOnly Fecha,
    [Range(typeof(decimal), "0.01", "99999999", ParseLimitsInInvariantCulture = true)] decimal CantidadKg,
    [StringLength(30)] string? Remito,
    [StringLength(300)] string? Observaciones);

/// <summary>Datos de la orden y el ítem necesarios para validar una recepción.</summary>
public sealed class ContextoRecepcionDto
{
    public int OrdenCompraId { get; init; }
    public string EstadoOrden { get; init; } = "";
    public DateOnly FechaOrden { get; init; }
    public bool RecepcionActiva { get; init; }
}

public sealed class RecepcionRepository(IDbConnectionFactory db)
{
    private const string SelectRecepcion = """
        SELECT r.Id, r.OrdenCompraItemId, o.Id AS OrdenCompraId, o.Numero AS NumeroOrden, p.RazonSocial AS Proveedor,
               t.Nombre + N' ' + CAST(g.Gramos AS NVARCHAR(10)) + N' g/m² · ' + f.Descripcion AS Producto,
               r.Fecha, r.CantidadKg, r.Remito, r.Observaciones, u.NombreCompleto AS RegistradaPor,
               r.Activo, r.FechaRegistro
        FROM dbo.Recepcion r
        JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
        JOIN dbo.OrdenCompra     o ON o.Id = i.OrdenCompraId
        JOIN dbo.Proveedor       p ON p.Id = o.ProveedorId
        JOIN dbo.TipoProducto    t ON t.Id = i.TipoProductoId
        JOIN dbo.Gramaje         g ON g.Id = i.GramajeId
        JOIN dbo.Formato         f ON f.Id = i.FormatoId
        JOIN dbo.Usuario         u ON u.Id = r.RegistradaPorId
        """;

    public async Task<IReadOnlyList<RecepcionDto>> ListarPorItemAsync(int ordenId, int itemId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<RecepcionDto>(new CommandDefinition(
            SelectRecepcion + " WHERE i.Id = @itemId AND o.Id = @ordenId ORDER BY r.Fecha, r.Id;",
            new { ordenId, itemId }, cancellationToken: ct));
        return filas.AsList();
    }

    /// <summary>Historial de ingresos activos en un rango de fechas (máximo 500 filas).</summary>
    public async Task<IReadOnlyList<RecepcionDto>> ListarAsync(DateOnly desde, DateOnly hasta, int? proveedorId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<RecepcionDto>(new CommandDefinition(
            SelectRecepcion.Replace("SELECT r.Id", "SELECT TOP (500) r.Id") + """

             WHERE r.Activo = 1 AND r.Fecha BETWEEN @desde AND @hasta
               AND (@proveedorId IS NULL OR o.ProveedorId = @proveedorId)
             ORDER BY r.Fecha DESC, r.Id DESC;
            """,
            new { desde, hasta, proveedorId }, cancellationToken: ct));
        return filas.AsList();
    }

    public async Task<RecepcionDto> ObtenerAsync(int id, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<RecepcionDto>(new CommandDefinition(
                   SelectRecepcion + " WHERE r.Id = @id;", new { id }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"No existe la recepción {id}.");
    }

    public async Task<ContextoRecepcionDto> ObtenerContextoItemAsync(int ordenId, int itemId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<ContextoRecepcionDto>(new CommandDefinition("""
                   SELECT o.Id AS OrdenCompraId, o.Estado AS EstadoOrden, o.Fecha AS FechaOrden,
                          CAST(1 AS BIT) AS RecepcionActiva
                   FROM dbo.OrdenCompraItem i JOIN dbo.OrdenCompra o ON o.Id = i.OrdenCompraId
                   WHERE i.Id = @itemId AND o.Id = @ordenId AND i.Activo = 1;
                   """, new { ordenId, itemId }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"La orden {ordenId} no tiene el ítem {itemId}.");
    }

    public async Task<ContextoRecepcionDto> ObtenerContextoRecepcionAsync(int recepcionId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<ContextoRecepcionDto>(new CommandDefinition("""
                   SELECT o.Id AS OrdenCompraId, o.Estado AS EstadoOrden, o.Fecha AS FechaOrden, r.Activo AS RecepcionActiva
                   FROM dbo.Recepcion r
                   JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
                   JOIN dbo.OrdenCompra     o ON o.Id = i.OrdenCompraId
                   WHERE r.Id = @recepcionId;
                   """, new { recepcionId }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"No existe la recepción {recepcionId}.");
    }

    /// <summary>Inserta la recepción solo si la orden sigue abierta. Devuelve null si cambió de estado.</summary>
    public async Task<int?> RegistrarAsync(int itemId, RegistrarRecepcionRequest r, int usuarioId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteScalarAsync<int?>(new CommandDefinition("""
            INSERT INTO dbo.Recepcion (OrdenCompraItemId, Fecha, CantidadKg, Remito, Observaciones, RegistradaPorId)
            OUTPUT INSERTED.Id
            SELECT i.Id, @Fecha, @CantidadKg, @Remito, @Observaciones, @usuarioId
            FROM dbo.OrdenCompraItem i JOIN dbo.OrdenCompra o ON o.Id = i.OrdenCompraId
            WHERE i.Id = @itemId AND i.Activo = 1 AND o.Estado = 'ABIERTA';
            """,
            new { itemId, r.Fecha, r.CantidadKg, Remito = r.Remito?.Trim(), r.Observaciones, usuarioId },
            cancellationToken: ct));
    }

    public async Task<bool> AnularAsync(int id, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE r SET Activo = 0
            FROM dbo.Recepcion r
            JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
            JOIN dbo.OrdenCompra     o ON o.Id = i.OrdenCompraId
            WHERE r.Id = @id AND r.Activo = 1 AND o.Estado = 'ABIERTA';
            """, new { id }, cancellationToken: ct)) > 0;
    }
}
