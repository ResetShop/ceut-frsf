<!-- Source: CLAUDE.md | Last updated: 2026-09-27 -->

# Generators Reference

This file briefs agents on the eight Nx generators shipped under `@resetshop/generators`. **Always prefer a generator over hand-rolling boilerplate** when the task fits one of the shapes below. Generators emit files that follow this project's conventions automatically — file naming, path structure, type imports, store builder block ordering, repository projection types, OpenAPI registration, etc. Hand-written equivalents drift on every dimension.

When in doubt, scan the executable specs (`packages/generators/src/generators/<name>/index.spec.ts`) — they enumerate the exact paths and content each generator produces.

---

## Decision tree

| Task                                                                 | Use this generator                          | Notes                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Create a new app from the canonical template                         | `app`                                       | Only entry point — never copy `apps/reference-app` by hand                           |
| Add a new entity end-to-end (DB table → API → frontend store + page) | `crud`                                      | Orchestrates `drizzle-schema` + `backend-module` + `api-provider` + `store` + `page` |
| Add a new table to an existing module (no API yet)                   | `drizzle-schema`                            | One file: pgTable + relations + inferred types                                       |
| Add a new endpoint group to a backend module                         | `backend-module`                            | 5 files: routes, controller, repository, service, interfaces                         |
| Add a frontend API token + http impl + mock                          | `api-provider`                              | 4 files: interface (token), http impl, in-memory mock, `provideX()` function         |
| Add a NgRx Signal Store for an existing API                          | `store`                                     | 3 files: store, types (`State`/`ReadError`/`MutationError`), test spec               |
| Add a list page that uses an existing API + store                    | `page`                                      | Pass `--withStore=false --withApiProvider=false` to skip sub-generators              |
| Add a list page **and** wire its store + provider in one go          | `page` with `--withStore --withApiProvider` | Sub-generators run alongside the page                                                |
| Add a shared UI library component (component + spec + stories)       | `ui-component`                              | Appends a named export to `packages/ui/src/index.ts` by default                      |

If the task spans more than one row above, prefer `crud` (it stitches the slice and emits all five layers in one invocation).

---

## Naming convention for the `name` argument

All generators accept either camelCase or snake_case input — both produce the same output via `@nx/devkit`'s `names()` helper:

| Input             | `className`      | `propertyName`   | `fileName`        | `constantName`    |
| ----------------- | ---------------- | ---------------- | ----------------- | ----------------- |
| `product`         | `Product`        | `product`        | `product`         | `PRODUCT`         |
| `productCatalog`  | `ProductCatalog` | `productCatalog` | `product-catalog` | `PRODUCT_CATALOG` |
| `order_line_item` | `OrderLineItem`  | `orderLineItem`  | `order-line-item` | `ORDER_LINE_ITEM` |

All file paths produced by every generator are **kebab-case** (`order-line-item.ts`); JS identifiers inside generated files are **camelCase** (`orderLineItem`); types are **PascalCase** (`OrderLineItem`).

---

## Per-generator details

### `app`

> Generate a new Angular app pre-wired to `@resetshop/*` packages.

- **Invocation:** `npm run generate:app -- --name="My App"` (the only generator with an `npm run` wrapper, because it enforces canonical-template constraints).
- **Inputs:** `name` (required, human-readable display name; gets slugified). `directory` (default `apps`).
- **Output:** clones `apps/reference-app` into `apps/<slug>` with text files rewritten (slug substituted everywhere `reference-app` appears, `<title>` set to display name, `scope:starter` rewritten to `scope:app`, `IMPORT_MIGRATION.md` excluded). Binary files copied byte-for-byte.
- **Validation:** rejects empty/whitespace-only names, names that produce no slug (`!!!`), names that match reserved tooling slugs (`node`, `dist`), and the literal `reference-app`. Also throws if `apps/<slug>` already exists or if `apps/reference-app` is missing.
- **Hard rule:** `apps/reference-app` is upstream-owned and must never be modified by forks. Never create a new app by hand-copying `apps/reference-app`, scaffolding from `nx g @nx/angular:application`, or modifying `apps/reference-app` directly. See `docs/forking.md`.
- **Spec:** `packages/generators/src/generators/app/index.spec.ts` (15 tests, including `slugifyAppName` unit tests).

