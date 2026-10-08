# Modelo de datos

```mermaid
erDiagram
    Rol ||--o{ Usuario : "tiene"
    Rol ||--o{ RolPermiso : ""
    Permiso ||--o{ RolPermiso : ""
    Usuario ||--o{ UsuarioPermiso : "permisos extra"
    Permiso ||--o{ UsuarioPermiso : ""

    Proveedor ||--o{ ProveedorProducto : "ofrece"
    TipoProducto ||--o{ ProveedorProducto : ""
    Gramaje ||--o{ ProveedorProducto : ""
    Formato ||--o{ ProveedorProducto : ""

    Proveedor ||--o{ OrdenCompra : "recibe"
    Usuario ||--o{ OrdenCompra : "crea"
    OrdenCompra ||--|{ OrdenCompraItem : "contiene"
    TipoProducto ||--o{ OrdenCompraItem : ""
    Gramaje ||--o{ OrdenCompraItem : ""
    Formato ||--o{ OrdenCompraItem : ""
    OrdenCompraItem ||--o{ Recepcion : "se recibe en"
    Usuario ||--o{ Recepcion : "registra"
    OrdenCompra ||--o{ EnvioOrden : "se envía"
    Usuario ||--o{ EnvioOrden : "envía"

    OrdenCompra {
        int Id PK
        int Numero UK "secuencia SeqNumeroOrden"
        date Fecha
        int ProveedorId FK
        string Concepto
        string Estado "ABIERTA | CERRADA | ANULADA"
    }
    OrdenCompraItem {
        int Id PK
        int OrdenCompraId FK
        decimal CantidadKg
        bit Activo
    }
    Recepcion {
        int Id PK
        int OrdenCompraItemId FK
        date Fecha
        decimal CantidadKg
        string Remito
        bit Activo
    }
    Usuario {
        int Id PK
        string NombreUsuario UK
        string ClaveHash "BCrypt"
        int RolId FK
    }
```

## Reglas principales

- **Permisos efectivos** de un usuario = permisos de su rol ∪ permisos extra (`UsuarioPermiso`). Un rol con `EsAdministrador = 1` tiene todos.
- **Estado de entrega** de cada ítem (vista `vw_EstadoEntregaItem`), según lo recibido contra lo pedido:
  `EN ESPERA` → `ENTREGA PARCIAL` → `ENTREGA COMPLETA`, o `CANTIDAD SUPERADA` si se recibió de más.
- **Numeración** de órdenes con una `SEQUENCE`: nunca se reutiliza un número, aunque la orden se anule.
- **Bajas lógicas** (`Activo = 0`) en ítems y recepciones, para conservar el historial.
- **Historial de envíos** (`EnvioOrden`): cada envío de la orden por mail queda registrado con destinatario, fecha y usuario.
- `ProveedorProducto` define qué combinaciones tipo / gramaje / formato ofrece cada proveedor y alimenta los combos en cascada al cargar una orden.
