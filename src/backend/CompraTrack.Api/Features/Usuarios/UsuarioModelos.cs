using System.ComponentModel.DataAnnotations;

namespace CompraTrack.Api.Features.Usuarios;

public sealed class UsuarioResumenDto
{
    public int Id { get; init; }
    public string NombreUsuario { get; init; } = "";
    public string NombreCompleto { get; init; } = "";
    public string Email { get; init; } = "";
    public int RolId { get; init; }
    public string Rol { get; init; } = "";
    public bool EsAdministrador { get; init; }
    public bool Activo { get; init; }
    public DateTime FechaAlta { get; init; }
    public DateTime? UltimoAcceso { get; init; }
    public int PermisosExtra { get; init; }
}

public sealed class UsuarioDetalleDto
{
    public int Id { get; init; }
    public string NombreUsuario { get; init; } = "";
    public string NombreCompleto { get; init; } = "";
    public string Email { get; init; } = "";
    public int RolId { get; init; }
    public string Rol { get; init; } = "";
    public bool EsAdministrador { get; init; }
    public bool Activo { get; init; }
    public DateTime FechaAlta { get; init; }
    public DateTime? UltimoAcceso { get; init; }
    /// <summary>Permisos que trae el rol (todos, si el rol es administrador).</summary>
    public IReadOnlyList<int> PermisosRol { get; set; } = [];
    /// <summary>Permisos otorgados además de los del rol.</summary>
    public IReadOnlyList<int> PermisosExtra { get; set; } = [];
}

public sealed class RolDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
    public string? Descripcion { get; init; }
    public bool EsAdministrador { get; init; }
    public int Usuarios { get; init; }
    public IReadOnlyList<int> Permisos { get; set; } = [];
}

public sealed class PermisoDto
{
    public int Id { get; init; }
    public string Codigo { get; init; } = "";
    public string Modulo { get; init; } = "";
    public string Descripcion { get; init; } = "";
}

/// <summary>Datos mínimos del usuario afectado y del sistema, para validar reglas.</summary>
public sealed class ContextoUsuarioDto
{
    public int Id { get; init; }
    public bool Activo { get; init; }
    public bool EsAdministrador { get; init; }
    public int AdministradoresActivos { get; init; }
}

public sealed class FiltroUsuarios
{
    public string? Buscar { get; set; }
    public int? RolId { get; set; }
    public bool? Activo { get; set; }
}

public sealed record CrearUsuarioRequest(
    [Required, StringLength(50, MinimumLength = 3), RegularExpression("^[a-zA-Z0-9._-]+$", ErrorMessage = "El usuario solo admite letras, números, punto, guion y guion bajo.")] string NombreUsuario,
    [Required, StringLength(100, MinimumLength = 3)] string NombreCompleto,
    [Required, EmailAddress, StringLength(150)] string Email,
    [Range(1, int.MaxValue)] int RolId,
    [Required, StringLength(100)] string Clave);

public sealed record ActualizarUsuarioRequest(
    [Required, StringLength(100, MinimumLength = 3)] string NombreCompleto,
    [Required, EmailAddress, StringLength(150)] string Email,
    [Range(1, int.MaxValue)] int RolId);

public sealed record CambiarEstadoUsuarioRequest(bool Activo);

public sealed record RestablecerClaveRequest([Required, StringLength(100)] string NuevaClave);

public sealed record PermisosExtraRequest([Required] IReadOnlyList<int> PermisoIds);
