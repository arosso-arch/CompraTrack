using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace CompraTrack.Api.Infrastructure.Correo;

public sealed class CorreoOptions
{
    public const string Seccion = "Correo";

    /// <summary>"Carpeta": guarda cada mail como .eml (desarrollo y demo). "Smtp": envía de verdad.</summary>
    public string Modo { get; init; } = "Carpeta";
    public string Remitente { get; init; } = "compras@compratrack.example";
    public string NombreRemitente { get; init; } = "Compras";
    /// <summary>Carpeta donde se guardan los .eml en modo Carpeta (relativa al directorio de la app).</summary>
    public string Carpeta { get; init; } = "correos-enviados";
    public SmtpOptions Smtp { get; init; } = new();

    public bool EsSmtp => Modo.Equals("Smtp", StringComparison.OrdinalIgnoreCase);
}

public sealed class SmtpOptions
{
    public string Servidor { get; init; } = "";
    public int Puerto { get; init; } = 587;
    public string Usuario { get; init; } = "";
    /// <summary>Nunca en el repositorio: se carga por variable de entorno o user-secrets.</summary>
    public string Clave { get; init; } = "";
}

public interface IEnvioCorreo
{
    Task EnviarAsync(MimeMessage mensaje, CancellationToken ct);
}

/// <summary>Envía el mail por SMTP con TLS (ej.: Gmail con contraseña de aplicación, Outlook, SendGrid).</summary>
public sealed class EnvioCorreoSmtp(IOptions<CorreoOptions> opciones) : IEnvioCorreo
{
    public async Task EnviarAsync(MimeMessage mensaje, CancellationToken ct)
    {
        var smtp = opciones.Value.Smtp;
        using var cliente = new SmtpClient();
        await cliente.ConnectAsync(smtp.Servidor, smtp.Puerto, SecureSocketOptions.StartTlsWhenAvailable, ct);
        if (!string.IsNullOrEmpty(smtp.Usuario))
            await cliente.AuthenticateAsync(smtp.Usuario, smtp.Clave, ct);
        await cliente.SendAsync(mensaje, ct);
        await cliente.DisconnectAsync(true, ct);
    }
}

/// <summary>
/// No envía nada: guarda el mail como archivo .eml (se abre con Outlook o Thunderbird).
/// Así el demo público no puede usarse para mandar correos a direcciones reales.
/// </summary>
public sealed class EnvioCorreoCarpeta(IOptions<CorreoOptions> opciones, IHostEnvironment entorno, ILogger<EnvioCorreoCarpeta> logger) : IEnvioCorreo
{
    public async Task EnviarAsync(MimeMessage mensaje, CancellationToken ct)
    {
        var carpeta = Path.Combine(entorno.ContentRootPath, opciones.Value.Carpeta);
        Directory.CreateDirectory(carpeta);

        var archivo = Path.Combine(carpeta, $"{DateTime.Now:yyyyMMdd-HHmmss}-{Guid.NewGuid().ToString("N")[..8]}.eml");
        await mensaje.WriteToAsync(archivo, ct);
        logger.LogInformation("Correo guardado en {Archivo} (modo Carpeta, no se envió)", archivo);

        DepurarAntiguos(carpeta);
    }

    /// <summary>Conserva solo los últimos mails, para que el demo público no llene el disco.</summary>
    private static void DepurarAntiguos(string carpeta, int conservar = 50)
    {
        foreach (var viejo in new DirectoryInfo(carpeta).GetFiles("*.eml").OrderByDescending(f => f.Name).Skip(conservar))
            viejo.Delete();
    }
}
