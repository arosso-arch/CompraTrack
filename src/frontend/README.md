# CompraTrack · Frontend

React 19 + TypeScript + Vite. Ver el [README principal](../../README.md) para levantar todo el proyecto.

```bash
npm install
npm run dev      # http://localhost:5173 (requiere la API en http://localhost:5137)
npm run build    # verifica tipos y genera dist/
npm run lint
```

## Estructura

```
src/
├── api/          cliente HTTP, tipos de la API y hooks de TanStack Query
├── auth/         sesión (JWT), permisos y rutas protegidas
├── components/   componentes visuales reutilizables
├── layout/       menú lateral y estructura general
├── lib/          formato de números y fechas, esquemas de validación (Zod)
└── pages/        una pantalla por archivo
```

En desarrollo, Vite reenvía `/api` a la API .NET (ver `vite.config.ts`). En producción se configura `VITE_API_URL`.
