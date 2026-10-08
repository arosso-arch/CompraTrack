using System.ComponentModel.DataAnnotations;
using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CompraTrack.Api.Features.Auth;

public sealed record LoginRequest(
    [Required, StringLength(50)] string Usuario,
    [Required, StringLength(100)] string Clave);

public sealed record UsuarioSesion(
    int Id, string NombreUsuario, string NombreCompleto, string Email, string Rol, IReadOnlyList<string> Permisos);

public sealed record LoginResponse(string Token, DateTimeOffset Expira, UsuarioSesion Usuario);

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthRepository repo, TokenService tokens) : ControllerBase
{
    // Hash de una clave cualquiera: se verifica contra él cuando el usuario no existe,
    // para que la respuesta tarde lo mismo y no revele qué usuarios existen.
    private static readonly string HashFicticio = BCrypt.Net.BCrypt.HashPassword("usuario-inexistente", 11);

    /// <summary>Inicia sesión y devuelve un token JWT con los permisos del usuario.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var usuario = await repo.ObtenerPorNombreUsuarioAsync(request.Usuario.Trim(), ct);
        var claveValida = BCrypt.Net.BCrypt.Verify(request.Clave, usuario?.ClaveHash ?? HashFicticio);

        if (usuario is null || !claveValida || !usuario.Activo)
            return Problem(statusCode: StatusCodes.Status401Unauthorized,
                           title: "Credenciales inválidas",
                           detail: "Usuario o contraseña incorrectos.");

        var permisos = await repo.ObtenerPermisosEfectivosAsync(usuario.Id, ct);
        var token = tokens.Generar(usuario.Id, usuario.NombreUsuario, usuario.Rol, permisos);
        await repo.RegistrarAccesoAsync(usuario.Id, ct);

        return new LoginResponse(token.Token, token.Expira, ASesion(usuario, permisos));
    }

    /// <summary>Datos del usuario autenticado (para refrescar la sesión en el frontend).</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioSesion>> Me(CancellationToken ct)
    {
        var usuario = await repo.ObtenerPorIdAsync(User.ObtenerUsuarioId(), ct);
        if (usuario is null || !usuario.Activo)
            return Unauthorized();

        var permisos = await repo.ObtenerPermisosEfectivosAsync(usuario.Id, ct);
        return ASesion(usuario, permisos);
    }

    private static UsuarioSesion ASesion(UsuarioCredenciales u, IReadOnlyList<string> permisos) =>
        new(u.Id, u.NombreUsuario, u.NombreCompleto, u.Email, u.Rol, permisos);
}
