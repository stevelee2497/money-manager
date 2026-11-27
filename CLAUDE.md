# CLAUDE.md — Jupiter Wallet

Standalone wallet and transaction manager (Angular + Cloudflare Workers + D1 + R2 + Auth0). `frontend/` is an Angular (standalone components, signals, zoneless) + TypeScript SPA built with the Angular CLI (Cloudflare Pages). `backend/` is a Hono Worker on D1 (SQLite) and R2, with Auth0 for login. It was split out of the SourceBase .NET system and is independent of it.

- Backend: `backend/` — `npm --prefix /home/ubuntu/jupiter-wallet/backend test | run typecheck | run dev`.
- Frontend: `frontend/` — `npm --prefix /home/ubuntu/jupiter-wallet/frontend test | run build | run dev`.
- Docs: `docs/api.md` (contract), `docs/setup-and-deploy.md` (setup, Auth0, D1, R2, Pages, CI), `docs/requirements.md` (original brief).

## The Ponytail rule: keep it simple

Every decision is checked against this. When two options work, pick the one with less code, fewer files and fewer moving parts.

- No abstraction until the third use. Duplicating a few lines beats a premature helper.
- No new dependency without a clear reason. Prefer the platform (`fetch`, `Intl`, `crypto.randomUUID`, D1 `batch`) over a library.
- Flat structure. One file per backend resource, one folder per page.
- Raw SQL, plain signals (`signal` / `computed` / `effect`), plain `fetch`. No ORM, no state or data-fetching library (no NgRx, no `HttpClient`), no DI container in the backend.
- No speculative features, config flags or "future" hooks. Delete dead code instead of commenting it out.
- A short function that does one thing, with guard clauses and early returns instead of nested `if`.
- Constants over magic strings. Comments only for the non-obvious "why".

## Layout

```
backend/   src/index.ts (app + middleware)   src/lib/ (auth, errors, validate, db, json)
           src/features/<resource>.ts        migrations/NNNN_name.sql   test/features/<resource>/
frontend/  src/lib/ (api.service, toast.service, theme.service, format, dateRanges, types)
           src/components/ (shared UI, *.component.ts)
           src/pages/<route>/ (<route>.component.{ts,html}, components/ (page-only UI), utils/)
           src/app.routes.ts (routes)
docs/      requirements.md  api.md  setup-and-deploy.md
```

## Backend conventions

- One file per resource in `src/features/` exporting a Hono router: zod schema, SQL and handlers together. Mounted in `src/index.ts`; everything under `/api` goes through `requireAuth` except `GET /api/icons/files/:key`.
- **Owner scoping on every query**: filter by `user_id = c.get("userId")` (the Auth0 `sub`). A row that isn't yours is a 404, never a 403. Exceptions: system rows (`is_system = 1`) are visible to all but immutable (403).
- **Errors**: throw `notFound()`, `forbidden()`, `badRequest()`, `fieldError(field, msg)` from `lib/errors.ts`. The body shape is `{ traceId, code, message, errors }`. Don't invent new shapes.
- **Validation**: `parseBody` / `parseQuery` with zod. Strings are trimmed, query keys listed in `arrayKeys` accept repeats. The nil GUID in a route id is a 400 (`idParam`).
- **Partial updates** use null-coalescing: `body.name ?? existing.name`.
- **Multi-row writes use `DB.batch([...])`** so they are atomic (transfers, wallet delete). Never two separate `run` calls for one logical change.
- JSON is camelCase with nulls omitted (`ok(c, data)`); columns are snake_case. Dates are `yyyy-MM-dd` text. Enums are strings (`Income`, `Expense`, ...).
- Schema changes are new numbered files in `migrations/`; never edit an applied migration.
- Config goes in `wrangler.jsonc` vars (and `env.d.ts`), secrets in `.dev.vars` / `wrangler secret`. Never commit secrets.

## Frontend conventions

