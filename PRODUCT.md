# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal interno de Banco Calixte: equipo ops, soporte L1, ejecutivos por nivel, gerentes y jefes de área. No son clientes de la app móvil. Abren el panel para operar identidad digital, estados de cuenta app y operaciones BFF durante el día laboral (escritorio, luz de oficina variable; tema claro/oscuro).

## Product Purpose

Panel ops web de Banco Calixte para gestionar la capa BFF (`app_users`, dispositivos, flags, auditoría, ops) sin tocar el ledger. El éxito es autenticarse, ver solo lo permitido por rol/permiso, y completar acciones (p. ej. suspender/activar usuarios app) con trazabilidad.

## Positioning

Backoffice de la **capa aplicación Calixte** (BFF), no un segundo Mifos. Contabilidad, productos y GL viven en Mifos/Fineract; este panel habla solo a `api.bcalixte.cc.cd` con identidad staff separada del JWT de clientes móviles.

## Operating Context

- Dominio: `panel.bcalixte.cc.cd` (desplegado)
- Stack: Next.js + TypeScript; API admin en `bakend_calixte`
- Auth: email + password (MFA = post soft launch)
- AuthZ: roles + permisos; `super_admin` acceso total
- Idiomas: español y francés
- Tema: claro/oscuro
- UX: shell tipo Salesforce/ERP
- Estado **2026-09-13**: ficha 360, tarjetas, Soporte, Cuentas extra, notifs de usuario, catálogo. Soft launch 20–50 = P9 BFF.
- MVP histórico (login + users status) **superado**

## Capabilities and Constraints

- El panel **nunca** llama a Fineract directamente.
- No reutilizar tokens de sesión móvil.
- BFF es la autoridad de permisos; la UI solo oculta, no autoriza.
- Cambio de status de usuario app: solo `PATCH /api/v1/admin/users/:id/status` con permiso `users:update_status`. El stub `PATCH /internal/users/:id/status` fue retirado (2026-09-14).
- Roles semilla: `super_admin`, `ops`, `support_l1`, `executive`, `manager`, `area_head`.
- Repo: https://github.com/Jean007K/panel_admin_calixte
- Hecho: devices, flags, audit, ops, support, account-requests. Staff MFA del panel = post soft launch.

## Brand Commitments

- Nombre: Banco Calixte / CALIXTE / Panel Admin Calixte
- Voz: clara, operativa, español (UI también francés)
- No sustituye ni copia la marca Mifos; deep-link externo cuando haga falta Core

## Evidence on Hand

- Cambio de status: `PATCH /api/v1/admin/users/:id/status` (permiso `users:update_status`)
- Schema `app_users` (status lifecycle) en Postgres BFF
- Design system móvil Calixte en `appcalixte` (referencia de marca, no copiar 1:1 a admin)
- No fabricar testimonios, métricas de clientes ni claims de ledger

## Product Principles

1. Permiso antes que pantalla: si no hay permiso, no hay acción.
2. Operar con densidad y claridad (ERP), no marketing.
3. Una sola verdad de identidad staff, separada del cliente móvil.
4. Localización y tema son controles de primer nivel, no afterthought.
5. El Core contable no vive aquí; no fingir saldos autoritativos.

## Accessibility & Inclusion

WCAG 2.2 AA como objetivo: contraste ≥4.5:1, foco teclado visible, labels en formularios, soporte de preferencia de tema del sistema al primer load.

## Productos, seguros y préstamos (BFF)

Contenido remoto administrable desde el panel (DEC-BFF-019..022); la app móvil consume `/api/v1/content/*` y `/api/v1/admin/*` — el panel **no** toca Fineract.

| Área | Panel (ops) | App cliente |
|------|-------------|-------------|
| **Productos / multi-cuenta** | Catálogo `product_definitions`; prefs default por usuario | `GET /me/accounts`, default en BFF |
| **Seguros** | CRUD catálogo (`insurance_products`, icon_key local) | Lista catálogo; contratar = futuro |
| **Préstamos (tip)** | Editar tip/simulador (`loan_tip_config`, historial simulaciones) | `GET /content/loans`, simulador sin underwriting Core |

Transferencias P2P siguen usando la **cuenta default** del usuario hasta selector explícito en app.
