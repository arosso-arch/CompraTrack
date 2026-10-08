using CompraTrack.Api.Infrastructure.Auth;
using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Features.Usuarios;

/// <summary>Aplica las reglas de ReglasUsuario antes de delegar en el repositorio.</summary>
public sealed class UsuarioService(UsuarioRepository repo, VerificadorUsuarioActivo verificador)
{
    private const int CostoBcrypt = 11;

    private const string CambioConcurrente =
        "Otro administrador modificó los usuarios mientras se procesaba la operación y el sistema se quedaría sin administradores. Actualizá y volvé a intentar.";

    public static string Hashear(string clave) => BCrypt.Net.BCrypt.HashPassword(clave, CostoBcrypt);

    public async Task<int> CrearAsync(CrearUsuarioRequest request, CancellationToken ct)
    {
        ReglasUsuario.ValidarClave(request.Clave);
        return await repo.CrearAsync(request, Hashear(request.Clave), ct);
    }

    public async Task ActualizarAsync(int id, ActualizarUsuarioRequest request, int actorId, CancellationToken ct)
    {
        var usuario = await repo.ObtenerContextoAsync(id, ct);
        var nuevoEsAdmin = await repo.RolEsAdministradorAsync(request.RolId, ct)
                           ?? throw new ReglaNegocioException("El rol indicado no existe.");

        ReglasUsuario.AsegurarPuedeCambiarRol(id == actorId, usuario.EsAdministrador, nuevoEsAdmin, usuario.Activo, usuario.AdministradoresActivos);

        if (!await repo.ActualizarAsync(id, request, ct))
            throw new ReglaNegocioException(CambioConcurrente);
    }

    public async Task CambiarEstadoAsync(int id, bool activo, int actorId, CancellationToken ct)
    {
        var usuario = await repo.ObtenerContextoAsync(id, ct);
        if (!activo)
            ReglasUsuario.AsegurarPuedeDesactivar(id == actorId, usuario.EsAdministrador, usuario.AdministradoresActivos);

        if (!await repo.CambiarEstadoAsync(id, activo, ct))
            throw new ReglaNegocioException(CambioConcurrente);

        verificador.Invalidar(id);   // la baja corta la sesión abierta en el próximo pedido
    }

    public async Task RestablecerClaveAsync(int id, string nuevaClave, CancellationToken ct)
    {
        ReglasUsuario.ValidarClave(nuevaClave);
        await repo.CambiarClaveAsync(id, Hashear(nuevaClave), ct);
    }

    public async Task GuardarPermisosExtraAsync(int id, IReadOnlyList<int> permisoIds, int actorId, CancellationToken ct)
    {
        var usuario = await repo.ObtenerContextoAsync(id, ct);
        if (usuario.EsAdministrador && permisoIds.Count > 0)
            throw new ReglaNegocioException("Un administrador ya tiene todos los permisos: no hace falta otorgarle permisos extra.");

        await repo.GuardarPermisosExtraAsync(id, permisoIds, actorId, ct);
    }
}
