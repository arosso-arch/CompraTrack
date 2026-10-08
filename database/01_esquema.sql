/*
    CompraTrack - Esquema de base de datos
    -----------------------------------------------------------------
    Crea (o recrea) la base CompraTrack con todas sus tablas, la
    secuencia de numeración de órdenes y la vista de estado de entrega.

    ATENCIÓN: si la base ya existe, se elimina y se vuelve a crear.
    Pensado para entornos de desarrollo y demo.

    Ejecutar:
        sqlcmd -S "(localdb)\MSSQLLocalDB" -i database\01_esquema.sql
*/

SET NOCOUNT ON;
USE master;
GO

IF DB_ID('CompraTrack') IS NOT NULL
BEGIN
    ALTER DATABASE CompraTrack SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE CompraTrack;
END
GO

CREATE DATABASE CompraTrack COLLATE Modern_Spanish_CI_AS;
GO

USE CompraTrack;
GO

------------------------------------------------------------
-- 1) SEGURIDAD: roles, permisos y usuarios
------------------------------------------------------------

CREATE TABLE dbo.Rol
(
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Rol PRIMARY KEY,
    Nombre          NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Rol_Nombre UNIQUE,
    Descripcion     NVARCHAR(200) NULL,
    -- Un rol administrador tiene todos los permisos, sin importar RolPermiso.
    EsAdministrador BIT NOT NULL CONSTRAINT DF_Rol_EsAdministrador DEFAULT (0)
);

CREATE TABLE dbo.Permiso
(
    Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Permiso PRIMARY KEY,
    Codigo      VARCHAR(50)   NOT NULL CONSTRAINT UQ_Permiso_Codigo UNIQUE,  -- ej: ordenes.crear
    Modulo      NVARCHAR(50)  NOT NULL,
    Descripcion NVARCHAR(200) NOT NULL
);

-- Permisos que trae cada rol por defecto.
CREATE TABLE dbo.RolPermiso
(
    RolId     INT NOT NULL CONSTRAINT FK_RolPermiso_Rol     REFERENCES dbo.Rol(Id) ON DELETE CASCADE,
    PermisoId INT NOT NULL CONSTRAINT FK_RolPermiso_Permiso REFERENCES dbo.Permiso(Id) ON DELETE CASCADE,
    CONSTRAINT PK_RolPermiso PRIMARY KEY (RolId, PermisoId)
);

CREATE TABLE dbo.Usuario
(
    Id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Usuario PRIMARY KEY,
    NombreUsuario  VARCHAR(50)   NOT NULL CONSTRAINT UQ_Usuario_NombreUsuario UNIQUE,
    NombreCompleto NVARCHAR(100) NOT NULL,
    Email          VARCHAR(150)  NOT NULL CONSTRAINT UQ_Usuario_Email UNIQUE,
    ClaveHash      VARCHAR(100)  NOT NULL,   -- BCrypt; nunca la clave en texto plano
    RolId          INT NOT NULL CONSTRAINT FK_Usuario_Rol REFERENCES dbo.Rol(Id),
    Activo         BIT NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    FechaAlta      DATETIME2(0) NOT NULL CONSTRAINT DF_Usuario_FechaAlta DEFAULT (SYSDATETIME()),
    UltimoAcceso   DATETIME2(0) NULL
);

-- Permisos adicionales otorgados a un usuario puntual, además de los de su rol.
CREATE TABLE dbo.UsuarioPermiso
(
    UsuarioId      INT NOT NULL CONSTRAINT FK_UsuarioPermiso_Usuario REFERENCES dbo.Usuario(Id) ON DELETE CASCADE,
    PermisoId      INT NOT NULL CONSTRAINT FK_UsuarioPermiso_Permiso REFERENCES dbo.Permiso(Id) ON DELETE CASCADE,
    OtorgadoPorId  INT NULL     CONSTRAINT FK_UsuarioPermiso_OtorgadoPor REFERENCES dbo.Usuario(Id),
    FechaOtorgado  DATETIME2(0) NOT NULL CONSTRAINT DF_UsuarioPermiso_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_UsuarioPermiso PRIMARY KEY (UsuarioId, PermisoId)
);
GO

------------------------------------------------------------
-- 2) PROVEEDORES Y CATÁLOGO DE PRODUCTOS
------------------------------------------------------------

CREATE TABLE dbo.Proveedor
(
    Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Proveedor PRIMARY KEY,
    Codigo      INT           NOT NULL CONSTRAINT UQ_Proveedor_Codigo UNIQUE,
    RazonSocial NVARCHAR(150) NOT NULL,
    Contacto    NVARCHAR(100) NULL,      -- persona de atención
    Email       VARCHAR(150)  NULL,      -- destino del PDF de la orden
    Telefono    VARCHAR(30)   NULL,
    Direccion   NVARCHAR(200) NULL,
    Activo      BIT NOT NULL CONSTRAINT DF_Proveedor_Activo DEFAULT (1),
    FechaAlta   DATETIME2(0) NOT NULL CONSTRAINT DF_Proveedor_FechaAlta DEFAULT (SYSDATETIME())
);