### `crud`

> Generate a full CRUD vertical slice (schema + backend + provider + store + page).

- **Invocation:** `nx g @resetshop/generators:crud product --module=catalog`.
- **Inputs:** `name` (required), `module` (required-by-convention; the parent backend module — defaults to `''`), `appRoot` (default `apps/reference-app`).
- **Output:** orchestrates four sub-generators. For `product` in `catalog` under `apps/reference-app`:
  - `apps/reference-app/src/db/schema/product.ts` (drizzle-schema)
  - `apps/reference-app/src/api/modules/catalog/product/{*.controller.ts, *.repository.ts, *.routes.ts, *.service.ts, interfaces.ts}` (backend-module)
  - `apps/reference-app/src/app/providers/product/{*.ts, *.interface.ts, *.mock.ts, *.provider.ts}` (api-provider)
  - `apps/reference-app/src/app/store/product/{*.store.ts, *.store.spec.ts, *.types.ts}` (store)
  - `apps/reference-app/src/app/pages/dashboard/product/product-list/{*.ts, *.spec.ts}` (page, with `withStore=false withApiProvider=false`)
- **Post-step (the generator logs these as TODOs):**
  1. Add the route to `<appRoot>/src/app/pages/dashboard/dashboard.routes.ts`. Put `provide<Class>()` and `<Class>Store` (plus `provideToast()` if the pages fire toasts) in the `providers` of the section's **parent route**, the lowest route that is a common parent of every page using them, and add the generated list page as its `''` child. Child pages share the parent's instances; never repeat the providers on each page (see [`angular-di.md`](angular-di.md) → "Pattern 1 — Route-Scoped Feature Providers")
  2. Add a navigation entry to the `NavigationConfig`
  3. Register the new schema in the drizzle connector at `apps/reference-app/src/db/schema/all.ts`
- **Spec:** `packages/generators/src/generators/crud/index.spec.ts`.

### `drizzle-schema`

> Generate a Drizzle table schema with optional relations.

- **Invocation:** `nx g @resetshop/generators:drizzle-schema product`.
- **Inputs:** `name` (required), `directory` (default `src/db/schema`).
- **Output:** one file at `<directory>/<kebab-case>.ts` containing `pgTable(...)`, `relations(...)`, and inferred `Type`/`NewType` exports.
- **Convention note:** the generated `pgTable('orderLineItem', ...)` uses the camelCase JS identifier as the table-name string. Existing schemas in `apps/reference-app/src/db/schema/` use snake_case strings (`pgTable('order_line_item', ...)`). Discrepancy is known; rename by hand for new tables that must match the existing convention.
- **Don't use it when:** the table needs custom column types beyond `serial`/`varchar`/`boolean`/`timestamp`, multiple unique indexes, or composite foreign keys. The template emits a minimal scaffold and is not a full schema-design tool.
- **Spec:** `packages/generators/src/generators/drizzle-schema/index.spec.ts`.

### `backend-module`

> Generate a Hono backend module (routes, controller, service, repository).

- **Invocation:** `nx g @resetshop/generators:backend-module product --module=catalog`.
- **Inputs:** `name` (required), `module` (default `''`; the parent module path), `directory` (default `src/api/modules`).
- **Output:** five files at `<directory>/<module>/<kebab-case>/` (or `<directory>/<kebab-case>/` if `module` is empty):
  - `<kebab-case>.routes.ts` — `createRoute()` definitions for `list*` and `get*` endpoints
  - `<kebab-case>.controller.ts` — `registerRoute()` handlers wired to the service
  - `<kebab-case>.repository.ts` — `Drizzle<Class>Repository extends BaseRepository`
  - `<kebab-case>.service.ts` — `<Class>Service` with `getAll<Class>s` / `get<Class>` methods
  - `interfaces.ts` — `<Class>Repository`, `<Class>Service`, `List<Class>sParams`, `<Class>ServiceDeps`
