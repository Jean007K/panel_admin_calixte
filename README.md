# Panel Admin Calixte

Backoffice ops de Banco Calixte (capa BFF). **No** sustituye Mifos.

| Campo | Valor |
|-------|-------|
| Dominio | `panel.bcalixte.cc.cd` (DNS a pedir al dueño) |
| Repo | https://github.com/Jean007K/panel_admin_calixte |
| API | `NEXT_PUBLIC_API_BASE_URL` → `https://api.bcalixte.cc.cd` |
| Stack | Next.js 15 · TypeScript · next-intl (es/fr) · tema claro/oscuro |
| Diseño | `PRODUCT.md` · `DESIGN.md` · Impeccable |

## Arranque local

```powershell
cd Bakend_panelAdmin
copy .env.example .env.local
npm install
npm run dev
```

Abrir http://localhost:3000 → redirige a `/es/users` (login si no hay sesión).

## Auth staff (BFF)

Requiere Postgres BFF + migración `000005_staff_rbac.sql` y variables:

```env
ADMIN_BOOTSTRAP_EMAIL=admin@bcalixte.cc.cd
ADMIN_BOOTSTRAP_PASSWORD=ChangeMeAdmin!123
CORS_ORIGINS=http://localhost:3000,https://panel.bcalixte.cc.cd
```

Endpoints: login/refresh, users (+ `GET .../users/:id/dossier`), content (promos/blocks), flags, links, devices, sessions, audit, ops.

Navegación: **Usuarios** · **Configuración de la app** (anuncios, préstamos tip/simulador, seguros catálogo, productos multi-cuenta, actualización remota, flags) · **Más** (vínculos, dispositivos, sesiones, auditoría, ops).

Migraciones BFF: `000005_staff_rbac.sql`, `000006_app_content_remote.sql`, `000007_products_cards_loans_insurance.sql`.

## Relación con el monorepo

```
Panel → bakend_calixte /api/v1/admin → Postgres BFF (app_users, staff_*)
Mifos → Fineract (ledger) — enlace externo en el shell
```

## Deploy Dokploy

1. Conectar repo `panel_admin_calixte`.
2. Dockerfile en raíz; build-arg `NEXT_PUBLIC_API_BASE_URL=https://api.bcalixte.cc.cd`.
3. Dominio `panel.bcalixte.cc.cd` → contenedor puerto 3000.
4. Añadir origen CORS en BFF.

## Docs

- [`docs/DEC-PANEL-001.md`](docs/DEC-PANEL-001.md)
- [`docs/SHAPE_BRIEF.md`](docs/SHAPE_BRIEF.md)
- BFF: DEC-BFF-017 en `bakend_calixte/docs/DECISIONS.md`
