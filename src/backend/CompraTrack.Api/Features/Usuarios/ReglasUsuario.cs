using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Features.Usuarios;

/// <summary>
/// Reglas de la administración de usuarios. Funciones puras (sin base de datos) para poder testearlas.
/// La principal: el sistema nunca puede quedarse sin un administrador activo.
/// </summary>
public static class ReglasUsuario
{
    public const int LargoMinimoClave = 8;

    public static void ValidarClave(string clave)
    {
        if (clave.Length < LargoMinimoClave)
            throw new ReglaNegocioException($"La contraseña debe tener al menos {LargoMinimoClave} caracteres.");
        if (!clave.Any(char.IsLetter) || !clave.Any(char.IsDigit))
            throw new ReglaNegocioException("La contraseña debe combinar letras y números.");
    }

    /// <param name="esUnoMismo">El usuario que hace la operación es el mismo que el afectado.</param>
    /// <param name="esAdministrador">El usuario afectado tiene hoy un rol administrador.</param>
    /// <param name="administradoresActivos">Cantidad de administradores activos, incluido el afectado.</param>
    public static void AsegurarPuedeDesactivar(bool esUnoMismo, bool esAdministrador, int administradoresActivos)
    {
        if (esUnoMismo)
            throw new ReglaNegocioException("No podés darte de baja a vos mismo.");
        if (esAdministrador && administradoresActivos <= 1)
            throw new ReglaNegocioException("Es el único administrador activo: el sistema no puede quedarse sin administradores.");
    }

    public static void AsegurarPuedeCambiarRol(bool esUnoMismo, bool eraAdministrador, bool seraAdministrador, bool estaActivo, int administradoresActivos)
    {
        if (!eraAdministrador || seraAdministrador)
            return;   // el cambio no le quita el rol de administrador a nadie

        if (esUnoMismo)
            throw new ReglaNegocioException("No podés quitarte a vos mismo el rol de administrador.");
        if (estaActivo && administradoresActivos <= 1)
            throw new ReglaNegocioException("Es el único administrador activo: asigná el rol a otro usuario antes de cambiar este.");
    }
}
