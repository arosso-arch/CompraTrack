using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.Data.SqlClient;

namespace CompraTrack.Api.Features.Proveedores;

public sealed class ProveedorRepository(IDbConnectionFactory db)
{
    private const string SelectProveedor = """
        SELECT p.Id, p.Codigo, p.RazonSocial, p.Contacto, p.Email, p.Telefono, p.Direccion, p.Activo,
               (SELECT COUNT(*) FROM dbo.OrdenCompra o WHERE o.ProveedorId = p.Id AND o.Estado = 'ABIERTA') AS OrdenesAbiertas
        FROM dbo.Proveedor p
        """;

    public async Task<IReadOnlyList<ProveedorDto>> ListarAsync(bool? activo, string? buscar, CancellationToken ct)
    {
        var sql = SelectProveedor + """

            WHERE (@activo IS NULL OR p.Activo = @activo)
              AND (@buscar IS NULL OR p.RazonSocial LIKE '%' + @buscar + '%'
                                   OR CAST(p.Codigo AS VARCHAR(10)) = @buscar
                                   OR p.Contacto LIKE '%' + @buscar + '%')
            ORDER BY p.RazonSocial;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<ProveedorDto>(new CommandDefinition(
            sql, new { activo, buscar = string.IsNullOrWhiteSpace(buscar) ? null : buscar.Trim() }, cancellationToken: ct));
        return filas.AsList();
    }

    public async Task<ProveedorDto> ObtenerAsync(int id, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<ProveedorDto>(new CommandDefinition(
                   SelectProveedor + " WHERE p.Id = @id;", new { id }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"No existe el proveedor {id}.");
    }

    public async Task<int> CrearAsync(GuardarProveedorRequest r, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO dbo.Proveedor (Codigo, RazonSocial, Contacto, Email, Telefono, Direccion)
            OUTPUT INSERTED.Id
            VALUES (@Codigo, @RazonSocial, @Contacto, @Email, @Telefono, @Direccion);
            """;

        await using var cn = await db.AbrirAsync(ct);
        try
        {
            return await cn.ExecuteScalarAsync<int>(new CommandDefinition(sql, r, cancellationToken: ct));
        }
        catch (SqlException ex) when (EsClaveDuplicada(ex))
        {
            throw new ReglaNegocioException($"Ya existe un proveedor con el código {r.Codigo}.");
        }
    }

    public async Task ActualizarAsync(int id, GuardarProveedorRequest r, CancellationToken ct)
    {
        const string sql = """
            UPDATE dbo.Proveedor
            SET Codigo = @Codigo, RazonSocial = @RazonSocial, Contacto = @Contacto,
                Email = @Email, Telefono = @Telefono, Direccion = @Direccion
            WHERE Id = @id;
            """;

        await using var cn = await db.AbrirAsync(ct);
        try
        {
            var filas = await cn.ExecuteAsync(new CommandDefinition(sql,
                new { id, r.Codigo, r.RazonSocial, r.Contacto, r.Email, r.Telefono, r.Direccion }, cancellationToken: ct));
            if (filas == 0) throw new NoEncontradoException($"No existe el proveedor {id}.");
        }
        catch (SqlException ex) when (EsClaveDuplicada(ex))
        {
            throw new ReglaNegocioException($"Ya existe un proveedor con el código {r.Codigo}.");
        }
    }

    public async Task CambiarEstadoAsync(int id, bool activo, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);

        if (!activo)
        {
            var abiertas = await cn.ExecuteScalarAsync<int>(new CommandDefinition(
                "SELECT COUNT(*) FROM dbo.OrdenCompra WHERE ProveedorId = @id AND Estado = 'ABIERTA';",
                new { id }, cancellationToken: ct));
            if (abiertas > 0)
                throw new ReglaNegocioException(
                    $"No se puede dar de baja: el proveedor tiene {abiertas} orden(es) abierta(s).");
        }

