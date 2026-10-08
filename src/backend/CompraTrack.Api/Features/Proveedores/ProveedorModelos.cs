using System.ComponentModel.DataAnnotations;

namespace CompraTrack.Api.Features.Proveedores;

public sealed class ProveedorDto
{
    public int Id { get; init; }
    public int Codigo { get; init; }
    public string RazonSocial { get; init; } = "";
    public string? Contacto { get; init; }
    public string? Email { get; init; }
    public string? Telefono { get; init; }
    public string? Direccion { get; init; }
    public bool Activo { get; init; }
    public int OrdenesAbiertas { get; init; }
}

public sealed record GuardarProveedorRequest(
    [Range(1, 999999)] int Codigo,
    [Required, StringLength(150, MinimumLength = 2)] string RazonSocial,
    [StringLength(100)] string? Contacto,
    [EmailAddress, StringLength(150)] string? Email,
    [StringLength(30)] string? Telefono,
    [StringLength(200)] string? Direccion);

public sealed record CambiarEstadoRequest(bool Activo);

/// <summary>Una combinación tipo / gramaje / formato que ofrece un proveedor.</summary>
public sealed class ProveedorProductoDto
{
    public int Id { get; init; }
    public int TipoProductoId { get; init; }
    public string Tipo { get; init; } = "";
    public int GramajeId { get; init; }
    public short Gramos { get; init; }
    public int FormatoId { get; init; }
    public string Formato { get; init; } = "";
    public int CantidadUsos { get; init; }
    public bool Activo { get; init; }
}

public sealed record AgregarProveedorProductoRequest(
    [Range(1, int.MaxValue)] int TipoProductoId,
    [Range(1, int.MaxValue)] int GramajeId,
    [Range(1, int.MaxValue)] int FormatoId);

/// <summary>Opción genérica para combos (id + texto).</summary>
public sealed class OpcionDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
}
