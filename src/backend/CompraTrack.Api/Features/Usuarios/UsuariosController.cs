using CompraTrack.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Features.Usuarios;

/// <summary>Administración de usuarios, roles y permisos. Todo requiere el permiso usuarios.gestionar.</summary>
[ApiController]
[Route("api")]
[RequierePermiso(Permisos.UsuariosGestionar)]
public sealed class UsuariosController(UsuarioRepository repo, UsuarioService service) : ControllerBase
{
    [HttpGet("usuarios")]
    public Task<IReadOnlyList<UsuarioResumenDto>> Listar([FromQuery] FiltroUsuarios filtro, CancellationToken ct) =>
        repo.ListarAsync(filtro, ct);

    /// <summary>Usuario con los permisos de su rol y los permisos extra que se le otorgaron.</summary>
    [HttpGet("usuarios/{id:int}")]
    public Task<UsuarioDetalleDto> Obtener(int id, CancellationToken ct) => repo.ObtenerAsync(id, ct);

    [HttpPost("usuarios")]
    public async Task<ActionResult<UsuarioDetalleDto>> Crear(CrearUsuarioRequest request, CancellationToken ct)
    {
        var id = await service.CrearAsync(request, ct);
        return CreatedAtAction(nameof(Obtener), new { id }, await repo.ObtenerAsync(id, ct));
    }

    /// <summary>Datos y rol. No permite dejar al sistema sin administradores activos.</summary>
    [HttpPut("usuarios/{id:int}")]
    public async Task<UsuarioDetalleDto> Actualizar(int id, ActualizarUsuarioRequest request, CancellationToken ct)
    {
        await service.ActualizarAsync(id, request, User.ObtenerUsuarioId(), ct);
        return await repo.ObtenerAsync(id, ct);
    }

    /// <summary>Alta o baja. Una baja cierra la sesión del usuario en su próximo pedido.</summary>
    [HttpPatch("usuarios/{id:int}/estado")]
    public async Task<UsuarioDetalleDto> CambiarEstado(int id, CambiarEstadoUsuarioRequest request, CancellationToken ct)
    {
        await service.CambiarEstadoAsync(id, request.Activo, User.ObtenerUsuarioId(), ct);
        return await repo.ObtenerAsync(id, ct);
    }

    /// <summary>Asigna una contraseña nueva (por ejemplo, si el usuario la olvidó).</summary>
    [HttpPost("usuarios/{id:int}/clave")]
    public async Task<IActionResult> RestablecerClave(int id, RestablecerClaveRequest request, CancellationToken ct)
    {
        await service.RestablecerClaveAsync(id, request.NuevaClave, ct);
        return NoContent();
    }

    /// <summary>Reemplaza los permisos extra del usuario. Rigen desde su próximo inicio de sesión.</summary>
    [HttpPut("usuarios/{id:int}/permisos")]
    public async Task<UsuarioDetalleDto> GuardarPermisos(int id, PermisosExtraRequest request, CancellationToken ct)
    {
        await service.GuardarPermisosExtraAsync(id, request.PermisoIds, User.ObtenerUsuarioId(), ct);
        return await repo.ObtenerAsync(id, ct);
    }

    [HttpGet("roles")]
    public Task<IReadOnlyList<RolDto>> Roles(CancellationToken ct) => repo.ListarRolesAsync(ct);

    [HttpGet("permisos")]
    public Task<IReadOnlyList<PermisoDto>> PermisosDisponibles(CancellationToken ct) => repo.ListarPermisosAsync(ct);
}
