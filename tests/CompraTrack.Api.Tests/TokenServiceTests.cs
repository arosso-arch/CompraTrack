using System.IdentityModel.Tokens.Jwt;
using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace CompraTrack.Api.Tests;

public class TokenServiceTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 8, 12, 0, 0, TimeSpan.Zero);

    private static TokenService CrearServicio() => new(
        Options.Create(new JwtOptions { Clave = new string('k', 40), DuracionHoras = 8 }),
        new FakeTimeProvider(Ahora));

    [Fact]
    public void El_token_incluye_usuario_rol_y_cada_permiso()
    {
        var generado = CrearServicio().Generar(7, "compras", "Comprador", ["ordenes.ver", "ordenes.crear"]);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(generado.Token);

        Assert.Equal("7", jwt.Subject);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.UniqueName && c.Value == "compras");
        Assert.Equal(["ordenes.ver", "ordenes.crear"],
                     jwt.Claims.Where(c => c.Type == Permisos.ClaimType).Select(c => c.Value));
    }

    [Fact]
    public void El_token_vence_segun_la_duracion_configurada()
    {
        var generado = CrearServicio().Generar(1, "admin", "Administrador", []);

        Assert.Equal(Ahora.AddHours(8), generado.Expira);
    }
}
