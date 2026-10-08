using System.Globalization;
using CompraTrack.Api.Infrastructure;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CompraTrack.Api.Features.Ordenes;

/// <summary>Documento PDF de una orden de compra, para descargar o adjuntar al mail del proveedor.</summary>
public sealed class OrdenPdf(OrdenDetalleDto orden, EmpresaOptions empresa) : IDocument
{
    private static readonly CultureInfo Es = CultureInfo.GetCultureInfo("es-AR");
    private const string ColorMarca = "#0f766e";
    private const string ColorTexto = "#1e293b";
    private const string ColorSecundario = "#64748b";
    private const string ColorLinea = "#e2e8f0";

    public static string NombreArchivo(int numero) => $"OC-{numero}.pdf";

    public DocumentMetadata GetMetadata() => new()
    {
        Title = $"Orden de compra N° {orden.Numero}",
        Author = empresa.Nombre,
        Creator = "CompraTrack",
    };

    public void Compose(IDocumentContainer contenedor)
    {
        contenedor.Page(pagina =>
        {
            pagina.Size(PageSizes.A4);
            pagina.Margin(40);
            pagina.DefaultTextStyle(t => t.FontSize(9.5f).FontColor(ColorTexto));

            pagina.Header().Element(Encabezado);
            pagina.Content().PaddingVertical(16).Element(Contenido);
            pagina.Footer().Element(Pie);

            if (orden.Estado == EstadoOrden.Anulada)
                // Marca de agua detrás del contenido, para que todo siga legible.
                pagina.Background().AlignCenter().AlignMiddle().Rotate(-30)
                      .Text("ANULADA").FontSize(90).Bold().FontColor(Colors.Red.Lighten4);
        });
    }

    private void Encabezado(IContainer c)
    {
        c.Row(fila =>
        {
            fila.RelativeItem().Column(col =>
            {
                col.Item().Text(empresa.Nombre).FontSize(16).Bold().FontColor(ColorMarca);
                foreach (var linea in new[] { Prefijar("CUIT ", empresa.Cuit), empresa.Direccion, Unir(empresa.Telefono, empresa.Email) })
                    if (!string.IsNullOrWhiteSpace(linea))
                        col.Item().Text(linea).FontColor(ColorSecundario);
            });

            fila.ConstantItem(190).Border(1).BorderColor(ColorMarca).Padding(10).Column(col =>
            {
                col.Item().AlignCenter().Text("ORDEN DE COMPRA").FontSize(10).Bold().FontColor(ColorMarca).LetterSpacing(0.05f);
                col.Item().AlignCenter().Text($"N° {orden.Numero}").FontSize(20).Bold();
                col.Item().PaddingTop(4).AlignCenter().Text($"Fecha: {orden.Fecha.ToString("dd/MM/yyyy", Es)}");
                if (orden.Estado != EstadoOrden.Abierta)
                    col.Item().AlignCenter().Text(orden.Estado).FontSize(8).Bold().FontColor(ColorSecundario);
            });
        });
    }

    private void Contenido(IContainer c)
    {
        c.Column(col =>
        {
            col.Spacing(14);

            col.Item().Row(fila =>
            {
                fila.Spacing(12);
                fila.RelativeItem().Element(Recuadro).Column(p =>
                {
                    p.Item().Element(TituloSeccion).Text("PROVEEDOR");
                    p.Item().Text(orden.Proveedor).Bold().FontSize(11);
                    foreach (var linea in new[] { Prefijar("Atención: ", orden.ProveedorContacto), orden.ProveedorEmail, orden.ProveedorTelefono })
                        if (!string.IsNullOrWhiteSpace(linea)) p.Item().Text(linea);
                });
                fila.RelativeItem().Element(Recuadro).Column(p =>
                {
                    p.Item().Element(TituloSeccion).Text("CONDICIONES");
                    Dato(p, "Concepto", orden.Concepto);
                    Dato(p, "Forma de pago", orden.FormaPago ?? "A convenir");
                    if (!string.IsNullOrWhiteSpace(empresa.LugarEntrega)) Dato(p, "Lugar de entrega", empresa.LugarEntrega);
                });
            });

            col.Item().Element(TablaItems);

            if (!string.IsNullOrWhiteSpace(orden.Observaciones))
                col.Item().Element(Recuadro).Column(p =>
                {
                    p.Item().Element(TituloSeccion).Text("OBSERVACIONES");
                    p.Item().Text(orden.Observaciones);
                });

            col.Item().Text("Por favor, indicar el número de orden en el remito y en la factura.").Italic().FontColor(ColorSecundario);

            col.Item().PaddingTop(30).AlignRight().Width(200).Column(firma =>
            {
                firma.Item().BorderTop(1).BorderColor(ColorSecundario).PaddingTop(4).AlignCenter().Text(orden.CreadaPor);
                firma.Item().AlignCenter().Text("Compras").FontSize(8).FontColor(ColorSecundario);
            });
        });
    }