- **Don't forget:** the new module router (`index.ts`) and Awilix container registration are NOT generated. Wire them by hand into `src/api/routes.ts` and `src/api/container/container.ts` after running.
- **Spec:** `packages/generators/src/generators/backend-module/index.spec.ts`.

### `api-provider`

> Generate a frontend API provider (interface, Http impl, mock, provider function).

- **Invocation:** `nx g @resetshop/generators:api-provider product`.
- **Inputs:** `name` (required), `directory` (default `src/app/providers`).
- **Output:** four files at `<directory>/<kebab-case>/`:
  - `<kebab-case>.interface.ts` — `<Class>Api` TypeScript interface + `InjectionToken<<Class>Api>`
  - `<kebab-case>.ts` — `Http<Class>Api implements <Class>Api` with `@Injectable({ providedIn: 'root' })`
  - `<kebab-case>.mock.ts` — `InMemory<Class>Api implements <Class>Api` + `provide<Class>Mock()`
  - `<kebab-case>.provider.ts` — `provide<Class>()` returning `EnvironmentProviders` via `makeEnvironmentProviders`
- **Don't forget:** the methods on the interface and on `Http<Class>Api` / `InMemory<Class>Api` are TODO stubs. The generator's job is the boilerplate (token + provider function + mock skeleton); method bodies are application work.
- **DI rationale:** why the token has no `providedIn`/`factory`, why `provide<Class>()` returns `EnvironmentProviders`, and where to register it (root vs. route, co-provided with its store) — see [`angular-di.md`](angular-di.md) → "Frontend API Provider Pattern" and "Pattern 1 — Route-Scoped Feature Providers".
- **Spec:** `packages/generators/src/generators/api-provider/index.spec.ts`.

### `store`

> Generate a NgRx Signal Store following project conventions.

- **Invocation:** `nx g @resetshop/generators:store product`.
- **Inputs:** `name` (required), `directory` (default `src/app/store`), `project` (declared in schema, currently unused).
- **Output:** three files at `<directory>/<kebab-case>/`:
  - `<kebab-case>.store.ts` — `<Class>Store` via `signalStore(...)` with `withState`, `withComputed`, `withMethods`, `withHooks`. Block ordering matches CLAUDE.md's "Store builder block structure" rule.
  - `<kebab-case>.types.ts` — `<Class>State`, `<Class>ReadError`, `<Class>MutationError`, `initial<Class>State`
  - `<kebab-case>.store.spec.ts` — Angular Testing Library-style spec scaffolding with `clearAllMocks()` and `fn()` from `@test-utils`
- **Don't forget:** the API-token consumption (`inject(<Class>Api)`) is TODO-commented in the generated store; uncomment after running `api-provider` (or use `crud`, which runs both).
- **Spec:** `packages/generators/src/generators/store/index.spec.ts`.

### `page`

> Generate a route page component with optional store and API provider.

- **Invocation:** `nx g @resetshop/generators:page product --withStore --withApiProvider`.
- **Inputs:** `name` (required), `route` (optional, defaults to `n.fileName` for the route-registration log message), `withStore` (default `false`), `withApiProvider` (default `false`), `directory` (default `src/app/pages/dashboard`).
- **Output (page only):** two files at `<directory>/<kebab-case>/<kebab-case>-list/`:
  - `<kebab-case>-list.ts` — standalone Angular component using `app-page-shell` and `TranslatePipe`
  - `<kebab-case>-list.spec.ts` — `@testing-library/angular` render scaffolding
