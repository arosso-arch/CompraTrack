using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.Data.SqlClient;

namespace CompraTrack.Api.Features.Usuarios;

public sealed class UsuarioRepository(IDbConnectionFactory db)
{
    private const string AdministradoresActivos = """
        (SELECT COUNT(*) FROM dbo.Usuario ua JOIN dbo.Rol ra ON ra.Id = ua.RolId WHERE ua.Activo = 1 AND ra.EsAdministrador = 1)
        """;

    public async Task<IReadOnlyList<UsuarioResumenDto>> ListarAsync(FiltroUsuarios f, CancellationToken ct)
    {
        const string sql = """
            SELECT u.Id, u.NombreUsuario, u.NombreCompleto, u.Email, u.RolId, r.Nombre AS Rol, r.EsAdministrador,
                   u.Activo, u.FechaAlta, u.UltimoAcceso,
                   (SELECT COUNT(*) FROM dbo.UsuarioPermiso up WHERE up.UsuarioId = u.Id) AS PermisosExtra
            FROM dbo.Usuario u
            JOIN dbo.Rol r ON r.Id = u.RolId
            WHERE (@RolId IS NULL OR u.RolId = @RolId)
              AND (@Activo IS NULL OR u.Activo = @Activo)
              AND (@Buscar IS NULL OR u.NombreUsuario LIKE '%' + @Buscar + '%'
                                   OR u.NombreCompleto LIKE '%' + @Buscar + '%'
                                   OR u.Email LIKE '%' + @Buscar + '%')
            ORDER BY u.Activo DESC, u.NombreCompleto;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<UsuarioResumenDto>(new CommandDefinition(sql,
            new { f.RolId, f.Activo, Buscar = string.IsNullOrWhiteSpace(f.Buscar) ? null : f.Buscar.Trim() }, cancellationToken: ct));
        return filas.AsList();
    }

    public async Task<UsuarioDetalleDto> ObtenerAsync(int id, CancellationToken ct)
    {
        const string sql = """
            SELECT u.Id, u.NombreUsuario, u.NombreCompleto, u.Email, u.RolId, r.Nombre AS Rol, r.EsAdministrador,
                   u.Activo, u.FechaAlta, u.UltimoAcceso
            FROM dbo.Usuario u JOIN dbo.Rol r ON r.Id = u.RolId
            WHERE u.Id = @id;

            SELECT p.Id
            FROM dbo.Permiso p
            JOIN dbo.Usuario u ON u.Id = @id
            JOIN dbo.Rol r     ON r.Id = u.RolId
            WHERE r.EsAdministrador = 1
               OR EXISTS (SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = r.Id AND rp.PermisoId = p.Id)
            ORDER BY p.Id;

            SELECT PermisoId FROM dbo.UsuarioPermiso WHERE UsuarioId = @id ORDER BY PermisoId;
            """;

        await using var cn = await db.AbrirAsync(ct);
        using var multi = await cn.QueryMultipleAsync(new CommandDefinition(sql, new { id }, cancellationToken: ct));
        var usuario = await multi.ReadSingleOrDefaultAsync<UsuarioDetalleDto>()
                      ?? throw new NoEncontradoException($"No existe el usuario {id}.");
        usuario.PermisosRol = (await multi.ReadAsync<int>()).AsList();
        usuario.PermisosExtra = (await multi.ReadAsync<int>()).AsList();
        return usuario;
    }

    public async Task<ContextoUsuarioDto> ObtenerContextoAsync(int id, CancellationToken ct)
    {
        var sql = $"""
            SELECT u.Id, u.Activo, r.EsAdministrador, {AdministradoresActivos} AS AdministradoresActivos
            FROM dbo.Usuario u JOIN dbo.Rol r ON r.Id = u.RolId
            WHERE u.Id = @id;
            """;

        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<ContextoUsuarioDto>(new CommandDefinition(sql, new { id }, cancellationToken: ct))
               ?? throw new NoEncontradoException($"No existe el usuario {id}.");
    }

    public async Task<bool?> RolEsAdministradorAsync(int rolId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteScalarAsync<bool?>(new CommandDefinition(
            "SELECT EsAdministrador FROM dbo.Rol WHERE Id = @rolId;", new { rolId }, cancellationToken: ct));
    }

    public async Task<bool> EstaActivoAsync(int id, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteScalarAsync<bool?>(new CommandDefinition(
            "SELECT Activo FROM dbo.Usuario WHERE Id = @id;", new { id }, cancellationToken: ct)) ?? false;
    }

    public async Task<int> CrearAsync(CrearUsuarioRequest r, string claveHash, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO dbo.Usuario (NombreUsuario, NombreCompleto, Email, ClaveHash, RolId)
            OUTPUT INSERTED.Id
            VALUES (@NombreUsuario, @NombreCompleto, @Email, @claveHash, @RolId);
            """;

        await using var cn = await db.AbrirAsync(ct);
        try
        {
            return await cn.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
            {
                NombreUsuario = r.NombreUsuario.Trim().ToLowerInvariant(),
                NombreCompleto = r.NombreCompleto.Trim(),
                Email = r.Email.Trim().ToLowerInvariant(),
                claveHash,
                r.RolId
            }, cancellationToken: ct));
        }
        catch (SqlException ex) { throw TraducirError(ex); }
    }

    /// <summary>
    /// Actualiza datos y rol. El WHERE impide, aun con dos administradores operando a la vez,
    /// quitarle el rol al último administrador activo. Devuelve false si esa condición lo bloqueó.
    /// </summary>
    public async Task<bool> ActualizarAsync(int id, ActualizarUsuarioRequest r, CancellationToken ct)
    {
        var sql = $"""
            UPDATE u SET NombreCompleto = @NombreCompleto, Email = @Email, RolId = @RolId
            FROM dbo.Usuario u JOIN dbo.Rol r ON r.Id = u.RolId
            WHERE u.Id = @id
              AND (r.EsAdministrador = 0 OR u.Activo = 0
                   OR (SELECT EsAdministrador FROM dbo.Rol WHERE Id = @RolId) = 1
                   OR {AdministradoresActivos} > 1);
            """;

        await using var cn = await db.AbrirAsync(ct);
        try
        {
            return await cn.ExecuteAsync(new CommandDefinition(sql, new
            {
                id, NombreCompleto = r.NombreCompleto.Trim(), Email = r.Email.Trim().ToLowerInvariant(), r.RolId
            }, cancellationToken: ct)) > 0;
        }
        catch (SqlException ex) { throw TraducirError(ex); }
    }

    /// <summary>Alta o baja. Una baja nunca deja al sistema sin administradores activos.</summary>
    public async Task<bool> CambiarEstadoAsync(int id, bool activo, CancellationToken ct)
    {
        var sql = $"""
            UPDATE u SET Activo = @activo
            FROM dbo.Usuario u JOIN dbo.Rol r ON r.Id = u.RolId
            WHERE u.Id = @id AND (@activo = 1 OR r.EsAdministrador = 0 OR {AdministradoresActivos} > 1);
            """;

        await using var cn = await db.AbrirAsync(ct);
        return await cn.ExecuteAsync(new CommandDefinition(sql, new { id, activo }, cancellationToken: ct)) > 0;
    }

    public async Task CambiarClaveAsync(int id, string claveHash, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.Usuario SET ClaveHash = @claveHash WHERE Id = @id;", new { id, claveHash }, cancellationToken: ct));
        if (filas == 0) throw new NoEncontradoException($"No existe el usuario {id}.");
    }

    /// <summary>Reemplaza los permisos extra del usuario. Ignora los que ya trae su rol.</summary>
    public async Task GuardarPermisosExtraAsync(int id, IReadOnlyList<int> permisoIds, int otorgadoPorId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        await using var tx = (SqlTransaction)await cn.BeginTransactionAsync(ct);

        await cn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM dbo.UsuarioPermiso WHERE UsuarioId = @id;", new { id }, tx, cancellationToken: ct));

        var ids = permisoIds.Distinct().ToList();
        if (ids.Count > 0)
        {
            var existentes = await cn.ExecuteScalarAsync<int>(new CommandDefinition(
                "SELECT COUNT(*) FROM dbo.Permiso WHERE Id IN @ids;", new { ids }, tx, cancellationToken: ct));
            if (existentes != ids.Count)
                throw new ReglaNegocioException("Alguno de los permisos indicados no existe.");

            await cn.ExecuteAsync(new CommandDefinition("""
                INSERT INTO dbo.UsuarioPermiso (UsuarioId, PermisoId, OtorgadoPorId)
                SELECT @id, p.Id, @otorgadoPorId
                FROM dbo.Permiso p
                JOIN dbo.Usuario u ON u.Id = @id
                WHERE p.Id IN @ids
                  AND NOT EXISTS (SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = u.RolId AND rp.PermisoId = p.Id);
                """, new { id, ids, otorgadoPorId }, tx, cancellationToken: ct));
        }

        await tx.CommitAsync(ct);
    }

    public async Task<IReadOnlyList<RolDto>> ListarRolesAsync(CancellationToken ct)
    {
        const string sql = """
            SELECT r.Id, r.Nombre, r.Descripcion, r.EsAdministrador,
                   (SELECT COUNT(*) FROM dbo.Usuario u WHERE u.RolId = r.Id AND u.Activo = 1) AS Usuarios
            FROM dbo.Rol r ORDER BY r.EsAdministrador DESC, r.Nombre;

            SELECT r.Id AS RolId, p.Id AS PermisoId
            FROM dbo.Rol r JOIN dbo.Permiso p
              ON r.EsAdministrador = 1 OR EXISTS (SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = r.Id AND rp.PermisoId = p.Id);
            """;

        await using var cn = await db.AbrirAsync(ct);
        using var multi = await cn.QueryMultipleAsync(new CommandDefinition(sql, cancellationToken: ct));
        var roles = (await multi.ReadAsync<RolDto>()).AsList();
        var permisos = (await multi.ReadAsync<(int RolId, int PermisoId)>()).ToLookup(x => x.RolId, x => x.PermisoId);
        foreach (var rol in roles) rol.Permisos = permisos[rol.Id].Order().ToList();
        return roles;
    }

    public async Task<IReadOnlyList<PermisoDto>> ListarPermisosAsync(CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<PermisoDto>(new CommandDefinition(
            "SELECT Id, Codigo, Modulo, Descripcion FROM dbo.Permiso ORDER BY Id;", cancellationToken: ct));
        return filas.AsList();
    }

    /// <summary>Traduce violaciones de UNIQUE y FK a mensajes claros.</summary>
    private static Exception TraducirError(SqlException ex) => ex.Number switch
    {
        2627 or 2601 when ex.Message.Contains("UQ_Usuario_NombreUsuario") => new ReglaNegocioException("Ya existe un usuario con ese nombre de usuario."),
        2627 or 2601 when ex.Message.Contains("UQ_Usuario_Email") => new ReglaNegocioException("Ya existe un usuario con ese email."),
        547 => new ReglaNegocioException("El rol indicado no existe."),
        _ => ex
    };
}
