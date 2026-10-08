using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CompraTrack.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace CompraTrack.Api.Features.Demo;

public sealed class DemoOptions
{
    public const string Seccion = "Demo";

    /// <summary>
    /// Clave para reiniciar los datos del demo. Si está vacía, el endpoint no existe (404).
    /// Se configura solo en el servidor del demo (variable de entorno Demo__ClaveReinicio).
    /// </summary>
    public string ClaveReinicio { get; init; } = "";
}

/// <summary>
/// Reinicia el demo público: recrea las tablas y vuelve a cargar los datos ficticios,
/// con fechas relativas al día de hoy. Lo invoca un workflow programado de GitHub Actions cada noche.
/// </summary>
[ApiController]
[Route("api/demo")]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed partial class DemoController(IDbConnectionFactory db, IOptions<DemoOptions> opciones, ILogger<DemoController> logger) : ControllerBase
{
    private static readonly string[] Scripts = ["01_esquema.sql", "02_datos_demo.sql"];

    [HttpPost("reiniciar")]
    [AllowAnonymous]
    public async Task<IActionResult> Reiniciar([FromHeader(Name = "X-Clave-Reinicio")] string? clave, CancellationToken ct)
    {
        var esperada = opciones.Value.ClaveReinicio;
        if (string.IsNullOrEmpty(esperada))
            return NotFound();
        // Comparación en tiempo constante, para no filtrar información sobre la clave.
        if (clave is null || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(clave), Encoding.UTF8.GetBytes(esperada)))
            return Unauthorized();

        await using var cn = await db.AbrirAsync(ct);
        foreach (var script in Scripts)
        {
            var ruta = Path.Combine(AppContext.BaseDirectory, "Scripts", script);
            foreach (var lote in SeparadorGo().Split(await System.IO.File.ReadAllTextAsync(ruta, ct)).Where(l => !string.IsNullOrWhiteSpace(l)))
            {
                await using var cmd = new SqlCommand(lote, cn) { CommandTimeout = 300 };
                await cmd.ExecuteNonQueryAsync(ct);
            }
        }

        logger.LogInformation("Datos del demo reiniciados");
        return Ok(new { estado = "Datos del demo reiniciados" });
    }

    /// <summary>Separa los lotes por líneas "GO", como hace sqlcmd.</summary>
    [GeneratedRegex(@"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex SeparadorGo();
}