CREATE TABLE dbo.TipoProducto
(
    Id     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TipoProducto PRIMARY KEY,
    Nombre NVARCHAR(60) NOT NULL CONSTRAINT UQ_TipoProducto_Nombre UNIQUE,
    Activo BIT NOT NULL CONSTRAINT DF_TipoProducto_Activo DEFAULT (1)
);

CREATE TABLE dbo.Gramaje
(
    Id     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Gramaje PRIMARY KEY,
    Gramos SMALLINT NOT NULL CONSTRAINT UQ_Gramaje_Gramos UNIQUE
                             CONSTRAINT CK_Gramaje_Gramos CHECK (Gramos > 0)   -- g/m²
);

CREATE TABLE dbo.Formato
(
    Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Formato PRIMARY KEY,
    Descripcion NVARCHAR(50) NOT NULL CONSTRAINT UQ_Formato_Descripcion UNIQUE   -- ej: 70 x 100 cm, Bobina 66 cm
);

-- Qué combinaciones tipo/gramaje/formato ofrece cada proveedor.
-- Alimenta los combos en cascada al cargar una orden.
CREATE TABLE dbo.ProveedorProducto
(
    Id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProveedorProducto PRIMARY KEY,
    ProveedorId    INT NOT NULL CONSTRAINT FK_ProveedorProducto_Proveedor REFERENCES dbo.Proveedor(Id),
    TipoProductoId INT NOT NULL CONSTRAINT FK_ProveedorProducto_Tipo      REFERENCES dbo.TipoProducto(Id),
    GramajeId      INT NOT NULL CONSTRAINT FK_ProveedorProducto_Gramaje   REFERENCES dbo.Gramaje(Id),
    FormatoId      INT NOT NULL CONSTRAINT FK_ProveedorProducto_Formato   REFERENCES dbo.Formato(Id),
    CantidadUsos   INT NOT NULL CONSTRAINT DF_ProveedorProducto_Usos   DEFAULT (0),
    Activo         BIT NOT NULL CONSTRAINT DF_ProveedorProducto_Activo DEFAULT (1),
    FechaAlta      DATETIME2(0) NOT NULL CONSTRAINT DF_ProveedorProducto_FechaAlta DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_ProveedorProducto UNIQUE (ProveedorId, TipoProductoId, GramajeId, FormatoId)
);
GO

------------------------------------------------------------
-- 3) ÓRDENES DE COMPRA, ÍTEMS Y RECEPCIONES
------------------------------------------------------------

-- Numeración correlativa de órdenes, sin reutilizar números de órdenes anuladas.
CREATE SEQUENCE dbo.SeqNumeroOrden AS INT START WITH 1001 INCREMENT BY 1;
GO

CREATE TABLE dbo.OrdenCompra
(
    Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrdenCompra PRIMARY KEY,
    Numero        INT NOT NULL CONSTRAINT DF_OrdenCompra_Numero DEFAULT (NEXT VALUE FOR dbo.SeqNumeroOrden)
                           CONSTRAINT UQ_OrdenCompra_Numero UNIQUE,
    Fecha         DATE NOT NULL,
    ProveedorId   INT NOT NULL CONSTRAINT FK_OrdenCompra_Proveedor REFERENCES dbo.Proveedor(Id),
    Concepto      NVARCHAR(100) NOT NULL,   -- referencia libre: campaña, obra, cliente, etc.
    FormaPago     NVARCHAR(100) NULL,
    Observaciones NVARCHAR(500) NULL,
    Estado        VARCHAR(10) NOT NULL CONSTRAINT DF_OrdenCompra_Estado DEFAULT ('ABIERTA')
                               CONSTRAINT CK_OrdenCompra_Estado CHECK (Estado IN ('ABIERTA', 'CERRADA', 'ANULADA')),
    CreadaPorId   INT NOT NULL CONSTRAINT FK_OrdenCompra_CreadaPor REFERENCES dbo.Usuario(Id),
    FechaCreacion DATETIME2(0) NOT NULL CONSTRAINT DF_OrdenCompra_FechaCreacion DEFAULT (SYSDATETIME()),
    FechaCierre   DATETIME2(0) NULL
);

CREATE INDEX IX_OrdenCompra_Proveedor ON dbo.OrdenCompra (ProveedorId);
CREATE INDEX IX_OrdenCompra_Fecha     ON dbo.OrdenCompra (Fecha DESC) INCLUDE (Estado);

