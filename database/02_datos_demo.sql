/*
    CompraTrack - Datos de demostración
    -----------------------------------------------------------------
    Carga datos 100% ficticios: usuarios demo, proveedores inventados,
    catálogo de papeles, ~60 órdenes de compra y sus recepciones.

    Las fechas se calculan relativas al día de ejecución, así el demo
    siempre muestra órdenes recientes abiertas y un historial cerrado.

    Todos los usuarios demo tienen la clave:  Demo1234!

    Ejecutar después de 01_esquema.sql:
        sqlcmd -S "(localdb)\MSSQLLocalDB" -d CompraTrack -i database\02_datos_demo.sql
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

------------------------------------------------------------
-- 1) Roles y permisos
------------------------------------------------------------

INSERT INTO dbo.Rol (Nombre, Descripcion, EsAdministrador) VALUES
    (N'Administrador', N'Acceso total al sistema',                          1),
    (N'Comprador',     N'Gestiona proveedores, catálogo y órdenes de compra', 0),
    (N'Depósito',      N'Registra el ingreso de mercadería',                 0),
    (N'Consulta',      N'Solo lectura de órdenes y reportes',                0);

INSERT INTO dbo.Permiso (Codigo, Modulo, Descripcion) VALUES
    ('ordenes.ver',            N'Órdenes',      N'Ver órdenes de compra'),
    ('ordenes.crear',          N'Órdenes',      N'Crear órdenes de compra'),
    ('ordenes.editar',         N'Órdenes',      N'Editar órdenes abiertas'),
    ('ordenes.cerrar',         N'Órdenes',      N'Cerrar, reabrir y anular órdenes'),
    ('ordenes.enviar',         N'Órdenes',      N'Enviar la orden por mail al proveedor'),
    ('recepciones.registrar',  N'Recepciones',  N'Registrar ingresos de mercadería'),
    ('recepciones.anular',     N'Recepciones',  N'Dar de baja un ingreso registrado'),
    ('proveedores.ver',        N'Proveedores',  N'Ver proveedores'),
    ('proveedores.gestionar',  N'Proveedores',  N'Alta, edición y baja de proveedores'),
    ('productos.ver',          N'Productos',    N'Ver el catálogo de productos'),
    ('productos.gestionar',    N'Productos',    N'Editar catálogo y productos por proveedor'),
    ('reportes.ver',           N'Reportes',     N'Ver reportes y tablero'),
    ('usuarios.gestionar',     N'Usuarios',     N'Administrar usuarios y permisos');

-- El Administrador no necesita filas: EsAdministrador = 1 implica todos los permisos.
INSERT INTO dbo.RolPermiso (RolId, PermisoId)
SELECT r.Id, p.Id
FROM dbo.Rol r
JOIN dbo.Permiso p ON
       (r.Nombre = N'Comprador' AND p.Codigo IN ('ordenes.ver','ordenes.crear','ordenes.editar','ordenes.cerrar','ordenes.enviar',
                                                  'proveedores.ver','proveedores.gestionar','productos.ver','productos.gestionar','reportes.ver'))
    OR (r.Nombre = N'Depósito'  AND p.Codigo IN ('ordenes.ver','recepciones.registrar','recepciones.anular','productos.ver','proveedores.ver'))
    OR (r.Nombre = N'Consulta'  AND p.Codigo IN ('ordenes.ver','proveedores.ver','productos.ver','reportes.ver'));

------------------------------------------------------------
-- 2) Usuarios demo (clave: Demo1234!)
------------------------------------------------------------

DECLARE @hashDemo VARCHAR(100) = '$2a$11$Ntgnz20Xltq/sfAkqvcfy.TwirYyOlg.EPlRXQqn0fwNwDH4AFqKy';

INSERT INTO dbo.Usuario (NombreUsuario, NombreCompleto, Email, ClaveHash, RolId) VALUES
    ('admin',    N'Laura Fernández', 'admin@compratrack.example',    @hashDemo, (SELECT Id FROM dbo.Rol WHERE Nombre = N'Administrador')),
    ('compras',  N'Martín Herrera',  'compras@compratrack.example',  @hashDemo, (SELECT Id FROM dbo.Rol WHERE Nombre = N'Comprador')),
    ('deposito', N'Sofía Medina',    'deposito@compratrack.example', @hashDemo, (SELECT Id FROM dbo.Rol WHERE Nombre = N'Depósito')),
    ('consulta', N'Diego Paredes',   'consulta@compratrack.example', @hashDemo, (SELECT Id FROM dbo.Rol WHERE Nombre = N'Consulta'));

DECLARE @idAdmin    INT = (SELECT Id FROM dbo.Usuario WHERE NombreUsuario = 'admin');
DECLARE @idCompras  INT = (SELECT Id FROM dbo.Usuario WHERE NombreUsuario = 'compras');
DECLARE @idDeposito INT = (SELECT Id FROM dbo.Usuario WHERE NombreUsuario = 'deposito');

-- Ejemplo de permiso extra por usuario: el de depósito también puede ver reportes.
INSERT INTO dbo.UsuarioPermiso (UsuarioId, PermisoId, OtorgadoPorId)
SELECT @idDeposito, Id, @idAdmin FROM dbo.Permiso WHERE Codigo = 'reportes.ver';

------------------------------------------------------------
-- 3) Proveedores ficticios (dominios .example reservados)
------------------------------------------------------------

INSERT INTO dbo.Proveedor (Codigo, RazonSocial, Contacto, Email, Telefono, Direccion) VALUES
    (101, N'Papelera Horizonte Austral S.A.', N'Carla Benítez',   'ventas@horizonteaustral.example', '+54 11 5555-0101', N'Av. Ficticia 1200, CABA'),
    (102, N'Celulosas del Litoral SRL',       N'Ramiro Quiroga',  'pedidos@celulitoral.example',     '+54 341 555-0102', N'Ruta 11 km 4, Rosario'),
    (103, N'Distribuidora Pliego Norte S.A.', N'Valeria Sosa',    'comercial@pliegonorte.example',   '+54 381 555-0103', N'Calle Inventada 455, Tucumán'),
    (104, N'Cartones Río Blanco S.A.',        N'Hernán Ibarra',   'ventas@rioblanco.example',        '+54 11 5555-0104', N'Parque Industrial Lote 8, Pilar'),
    (105, N'Insumos Gráficos Meridiano SRL',  N'Paula Acosta',    'info@meridiano.example',          '+54 351 555-0105', N'Bv. Demo 980, Córdoba'),
    (106, N'Papeles Finos Altamira S.A.',     N'Gustavo Peralta', 'altamira@papelesfinos.example',   '+54 11 5555-0106', N'Av. Ejemplo 3300, Avellaneda'),
    (107, N'Kraft & Bobinas del Sur SA',      N'Natalia Romero',  'compras@kraftsur.example',        '+54 223 555-0107', N'Calle Prueba 77, Mar del Plata'),
    (108, N'Etiquetas Adhesivas Cumbre SRL',  N'Lucas Ferreyra',  'ventas@cumbreadhesivos.example',  '+54 261 555-0108', N'Godoy Cruz 1500, Mendoza');

-- Un proveedor dado de baja, para mostrar el filtro de activos.
INSERT INTO dbo.Proveedor (Codigo, RazonSocial, Contacto, Email, Telefono, Activo) VALUES
    (109, N'Papelera Antigua Delta SRL', N'Oscar Villalba', 'contacto@antiguadelta.example', '+54 11 5555-0109', 0);

------------------------------------------------------------
-- 4) Catálogo: tipos, gramajes y formatos
------------------------------------------------------------

INSERT INTO dbo.TipoProducto (Nombre) VALUES
    (N'Obra'), (N'Ilustración brillante'), (N'Ilustración mate'), (N'Kraft'),
    (N'Cartulina'), (N'Autoadhesivo'), (N'Bond');

INSERT INTO dbo.Gramaje (Gramos) VALUES
    (60), (70), (80), (90), (115), (150), (170), (200), (250), (300);

INSERT INTO dbo.Formato (Descripcion) VALUES
    (N'65 x 95 cm'), (N'70 x 100 cm'), (N'72 x 102 cm'), (N'Bobina 66 cm'), (N'Bobina 88 cm'), (N'A4 (resma)');

-- Combinaciones válidas tipo / gramaje / formato.
DECLARE @Combinacion TABLE (Tipo NVARCHAR(60), Gramos SMALLINT, Formato NVARCHAR(50));
INSERT INTO @Combinacion (Tipo, Gramos, Formato)
SELECT t.Tipo, g.Gramos, f.Formato
FROM (VALUES
        (N'Obra',                  N'60,70,80,90',      N'65 x 95 cm|70 x 100 cm|Bobina 66 cm|Bobina 88 cm'),
        (N'Ilustración brillante', N'90,115,150,170',   N'65 x 95 cm|70 x 100 cm|72 x 102 cm'),
        (N'Ilustración mate',      N'115,150,170',      N'65 x 95 cm|70 x 100 cm|72 x 102 cm'),
        (N'Kraft',                 N'80,90,115',        N'Bobina 66 cm|Bobina 88 cm|70 x 100 cm'),
        (N'Cartulina',             N'200,250,300',      N'65 x 95 cm|70 x 100 cm|72 x 102 cm'),
        (N'Autoadhesivo',          N'80,90',            N'70 x 100 cm|65 x 95 cm'),
        (N'Bond',                  N'70,80',            N'A4 (resma)|70 x 100 cm')
     ) t(Tipo, GramosLista, FormatoLista)
CROSS APPLY (SELECT CAST(value AS SMALLINT) AS Gramos FROM STRING_SPLIT(t.GramosLista, ',')) g
CROSS APPLY (SELECT value AS Formato FROM STRING_SPLIT(t.FormatoLista, '|')) f;

-- Especialidad de cada proveedor (qué tipos vende).
DECLARE @Especialidad TABLE (Codigo INT, Tipo NVARCHAR(60));
INSERT INTO @Especialidad (Codigo, Tipo) VALUES
    (101, N'Obra'), (101, N'Ilustración brillante'), (101, N'Ilustración mate'), (101, N'Bond'),
    (102, N'Obra'), (102, N'Kraft'),
    (103, N'Obra'), (103, N'Ilustración brillante'), (103, N'Cartulina'),
    (104, N'Cartulina'), (104, N'Kraft'),
    (105, N'Ilustración mate'), (105, N'Ilustración brillante'), (105, N'Autoadhesivo'),
    (106, N'Ilustración brillante'), (106, N'Ilustración mate'), (106, N'Cartulina'),
    (107, N'Kraft'), (107, N'Obra'),
    (108, N'Autoadhesivo'), (108, N'Bond'),
    (109, N'Obra');

-- Cada proveedor ofrece ~2 de cada 3 combinaciones de sus tipos (determinístico).
INSERT INTO dbo.ProveedorProducto (ProveedorId, TipoProductoId, GramajeId, FormatoId)
SELECT p.Id, t.Id, g.Id, f.Id
FROM @Especialidad e
JOIN dbo.Proveedor    p ON p.Codigo = e.Codigo
JOIN @Combinacion     c ON c.Tipo   = e.Tipo
JOIN dbo.TipoProducto t ON t.Nombre = c.Tipo
JOIN dbo.Gramaje      g ON g.Gramos = c.Gramos
JOIN dbo.Formato      f ON f.Descripcion = c.Formato
WHERE (p.Codigo + t.Id * 3 + g.Id * 5 + f.Id * 7) % 3 <> 0;

------------------------------------------------------------
-- 5) Órdenes de compra (~60, últimos 20 meses)
------------------------------------------------------------

DECLARE @hoy DATE = CAST(GETDATE() AS DATE);

DECLARE @Concepto TABLE (N INT, Texto NVARCHAR(100));
INSERT INTO @Concepto VALUES
    (0, N'Reposición de stock'), (1, N'Campaña escolar'), (2, N'Pedido editorial'),
    (3, N'Packaging'),           (4, N'Folletería'),      (5, N'Stock de seguridad');

DECLARE @FormaPago TABLE (N INT, Texto NVARCHAR(100));
INSERT INTO @FormaPago VALUES
    (0, N'Transferencia a 30 días'), (1, N'Cheque a 60 días'),
    (2, N'Contado'),                 (3, N'Transferencia a 45 días');

DECLARE @Proveedores TABLE (N INT IDENTITY(0,1), Id INT);
INSERT INTO @Proveedores (Id) SELECT Id FROM dbo.Proveedor WHERE Activo = 1 ORDER BY Codigo;
DECLARE @cantProv INT = (SELECT COUNT(*) FROM @Proveedores);

;WITH Numeros AS
(
    SELECT TOP (60) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS N
    FROM sys.all_objects
)
INSERT INTO dbo.OrdenCompra (Fecha, ProveedorId, Concepto, FormaPago, Observaciones, Estado, CreadaPorId, FechaCreacion, FechaCierre)
SELECT
    o.Fecha,
    pr.Id,
    c.Texto,
    fp.Texto,
    CASE WHEN n.N % 7 = 0 THEN N'Entregar en depósito de 8 a 14 h.' END,
    o.Estado,
    @idCompras,
    DATEADD(MINUTE, 9 * 60 + (n.N * 37) % 420, CAST(o.Fecha AS DATETIME2(0))),   -- creada entre las 9 y las 16 h
    CASE WHEN o.Estado <> 'ABIERTA' THEN DATEADD(DAY, 35, CAST(o.Fecha AS DATETIME2(0))) END
FROM Numeros n
CROSS APPLY (SELECT DATEADD(DAY, -(600 - n.N * 10 - n.N % 4), @hoy) AS Fecha) f
CROSS APPLY
(
    SELECT f.Fecha,
           CASE WHEN DATEDIFF(DAY, f.Fecha, @hoy) <= 90 THEN 'ABIERTA'
                WHEN n.N % 17 = 0                     THEN 'ANULADA'
                ELSE                                       'CERRADA' END AS Estado
) o
-- 3 y la cantidad de proveedores (8) no tienen divisores comunes: el reparto recorre a todos.
JOIN @Proveedores pr ON pr.N = (n.N * 3 + n.N / 8) % @cantProv
JOIN @Concepto    c  ON c.N  = n.N % 6
JOIN @FormaPago   fp ON fp.N = (n.N / 2) % 4
ORDER BY n.N;   -- los números de orden quedan en orden cronológico

------------------------------------------------------------
-- 6) Ítems: 1 a 4 por orden, elegidos entre lo que ofrece el proveedor
------------------------------------------------------------

INSERT INTO dbo.OrdenCompraItem (OrdenCompraId, TipoProductoId, GramajeId, FormatoId, Detalle, CantidadKg)
SELECT
    o.Id,
    pp.TipoProductoId,
    pp.GramajeId,
    pp.FormatoId,
    CASE WHEN (o.Id + pp.Id) % 5 = 0 THEN N'Embalaje en pallets' END,
    ((o.Id * 13 + pp.Id * 7) % 20 + 2) * 500     -- entre 1.000 y 10.500 kg, múltiplos de 500
FROM dbo.OrdenCompra o
CROSS APPLY
(
    SELECT TOP ((o.Id % 4) + 1) x.*
    FROM dbo.ProveedorProducto x
    WHERE x.ProveedorId = o.ProveedorId
    ORDER BY (x.Id * 37 + o.Id * 11) % 101
) pp;

UPDATE pp
SET CantidadUsos = u.Usos
FROM dbo.ProveedorProducto pp
CROSS APPLY
(
    SELECT COUNT(*) AS Usos
    FROM dbo.OrdenCompraItem i
    JOIN dbo.OrdenCompra oc ON oc.Id = i.OrdenCompraId
    WHERE oc.ProveedorId     = pp.ProveedorId
      AND i.TipoProductoId   = pp.TipoProductoId
      AND i.GramajeId        = pp.GramajeId
      AND i.FormatoId        = pp.FormatoId
) u;

------------------------------------------------------------
-- 7) Recepciones de mercadería
--    Cerradas: entregadas completas (algunas en 2 partes, algunas con excedente)
--    Abiertas: algunas en espera, otras parciales o completas
------------------------------------------------------------

DECLARE @Recepciones TABLE (ItemId INT, Fecha DATE, CantidadKg DECIMAL(12,2), Observaciones NVARCHAR(300));

INSERT INTO @Recepciones (ItemId, Fecha, CantidadKg, Observaciones)
SELECT i.Id, r.Fecha, r.CantidadKg, r.Obs
FROM dbo.OrdenCompraItem i
JOIN dbo.OrdenCompra o ON o.Id = i.OrdenCompraId
CROSS APPLY
(
    -- Órdenes cerradas
    SELECT DATEADD(DAY, 10, o.Fecha), i.CantidadKg * 0.6, N'Primera entrega'
    WHERE o.Estado = 'CERRADA' AND i.Id % 5 = 0
    UNION ALL
    SELECT DATEADD(DAY, 24, o.Fecha), i.CantidadKg * 0.4, N'Segunda entrega'
    WHERE o.Estado = 'CERRADA' AND i.Id % 5 = 0
    UNION ALL
    SELECT DATEADD(DAY, 14, o.Fecha), i.CantidadKg * 1.02, N'Ingresó con excedente'
    WHERE o.Estado = 'CERRADA' AND i.Id % 5 = 1
    UNION ALL
    SELECT DATEADD(DAY, 12, o.Fecha), i.CantidadKg, NULL
    WHERE o.Estado = 'CERRADA' AND i.Id % 5 NOT IN (0, 1)
    -- Órdenes abiertas
    UNION ALL
    SELECT DATEADD(DAY, 8, o.Fecha), i.CantidadKg * 0.5, N'Entrega parcial'
    WHERE o.Estado = 'ABIERTA' AND i.Id % 3 = 1 AND DATEADD(DAY, 8, o.Fecha) <= @hoy
    UNION ALL
    SELECT DATEADD(DAY, 12, o.Fecha), i.CantidadKg, NULL
    WHERE o.Estado = 'ABIERTA' AND i.Id % 3 = 2 AND DATEADD(DAY, 12, o.Fecha) <= @hoy
) r(Fecha, CantidadKg, Obs);

INSERT INTO dbo.Recepcion (OrdenCompraItemId, Fecha, CantidadKg, Remito, Observaciones, RegistradaPorId, FechaRegistro)
SELECT
    ItemId,
    Fecha,
    CantidadKg,
    'R-0001-' + RIGHT('00000000' + CAST(ROW_NUMBER() OVER (ORDER BY Fecha, ItemId) + 4500 AS VARCHAR(8)), 8),
    Observaciones,
    @idDeposito,
    CAST(Fecha AS DATETIME2(0))
FROM @Recepciones
ORDER BY Fecha, ItemId;

------------------------------------------------------------
-- 8) Envíos por mail: cada orden no anulada se envió al proveedor el día de su creación
------------------------------------------------------------

INSERT INTO dbo.EnvioOrden (OrdenCompraId, Destinatario, Asunto, EnviadoPorId, FechaEnvio)
SELECT o.Id, p.Email, N'Orden de compra N° ' + CAST(o.Numero AS NVARCHAR(10)), @idCompras,
       DATEADD(MINUTE, 30, o.FechaCreacion)   -- media hora después de crearla
FROM dbo.OrdenCompra o
JOIN dbo.Proveedor p ON p.Id = o.ProveedorId
WHERE o.Estado <> 'ANULADA' AND p.Email IS NOT NULL
  AND DATEDIFF(DAY, o.Fecha, @hoy) > 2;   -- las más recientes quedan sin enviar, para probarlo en el demo

COMMIT TRANSACTION;
GO

------------------------------------------------------------
-- Resumen
------------------------------------------------------------
SELECT 'Usuarios' AS Tabla, COUNT(*) AS Filas FROM dbo.Usuario
UNION ALL SELECT 'Proveedores',        COUNT(*) FROM dbo.Proveedor
UNION ALL SELECT 'ProveedorProducto',  COUNT(*) FROM dbo.ProveedorProducto
UNION ALL SELECT 'Ordenes',            COUNT(*) FROM dbo.OrdenCompra
UNION ALL SELECT 'Items',              COUNT(*) FROM dbo.OrdenCompraItem
UNION ALL SELECT 'Recepciones',        COUNT(*) FROM dbo.Recepcion
UNION ALL SELECT 'Envios',             COUNT(*) FROM dbo.EnvioOrden;
GO
