# Axon Ecosystem — UI/UX Design Guidelines

Reference for styling & structuring interfaces. Based on the Projects page (`/dashboard/sales/projects`).

## 1. Page Structure

Header (sticky, glass-morphism bg):
```
┌──────────────────────────────────────┐
│ Breadcrumb: Dashboard / Sales / Projects │
│ Title + Count badge          [Btn New] │
│ Search bar │ Category filter │ View toggle │
│ [Advanced filters expandable]           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Stat cards row (Revenue, Active, Margin) │
│ Data list (grid/list/table)              │
│ Pagination                               │
└──────────────────────────────────────┘
FAB (mobile-only, fixed bottom-right)
```

- Breadcrumb as text with `/` separator, active page highlighted via `text-indigo-600`
- Count badge: `text-[9px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded-full`
- New button: `hidden lg:flex` — desktop header only, mobile uses FAB

## 2. Empty & Loading States

- **Loading**: Skeleton cards matching exact card layout. Grid of 3-6 `animate-pulse` cards with placeholder lines for title, subtitle, stats row.
- **Empty**: Centered graphic (circle with icon + decorative ring), heading, description text (contextual — "no results" vs "create first"), CTA button (clear filters or create). Framer Motion `scale: 0.95` entry.

## 3. Dark Mode

- Every `bg-white` paired with `dark:bg-slate-900`
- Every `border-slate-100/200` paired with `dark:border-slate-800/700`
- Text: `text-slate-900 dark:text-white`, secondary `text-slate-500 dark:text-slate-400`
- Gradient: `bg-linear-to-r from-indigo-600 to-indigo-500` (Tailwind v4 syntax)
- Status colors dim slightly in dark: `text-indigo-600` → `dark:text-indigo-400`

## 4. Financial Data

- Compact notation via `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 })` — produces `Rp 1,2 M`
- Profit colored: `text-emerald-600` (positive), `text-rose-600` (negative), always prefixed with `+`/`-`
- Columns right-aligned in table mode (`text-right`), left-justified in cards
- Stat cards use `text-2xl font-black tracking-tight`

## 5. Status & Priority Badges

Always pair color + icon:

| Concept | Color | Icon | Pattern |
|---------|-------|------|---------|
| Prospecting | slate | Search | `bg-slate-100 text-slate-600` |
| Survey Stage | amber | Clock | `bg-amber-50 text-amber-700` |
| Quotation Stage | blue | FileText | `bg-blue-50 text-blue-700` |
| Ordered | purple | ShoppingCart | `bg-purple-50 text-purple-700` |
| Completed | emerald | CheckCircle2 | `bg-emerald-50 text-emerald-700` |
| Lost | rose | Ban | `bg-rose-50 text-rose-600` |
| Priority HIGH | rose | Zap | `bg-rose-100 text-rose-700` |
| Priority MEDIUM | amber | Activity | `bg-amber-100 text-amber-700` |
| Priority LOW | emerald | Target | `bg-emerald-100 text-emerald-700` |

Rendered as: `flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider border`

Category badges (business unit): `bg-rose-50 text-rose-500 text-[7px] font-semibold uppercase px-1 py-0.5 rounded`

## 6. View Modes

Three-view system persisted to `localStorage`:
- **Grid** — cards, mobile-first, 1-3 columns
- **List** — horizontal compact rows, dense info
- **Table** — desktop only (`hidden lg:block`), full column headers

Toggle button group: `bg-white rounded-lg border p-0.5`, active state `bg-indigo-600 text-white shadow-sm`, aria-pressed, aria-label.

## 7. Cards (Grid View)

Pattern:
```
┌──────────────────────────┐
│ ██ status stripe (top)   │
│ Number  ███ Badge ███    │
│ Title (bold, truncate)   │
│ Customer · Category      │
│ ████ progress bar ████   │
│ ┌──────┬──────┬──────┐   │
│ │Revenue│Expense│Profit│  │
│ └──────┴──────┴──────┘   │
│ Margin %            Date │
│ [View] [Edit] [PDF] [Del]│
└──────────────────────────┘
```

