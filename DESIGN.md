# Design System — Panel Admin Calixte

<!-- impeccable:design-schema 1 -->

## Mode

Operate — shell ERP / Salesforce-like para trabajo diario de staff.

## Visual world

**Clearing desk** — mesa de operaciones bancarias: densidad informativa, jerarquía por peso tipográfico y alineación en rejilla, acento institucional contenido. Inspiración de gramática Salesforce Lightning / ERP (nav izquierda, top bar utilitaria, tablas densas, panel de detalle), no de landing fintech.

**Color strategy:** Restrained — neutros tintados + un acento verde marca Calixte (~8–12% de superficie).

**Default scene:** oficina diurna → tema **light** por defecto; dark disponible por toggle (mismo cluster que idioma).

## Anti-references

- Purple-to-indigo gradients, glow neon, glassmorphism decorativo
- Inter / Roboto / Arial / system-ui como display
- Cards anidados, icon tiles sobre cada heading, pill clusters de stats en hero
- Warm cream + terracotta editorial cluster
- Broadsheet hairline newspaper columns

## Typography

| Rol | Familia | Notas |
|-----|---------|-------|
| UI / body | **Source Sans 3** | Legible densa; no Inter |
| Display / brand lockup | **Source Serif 4** | Solo marca y títulos de página |
| Data / IDs | **IBM Plex Mono** | Teléfonos, ULIDs, códigos — solo datos |

Escala (rem): 12 / 14 / 16 / 20 / 24 / 32. Body 14px en tablas; 16px en formularios. Tracking display ≤ -0.02em.

## Color tokens

### Light

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#F4F6F5` | Lienzo app |
| `--surface` | `#FFFFFF` | Paneles, tablas |
| `--surface-2` | `#E8ECEA` | Sidebar, filas hover |
| `--border` | `#C5CEC8` | Separadores 1px |
| `--text` | `#14201A` | Primario |
| `--text-muted` | `#4A5C54` | Secundario (≥4.5:1 sobre bg) |
| `--accent` | `#1B6B45` | CTA, focus, active nav |
| `--accent-fg` | `#F5FBF7` | Texto sobre accent |
| `--danger` | `#A11F2C` | Suspend / error |
| `--warning` | `#9A6B12` | Locked / pending |
| `--success` | `#1B6B45` | Active |

### Dark

| Token | Valor |
|-------|-------|
| `--bg` | `#0E1512` |
| `--surface` | `#17201C` |
| `--surface-2` | `#1F2B25` |
| `--border` | `#2F3F37` |
| `--text` | `#E8F0EB` |
| `--text-muted` | `#A3B5AC` |
| `--accent` | `#3D9A68` |
| `--accent-fg` | `#0A120E` |
| `--danger` | `#E85A67` |
| `--warning` | `#D4A017` |
| `--success` | `#3D9A68` |

## Layout

- **Sidebar** fija ~240px: logo Calixte, nav por permiso, colapsable en &lt;1024px
- **Top bar** ~48px: título de sección a la izquierda; a la derecha cluster **idioma (ES\|FR) + tema (claro/oscuro) + menú usuario**
- **Contenido**: padding 24px; tablas full-bleed dentro del área; detalle en split o página
- Sin cards en shell; superficies planas con borde 1px

## Components

- Primary button: fill accent, radius 4px (no pill)
- Secondary: border + text
- Inputs: altura 36–40px, border, focus ring accent 2px
- Table: header sticky, zebra sutil, row click → detalle
- Status chip: texto + punto de color (active / suspended / locked / pending / disabled / closed)
- Permission gate: ocultar control; si deep-link sin permiso → pantalla Forbidden

## Motion

- Una transición de shell: sidebar/content fade 150ms ease-out
- Theme/locale switch: sin animación de color larga
- Sin bounce/elastic

## States

Login: idle / submitting / error credenciales / rate limit  
Users list: loading skeleton filas / empty / error red / forbidden  
User detail: loading / not found / action confirm (suspend) / success toast  
Shell: nav items según permisos efectivos

## Direction contract (first surfaces)

**THESIS:** Mesa de clearing Calixte — operar identidad app con densidad ERP; rechaza dashboard de métricas hero y marketing cards.  
**OWN-WORLD:** Neutros verde-gris + acento `#1B6B45`, Source Sans 3 + Source Serif 4, sidebar+topbar Salesforce-like.  
**STORY:** Staff entra, ve solo módulos permitidos, encuentra usuario, cambia status con motivo.  
**FIRST VIEWPORT (login):** Marca a la izquierda o arriba; formulario email/password centrado verticalmente en mitad derecha o columna única; sin ilustración stock.  
**FORM:** Canon ERP/Salesforce (user-pinned via plan) — clearing desk restrained.
