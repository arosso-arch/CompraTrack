using CompraTrack.Api.Features.Usuarios;
using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Tests;

public class ReglasUsuarioTests
{
    // ---------- Contraseñas ----------

    [Theory]
    [InlineData("Demo1234!")]
    [InlineData("abcdefg1")]
    [InlineData("12345678a")]
    public void Clave_valida(string clave) => ReglasUsuario.ValidarClave(clave);

    [Theory]
    [InlineData("abc123")]        // corta
    [InlineData("abcdefgh")]      // sin números
    [InlineData("12345678")]      // sin letras
    public void Clave_invalida(string clave) =>
        Assert.Throws<ReglaNegocioException>(() => ReglasUsuario.ValidarClave(clave));

    // ---------- Bajas ----------

    [Fact]
    public void Nadie_puede_darse_de_baja_a_si_mismo() =>
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasUsuario.AsegurarPuedeDesactivar(esUnoMismo: true, esAdministrador: false, administradoresActivos: 3));

    [Fact]
    public void No_se_puede_dar_de_baja_al_unico_administrador() =>
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasUsuario.AsegurarPuedeDesactivar(esUnoMismo: false, esAdministrador: true, administradoresActivos: 1));

    [Theory]
    [InlineData(false, 1)]   // un usuario común, aunque haya un solo administrador
    [InlineData(true, 2)]    // un administrador, si queda otro activo
    public void Baja_permitida(bool esAdministrador, int administradoresActivos) =>
        ReglasUsuario.AsegurarPuedeDesactivar(esUnoMismo: false, esAdministrador, administradoresActivos);

    // ---------- Cambios de rol ----------

    [Fact]
    public void Nadie_puede_quitarse_su_propio_rol_de_administrador() =>
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasUsuario.AsegurarPuedeCambiarRol(esUnoMismo: true, eraAdministrador: true, seraAdministrador: false, estaActivo: true, administradoresActivos: 3));

    [Fact]
    public void No_se_puede_quitar_el_rol_al_unico_administrador_activo() =>
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasUsuario.AsegurarPuedeCambiarRol(esUnoMismo: false, eraAdministrador: true, seraAdministrador: false, estaActivo: true, administradoresActivos: 1));

    [Theory]
    [InlineData(false, false, true, 1)]   // común → común
    [InlineData(false, true, true, 1)]    // común → administrador
    [InlineData(true, true, true, 1)]     // administrador → administrador (otro rol admin)
    [InlineData(true, false, true, 2)]    // administrador → común, quedando otro administrador
    [InlineData(true, false, false, 1)]   // administrador dado de baja → común: no cuenta como activo
    public void Cambio_de_rol_permitido(bool eraAdministrador, bool seraAdministrador, bool estaActivo, int administradoresActivos) =>
        ReglasUsuario.AsegurarPuedeCambiarRol(esUnoMismo: false, eraAdministrador, seraAdministrador, estaActivo, administradoresActivos);
}