    private void TablaItems(IContainer c)
    {
        var items = orden.Items;
        c.Table(tabla =>
        {
            tabla.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(28);
                cols.RelativeColumn(3);
                cols.RelativeColumn(2);
                cols.ConstantColumn(90);
            });

            tabla.Header(h =>
            {
                foreach (var (texto, derecha) in new[] { ("#", false), ("Producto", false), ("Detalle", false), ("Cantidad", true) })
                {
                    var celda = h.Cell().Background(ColorMarca).PaddingVertical(6).PaddingHorizontal(6);
                    (derecha ? celda.AlignRight() : celda).Text(texto).FontColor(Colors.White).Bold();
                }
            });

            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                Color fondo = i % 2 == 0 ? Colors.Transparent : (Color)"#f8fafc";   // filas alternadas; las pares dejan ver la marca de agua
                IContainer Celda() => tabla.Cell().Background(fondo).BorderBottom(1).BorderColor(ColorLinea).PaddingVertical(6).PaddingHorizontal(6);

                Celda().Text((i + 1).ToString()).FontColor(ColorSecundario);
                Celda().Text(t =>
                {
                    t.Span($"{item.Tipo} {item.Gramos} g/m²").SemiBold();
                    t.Span($"  ·  {item.Formato}").FontColor(ColorSecundario);
                });
                Celda().Text(item.Detalle ?? "—").FontColor(item.Detalle is null ? ColorSecundario : ColorTexto);
                Celda().AlignRight().Text(Kg(item.CantidadKg));
            }

            tabla.Footer(f =>
            {
                f.Cell().ColumnSpan(3).PaddingVertical(6).PaddingHorizontal(6).AlignRight().Text("Total").Bold();
                f.Cell().PaddingVertical(6).PaddingHorizontal(6).AlignRight().Text(Kg(orden.TotalPedidoKg)).Bold();
            });
        });
    }

    private void Pie(IContainer c)
    {
        c.BorderTop(1).BorderColor(ColorLinea).PaddingTop(6).Row(fila =>
        {
            fila.RelativeItem().Text($"{empresa.Nombre} · Orden de compra N° {orden.Numero}").FontSize(8).FontColor(ColorSecundario);
            fila.RelativeItem().AlignRight().Text(t =>
            {
                t.DefaultTextStyle(s => s.FontSize(8).FontColor(ColorSecundario));
                t.Span("Página ");
                t.CurrentPageNumber();
                t.Span(" de ");
                t.TotalPages();
            });
        });
    }

    // ---------- Ayudantes ----------

    private static IContainer Recuadro(IContainer c) => c.Border(1).BorderColor(ColorLinea).Padding(10);
    private static IContainer TituloSeccion(IContainer c) => c.PaddingBottom(4).DefaultTextStyle(t => t.FontSize(8).Bold().FontColor(ColorSecundario));

    private static void Dato(ColumnDescriptor col, string etiqueta, string valor) =>
        col.Item().Text(t =>
        {
            t.Span($"{etiqueta}: ").FontColor(ColorSecundario);
            t.Span(valor);
        });

    private static string Kg(decimal valor) => $"{valor.ToString("#,##0.##", Es)} kg";
    private static string? Prefijar(string prefijo, string? valor) => string.IsNullOrWhiteSpace(valor) ? null : prefijo + valor;
    private static string Unir(params string?[] partes) => string.Join(" · ", partes.Where(p => !string.IsNullOrWhiteSpace(p)));
}