CREATE TABLE dbo.OrdenCompraItem
(
    Id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrdenCompraItem PRIMARY KEY,
    OrdenCompraId  INT NOT NULL CONSTRAINT FK_OrdenCompraItem_Orden   REFERENCES dbo.OrdenCompra(Id),
    TipoProductoId INT NOT NULL CONSTRAINT FK_OrdenCompraItem_Tipo    REFERENCES dbo.TipoProducto(Id),
    GramajeId      INT NOT NULL CONSTRAINT FK_OrdenCompraItem_Gramaje REFERENCES dbo.Gramaje(Id),
    FormatoId      INT NOT NULL CONSTRAINT FK_OrdenCompraItem_Formato REFERENCES dbo.Formato(Id),
    Detalle        NVARCHAR(200) NULL,
    CantidadKg     DECIMAL(12,2) NOT NULL CONSTRAINT CK_OrdenCompraItem_Cantidad CHECK (CantidadKg > 0),
    Activo         BIT NOT NULL CONSTRAINT DF_OrdenCompraItem_Activo DEFAULT (1)
);

CREATE INDEX IX_OrdenCompraItem_Orden ON dbo.OrdenCompraItem (OrdenCompraId);

-- Cada ingreso de mercadería contra un ítem. Un ítem puede recibirse en varias entregas.
CREATE TABLE dbo.Recepcion
(
    Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Recepcion PRIMARY KEY,
    OrdenCompraItemId INT NOT NULL CONSTRAINT FK_Recepcion_Item REFERENCES dbo.OrdenCompraItem(Id),
    Fecha             DATE NOT NULL,
    CantidadKg        DECIMAL(12,2) NOT NULL CONSTRAINT CK_Recepcion_Cantidad CHECK (CantidadKg > 0),
    Remito            VARCHAR(30)   NULL,
    Observaciones     NVARCHAR(300) NULL,
    RegistradaPorId   INT NOT NULL CONSTRAINT FK_Recepcion_RegistradaPor REFERENCES dbo.Usuario(Id),
    Activo            BIT NOT NULL CONSTRAINT DF_Recepcion_Activo DEFAULT (1),
    FechaRegistro     DATETIME2(0) NOT NULL CONSTRAINT DF_Recepcion_FechaRegistro DEFAULT (SYSDATETIME())
);

CREATE INDEX IX_Recepcion_Item  ON dbo.Recepcion (OrdenCompraItemId) INCLUDE (CantidadKg, Activo);
CREATE INDEX IX_Recepcion_Fecha ON dbo.Recepcion (Fecha) INCLUDE (CantidadKg, Activo);

-- Historial de envíos de la orden por mail al proveedor.
CREATE TABLE dbo.EnvioOrden
(
    Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EnvioOrden PRIMARY KEY,
    OrdenCompraId INT NOT NULL CONSTRAINT FK_EnvioOrden_Orden REFERENCES dbo.OrdenCompra(Id),
    Destinatario  VARCHAR(150)  NOT NULL,
    Asunto        NVARCHAR(200) NOT NULL,
    EnviadoPorId  INT NOT NULL CONSTRAINT FK_EnvioOrden_EnviadoPor REFERENCES dbo.Usuario(Id),
    FechaEnvio    DATETIME2(0) NOT NULL CONSTRAINT DF_EnvioOrden_FechaEnvio DEFAULT (SYSDATETIME())
);

CREATE INDEX IX_EnvioOrden_Orden ON dbo.EnvioOrden (OrdenCompraId);
GO

------------------------------------------------------------
-- 4) VISTAS
------------------------------------------------------------

-- Estado de entrega de cada ítem activo, calculado a partir de sus recepciones activas.
CREATE VIEW dbo.vw_EstadoEntregaItem
AS
SELECT
    i.Id                                   AS OrdenCompraItemId,
    i.OrdenCompraId,
    i.CantidadKg                           AS CantidadPedidaKg,
    ISNULL(r.RecibidoKg, 0)                AS CantidadRecibidaKg,
    i.CantidadKg - ISNULL(r.RecibidoKg, 0) AS DiferenciaKg,
    CASE
        WHEN ISNULL(r.RecibidoKg, 0) = 0           THEN 'EN ESPERA'
        WHEN r.RecibidoKg < i.CantidadKg           THEN 'ENTREGA PARCIAL'
        WHEN r.RecibidoKg = i.CantidadKg           THEN 'ENTREGA COMPLETA'
        ELSE                                            'CANTIDAD SUPERADA'
    END                                    AS EstadoEntrega
FROM dbo.OrdenCompraItem i
OUTER APPLY
(
    SELECT SUM(rc.CantidadKg) AS RecibidoKg
    FROM dbo.Recepcion rc
    WHERE rc.OrdenCompraItemId = i.Id
      AND rc.Activo = 1
) r
WHERE i.Activo = 1;
GO

PRINT 'Esquema CompraTrack creado correctamente.';
GO
