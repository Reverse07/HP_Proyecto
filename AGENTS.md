# AGENTS.md

## Convenciones del proyecto

- Monorepo con workspaces: `backend`, `frontend`, `db`.
- La base de datos usa PostgreSQL 16 con esquema `terra_brasa`.
- El backend usa Node.js 20 + TypeScript + Express, validación con zod y `pg` sin ORM.
- El frontend usa React 18 + TypeScript + Vite con CSS puro y tokens.
- Todos los textos deben estar en español (es-PE).
- La zona horaria del negocio es `America/Lima`.
- Deben aplicarse validaciones en backend y frontend.
- Cada fase requiere lint/build/tests y commit con mensaje claro.
