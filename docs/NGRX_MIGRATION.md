# NgRx Signal Store — State Management Architecture

This document describes the state management architecture adopted during Epic #33. It covers store organization, patterns, and guidance for adding new stores.

## Overview

### Why NgRx Signal Store?

The project migrated from service-based signals to **NgRx Signal Store** (`@ngrx/signals`) for the following reasons:

1. **Standardized patterns** — `signalStore()`, `withState()`, `withComputed()`, `withMethods()` enforce a consistent shape across all stores
2. **Reactive data fetching** — `rxMethod` from `@ngrx/signals/rxjs-interop` integrates observables with signal-based state without converting to promises
3. **Composable building blocks** — `withComputed` / `withMethods` blocks layer naturally, allowing derived state and multi-stage method access
4. **Framework alignment** — NgRx Signal Store is the official signals-first state management solution for Angular 17+

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Components                           │
│  inject(UsersStore), inject(RolesStore), inject(UIStore)    │
└──────────────┬──────────────────────────────────────────────┘
               │ read signals / call methods
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Signal Stores                            │
│  AuthStore · UsersStore · RolesStore · PermissionsStore     │
│  UIStore                                                    │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  withState   │→│ withComputed  │→│   withMethods     │  │
│  │ (initial)    │  │ (derived)     │  │ (rxMethod, sync) │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP calls (observables)
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Services                             │
│  AuthApiService · UsersApiService · RolesApiService         │
│  PermissionsApiService                                      │
│                                                             │
│  Pure HTTP clients — no state, no caching, no side effects  │
└─────────────────────────────────────────────────────────────┘
```

## Store Organization

### Folder Structure

```
src/app/store/
├── auth/
│   ├── auth.store.ts          # Store definition
│   ├── auth.store.spec.ts     # Store tests
│   └── auth.types.ts          # State interface, initial state, error types
├── users/
│   ├── users.store.ts
│   ├── users.store.spec.ts
│   └── users.types.ts
├── roles/
│   ├── roles.store.ts
│   ├── roles.store.spec.ts
│   └── roles.types.ts
├── permissions/
│   ├── permissions.store.ts
│   ├── permissions.store.spec.ts
│   └── permissions.types.ts
└── ui/
    ├── ui.store.ts
    ├── ui.store.spec.ts
    └── ui.types.ts