        var filas = await cn.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.Proveedor SET Activo = @activo WHERE Id = @id;", new { id, activo }, cancellationToken: ct));
        if (filas == 0) throw new NoEncontradoException($"No existe el proveedor {id}.");
    }

    // ---------- Productos que ofrece el proveedor ----------

    public async Task<IReadOnlyList<ProveedorProductoDto>> ListarProductosAsync(int proveedorId, CancellationToken ct)
    {
        const string sql = """
            SELECT pp.Id, pp.TipoProductoId, t.Nombre AS Tipo, pp.GramajeId, g.Gramos,
                   pp.FormatoId, f.Descripcion AS Formato, pp.CantidadUsos, pp.Activo
            FROM dbo.ProveedorProducto pp
            JOIN dbo.TipoProducto t ON t.Id = pp.TipoProductoId
            JOIN dbo.Gramaje      g ON g.Id = pp.GramajeId
            JOIN dbo.Formato      f ON f.Id = pp.FormatoId
            WHERE pp.ProveedorId = @proveedorId
            ORDER BY t.Nombre, g.Gramos, f.Descripcion;
            """;

        await using var cn = await db.AbrirAsync(ct);
        await AsegurarExisteAsync(cn, proveedorId, ct);
        var filas = await cn.QueryAsync<ProveedorProductoDto>(new CommandDefinition(sql, new { proveedorId }, cancellationToken: ct));
        return filas.AsList();
    }

    /// <summary>Agrega la combinación; si ya existía dada de baja, la reactiva.</summary>
    public async Task<int> AgregarProductoAsync(int proveedorId, AgregarProveedorProductoRequest r, CancellationToken ct)
    {
        const string sql = """
            MERGE dbo.ProveedorProducto WITH (HOLDLOCK) AS destino
            USING (SELECT @proveedorId AS ProveedorId, @TipoProductoId AS TipoProductoId,
                          @GramajeId AS GramajeId, @FormatoId AS FormatoId) AS origen
               ON destino.ProveedorId = origen.ProveedorId AND destino.TipoProductoId = origen.TipoProductoId
              AND destino.GramajeId = origen.GramajeId AND destino.FormatoId = origen.FormatoId
            WHEN MATCHED THEN UPDATE SET Activo = 1
            WHEN NOT MATCHED THEN
                INSERT (ProveedorId, TipoProductoId, GramajeId, FormatoId)
                VALUES (origen.ProveedorId, origen.TipoProductoId, origen.GramajeId, origen.FormatoId)
            OUTPUT INSERTED.Id;
            """;

        await using var cn = await db.AbrirAsync(ct);
        await AsegurarExisteAsync(cn, proveedorId, ct);
        try
        {
            return await cn.ExecuteScalarAsync<int>(new CommandDefinition(sql,
                new { proveedorId, r.TipoProductoId, r.GramajeId, r.FormatoId }, cancellationToken: ct));
        }
        catch (SqlException ex) when (ex.Number == 547)   // violación de FK
        {
            throw new ReglaNegocioException("El tipo, gramaje o formato indicado no existe.");
        }
    }

    public async Task CambiarEstadoProductoAsync(int proveedorId, int id, bool activo, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.ProveedorProducto SET Activo = @activo WHERE Id = @id AND ProveedorId = @proveedorId;",
            new { proveedorId, id, activo }, cancellationToken: ct));
        if (filas == 0) throw new NoEncontradoException($"El proveedor {proveedorId} no tiene el producto {id}.");
    }

    // ---------- Opciones en cascada para cargar una orden ----------

    public async Task<IReadOnlyList<OpcionDto>> OpcionesTiposAsync(int proveedorId, CancellationToken ct)
    {
        const string sql = """
            SELECT DISTINCT t.Id, t.Nombre
            FROM dbo.ProveedorProducto pp JOIN dbo.TipoProducto t ON t.Id = pp.TipoProductoId
            WHERE pp.ProveedorId = @proveedorId AND pp.Activo = 1 AND t.Activo = 1
            ORDER BY t.Nombre;
            """;
        return await ConsultarOpcionesAsync(sql, new { proveedorId }, ct);
    }

    public async Task<IReadOnlyList<OpcionDto>> OpcionesGramajesAsync(int proveedorId, int tipoProductoId, CancellationToken ct)
    {
        const string sql = """
            SELECT DISTINCT g.Id, CAST(g.Gramos AS NVARCHAR(10)) + N' g/m²' AS Nombre, g.Gramos
            FROM dbo.ProveedorProducto pp JOIN dbo.Gramaje g ON g.Id = pp.GramajeId
            WHERE pp.ProveedorId = @proveedorId AND pp.TipoProductoId = @tipoProductoId AND pp.Activo = 1
            ORDER BY g.Gramos;
            """;
        return await ConsultarOpcionesAsync(sql, new { proveedorId, tipoProductoId }, ct);
    }

    public async Task<IReadOnlyList<OpcionDto>> OpcionesFormatosAsync(int proveedorId, int tipoProductoId, int gramajeId, CancellationToken ct)
    {
        const string sql = """
            SELECT DISTINCT f.Id, f.Descripcion AS Nombre
            FROM dbo.ProveedorProducto pp JOIN dbo.Formato f ON f.Id = pp.FormatoId
            WHERE pp.ProveedorId = @proveedorId AND pp.TipoProductoId = @tipoProductoId
              AND pp.GramajeId = @gramajeId AND pp.Activo = 1
            ORDER BY f.Descripcion;
            """;
        return await ConsultarOpcionesAsync(sql, new { proveedorId, tipoProductoId, gramajeId }, ct);
    }

    private async Task<IReadOnlyList<OpcionDto>> ConsultarOpcionesAsync(string sql, object parametros, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<OpcionDto>(new CommandDefinition(sql, parametros, cancellationToken: ct));
        return filas.AsList();
    }

    private static async Task AsegurarExisteAsync(SqlConnection cn, int proveedorId, CancellationToken ct)
    {
        var existe = await cn.ExecuteScalarAsync<bool>(new CommandDefinition(
            "SELECT CAST(COUNT(*) AS BIT) FROM dbo.Proveedor WHERE Id = @proveedorId;", new { proveedorId }, cancellationToken: ct));
        if (!existe) throw new NoEncontradoException($"No existe el proveedor {proveedorId}.");
    }

    /// <summary>2627 = violación de UNIQUE constraint, 2601 = de índice único.</summary>
    private static bool EsClaveDuplicada(SqlException ex) => ex.Number is 2627 or 2601;
}
