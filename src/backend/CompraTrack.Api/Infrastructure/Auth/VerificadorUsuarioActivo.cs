using CompraTrack.Api.Features.Usuarios;
using Microsoft.Extensions.Caching.Memory;

namespace CompraTrack.Api.Infrastructure.Auth;

/// <summary>
/// Verifica en cada pedido que el usuario del token siga activo, así una baja tiene efecto
/// inmediato y no recién cuando vence el token. El resultado se cachea 30 segundos para no
/// consultar la base en cada pedido; al dar de baja a alguien, su entrada se borra de la caché.
/// </summary>
public sealed class VerificadorUsuarioActivo(IMemoryCache cache, IServiceScopeFactory scopes)
{
    private static string Clave(int usuarioId) => $"usuario-activo:{usuarioId}";

    public async Task<bool> EstaActivoAsync(int usuarioId, CancellationToken ct)
    {
        return await cache.GetOrCreateAsync(Clave(usuarioId), async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
            await using var scope = scopes.CreateAsyncScope();
            return await scope.ServiceProvider.GetRequiredService<UsuarioRepository>().EstaActivoAsync(usuarioId, ct);
        });
    }

    public void Invalidar(int usuarioId) => cache.Remove(Clave(usuarioId));
}