- One standalone component per file, always `ChangeDetectionStrategy.OnPush`. Inline template when short; pages and other large templates go in a sibling `.html` (`templateUrl`). Inputs/outputs via `input()` / `output()` / `model()`, state in signals. Hosts use `host: { class: "contents" }` so they don't add a layout box. Modal fields bind with `[(ngModel)]` to signals.
- Load data with `resource({ params, loader })` and refresh with `.reload()`. Never fetch in `effect()`. Shared state lives in `providedIn: "root"` services (`ToastService`, `ThemeService`), not module-level signals.
- Pages are lazy routes (`loadComponent`) in `src/app.routes.ts`. The folder tree mirrors the route tree: `pages/<route>/<route>.component.ts` is the one smart component (route-level state and loading); its page-only UI goes in `components/`, helpers and constants in `utils/`. Don't repeat the route name in child files. Shared UI used by several pages stays in `src/components/`. Every `.html` sits beside the component that owns it.
- File suffixes: `*.component.ts`, `*.service.ts`; plain helper modules have none.
- Reuse the shared classes in `src/styles.css` (`.card`, `.btn-primary|secondary|danger`, `.btn-sm`, `.form-input`, `.form-label`, `.badge-*`) and the shared components. Match the original Blazor look exactly: Tailwind v4 defaults, indigo primary, gray neutrals, dark mode via the `dark` class.
- Render every icon through `<app-icon [value]="..." />` (emoji, `<path…/>` SVG fragment, or `http` image URL). Never print an icon value as text.
- Call the API only through the `Api` service (`inject(Api)`, `lib/api.ts`): it attaches the Auth0 token and shows error toasts. Add one method per endpoint there.
- Mobile first. Check layouts at 320px and 375px; keep the original `sm` / `md` / `lg` breakpoints.
- Amounts: `formatAmount` (no decimals, thousands separators). Dates: `dd MMM` in lists.
- No sidebar. The top bar has two icons: Wallets (home) and Categories.
- Only the four `VITE_*` variables reach the browser, baked in as global constants by `scripts/ng.mjs` (declared in `src/env.d.ts`). None of them is a secret. Read them inside functions, not at module top level, so tests can import the module.

## Testing

- Backend: vitest in the Workers runtime (`@cloudflare/vitest-plugin`) against in-memory D1 and R2. `npm --prefix backend test`.
- Every test creates its own user with `uniqueUser()` and signs a token with `api(user, ...)`, so tests are independent. Payloads are inline in the test; use the arrange helpers in `test/helpers.ts` (`createWallet`, `createTransaction`, ...) only for setup.
- Test names keep the original .NET ids (`WALLETS-CREATE-001: ...`). One test file per endpoint under `test/features/<resource>/`.
- Every behaviour change or bug fix gets a test. Cover 401, validation 400, ownership 404 and the happy path.
- Test data is always synthetic. Never use real personal or health data.
- Frontend: `ng test` (Vitest + jsdom) for pure helpers and small components. Test files are `*.test.ts` next to the code. Import `describe`/`expect`/`it` from `vitest`. One top-level `describe` per unit (one per exported function for helpers); no "should create" tests; render components with `TestBed.createComponent(X, { bindings: [inputBinding(...)] })`. `npm --prefix frontend test`.

## Shell prompts

Claude Code's "Contains brace with quote character (expansion obfuscation)" check can't be turned off with an allow rule. Avoid triggering it: create or change files with the Write / Edit tools, not heredocs, `python -c` or `sed` with JSON-like `{"…"}` in a Bash command. Keep Bash for short commands (`npm`, `git`, `ls`).

Read files with the Read tool (several Read calls in parallel), never with Bash loops, `cat`, `head`, `sed -n` or `echo` chains like `for f in ...; do cat "$f"; done`. Those compound commands always ask for permission. One simple command per Bash call. No `for` loops, and no `&&` / `;` chains mixing in `cd`.

## Before finishing

```
npm --prefix backend run typecheck && npm --prefix backend test
npm --prefix frontend run build && npm --prefix frontend test
```
