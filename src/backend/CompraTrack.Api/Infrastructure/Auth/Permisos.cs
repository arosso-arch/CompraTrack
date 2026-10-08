namespace CompraTrack.Api.Infrastructure.Auth;

/// <summary>Códigos de permiso. Deben coincidir con la tabla dbo.Permiso.</summary>
public static class Permisos
{
    public const string OrdenesVer            = "ordenes.ver";
    public const string OrdenesCrear          = "ordenes.crear";
    public const string OrdenesEditar         = "ordenes.editar";
    public const string OrdenesCerrar         = "ordenes.cerrar";
    public const string OrdenesEnviar         = "ordenes.enviar";
    public const string RecepcionesRegistrar  = "recepciones.registrar";
    public const string RecepcionesAnular     = "recepciones.anular";
    public const string ProveedoresVer        = "proveedores.ver";
    public const string ProveedoresGestionar  = "proveedores.gestionar";
    public const string ProductosVer          = "productos.ver";
    public const string ProductosGestionar    = "productos.gestionar";
    public const string ReportesVer           = "reportes.ver";
    public const string UsuariosGestionar     = "usuarios.gestionar";

    /// <summary>Tipo de claim del JWT que transporta cada permiso.</summary>
    public const string ClaimType = "permiso";
}
