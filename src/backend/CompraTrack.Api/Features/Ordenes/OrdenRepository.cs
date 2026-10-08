using System.Data;
using CompraTrack.Api.Common;
using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.Data.SqlClient;

namespace CompraTrack.Api.Features.Ordenes;

public sealed class OrdenRepository(IDbConnectionFactory db)
{
    public async Task<ResultadoPaginado<OrdenResumenDto>> ListarAsync(FiltroOrdenes f, CancellationToken ct)
    {
        const string desde = """
            FROM dbo.OrdenCompra o
            JOIN dbo.Proveedor p ON p.Id = o.ProveedorId
            """;

        const string where = """
            WHERE (@Estado IS NULL OR o.Estado = @Estado)
              AND (@ProveedorId IS NULL OR o.ProveedorId = @ProveedorId)
              AND (@Desde IS NULL OR o.Fecha >= @Desde)
              AND (@Hasta IS NULL OR o.Fecha <= @Hasta)
              AND (@Buscar IS NULL OR CAST(o.Numero AS VARCHAR(10)) = @Buscar
                                   OR o.Concepto    LIKE '%' + @Buscar + '%'
                                   OR p.RazonSocial LIKE '%' + @Buscar + '%')
            """;

        const string sql = $"""
            SELECT COUNT(*) {desde} {where};

            SELECT o.Id, o.Numero, o.Fecha, o.ProveedorId, p.RazonSocial AS Proveedor, o.Concepto, o.Estado,
                   u.NombreCompleto AS CreadaPor,
                   a.CantidadItems, a.ItemsPendientes, a.TotalPedidoKg, a.TotalRecibidoKg
            {desde}
            JOIN dbo.Usuario u ON u.Id = o.CreadaPorId
            OUTER APPLY
            (
                SELECT COUNT(*)                            AS CantidadItems,
                       ISNULL(SUM(CASE WHEN v.EstadoEntrega IN ('EN ESPERA', 'ENTREGA PARCIAL') THEN 1 END), 0) AS ItemsPendientes,
                       ISNULL(SUM(v.CantidadPedidaKg), 0)  AS TotalPedidoKg,
                       ISNULL(SUM(v.CantidadRecibidaKg), 0) AS TotalRecibidoKg
                FROM dbo.vw_EstadoEntregaItem v
                WHERE v.OrdenCompraId = o.Id
            ) a
            {where}
            ORDER BY o.Fecha DESC, o.Numero DESC
            OFFSET (@Pagina - 1) * @TamanioPagina ROWS FETCH NEXT @TamanioPagina ROWS ONLY;
            """;

        var parametros = new
        {
            f.Estado, f.ProveedorId, f.Desde, f.Hasta,
            Buscar = string.IsNullOrWhiteSpace(f.Buscar) ? null : f.Buscar.Trim(),
            f.Pagina, f.TamanioPagina
        };

        await using var cn = await db.AbrirAsync(ct);
        using var multi = await cn.QueryMultipleAsync(new CommandDefinition(sql, parametros, cancellationToken: ct));
        var total = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<OrdenResumenDto>()).AsList();
        return new ResultadoPaginado<OrdenResumenDto>(items, total, f.Pagina, f.TamanioPagina);
    }

    public async Task<OrdenDetalleDto> ObtenerDetalleAsync(int id, CancellationToken ct)
    {
        const string sql = """
            SELECT o.Id, o.Numero, o.Fecha, o.ProveedorId, p.RazonSocial AS Proveedor, p.Contacto AS ProveedorContacto,
                   p.Email AS ProveedorEmail, p.Telefono AS ProveedorTelefono, o.Concepto, o.FormaPago, o.Observaciones,
                   o.Estado, u.NombreCompleto AS CreadaPor, o.FechaCreacion, o.FechaCierre
            FROM dbo.OrdenCompra o
            JOIN dbo.Proveedor p ON p.Id = o.ProveedorId
            JOIN dbo.Usuario   u ON u.Id = o.CreadaPorId
            WHERE o.Id = @id;

            SELECT i.Id, i.TipoProductoId, t.Nombre AS Tipo, i.GramajeId, g.Gramos, i.FormatoId, f.Descripcion AS Formato,
                   i.Detalle, i.CantidadKg, v.CantidadRecibidaKg AS RecibidoKg, v.DiferenciaKg, v.EstadoEntrega
            FROM dbo.OrdenCompraItem i
            JOIN dbo.vw_EstadoEntregaItem v ON v.OrdenCompraItemId = i.Id
            JOIN dbo.TipoProducto t ON t.Id = i.TipoProductoId
            JOIN dbo.Gramaje      g ON g.Id = i.GramajeId
            JOIN dbo.Formato      f ON f.Id = i.FormatoId
            WHERE i.OrdenCompraId = @id
            ORDER BY i.Id;

            SELECT e.Id, e.Destinatario, e.Asunto, u.NombreCompleto AS EnviadoPor, e.FechaEnvio
            FROM dbo.EnvioOrden e
            JOIN dbo.Usuario u ON u.Id = e.EnviadoPorId
            WHERE e.OrdenCompraId = @id
            ORDER BY e.FechaEnvio DESC, e.Id DESC;
            """;

        await using var cn = await db.AbrirAsync(ct);
        using var multi = await cn.QueryMultipleAsync(new CommandDefinition(sql, new { id }, cancellationToken: ct));
        var orden = await multi.ReadSingleOrDefaultAsync<OrdenDetalleDto>()
                    ?? throw new NoEncontradoException($"No existe la orden {id}.");
        orden.Items = (await multi.ReadAsync<OrdenItemDto>()).AsList();
        orden.Envios = (await multi.ReadAsync<EnvioOrdenDto>()).AsList();
        return orden;
    }

    public async Task RegistrarEnvioAsync(int ordenId, string destinatario, string asunto, int usuarioId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        await cn.ExecuteAsync(new CommandDefinition("""
            INSERT INTO dbo.EnvioOrden (OrdenCompraId, Destinatario, Asunto, EnviadoPorId)
            VALUES (@ordenId, @destinatario, @asunto, @usuarioId);
            """, new { ordenId, destinatario, asunto, usuarioId }, cancellationToken: ct));
    }

    public async Task<OrdenEstadoDto> ObtenerEstadoAsync(int id, CancellationToken ct)
    {
        const string sql = """
            SELECT o.Id, o.Estado, o.Fecha, o.ProveedorId,
                   CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Recepcion r
                                          JOIN dbo.OrdenCompraItem i ON i.Id = r.OrdenCompraItemId
                                          WHERE i.OrdenCompraId = o.Id AND i.Activo = 1 AND r.Activo = 1)
                        THEN 1 ELSE 0 END AS BIT) AS TieneRecepciones,
                   (SELECT COUNT(*) FROM dbo.OrdenCompraItem i WHERE i.OrdenCompraId = o.Id AND i.Activo = 1) AS ItemsActivos
            FROM dbo.OrdenCompra o
            WHERE o.Id = @id;
            """;

        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<OrdenEstadoDto>(new CommandDefinition(sql, new { id }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"No existe la orden {id}.");
    }

    public async Task<bool> ItemTieneRecepcionesAsync(int ordenId, int itemId, CancellationToken ct)
    {
        // Devuelve NULL (sin filas) si el ítem no existe o no pertenece a la orden.
        const string sql = """
            SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Recepcion r WHERE r.OrdenCompraItemId = i.Id AND r.Activo = 1)
                        THEN 1 ELSE 0 END AS BIT)
            FROM dbo.OrdenCompraItem i
            WHERE i.Id = @itemId AND i.OrdenCompraId = @ordenId AND i.Activo = 1;
            """;

        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteScalarAsync<bool?>(new CommandDefinition(sql, new { ordenId, itemId }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"La orden {ordenId} no tiene el ítem {itemId}.");
    }

    /// <summary>Crea la orden con sus ítems en una transacción. Devuelve el Id generado.</summary>
    public async Task<int> CrearAsync(CrearOrdenRequest r, int usuarioId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        await using var tx = (SqlTransaction)await cn.BeginTransactionAsync(ct);

        var proveedorActivo = await cn.ExecuteScalarAsync<bool?>(new CommandDefinition(
            "SELECT Activo FROM dbo.Proveedor WHERE Id = @ProveedorId;", new { r.ProveedorId }, tx, cancellationToken: ct));
        if (proveedorActivo is null) throw new ReglaNegocioException($"No existe el proveedor {r.ProveedorId}.");
        if (proveedorActivo == false) throw new ReglaNegocioException("El proveedor está dado de baja.");

        var ordenId = await cn.ExecuteScalarAsync<int>(new CommandDefinition("""
            INSERT INTO dbo.OrdenCompra (Fecha, ProveedorId, Concepto, FormaPago, Observaciones, CreadaPorId)
            OUTPUT INSERTED.Id
            VALUES (@Fecha, @ProveedorId, @Concepto, @FormaPago, @Observaciones, @usuarioId);
            """,
            new { r.Fecha, r.ProveedorId, Concepto = r.Concepto.Trim(), r.FormaPago, r.Observaciones, usuarioId },
            tx, cancellationToken: ct));

        foreach (var item in r.Items)
            await InsertarItemAsync(cn, tx, ordenId, r.ProveedorId, item, ct);

        await tx.CommitAsync(ct);
        return ordenId;
    }

    public async Task<int> AgregarItemAsync(int ordenId, int proveedorId, ItemRequest item, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        await using var tx = (SqlTransaction)await cn.BeginTransactionAsync(ct);
        var id = await InsertarItemAsync(cn, tx, ordenId, proveedorId, item, ct);
        await tx.CommitAsync(ct);
        return id;
    }

    /// <summary>Inserta un ítem validando que el proveedor ofrezca esa combinación, y suma un uso a la combinación.</summary>
    private static async Task<int> InsertarItemAsync(SqlConnection cn, IDbTransaction tx, int ordenId, int proveedorId, ItemRequest item, CancellationToken ct)
    {
        var parametros = new { ordenId, proveedorId, item.TipoProductoId, item.GramajeId, item.FormatoId, item.Detalle, item.CantidadKg };

        var filas = await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.ProveedorProducto SET CantidadUsos = CantidadUsos + 1
            WHERE ProveedorId = @proveedorId AND TipoProductoId = @TipoProductoId
              AND GramajeId = @GramajeId AND FormatoId = @FormatoId AND Activo = 1;
            """, parametros, tx, cancellationToken: ct));

        if (filas == 0)
            throw new ReglaNegocioException(
                "El proveedor no ofrece la combinación tipo / gramaje / formato indicada (o está dada de baja).");

        return await cn.ExecuteScalarAsync<int>(new CommandDefinition("""
            INSERT INTO dbo.OrdenCompraItem (OrdenCompraId, TipoProductoId, GramajeId, FormatoId, Detalle, CantidadKg)
            OUTPUT INSERTED.Id
            VALUES (@ordenId, @TipoProductoId, @GramajeId, @FormatoId, @Detalle, @CantidadKg);
            """, parametros, tx, cancellationToken: ct));
    }

    // Los UPDATE incluyen "AND Estado = 'ABIERTA'" como protección ante cambios concurrentes:
    // si otro usuario cerró la orden entre la validación y el guardado, no se modifica nada.

    public async Task<bool> ActualizarCabeceraAsync(int id, ActualizarOrdenRequest r, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.OrdenCompra
            SET Fecha = @Fecha, Concepto = @Concepto, FormaPago = @FormaPago, Observaciones = @Observaciones
            WHERE Id = @id AND Estado = 'ABIERTA';
            """,
            new { id, r.Fecha, Concepto = r.Concepto.Trim(), r.FormaPago, r.Observaciones }, cancellationToken: ct)) > 0;
    }

    public async Task<bool> ActualizarItemAsync(int ordenId, int itemId, ActualizarItemRequest r, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE i SET Detalle = @Detalle, CantidadKg = @CantidadKg
            FROM dbo.OrdenCompraItem i
            JOIN dbo.OrdenCompra o ON o.Id = i.OrdenCompraId
            WHERE i.Id = @itemId AND i.OrdenCompraId = @ordenId AND i.Activo = 1 AND o.Estado = 'ABIERTA';
            """,
            new { ordenId, itemId, r.Detalle, r.CantidadKg }, cancellationToken: ct)) > 0;
    }

    public async Task<bool> QuitarItemAsync(int ordenId, int itemId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE i SET Activo = 0
            FROM dbo.OrdenCompraItem i
            JOIN dbo.OrdenCompra o ON o.Id = i.OrdenCompraId
            WHERE i.Id = @itemId AND i.OrdenCompraId = @ordenId AND i.Activo = 1 AND o.Estado = 'ABIERTA'
              AND NOT EXISTS (SELECT 1 FROM dbo.Recepcion r WHERE r.OrdenCompraItemId = i.Id AND r.Activo = 1);
            """,
            new { ordenId, itemId }, cancellationToken: ct)) > 0;
    }

    /// <summary>Cambia el estado solo si la orden sigue en el estado esperado.</summary>
    public async Task<bool> CambiarEstadoAsync(int id, string estadoEsperado, string nuevoEstado, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.OrdenCompra
            SET Estado = @nuevoEstado,
                FechaCierre = CASE WHEN @nuevoEstado = 'ABIERTA' THEN NULL ELSE SYSDATETIME() END
            WHERE Id = @id AND Estado = @estadoEsperado;
            """,
            new { id, estadoEsperado, nuevoEstado }, cancellationToken: ct)) > 0;
    }
}
