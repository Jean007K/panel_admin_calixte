# Shape brief — Login + Shell + Usuarios

## Job and audience

Staff Calixte (ops, L1, gerentes, ejecutivos) en escritorio. Modo **Operate**. Necesitan entrar y gestionar estados de usuarios app.

## Outcome

Login exitoso → shell con nav filtrada por permisos → listar/buscar usuarios → detalle → suspend/activate si `users:update_status`.

## Direction

Clearing desk / Salesforce-like (ver `DESIGN.md`). Densidad, no marketing.

## Scope

MVP: login, shell (lang+theme top-right), users list+detail+status. Fuera: devices, flags, audit UI, staff management UI, MFA.

## States

loading, empty, error, forbidden, confirm status change.

## Interaction

Sidebar por permiso; tabla clickable; acción status con motivo obligatorio; toggles idioma/tema persistentes.
