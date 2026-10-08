namespace CompraTrack.Api.Infrastructure;

/// <summary>Datos de la empresa compradora que aparecen en el encabezado de las órdenes y en los mails.</summary>
public sealed class EmpresaOptions
{
    public const string Seccion = "Empresa";

    public string Nombre { get; init; } = "Empresa Demo S.A.";
    public string? Cuit { get; init; }
    public string? Direccion { get; init; }
    public string? Telefono { get; init; }
    public string? Email { get; init; }
    public string? LugarEntrega { get; init; }
}
