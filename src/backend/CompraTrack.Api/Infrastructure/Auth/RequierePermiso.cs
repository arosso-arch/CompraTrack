using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace CompraTrack.Api.Infrastructure.Auth;

/// <summary>
/// Restringe un endpoint a los usuarios que tengan el permiso indicado.
/// Uso: [RequierePermiso(Permisos.OrdenesCrear)]
/// </summary>
public sealed class RequierePermisoAttribute(string permiso)
    : AuthorizeAttribute(PoliticaPermisoProvider.Prefijo + permiso);

/// <summary>
/// Crea al vuelo una política por cada permiso ("permiso:ordenes.crear"),
/// así no hay que registrar una política por permiso en Program.cs.
/// </summary>
public sealed class PoliticaPermisoProvider(IOptions<AuthorizationOptions> opciones)
    : DefaultAuthorizationPolicyProvider(opciones)
{
    public const string Prefijo = "permiso:";

    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string nombre)
    {
        if (!nombre.StartsWith(Prefijo, StringComparison.Ordinal))
            return await base.GetPolicyAsync(nombre);

        return new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .RequireClaim(Permisos.ClaimType, nombre[Prefijo.Length..])
            .Build();
    }
}
