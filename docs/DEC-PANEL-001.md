# DEC-PANEL-001 — Panel Admin Calixte

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-29 |
| **Estado** | Vigente |
| **Decisión** | Construir `Bakend_panelAdmin` como Next.js en `panel.bcalixte.cc.cd`, repo `Jean007K/panel_admin_calixte`, con auth staff real, RBAC roles+permisos, i18n es/fr, tema claro/oscuro, diseño Operate Impeccable (ERP/Salesforce). No sustituye Mifos. |
| **Motivo** | Ops/soporte/ejecutivos necesitan gestionar `app_users` y capa BFF sin exponer Fineract ni tokens móviles. |
| **Consecuencias** | Auth en `/api/v1/admin/*`; JWT staff ≠ customer; UI gated por permisos; BFF autoridad. MFA diferido. |
| **Docs** | `PRODUCT.md`, `DESIGN.md` |
