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
| Backend | ASP.NET Core Web API · .NET 10 · Dapper · JWT · BCrypt |
| Tests | xUnit |
| Frontend | React + TypeScript *(próximamente)* |

### Decisiones técnicas

- **Dapper + SQL explícito** en lugar de un ORM: consultas visibles y optimizables, apoyadas en una vista (`vw_EstadoEntregaItem`) para el cálculo de estados de entrega.
- **Organización por funcionalidad** (`Features/Ordenes`, `Features/Recepciones`, …): cada módulo agrupa su controller, repositorio y modelos.
- **Reglas de negocio puras** (`ReglasOrden`) separadas del acceso a datos, cubiertas con tests unitarios.
- **Protección ante cambios concurrentes**: los `UPDATE` verifican el estado esperado (`WHERE Estado = 'ABIERTA'`), así dos usuarios no pueden, por ejemplo, registrar un ingreso en una orden que otro acaba de cerrar.
- **Permisos granulares en el JWT** y un atributo `[RequierePermiso(...)]` por endpoint.
- Errores en formato estándar **ProblemDetails** (RFC 9457), login con **rate limiting** y documentación **OpenAPI** interactiva.

## Cómo levantarlo

### Base de datos

Requisitos: [SQL Server LocalDB](https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb) y [sqlcmd](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility).

```powershell
.\database\crear-base.ps1
```

Crea la base `CompraTrack` y la carga con datos de demostración.

### API

Requisito: [.NET 10 SDK](https://dotnet.microsoft.com/download).

```powershell
dotnet run --project src/backend/CompraTrack.Api --launch-profile http
```

- Documentación interactiva: http://localhost:5137/docs
- Para probar endpoints protegidos: `POST /api/auth/login` con un usuario demo y usar el token como *Bearer*.

### Tests

```powershell
dotnet test
```

### Endpoints principales

| Módulo | Endpoints |
|---|---|
| Autenticación | `POST /api/auth/login` · `GET /api/auth/me` |
| Órdenes | listar (filtros + paginado), detalle, crear, editar, agregar / editar / quitar ítems, cerrar, reabrir, anular |
| Recepciones | registrar ingreso parcial o total por ítem, historial, anular ingreso |
| Proveedores | ABM, productos que ofrece cada uno, combos en cascada tipo → gramaje → formato |
| Catálogo | tipos de producto, gramajes, formatos |
| Reportes | resumen para el tablero, entregas pendientes, kilos por proveedor / tipo / mes |

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
