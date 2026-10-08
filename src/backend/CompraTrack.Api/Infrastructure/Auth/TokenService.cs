using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CompraTrack.Api.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string Seccion = "Jwt";

    public string Emisor { get; init; } = "CompraTrack";
    public string Audiencia { get; init; } = "CompraTrack";
    /// <summary>Clave HMAC de al menos 32 caracteres. En producción se carga por variable de entorno.</summary>
    public string Clave { get; init; } = "";
    public int DuracionHoras { get; init; } = 8;

    public SymmetricSecurityKey ObtenerClaveFirma() => new(Encoding.UTF8.GetBytes(Clave));
}

public sealed record TokenGenerado(string Token, DateTimeOffset Expira);

public sealed class TokenService(IOptions<JwtOptions> opciones, TimeProvider reloj)
{
    private readonly JwtOptions _jwt = opciones.Value;

    public TokenGenerado Generar(int usuarioId, string nombreUsuario, string rol, IEnumerable<string> permisos)
    {
        var expira = reloj.GetUtcNow().AddHours(_jwt.DuracionHoras);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuarioId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, nombreUsuario),
            new(ClaimTypes.Role, rol),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(permisos.Select(p => new Claim(Permisos.ClaimType, p)));

        var token = new JwtSecurityToken(
            issuer: _jwt.Emisor,
            audience: _jwt.Audiencia,
            claims: claims,
            notBefore: reloj.GetUtcNow().UtcDateTime,
            expires: expira.UtcDateTime,
            signingCredentials: new SigningCredentials(_jwt.ObtenerClaveFirma(), SecurityAlgorithms.HmacSha256));

        return new TokenGenerado(new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}

public static class ClaimsPrincipalExtensions
{
    public static int ObtenerUsuarioId(this ClaimsPrincipal usuario) =>
        int.Parse(usuario.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? throw new InvalidOperationException("El token no tiene el claim 'sub'."));
}
