using CompraTrack.Api.Infrastructure.Data;
using Dapper;

namespace CompraTrack.Api.Features.Auth;

public sealed class UsuarioCredenciales
{
    public int Id { get; init; }
    public string NombreUsuario { get; init; } = "";
    public string NombreCompleto { get; init; } = "";
    public string Email { get; init; } = "";
    public string ClaveHash { get; init; } = "";
    public string Rol { get; init; } = "";
    public bool Activo { get; init; }
}

public sealed class AuthRepository(IDbConnectionFactory db)
{
    private const string SelectUsuario = """
        SELECT u.Id, u.NombreUsuario, u.NombreCompleto, u.Email, u.ClaveHash, u.Activo, r.Nombre AS Rol
        FROM dbo.Usuario u
        JOIN dbo.Rol r ON r.Id = u.RolId
        """;

    public async Task<UsuarioCredenciales?> ObtenerPorNombreUsuarioAsync(string nombreUsuario, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<UsuarioCredenciales>(new CommandDefinition(
            SelectUsuario + " WHERE u.NombreUsuario = @nombreUsuario;", new { nombreUsuario }, cancellationToken: ct));
    }

    public async Task<UsuarioCredenciales?> ObtenerPorIdAsync(int id, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        return await cn.QuerySingleOrDefaultAsync<UsuarioCredenciales>(new CommandDefinition(
            SelectUsuario + " WHERE u.Id = @id;", new { id }, cancellationToken: ct));
    }

    /// <summary>Permisos del rol + permisos extra del usuario. Un rol administrador recibe todos.</summary>
    public async Task<IReadOnlyList<string>> ObtenerPermisosEfectivosAsync(int usuarioId, CancellationToken ct)
    {
        const string sql = """
            SELECT p.Codigo
            FROM dbo.Permiso p
            JOIN dbo.Usuario u ON u.Id = @usuarioId
            JOIN dbo.Rol r     ON r.Id = u.RolId
            WHERE r.EsAdministrador = 1
               OR EXISTS (SELECT 1 FROM dbo.RolPermiso rp     WHERE rp.RolId = r.Id     AND rp.PermisoId = p.Id)
               OR EXISTS (SELECT 1 FROM dbo.UsuarioPermiso up WHERE up.UsuarioId = u.Id AND up.PermisoId = p.Id)
            ORDER BY p.Codigo;
            """;

        await using var cn = await db.AbrirAsync(ct);
        var permisos = await cn.QueryAsync<string>(new CommandDefinition(sql, new { usuarioId }, cancellationToken: ct));
        return permisos.AsList();
    }

    public async Task RegistrarAccesoAsync(int usuarioId, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        await cn.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.Usuario SET UltimoAcceso = SYSDATETIME() WHERE Id = @usuarioId;",
            new { usuarioId }, cancellationToken: ct));
    }
}