- **Output (`--withApiProvider`):** also runs `api-provider` at `<directory>/../../providers/<kebab-case>/`.
- **Output (`--withStore`):** also runs `store` at `<directory>/../../store/<kebab-case>/`.
- **Known limitation — sibling path coupling:** the `../../providers` and `../../store` walk-up segments assume `directory` is exactly `src/app/pages/dashboard` (depth 4). Shallower directories under-walk: e.g. `directory: src/app/admin` produces sibling files at `src/providers/...` and `src/store/...`, NOT `src/app/providers/...`. The locked-in test in `page/index.spec.ts` asserts this behaviour. Stick with the default `directory` unless you also disable the sub-generators.
- **Don't forget:** the route registration is logged as guidance, not auto-wired. Add the suggested `{ path: '<route>', loadComponent: ... }` entry to `dashboard.routes.ts` by hand after running. With `--withStore` / `--withApiProvider`, do not put the generated providers on that page route: register `provide<Class>()` and `<Class>Store` once on the section's **parent route** (creating one if the page is the section's first), and nest the page under it, so every page of the section shares one instance (see [`angular-di.md`](angular-di.md) → "Pattern 1 — Route-Scoped Feature Providers").
- **Spec:** `packages/generators/src/generators/page/index.spec.ts`.

### `ui-component`

> Generate a shared UI library component with spec and Storybook story.

- **Invocation:** `nx g @resetshop/generators:ui-component tooltip`.
- **Inputs:** `name` (required), `directory` (default `packages/ui/src/lib`), `exportFromIndex` (boolean, default `true`), `inlineTemplate` (boolean, default `true`), `inlineStyle` (boolean, default `true`).
- **Output:** three files at `<directory>/<kebab-case>/` (plus optional sidecars — see below):
  - `<kebab-case>.ts` — `@Component` standalone scaffold with an `app-` element selector (change detection is left at Angular 22's OnPush default — no explicit `changeDetection` is emitted). Uses an inline `template:` and inline `styles:` block by default; when either of the flags below is `false`, the corresponding sidecar file is emitted and the decorator points at `templateUrl`/`styleUrl` instead.
  - `<kebab-case>.spec.ts` — Angular Testing Library `render` scaffold with `clearAllMocks()` from `@resetshop/util/test-utils` in `beforeEach`.
  - `<kebab-case>.stories.ts` — Storybook meta with `tags: ['autodocs']` and `parameters.docs.canvas.sourceState: 'shown'` (enforced project-wide by the `custom-storybook/storybook-source-state` ESLint rule).
- **Template/style sidecars:**
  - Pass `--inlineTemplate=false` to emit a sibling `<kebab-case>.html` and switch the decorator to `templateUrl: './<kebab-case>.html'`. Use this for components with non-trivial markup (e.g. existing `drawer`, `data-table`, `confirm-dialog`).
  - Pass `--inlineStyle=false` to emit a sibling `<kebab-case>.css` (pre-seeded with a `/* TODO */` stub) and switch the decorator to `styleUrl: './<kebab-case>.css'`. Use this for components with non-trivial styling (e.g. existing `combobox`, `select`, `drawer`). The `@reference "#tailwind-theme"` directive is auto-injected at build time by the root `postcss-inject-tailwind-reference.js` plugin, so it never appears in component source.
  - Inline mode keeps the component a single file, which is the project's prevailing pattern for small components (`button`, `badge`, `alert`, `spinner`); external mode matches the convention for the larger interactive components listed above.
- **Side effect:** when `exportFromIndex` is `true` (default), appends `export { <Class> } from './lib/<kebab>/<kebab>'` to `packages/ui/src/index.ts`. Duplicate appends are guarded — re-running the generator with the same name is idempotent for the index.
- **Don't forget:** fill in the empty template/styles, replace the stub spec assertion with a semantic query, document each public `input()` in `argTypes`, and adjust the story `title` if the component belongs under a non-`Components/` namespace (e.g., `UI / Card`).
- **Spec:** `packages/generators/src/generators/ui-component/index.spec.ts`.

---

## Writing or changing a generator: native ESM only

`packages/generators` is `"type": "module"`, and every generator must load and run as a **native ES module**. Nothing in the package may depend on CommonJS.

### How Nx loads a local generator

Nx resolves the generator's `factory` from `generators.json` to its `index.ts` **source** file. On Node 24 it loads that file with Node's native TypeScript type stripping. Because the package is `"type": "module"`, Node treats the file as ESM. Relative imports inside it resolve under ESM rules too.

If that native load throws, Nx does **not** fail. It silently registers swc/ts-node and recompiles the generator to **CommonJS**, where `__dirname` and extension-less `require` exist. This fallback only shows up under `NX_VERBOSE_LOGGING=true`, as a line such as `Native ESM named export linkage failed; falling back to swc/ts-node + tsconfig-paths`. The fallback hides ESM bugs: a generator can work only by accident, and a generator that loads natively can still crash on a CommonJS global. Its known triggers:

| Trigger                                                 | Example                                             | Native ESM error                          |
| ------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| A type imported as a value                              | `import { Tree, generateFiles } from '@nx/devkit'`  | `does not provide an export named 'Tree'` |
| An extension-less relative import                       | `import storeGenerator from '../store/index'`       | `Cannot find module …/store/index`        |
| TypeScript syntax that stripping can't erase            | `enum`, constructor parameter properties, namespace | `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`       |
| A CommonJS global (fails at run time, with no fallback) | `joinPathFragments(__dirname, 'files')`             | `__dirname is not defined`                |

### The rules

- **Templates:** locate the `files/` directory with `resolveTemplateDir(import.meta.url)` from `packages/generators/src/utils/resolve-template-dir.ts`. Never use `__dirname` / `__filename`; ESLint rejects them anywhere in `packages/generators`, including `vitest.config.ts`.
- **Type imports:** use `import type` for anything used only as a type (`Tree`, schema interfaces). `verbatimModuleSyntax` in `packages/generators/tsconfig.json` makes a missing `type` a compile error.
- **Relative imports:** write the explicit `.ts` extension (`'../store/index.ts'`). `moduleResolution: nodenext` rejects extension-less relative imports, and `rewriteRelativeImportExtensions` rewrites them to `.js` in the `build` output.
- **Syntax:** use only erasable TypeScript. `erasableSyntaxOnly` rejects enums (use `Object.freeze()`), parameter properties and namespaces.

### How it is enforced

- **Statically:** `npm run typecheck` enforces the tsconfig options above, and `npm run lint` enforces the ESLint rule above.
- **End to end:** the `generators:generators-esm-guard` target (`scripts/check-generators-load-as-esm.mjs`) dry-runs all eight generators with `NX_VERBOSE_LOGGING=true`. It fails if any run errors, lists no files, or prints a fallback notice. It runs in Batch 1 of `npm run ci` / `ci:verify` and in the `check` job of `.github/workflows/ci.yml`.

Vitest specs alone can't catch these bugs. Vitest provides `__dirname` and resolves extension-less imports itself, so a spec passes even when the generator fails under Nx.

Forks that add their own generators to `packages/generators` follow the same rules, and must add them to the `GENERATORS` list in `scripts/check-generators-load-as-esm.mjs`.

---

## Cross-references

- `packages/generators/generators.json` — authoritative one-line description for each generator, used by `nx g --help`.
- `packages/generators/src/generators/<name>/index.spec.ts` — executable specs (~74 tests across all 8).
- `packages/generators/src/generators/<name>/schema.json` — JSON schema for each generator's CLI options, including defaults.
- `README.md` "Generators" section — human-facing version of the decision tree (shorter than this file).
- `CLAUDE.md` "Canonical App Creation Workflow" — the `app` generator's rationale.
- `docs/forking.md` — the broader fork-distribution model that the `app` generator enforces.
