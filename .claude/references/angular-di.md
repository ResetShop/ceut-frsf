<!-- Source: CLAUDE.md | Last updated: 2026-09-18 -->

# Angular Dependency Injection

The single home for this repo's Angular DI guidance: how services get their lifetime, how routes register providers, and how the frontend API tokens are wired. `CLAUDE.md`, `clean-architecture.md`, `generators.md`, and `testing.md` point here instead of restating it.

---

## The Core Distinction: Singleton-ness vs. Eager Activation

Two **orthogonal** concerns are easy to conflate. Keep them apart:

| Concern                                    | What produces it                                                                                | What it does **not** do                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Singleton-ness** (one shared instance)   | `@Injectable({ providedIn: 'root' })` **+ never re-providing the class** in any route/component | —                                                       |
| **Eager activation** (instance exists now) | `provideEnvironmentInitializer(() => inject(X))` in a route's `providers`                       | Does **not** provide, scope, or make anything singleton |

- **A bare class in a route's `providers` is `useClass`.** It mints **one new instance per route injector**, shadowing the root singleton for that route and its children. Listing a `providedIn: 'root'` class there silently breaks singleton-ness.
- **A `providedIn: 'root'` service is lazy.** If nothing injects it, it is never constructed — and its constructor/field-initializer side effects (an `effect()`, a subscription) never run.
- **`provideEnvironmentInitializer(() => inject(X))` only wakes the singleton up.** `inject(X)` inside it resolves _up_ the injector tree to the existing root instance (because nothing below re-provides `X`). It creates nothing new.

⇒ `provideEnvironmentInitializer` is **not** a way to "declare a provider in a route and keep it singleton." Singleton-ness comes from `providedIn: 'root'` + not re-providing; the initializer is only the activation half.

---

## Pattern 1 — Route-Scoped Feature Providers (the norm)

Domain stores and their API tokens are **intentionally route-scoped instances**, provided once per **section** of the route tree. They are wired via their `provideX()` environment-provider functions and listed in the `providers` array of the section's **parent route**, never on the individual pages. Do **not** collapse them into root singletons.

Domain stores keep `providedIn: 'root'` for tree-shaking, but must be **explicitly provided** at the route level alongside their API token dependencies. `providedIn: 'root'` is a default — when a `providedIn: 'root'` service is listed in a route's `providers`, Angular creates it in that route's `EnvironmentInjector` instead of the root injector. Every `inject()` inside the store factory then resolves from that route's injector, where the API tokens are available.

**Pages under one parent share its instance.** A route's `EnvironmentInjector` serves that route **and all of its children**, so every page nested under the parent that lists a provider receives the **same** instance, and moving between those pages keeps it and its state. This is why providers belong on the lowest route that is a common parent of every page using them.

```typescript
// ✅ Correct — providers listed once on the section's parent route; the list and detail pages share them
{
  path: 'users',
  title: 'DASHBOARD.USERS.NAV',
  providers: [provideUsers(), provideRoles(), UsersStore, RolesStore, provideToast()],
  children: [
    { path: '', loadComponent: () => import('./users/users-list/users-list'), /* guard… */ },
    { path: ':id', loadComponent: () => import('./users/user-detail-page/user-detail-page'), /* guard… */ },
  ],
}

// ❌ Incorrect — the same providers repeated on sibling page routes: each page gets its own store instance
{ path: 'users', loadComponent: …, providers: [provideUsers(), provideRoles(), UsersStore, RolesStore] },
{ path: 'users/:id', loadComponent: …, providers: [provideUsers(), provideRoles(), UsersStore, RolesStore] },

// ❌ Incorrect — store not listed, so it resolves from the root injector, where the API token is missing
{ path: 'users', providers: [provideUsers(), provideRoles()], children: [...] }
```

**Rules:**

