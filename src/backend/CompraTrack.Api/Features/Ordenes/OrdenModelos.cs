using System.ComponentModel.DataAnnotations;

namespace CompraTrack.Api.Features.Ordenes;

// ---------- Lectura ----------

public sealed class OrdenResumenDto
{
    public int Id { get; init; }
    public int Numero { get; init; }
    public DateOnly Fecha { get; init; }
    public int ProveedorId { get; init; }
    public string Proveedor { get; init; } = "";
    public string Concepto { get; init; } = "";
    public string Estado { get; init; } = "";
    public string CreadaPor { get; init; } = "";
    public int CantidadItems { get; init; }
    public int ItemsPendientes { get; init; }
    public decimal TotalPedidoKg { get; init; }
    public decimal TotalRecibidoKg { get; init; }
}

public sealed class OrdenDetalleDto
{
    public int Id { get; init; }
    public int Numero { get; init; }
    public DateOnly Fecha { get; init; }
    public int ProveedorId { get; init; }
    public string Proveedor { get; init; } = "";
    public string? ProveedorContacto { get; init; }
    public string? ProveedorEmail { get; init; }
    public string? ProveedorTelefono { get; init; }
    public string Concepto { get; init; } = "";
    public string? FormaPago { get; init; }
    public string? Observaciones { get; init; }
    public string Estado { get; init; } = "";
    public string CreadaPor { get; init; } = "";
    public DateTime FechaCreacion { get; init; }
    public DateTime? FechaCierre { get; init; }
    public IReadOnlyList<OrdenItemDto> Items { get; set; } = [];

    public decimal TotalPedidoKg => Items.Sum(i => i.CantidadKg);
    public decimal TotalRecibidoKg => Items.Sum(i => i.RecibidoKg);
}

public sealed class OrdenItemDto
{
    public int Id { get; init; }
    public int TipoProductoId { get; init; }
    public string Tipo { get; init; } = "";
    public int GramajeId { get; init; }
    public short Gramos { get; init; }
    public int FormatoId { get; init; }
    public string Formato { get; init; } = "";
    public string? Detalle { get; init; }
    public decimal CantidadKg { get; init; }
    public decimal RecibidoKg { get; init; }
    public decimal DiferenciaKg { get; init; }
    /// <summary>EN ESPERA | ENTREGA PARCIAL | ENTREGA COMPLETA | CANTIDAD SUPERADA</summary>
    public string EstadoEntrega { get; init; } = "";
}

/// <summary>Datos mínimos de una orden para validar reglas antes de modificarla.</summary>
public sealed class OrdenEstadoDto
{
    public int Id { get; init; }
    public string Estado { get; init; } = "";
    public DateOnly Fecha { get; init; }
    public int ProveedorId { get; init; }
    public bool TieneRecepciones { get; init; }
    public int ItemsActivos { get; init; }
}

// ---------- Filtros y escritura ----------

public sealed class FiltroOrdenes
{
    [RegularExpression("^(ABIERTA|CERRADA|ANULADA)$", ErrorMessage = "Estado debe ser ABIERTA, CERRADA o ANULADA.")]
    public string? Estado { get; set; }
    public int? ProveedorId { get; set; }
    public DateOnly? Desde { get; set; }
    public DateOnly? Hasta { get; set; }
    /// <summary>Número de orden exacto, o texto contenido en el concepto o la razón social del proveedor.</summary>
    public string? Buscar { get; set; }
    [Range(1, int.MaxValue)] public int Pagina { get; set; } = 1;
    [Range(1, 100)] public int TamanioPagina { get; set; } = 20;
}

public sealed record ItemRequest(
    [Range(1, int.MaxValue)] int TipoProductoId,
    [Range(1, int.MaxValue)] int GramajeId,
    [Range(1, int.MaxValue)] int FormatoId,
    [StringLength(200)] string? Detalle,
    [Range(typeof(decimal), "0.01", "99999999", ParseLimitsInInvariantCulture = true)] decimal CantidadKg);

public sealed record CrearOrdenRequest(
    DateOnly Fecha,
    [Range(1, int.MaxValue)] int ProveedorId,
    [Required, StringLength(100, MinimumLength = 2)] string Concepto,
    [StringLength(100)] string? FormaPago,
    [StringLength(500)] string? Observaciones,
    [Required, MinLength(1, ErrorMessage = "La orden debe tener al menos un ítem.")] IReadOnlyList<ItemRequest> Items);

public sealed record ActualizarOrdenRequest(
    DateOnly Fecha,
    [Required, StringLength(100, MinimumLength = 2)] string Concepto,
    [StringLength(100)] string? FormaPago,
    [StringLength(500)] string? Observaciones);

public sealed record ActualizarItemRequest(
    [StringLength(200)] string? Detalle,
    [Range(typeof(decimal), "0.01", "99999999", ParseLimitsInInvariantCulture = true)] decimal CantidadKg);