Hover: `hover:shadow-xl motion-safe:hover:-translate-y-1`, group-hover title turns indigo.

Progress bar: `h-1 bg-slate-100 rounded-full overflow-hidden` with animated `motion.div` width.

Action buttons: icon-only with `aria-label`, colored backgrounds (indigo/slate/emerald/rose), `hover:bg-*-600 hover:text-white`.

## 8. Table View (Desktop)

- Header row: `bg-slate-50`, `text-[9px] font-bold uppercase tracking-wider text-slate-500`
- Row hover: `hover:bg-slate-50`
- Actions column: icon buttons with colored bg, `hover:bg-*-600 hover:text-white` transition
- Sorting indicator: inline `ChevronDown` with `rotate-180` when asc

## 9. Pagination

Located below content, above modals. Shows "Page X of Y (N items)" with Prev/Next + page number buttons. Active page: `bg-indigo-600 text-white shadow-sm`, inactive: `border border-slate-200`.

## 10. Pull-to-Refresh (Mobile)

Custom touch handler on scrollY=0. Pull indicator: centered rotating indigo circle. `pullDistance` capped at 80px, trigger at 60px. Touch passive handlers with `{ passive: false }` for preventDefault.

## 11. Filters Panel

Expandable `AnimatePresence` section below search bar. Sections: Status (pills), Priority (pills), Period (pills), Sort (toggle-able asc/desc). Each pill: `text-[8px] font-bold uppercase tracking-wider`, active = `bg-indigo-600 text-white`.

## 12. Accessibility

- `aria-label` on every icon-only button (View, Edit, Delete, PDF)
- `aria-pressed` on toggle buttons (view mode, filter pills)
- `role="toolbar"` on view-mode toggle group
- `focus:ring-2 focus:ring-indigo-500 focus:outline-none` on interactive elements
- Status & priority communicated via icon + text + color (not color alone)
- `motion-safe:` prefix on translate animations for reduced-motion respect

## 13. Performance

- `backdrop-blur` limited to sticky header only (one element)
- Content area uses solid `bg-slate-50` for scroll perf
- `animate-pulse` for loading skeleton (CSS-only, no JS)
- Debounced search (300ms delay)
- Pagination with `perPage = 20` prevents large DOM

## 14. Persisting User Preferences

- View mode (grid/list/table) saved to `localStorage` key `project_view_mode`, restored on mount via `handleViewModeChange`
- Search term debounced to separate state (`searchTerm` → `search`)

## 15. Micro-Animations

| Element | Animation |
|---------|-----------|
| Page entry | `initial: opacity:0 y:10` → `animate: opacity:1 y:0`, staggered `delay: idx * 0.03` |
| Modal entry | `scale: 0.9` + `opacity: 0` → `1`, with backdrop blur |
| Toast | Drop from top, auto-dismiss 4s, colored border per type |
| Button hover | `hover:shadow-xl`, `active:scale-[0.97]` |
| Card hover | `motion-safe:hover:-translate-y-1` + `hover:shadow-xl` |
| Progress bar | `motion.div` with `duration: 0.8, delay: 0.1` |
| Loading skeleton | `animate-pulse` (pure CSS) |
| Sort direction | `ChevronDown` with `rotate-180 transition-transform` |

## 16. Modals

Bottom sheet on mobile (`sm:justify-end`), centered dialog on desktop (`sm:justify-center`). Common pattern:
- `z-[100]`, `bg-slate-900/40 backdrop-blur-sm` overlay
- `max-h-[90vh]` with scrollable body
- Header with icon + title + close button
- Step tabs or sections
- Footer with Cancel + Primary action buttons

Delete confirmation: centered mini-dialog with rose accent, `max-w-xs`.

## 17. Stats Row

Top of content area. Grid of cards with colored accent borders (indigo/emerald/blue). Each card:
- Decorative blur orb in top-right corner
- Icon in top-right (colored bg + border matching accent)
- Label (`text-[10px] font-bold uppercase tracking-wider`)
- Value (`text-2xl font-black`)
- Hover: `group-hover:scale-110` on blur orb