```

### File Naming

| Suffix       | Purpose                                          |
| ------------ | ------------------------------------------------ |
| `*.store.ts` | Store definition (`signalStore(...)`)            |
| `*.types.ts` | State interface, initial state, error interfaces |
| `*.spec.ts`  | Store unit tests                                 |

### Import Convention

Stores are imported directly — **no barrel exports** (forbidden by project rules):

```typescript
import { UsersStore } from '@store/users/users.store'
import { UIStore } from '@store/ui/ui.store'
```

## Store Inventory

| Store              | Category    | Purpose                                        | API Service             |
| ------------------ | ----------- | ---------------------------------------------- | ----------------------- |
| `AuthStore`        | API-backed  | Login, logout, session validation, token state | `AuthApiService`        |
| `UsersStore`       | API-backed  | User CRUD, pagination, search, status changes  | `UsersApiService`       |
| `RolesStore`       | API-backed  | Role CRUD, pagination, permission assignment   | `RolesApiService`       |
| `PermissionsStore` | API-backed  | Read-only permission list with caching         | `PermissionsApiService` |
| `UIStore`          | Client-only | Sidebar, drawer, notifications, global loading | None                    |

## Store Patterns

### API-Backed Stores (Users, Roles, Permissions)

These stores follow a consistent builder block structure documented in `CLAUDE.md`:

1. `withState(initialState)`
2. `withComputed` — `totalPages`, `isAnyLoading`, `hasReadError`, `hasMutationError`, `listParams`
3. `withComputed` — `hasNextPage`, `hasPreviousPage` (depends on `totalPages`)
4. `withMethods` — read operations (`loadX` via `rxMethod`), sync setters, `clearErrors`
5. `withMethods` — `reload()`, then mutations in CRUD order
6. `withHooks` — `onInit` passes `listParams` signal to reactive `rxMethod`

**Key characteristics:**

- **Reactive list pattern** — `listParams` is a computed signal derived from `currentPage`, `pageSize`, `searchQuery`. Passing it as a signal reference to `rxMethod` makes the list auto-reload on any param change.
- **Structured error tracking** — Per-operation `ReadError` / `MutationError` interfaces with `patchReadError` / `patchMutationError` helpers.
- **No optimistic updates** — Mutations reload the full list from the server after success.
- **Derived state in `withComputed`** — Values like `totalPages` are computed signals, never stored in state.

**PermissionsStore variation:** Uses a cache-guard pattern (`isCached` flag + `filter()` operator) instead of pagination, since permissions are static reference data loaded once.

### Auth Store

The `AuthStore` is API-backed but follows a different pattern than CRUD stores:

- **No pagination** — manages a single user session, not a collection
- **Mixed method styles** — `login` and `logout` use `rxMethod`, while `validateSession` and `refreshToken` return observables for the caller to handle. `logout` uses `exhaustMap` (not `switchMap`) to guarantee the token revocation request completes — duplicate calls while one is in-flight are silently dropped
- **No structured error types** — uses simpler `loginError` / `networkError` flags

### Client-Only Store (UIStore)

The `UIStore` has no API dependencies and uses only synchronous `patchState` calls:

- **No `rxMethod`** — all methods are sync setters (`toggleSidebar`, `setSidebarOpen`, `openDrawer`, etc.)
- **Notification auto-dismiss** — `showNotification` sets a `setTimeout` that calls `dismissNotification` after a configurable duration
- **Cleanup** — timeout handles are tracked in a `Map` and cleared via `DestroyRef.onDestroy`

## Service Architecture

API services (`src/app/providers/`) are **pure HTTP clients**:

- They wrap `HttpClient` calls and return observables
- They contain no state, no caching, no side effects
- All state management lives in stores

| Service                 | File                                           |
| ----------------------- | ---------------------------------------------- |
| `AuthApiService`        | `src/app/providers/auth/auth.ts`               |
| `UsersApiService`       | `src/app/providers/users/users.ts`             |
| `RolesApiService`       | `src/app/providers/roles/roles.ts`             |
| `PermissionsApiService` | `src/app/providers/permissions/permissions.ts` |

## When to Use Stores vs. Providers

| Use a Store when...                              | Use a Provider when...                      |
| ------------------------------------------------ | ------------------------------------------- |
| State is shared across multiple components       | State is local to a single component tree   |
| State needs reactive list/pagination patterns    | Logic is purely presentational (theme, nav) |
| Multiple async operations need coordinated state | No async operations or API calls involved   |
| Error tracking per-operation is needed           | Simple toggle/flag state suffices           |

**Current providers that remain as providers** (not stores):

- `NavigationState` — sidebar/breadcrumb state scoped to the layout shell
- `Theme` — dark/light mode toggle, persisted to `localStorage`

These are lightweight, UI-only concerns with no API dependencies. Converting them to Signal Stores would add unnecessary ceremony.

## How to Add a New Store

### Checklist

1. **Create the folder** — `src/app/store/<domain>/`

2. **Define types** — `<domain>.types.ts`:
   - State interface with all fields
   - `ReadError` / `MutationError` interfaces (per-operation error keys)
   - `initialState` const with all defaults
   - Add `readonly` to the state interface fields

3. **Create the store** — `<domain>.store.ts`:
   - Follow the 6-block builder structure (see [Store Patterns](#api-backed-stores-users-roles-permissions))
   - Use `{ providedIn: 'root' }` (tree-shaking default), then list the store together with its `provideX()` API providers **once, on the section's parent route** — the lowest route that is a common parent of every page using the store. All child pages share that one instance until the user leaves the section; never repeat the providers on individual pages — see [`.claude/references/angular-di.md`](../.claude/references/angular-di.md)
   - Use `rxMethod` for all API calls — never `firstValueFrom` or `async/await`
   - Add `patchReadError` / `patchMutationError` helper functions
   - Log errors with `loggerService.error('StoreName', 'methodName failed', err)` via `inject(Logger)` from `@providers/logger/logger.token`
   - Add `withHooks({ onInit(store) { store.loadX(store.listParams); } })` as the last block to trigger reactive initial data loading

4. **Write tests** — `<domain>.store.spec.ts`:
   - Use `fn()` from `@test-utils`, never `vi.fn()`
   - Mock the API service with `Record<keyof XxxApiService, MockFn>` typing
   - Call `clearAllMocks()` in `beforeEach`

5. **Update CLAUDE.md** — Add the store to the "Existing stores" table

6. **Update this document** — Add the store to the [Store Inventory](#store-inventory) table

### Example: Minimal Read-Only Store

```typescript
// notifications.types.ts
export interface NotificationsReadError {
	readonly list: string | null
}

// Replace with your actual domain type import
// import type { NotificationData } from '@contracts/notification/notification.types';
interface NotificationData {
	id: number
	message: string
}

export interface NotificationsState {
	readonly items: NotificationData[]
	readonly isLoading: boolean
	readonly readError: NotificationsReadError
}

export const initialNotificationsState: NotificationsState = {
	items: [],
	isLoading: false,
	readError: { list: null },
}

// notifications.store.ts
export const NotificationsStore = signalStore(
	{ providedIn: 'root' },
	withState(initialNotificationsState),
	withComputed((store) => ({
		hasReadError: computed(() => Object.values(store.readError()).some((e) => e !== null)),
	})),
	withMethods((store) => {
		const api = inject(NotificationsApiService)
		const loggerService = inject(Logger)
		return {
			loadNotifications: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() =>
						api.getAll().pipe(
							tap({
								next: (items) => patchState(store, { items, isLoading: false }),
								error: (err) => {
									loggerService.error('NotificationsStore', 'loadNotifications failed', err)
									patchState(store, {
										isLoading: false,
										readError: { list: 'Failed to load notifications' },
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),
		}
	}),
	withHooks({
		onInit(store) {
			store.loadNotifications()
		},
	}),
)
```

---

_Last updated: 2026-03-12_
