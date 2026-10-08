# CompraTrack

Sistema web de gestión de **órdenes de compra** y **recepción de mercadería** para empresas que compran insumos (papel, cartón, etiquetas) a múltiples proveedores.

> 🚧 En desarrollo. Evolución web de un sistema de escritorio (WinForms) que desarrollé y que está en uso real en producción.
> Esta versión usa **datos 100% ficticios**.

## Funcionalidades

- Órdenes de compra con numeración correlativa, PDF y envío por mail al proveedor
- Registro de entregas parciales y seguimiento del estado de cada ítem (en espera, parcial, completa, excedida)
- Catálogo de productos por proveedor (tipo, gramaje, formato) con selección en cascada
- Usuarios con roles y permisos granulares
- Reportes de kilos recibidos por proveedor, tipo de producto y mes

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | SQL Server (LocalDB en desarrollo) |
| Backend | ASP.NET Core Web API · .NET 10 *(próximamente)* |
| Frontend | React + TypeScript *(próximamente)* |

## Cómo levantarlo

### Base de datos

Requisitos: [SQL Server LocalDB](https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb) y [sqlcmd](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility).

```powershell
.\database\crear-base.ps1
```

Crea la base `CompraTrack` y la carga con datos de demostración.

### Usuarios demo

Todos con la clave `Demo1234!`

| Usuario | Rol |
|---|---|
| `admin` | Administrador |
| `compras` | Comprador |
| `deposito` | Depósito |
| `consulta` | Consulta (solo lectura) |

## Documentación

- [Modelo de datos](docs/modelo-datos.md)

## Licencia

[MIT](LICENSE)
