using System.Text;
using CompraTrack.Api.Features.Ordenes;
using CompraTrack.Api.Infrastructure;
using CompraTrack.Api.Infrastructure.Errors;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace CompraTrack.Api.Tests;

public class OrdenPdfTests
{
    static OrdenPdfTests() => QuestPDF.Settings.License = LicenseType.Community;

    private static OrdenDetalleDto Orden(string estado = EstadoOrden.Abierta, int cantidadItems = 2, string? observaciones = null) => new()
    {
        Id = 1,
        Numero = 1061,
        Fecha = new DateOnly(2026, 10, 8),
        Proveedor = "Proveedor de prueba S.A.",
        ProveedorEmail = "ventas@proveedor.example",
        Concepto = "Prueba",
        Estado = estado,
        CreadaPor = "Usuario Test",
        Observaciones = observaciones,
        Items = Enumerable.Range(1, cantidadItems).Select(i => new OrdenItemDto
        {
            Id = i, Tipo = "Kraft", Gramos = 80, Formato = "Bobina 88 cm", CantidadKg = 1000m * i,
        }).ToList(),
    };

    private static byte[] Generar(OrdenDetalleDto orden) => new OrdenPdf(orden, new EmpresaOptions()).GeneratePdf();

    [Theory]
    [InlineData(EstadoOrden.Abierta)]
    [InlineData(EstadoOrden.Cerrada)]
    [InlineData(EstadoOrden.Anulada)]
    public void Genera_un_pdf_valido_en_cualquier_estado(string estado)
    {
        var pdf = Generar(Orden(estado, observaciones: "Entregar por la mañana"));

        Assert.True(pdf.Length > 1000);
        Assert.Equal("%PDF-", Encoding.ASCII.GetString(pdf, 0, 5));
    }

    [Fact]
    public void Una_orden_con_muchos_items_ocupa_varias_paginas()
    {
        var corta = Generar(Orden(cantidadItems: 2));
        var larga = Generar(Orden(cantidadItems: 80));

        Assert.True(larga.Length > corta.Length);
    }

    [Fact]
    public void El_nombre_del_archivo_incluye_el_numero_de_orden()
    {
        Assert.Equal("OC-1061.pdf", OrdenPdf.NombreArchivo(1061));
    }

    [Theory]
    [InlineData(EstadoOrden.Abierta, true)]
    [InlineData(EstadoOrden.Cerrada, true)]    // se puede reenviar una copia
    [InlineData(EstadoOrden.Anulada, false)]
    public void Solo_las_ordenes_anuladas_no_se_envian(string estado, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeEnviar(estado);
        if (permitido) accion();
        else Assert.Throws<ReglaNegocioException>(accion);
    }
}
