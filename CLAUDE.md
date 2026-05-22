# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # dev server on port 3000
pnpm build      # production build → dist/
pnpm preview    # serve dist/ locally
```

No test suite exists. There is no lint script; ESLint config is present in `eslint.config.mjs` but not wired to a script.

## Environment

Copy `.env.example` to `.env` and set:

```
VITE_API_BASE_URL=http://localhost:3001   # backend origin (no trailing slash needed by axios)
```

All Vite env vars exposed to the browser must be prefixed `VITE_`.

## Architecture

**Vite + React 18 SPA** (not Next.js — the README is a stale template). Package manager is **pnpm**.

### Routing

Hash-based custom router in `app.jsx:useHashRouter`. No React Router. URLs look like `#/sale`, `#/analytics`, etc. The switch in `App` maps routes to screen components. Back button works via `popstate`.

### Auth & locking

- PIN-based auth: user enters PIN → backend returns JWT → stored in a module-level variable in `api.js` (never localStorage).
- `setToken` / `clearToken` / `getToken` manage the in-memory token.
- Session expiry (401 response) fires a `elys:session-expired` DOM event; `app.jsx` listens and locks the screen.
- Inactivity timer and `lockAfterSale` both call `lock()` in `app.jsx`, which clears the token and renders `<LockScreen>`.

### API layer (`src/api.js`)

Central axios instance with base URL from `VITE_API_BASE_URL`. All backend calls go through named export objects:

`auth`, `staff`, `catalog`, `categories`, `sales`, `inventory`, `timeclock`, `goals`, `promotions`, `alerts`, `payroll`, `analytics`, `reports`, `upload`, `settings`, `prefs`

Each object exposes methods that handle request/response shape translation via private `from*` / `to*` adapters (e.g. `fromUser`, `toCatalogBody`). Backend returns numeric columns as strings from PostgreSQL — all adapters coerce with `Number()`. Always use these adapters when adding new endpoints; never put raw `r.data` directly into state.

### State

Most screens use local `useState` + `useEffect` for data fetching (not TanStack Query hooks, even though `QueryClientProvider` wraps the app). `useTweaks` in `tweaks-panel.jsx` owns UI preference state.

### Theming

- `data-theme="dark"|"light"` on `<html>` switches the CSS token set in `styles.css`.
- `--magenta` CSS var is the primary accent color, settable at runtime.
- `data-density="compact"|"comfortable"` on `<html>` adjusts `--pad`.
- These are applied in `app.jsx` via `useEffect` on tweak changes, and persisted to a cookie (`elys_prefs`).

### Cross-component events (DOM)

Components communicate via custom DOM events instead of prop drilling:

| Event | Direction | Purpose |
|---|---|---|
| `elys:session-expired` | api.js → app.jsx | 401 received, force lock |
| `elys:settings-updated` | screens.jsx → app.jsx | lock settings changed |
| `elys:toggle-dark` | menu.jsx → app.jsx | dark mode button |

### Screen files

- `app.jsx` — root: auth state, routing, theming, inactivity lock, toast
- `menu.jsx` — `TopBar` (shared header) + `MainMenu` (home screen)
- `sales.jsx` — POS / point-of-sale screen
- `analytics.jsx` — charts (Recharts)
- `staff.jsx` — staff management + shared modals (`ConfirmModal`, `EmployeeModal`, `PinChangeModal`)
- `reports.jsx` — report downloads (PDF/Excel blobs)
- `screens.jsx` — `Inventory`, `Progress`, `Team`, `Settings` (bundled because they share imports)
- `lockscreen.jsx` — PIN entry UI
- `tweaks-panel.jsx` — floating settings panel + `useTweaks` hook
- `icons.jsx` — icon components (`Icons.*`)
- `utils.js` — `fmtMoney` (USD formatter, `en-US` locale)

### UI language

All labels, toasts, and user-facing strings are in **Spanish (es-MX)**.

## Deployment

Deployed on Railway. `railway.toml` runs `pnpm install --frozen-lockfile && pnpm build` then `pnpm start` (`vite preview --host 0.0.0.0`). Allowed preview hosts: `elysalon.shop`, `react-frontend-dev-c187.up.railway.app`.