- List a domain store and its `provideX()` API providers **once**, on the lowest route that is a common parent of every page using them; child pages declare no providers of their own for it
- Pages under one parent share its instance; **sibling** routes never do — see [Sibling injectors](#sibling-injectors-cannot-share-a-route-scoped-instance). A store used by two sibling sections exists once per section (`RolesStore` under both `users` and `authorization`)
- Permission guards stay on the child pages when each needs a different permission (`authorization/permissions` vs. `authorization/roles`); they can move to the parent when every child requires the same one
- `AuthStore` and `UIStore` are exceptions — their dependencies (`AuthApi`) are provided at root in `app.config.ts`, so they are genuine root singletons and are never listed in a route's `providers`
- Never remove `providedIn: 'root'` from stores — it enables tree-shaking and serves as a fallback when no explicit provider is given
- `app.config.ts` registers `provideRouter(…, withExperimentalAutoCleanupInjectors())`, so a section's `EnvironmentInjector` — and every store in it — is destroyed once the user leaves the section. Moving between the section's child pages keeps the instances; leaving and re-entering the section creates fresh ones

---

## Pattern 2 — Root Singleton with Side Effects, Activated per Route

For a `providedIn: 'root'` service whose side effects must be live on specific routes:

1. **Never** list it (or any of its root-singleton dependencies) in a route's `providers`.
2. Activate the single root instance per route with `provideEnvironmentInitializer(() => inject(TheService))`, typically wrapped in a `provideX()` function.

**Canonical example: `provideToast()` / `ToastBridgeService`.** `ToastBridgeService` holds an `effect()` that mirrors `UIStore.notifications()` into `NgpToastManager`. Both it and `NgpToastManager` are `providedIn: 'root'` singletons (the manager renders into `document.body`, so where it is provided is irrelevant), and the bridge passes its presentation options per `show()` — so **no `NgpToastConfig` is registered anywhere**, and nothing toast-related is forced onto routes that never show toasts. `provideToast()` therefore provisions **nothing new**:

```typescript
// components/toast/toast.provider.ts
export function provideToast(): EnvironmentProviders {
	return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(ToastBridgeService))])
}
```

The `inject()` resolves up to the one root instance, so every route that calls `provideToast()` shares the same bridge and a notification renders exactly once.

```typescript
// ✅ Correct — provideToast() on each section that fires toasts; it only activates the root-singleton
// ToastBridgeService (no new instance). Sections that fire no toasts (settings, health, …) add nothing.
{
  path: 'users',
  providers: [provideUsers(), provideRoles(), UsersStore, RolesStore, provideToast()],
  children: [/* '', ':id' */],
}

// ❌ Incorrect — listing NgpToastManager / ToastBridgeService as classes mints route-scoped instances that
// shadow the root singletons; several live bridges each render the SHARED UIStore notifications, so a
// notification (e.g. the deny toast on a denied deep-link of a parameterized route) renders more than once
{
  path: 'users',
  providers: [provideUsers(), NgpToastManager, ToastBridgeService /* ← wrong */],
  children: [/* '', ':id' */],
}
```

**Rules:**

- Add `provideToast()` to the parent route of each section that fires toasts, next to the section's other providers. It is activation-only, so calling it in many sections still yields **one** shared bridge.
- Never list `ToastBridgeService` or `NgpToastManager` as a class in any route's `providers` — that mints a route-scoped instance and resurrects the duplicate-toast bug.
- Do **not** register `provideToastConfig` (it would have to live at app root for the root-singleton manager to read it, leaking toast config onto every route). Per-toast presentation defaults live in `DEFAULT_TOAST_OPTIONS` (`components/toast/toast.config.ts`) and are spread into `NgpToastManager.show()` by `ToastBridgeService` — the one place to tune `placement` / `dismissible`. Container-only settings the manager reads from its config token (`maxToasts`, `gap`, `zIndex`) are **not** expressible per `show()` and use ng-primitives' defaults (`maxToasts` is already 3); changing them is the only thing that would require a root `provideToastConfig`.
- Once first activated, the bridge persists for the session (it is a root singleton).

**On-demand activation outside a route.** A toast can also be fired from a route that never calls `provideToast()` — a 403 handled by `forbiddenInterceptor` on any page (settings, health, an auth page). The interceptor activates the bridge **on demand**, calling `injector.get(ToastBridgeService)` inside its 403 branch. It deliberately does not `inject(ToastBridgeService)` at the top of the interceptor: that would instantiate the bridge on the first HTTP request of every session, keeping it always-on app-wide instead of only when a 403 actually needs rendering.

### Scope limit

The activation pattern is for **root singletons with side effects only**. It must never be read as "use `provideEnvironmentInitializer` to make route providers singleton" — applying it to stores or API tokens would break the per-section store/API-token model of [Pattern 1](#pattern-1--route-scoped-feature-providers-the-norm).

---

## Current Route Registrations (`dashboard.routes.ts`)

| Route                            | Providers                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `dashboard` (shell)              | `provideNavigation()`, `provideNavigationConfig(dashboardNavigationConfig)`                  |
| `users` (section parent)         | `provideUsers()`, `provideRoles()`, `UsersStore`, `RolesStore`, `provideToast()`             |
| ↳ `''`, `':id'`                  | — (share the section's instances)                                                            |
| `authorization` (section parent) | `provideRoles()`, `providePermissions()`, `RolesStore`, `PermissionsStore`, `provideToast()` |
| ↳ `''`, `permissions`, `roles`   | — (share the section's instances)                                                            |

Update this table whenever a route's `providers` change.

---

## DI Mechanics

Verified against angular.dev ([Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection), [Defining dependency providers](https://angular.dev/guide/di/defining-dependency-providers), [`Route`](https://angular.dev/api/router/Route)).

### Route `providers` create an `EnvironmentInjector`

A route with a `providers` array gets its own `EnvironmentInjector`, shared by that route and its children. A token listed there with `useClass` (or the bare-class shorthand) gets a **fresh instance** in that injector, shadowing any ancestor registration — including `providedIn: 'root'`.

### Provider recipes

| Recipe                              | Result                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `useClass` / bare class `MyService` | **New** instance in this injector                                                                 |
| `useExisting: Other`                | **Alias** — two tokens, one instance (whatever `Other` resolves to from this injector)            |
| `useValue: obj`                     | The given object, shared by everyone resolving this registration                                  |
| `useFactory: () => …`               | Whatever the factory returns — new unless it returns a shared/ancestor instance; evaluated lazily |

### Sibling injectors cannot share a route-scoped instance

Two sibling routes each providing the same store get two instances; neither can see the other's. In this repo, `users` and `authorization` are sibling sections that both list `RolesStore`, so each section has its own. Sharing comes from a **common ancestor** — a parent route that lists the provider once (its child pages all receive that instance), or root via `providedIn: 'root'` with no re-provision below — or from **aliasing** (`useExisting`/`useValue`/`useFactory` pointing at an instance resolved elsewhere). Only `useClass`/bare-class registrations mint a per-injector instance.

Verified against the installed Angular 22 with `withExperimentalAutoCleanupInjectors()`: with a store listed on a parent route, its children `list`, `detail`, and `roles` all received the same instance; navigating to a sibling route outside the parent received a different one; and re-entering the parent after leaving it created a new instance.

### `useExisting` — two tokens, one instance

`useExisting` is the tool for "one instance reachable under two distinct tokens." It is **not** a tool for de-duplicating a re-provided class — the fix for that is to stop re-providing it.

This repo's `FormFieldCustomControl` contract is the canonical case: a custom control extends the abstract `FormFieldCustomControl` class and registers itself under that token, so `<app-form-field>` can discover the projected control through DI without knowing its concrete type. `forwardRef` is required because the class is referenced inside its own decorator, before the class binding exists.

```typescript
// pages/dashboard/roles/permission-selector/permission-selector.ts
import { FormFieldCustomControl } from '@resetshop/ui/form-field/form-field-custom-control'

@Component({
  providers: [{ provide: FormFieldCustomControl, useExisting: forwardRef(() => PermissionSelector) }],
})
export class PermissionSelector extends FormFieldCustomControl implements FormValueControl<number[]> {
  // ariaInvalid signal is inherited — use it for conditional border styling
}

// Usage in template:
<app-form-field label="Permissions">
  <app-permission-selector [formField]="roleForm.permissionIds" [groups]="groups()" />
</app-form-field>
```

`useClass: PermissionSelector` would be wrong here: it would build a **second** `PermissionSelector` (not the rendered component) and hand that to the form field.

### `useFactory` + `skipSelf` — and why "don't re-provide" beats it

```typescript
// Technically defers to the ancestor instance…
{ provide: ToastBridgeService, useFactory: () => inject(ToastBridgeService, { skipSelf: true }) }
```

This re-provides the token yet returns the ancestor's instance. It is strictly worse than simply **not re-providing**:

- It adds a registration whose only purpose is to undo itself.
- It does **not** remove the need for the activation initializer — a provider factory is lazy, so the service still is not constructed until something injects it.
- A reader has to reason about `skipSelf` resolution to confirm no new instance is created; with no registration there is nothing to reason about.

---

## Frontend API Provider Pattern

API tokens are plain `InjectionToken` instances with **no** `providedIn` / `factory`. The wiring happens exclusively through `provideX()` functions that return `EnvironmentProviders` via `makeEnvironmentProviders()`, preventing component-level registration.

```typescript
// 1. Interface + token (e.g., auth.interface.ts) — no factory, no providedIn
export interface AuthApi {
	login(params: LoginRequest): Observable<LoginResponse>
	// ...
}
export const AuthApi = new InjectionToken<AuthApi>('AuthApi')

// 2. HTTP implementation (e.g., auth.ts) — providedIn: 'root' for tree-shaking
@Injectable({ providedIn: 'root' })
export class HttpAuthApi implements AuthApi { ... }

// 3. Provider function (e.g., auth.provider.ts) — environment-only registration
//    provideAuth() also accepts opt-in features (e.g. withNavigationPermissionCheck()) whose providers it spreads in;
//    single-token providers such as provideUsers() take no arguments
export function provideAuth(...features: AuthFeature[]): EnvironmentProviders {
	return makeEnvironmentProviders([
		{ provide: AuthApi, useExisting: HttpAuthApi },
		// ...
		...features.flatMap((feature) => feature.providers),
	])
}

// 4a. Root registration (app.config.ts) — auth only, called once at bootstrap
providers: [provideAuth(withNavigationPermissionCheck())]

// 4b. Section-level registration (dashboard.routes.ts) — domain providers listed once on the section's parent
//     route, co-located with their stores; the child pages ('' and ':id') share them
{
	path: 'users',
	providers: [provideUsers(), provideRoles(), UsersStore, RolesStore, provideToast()],
	children: [/* '', ':id' */],
}

// 5. Consumer (e.g., auth.store.ts)
const authApi = inject(AuthApi) // resolves via provideAuth() registration

// 6. Mock provider function (e.g., auth.mock.ts) — same EnvironmentProviders pattern
export function provideAuthMock(api: InMemoryAuthApi = new InMemoryAuthApi()) {
	return makeEnvironmentProviders([{ provide: AuthApi, useValue: api }])
}

// 7. Test usage
providers: [provideAuthMock()]
```

`provideX()` aliases the token to the `Http*Api` class with `useExisting`, so the token and the class resolve to the same instance within an injector. The mock variant swaps in a caller-supplied `InMemory*Api` via `useValue`, so a test can hold a reference to the exact instance the code under test receives.

**Rules:**

- `InjectionToken` declarations must **not** include `providedIn` or `factory` — use `provideX()` instead
- `Http*Api` classes keep `@Injectable({ providedIn: 'root' })` for tree-shaking
- Provider functions return `EnvironmentProviders` (never `Provider[]`) to enforce environment-only registration
- Mock provider functions follow the same `makeEnvironmentProviders` pattern
- ESLint `no-restricted-imports` blocks direct API token imports in `src/app/pages/` and `src/app/components/` — components must inject via stores or guards

**Existing provider functions:**

| Function               | File                                  | Registers                               | Scope                                                             |
| ---------------------- | ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `provideAuth()`        | `auth/auth.provider.ts`               | `AuthApi` → `HttpAuthApi`               | Root (`app.config.ts`)                                            |
| `provideUsers()`       | `users/users.provider.ts`             | `UsersApi` → `HttpUsersApi`             | Section parent: `users` (`dashboard.routes.ts`)                   |
| `provideRoles()`       | `roles/roles.provider.ts`             | `RolesApi` → `HttpRolesApi`             | Section parents: `users`, `authorization` (`dashboard.routes.ts`) |
| `providePermissions()` | `permissions/permissions.provider.ts` | `PermissionsApi` → `HttpPermissionsApi` | Section parent: `authorization` (`dashboard.routes.ts`)           |

**Mock provider functions:**

| Function                   | File                              |
| -------------------------- | --------------------------------- |
| `provideAuthMock()`        | `auth/auth.mock.ts`               |
| `provideUsersMock()`       | `users/users.mock.ts`             |
| `provideRolesMock()`       | `roles/roles.mock.ts`             |
| `providePermissionsMock()` | `permissions/permissions.mock.ts` |

The `api-provider` generator (see `generators.md`) emits this four-file shape; the test doubles behind `provideXMock()` are described in `testing.md` → "Layer 3: Frontend API Mocks".

---

## Case Studies

### Duplicate toasts from a re-provided root singleton ([#471](https://github.com/ResetShop/angular-nx-standalone-starter/issues/471))

`provideToast()` used to list `ToastBridgeService` (and `NgpToastManager`) as bare-class providers. Each toast-firing route therefore minted its own route-scoped bridge. On a denied deep-link to `/dashboard/users/:id`, two route-scoped bridges were live at once (the denied `users/:id` injector's plus another), each watching the shared `UIStore.notifications()` — so the single deny notification rendered twice. The fix was the split this document leads with: keep the bridge a root singleton (stop re-providing it) and make `provideToast()` activation-only via `provideEnvironmentInitializer`.

### 403 toasts on routes without `provideToast()` ([#480](https://github.com/ResetShop/angular-nx-standalone-starter/issues/480))

With the bridge lazy and activated per route, a 403 on a route that never calls `provideToast()` queued a notification in `UIStore` that nothing rendered. Rather than activating the bridge app-wide, `forbiddenInterceptor` activates it on demand with `injector.get(ToastBridgeService)` inside the 403 branch — same root instance, activated only when needed.
