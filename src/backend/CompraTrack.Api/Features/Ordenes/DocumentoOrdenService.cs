using System.Net;
using CompraTrack.Api.Infrastructure;
using CompraTrack.Api.Infrastructure.Correo;
using Microsoft.Extensions.Options;
using MimeKit;
using QuestPDF.Fluent;

namespace CompraTrack.Api.Features.Ordenes;

public sealed record PdfGenerado(byte[] Contenido, string NombreArchivo);

/// <param name="EnvioReal">false en modo Carpeta: el mail se guardó como archivo pero no salió a internet.</param>
public sealed record ResultadoEnvio(bool EnvioReal, string Mensaje, OrdenDetalleDto Orden);

/// <summary>Genera el PDF de la orden y la envía por mail al proveedor.</summary>
public sealed class DocumentoOrdenService(
    OrdenRepository repo,
    IEnvioCorreo correo,
    IOptions<CorreoOptions> opcionesCorreo,
    IOptions<EmpresaOptions> opcionesEmpresa)
{
    private EmpresaOptions Empresa => opcionesEmpresa.Value;

    public async Task<PdfGenerado> GenerarPdfAsync(int ordenId, CancellationToken ct)
    {
        var orden = await repo.ObtenerDetalleAsync(ordenId, ct);
        return new PdfGenerado(new OrdenPdf(orden, Empresa).GeneratePdf(), OrdenPdf.NombreArchivo(orden.Numero));
    }

    public async Task<ResultadoEnvio> EnviarAsync(int ordenId, EnviarOrdenRequest request, int usuarioId, CancellationToken ct)
    {
        var orden = await repo.ObtenerDetalleAsync(ordenId, ct);
        ReglasOrden.AsegurarPuedeEnviar(orden.Estado);

        var asunto = string.IsNullOrWhiteSpace(request.Asunto) ? AsuntoPorDefecto(orden) : request.Asunto.Trim();
        var cuerpo = string.IsNullOrWhiteSpace(request.Mensaje) ? MensajePorDefecto(orden) : request.Mensaje.Trim();
        var pdf = new OrdenPdf(orden, Empresa).GeneratePdf();

        var mensaje = ArmarMensaje(request.Destinatario.Trim(), asunto, cuerpo, pdf, OrdenPdf.NombreArchivo(orden.Numero));
        await correo.EnviarAsync(mensaje, ct);
        await repo.RegistrarEnvioAsync(ordenId, request.Destinatario.Trim(), asunto, usuarioId, ct);

        var envioReal = opcionesCorreo.Value.EsSmtp;
        return new ResultadoEnvio(
            envioReal,
            envioReal
                ? $"Orden enviada a {request.Destinatario}."
                : $"Modo demostración: el mail para {request.Destinatario} se generó con el PDF adjunto, pero no se envió.",
            await repo.ObtenerDetalleAsync(ordenId, ct));
    }

    public string AsuntoPorDefecto(OrdenDetalleDto orden) => $"Orden de compra N° {orden.Numero} - {Empresa.Nombre}";

    public string MensajePorDefecto(OrdenDetalleDto orden) =>
        $"""
        Estimados {orden.Proveedor}:

        Adjuntamos la orden de compra N° {orden.Numero} para su gestión.
        Les pedimos indicar el número de orden en el remito y en la factura.

        Quedamos atentos ante cualquier consulta.

        Saludos cordiales,
        {orden.CreadaPor}
        {Empresa.Nombre}
        """;

    private MimeMessage ArmarMensaje(string destinatario, string asunto, string cuerpo, byte[] pdf, string nombreArchivo)
    {
        var config = opcionesCorreo.Value;
        var mensaje = new MimeMessage { Subject = asunto };
        mensaje.From.Add(new MailboxAddress(config.NombreRemitente, config.Remitente));
        mensaje.To.Add(MailboxAddress.Parse(destinatario));
        if (!string.IsNullOrWhiteSpace(Empresa.Email))
            mensaje.ReplyTo.Add(new MailboxAddress(Empresa.Nombre, Empresa.Email));

        var html = string.Join("", cuerpo.Split('\n').Select(l => $"<p style=\"margin:0 0 4px\">{WebUtility.HtmlEncode(l.TrimEnd('\r'))}&nbsp;</p>"));
        var partes = new BodyBuilder
        {
            TextBody = cuerpo,
            HtmlBody = $"<div style=\"font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b\">{html}</div>",
        };
        partes.Attachments.Add(nombreArchivo, pdf, new ContentType("application", "pdf"));
        mensaje.Body = partes.ToMessageBody();
        return mensaje;
    }
}
