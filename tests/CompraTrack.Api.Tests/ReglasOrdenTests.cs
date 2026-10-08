using CompraTrack.Api.Features.Ordenes;
using CompraTrack.Api.Infrastructure.Errors;

namespace CompraTrack.Api.Tests;

public class ReglasOrdenTests
{
    private static readonly DateOnly Hoy = new(2026, 10, 8);

    // ---------- Fecha de la orden ----------

    [Fact]
    public void FechaOrden_hoy_o_pasada_es_valida()
    {
        ReglasOrden.ValidarFechaOrden(Hoy, Hoy);
        ReglasOrden.ValidarFechaOrden(Hoy.AddDays(-30), Hoy);
    }

    [Fact]
    public void FechaOrden_futura_se_rechaza()
    {
        Assert.Throws<ReglaNegocioException>(() => ReglasOrden.ValidarFechaOrden(Hoy.AddDays(1), Hoy));
    }

    // ---------- Edición y cambios de estado ----------

    [Fact]
    public void Solo_se_editan_ordenes_abiertas()
    {
        ReglasOrden.AsegurarEditable(EstadoOrden.Abierta);

        Assert.Throws<ReglaNegocioException>(() => ReglasOrden.AsegurarEditable(EstadoOrden.Cerrada));
        Assert.Throws<ReglaNegocioException>(() => ReglasOrden.AsegurarEditable(EstadoOrden.Anulada));
    }

    [Theory]
    [InlineData(EstadoOrden.Abierta, true)]
    [InlineData(EstadoOrden.Cerrada, false)]
    [InlineData(EstadoOrden.Anulada, false)]
    public void Cerrar_solo_desde_abierta(string estado, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeCerrar(estado);
        AssertPermitido(accion, permitido);
    }

    [Theory]
    [InlineData(EstadoOrden.Cerrada, true)]
    [InlineData(EstadoOrden.Abierta, false)]
    [InlineData(EstadoOrden.Anulada, false)]
    public void Reabrir_solo_desde_cerrada(string estado, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeReabrir(estado);
        AssertPermitido(accion, permitido);
    }

    [Theory]
    [InlineData(EstadoOrden.Abierta, false, true)]
    [InlineData(EstadoOrden.Abierta, true, false)]    // con mercadería recibida se cierra, no se anula
    [InlineData(EstadoOrden.Cerrada, false, false)]
    [InlineData(EstadoOrden.Anulada, false, false)]
    public void Anular_solo_abiertas_sin_recepciones(string estado, bool tieneRecepciones, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeAnular(estado, tieneRecepciones);
        AssertPermitido(accion, permitido);
    }

    // ---------- Ítems ----------

    [Theory]
    [InlineData(EstadoOrden.Abierta, false, 2, true)]
    [InlineData(EstadoOrden.Abierta, true, 2, false)]   // tiene ingresos
    [InlineData(EstadoOrden.Abierta, false, 1, false)]  // es el único ítem
    [InlineData(EstadoOrden.Cerrada, false, 3, false)]  // orden cerrada
    public void Quitar_item(string estado, bool tieneRecepciones, int itemsActivos, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeQuitarItem(estado, tieneRecepciones, itemsActivos);
        AssertPermitido(accion, permitido);
    }

    // ---------- Recepciones ----------

    [Fact]
    public void Recepcion_valida_entre_la_fecha_de_la_orden_y_hoy()
    {
        var fechaOrden = Hoy.AddDays(-10);

        ReglasOrden.ValidarRecepcion(EstadoOrden.Abierta, fechaOrden, fechaOrden, Hoy);
        ReglasOrden.ValidarRecepcion(EstadoOrden.Abierta, fechaOrden, Hoy, Hoy);
    }

    [Fact]
    public void Recepcion_anterior_a_la_orden_se_rechaza()
    {
        var fechaOrden = Hoy.AddDays(-10);
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasOrden.ValidarRecepcion(EstadoOrden.Abierta, fechaOrden, fechaOrden.AddDays(-1), Hoy));
    }

    [Fact]
    public void Recepcion_futura_se_rechaza()
    {
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasOrden.ValidarRecepcion(EstadoOrden.Abierta, Hoy.AddDays(-10), Hoy.AddDays(1), Hoy));
    }

    [Theory]
    [InlineData(EstadoOrden.Cerrada)]
    [InlineData(EstadoOrden.Anulada)]
    public void Recepcion_en_orden_no_abierta_se_rechaza(string estado)
    {
        Assert.Throws<ReglaNegocioException>(() =>
            ReglasOrden.ValidarRecepcion(estado, Hoy.AddDays(-10), Hoy, Hoy));
    }

    [Theory]
    [InlineData(EstadoOrden.Abierta, true, true)]
    [InlineData(EstadoOrden.Abierta, false, false)]   // ya anulada
    [InlineData(EstadoOrden.Cerrada, true, false)]    // hay que reabrir la orden
    public void Anular_recepcion(string estadoOrden, bool recepcionActiva, bool permitido)
    {
        var accion = () => ReglasOrden.AsegurarPuedeAnularRecepcion(estadoOrden, recepcionActiva);
        AssertPermitido(accion, permitido);
    }

    private static void AssertPermitido(Action accion, bool permitido)
    {
        if (permitido)
            accion();
        else
            Assert.Throws<ReglaNegocioException>(accion);
    }
}
