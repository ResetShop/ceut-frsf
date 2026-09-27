<!-- Source: CLAUDE.md | Last updated: 2026-09-18 -->

# Testing Examples & Mock Infrastructure

## Basic Component Test Pattern

```typescript
import { render, screen } from '@testing-library/angular'

describe('ButtonComponent', () => {
	it('should render button with text', async () => {
		await render(`<button appButton>Click me</button>`, {
			imports: [ButtonComponent],
		})

		const button = screen.getByRole('button', { name: /click me/i })
		expect(button).toBeInTheDocument()
	})
})
```

## Testing User Interactions

```typescript
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'

describe('CounterComponent', () => {
	it('should increment count on button click', async () => {
		const user = userEvent.setup()
		await render(CounterComponent)

		const button = screen.getByRole('button', { name: /increment/i })
		await user.click(button)

		expect(screen.getByText('Count: 1')).toBeInTheDocument()
	})
})
```

## Testing Async Behavior

```typescript
import { render, screen, waitFor } from '@testing-library/angular'

describe('AsyncComponent', () => {
	it('should display data after loading', async () => {
		await render(AsyncComponent)

		// Wait for async content to appear
		await waitFor(() => {
			expect(screen.getByText('Data loaded')).toBeInTheDocument()
		})
	})

	it('should find element that appears asynchronously', async () => {
		await render(AsyncComponent)

		// findBy* queries have built-in waiting
		const element = await screen.findByRole('heading', { name: /welcome/i })
		expect(element).toBeInTheDocument()
	})
})
```

## Testing Services

```typescript
import { render, screen } from '@testing-library/angular'
import { fn } from '@test-utils'

describe('ComponentWithService', () => {
	it('should use injected service', async () => {
		const mockGetUser = fn<[], Promise<{ name: string }>>()
		mockGetUser.mockResolvedValue({ name: 'John' })

		await render(UserProfileComponent, {
			providers: [{ provide: UserService, useValue: { getUser: mockGetUser } }],
		})

		expect(await screen.findByText('John')).toBeInTheDocument()
	})
})
```

## Testing Form Inputs

```typescript
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'

describe('LoginFormComponent', () => {
	it('should update input value', async () => {
		const user = userEvent.setup()
		await render(LoginFormComponent)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'test@example.com')

		expect(emailInput).toHaveValue('test@example.com')
	})
})
```

## Instance Type Assertions

When verifying that an object is an instance of a specific class, always use `toBeInstanceOf()` instead of comparing `constructor.name` strings:

```typescript
// ✅ Correct — type-safe and idiomatic
expect(container.cradle.authService).toBeInstanceOf(AuthService)

// ❌ Incorrect — fragile string comparison
expect(container.cradle.authService.constructor.name).toBe('AuthService')
```

`toBeInstanceOf` is safer (survives refactors and minification), more expressive, and produces better error messages on failure.

## Mock Infrastructure

This project uses a two-layer mock architecture that avoids direct `vi.fn()`, `vi.mock()`, and `jest.fn()` usage. ESLint rules enforce this constraint.

### Layer 1: `@test-utils` (all tests)

The `src/test-utils.ts` module (aliased as `@test-utils`) provides framework-agnostic mock utilities used across all tests:

| Export                    | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `fn<TArgs, TReturn>()`    | Create a type-safe mock function with call tracking                |
| `clearAllMocks()`         | Clear call history from all registered mocks (keeps return values) |
| `resetAllMocks()`         | Clear call history and remove all mock references from registry    |
| `useFakeTimers()`         | Enable fake timers for time-dependent tests                        |
| `advanceTimersByTime(ms)` | Advance fake timers by specified milliseconds                      |
| `useRealTimers()`         | Restore real timers                                                |

**`fn()` API example:**

```typescript
import { clearAllMocks, fn } from '@test-utils'

const mockFetch = fn<[number], Promise<User>>()

beforeEach(() => {
	clearAllMocks()
})

it('should fetch user', async () => {
	mockFetch.mockResolvedValue({ id: 1, name: 'John' })

	const result = await mockFetch(1)

	expect(result).toEqual({ id: 1, name: 'John' })
	expect(mockFetch.calls).toEqual([[1]])
})
```

**Automatic cleanup:** The mock registry auto-clears via an `afterAll` hook registered at module load time, calling `resetAllMocks()` after each test suite.

### Layer 2: `container.mock.ts` (backend DI tests only)

The `src/api/container/container.mock.ts` module provides the `MockContainer` class for backend controller/middleware tests:

| Export          | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `MockContainer` | Implements `IContainer` with a partial cradle for test mocks |

Usage with the singleton `container` from `src/api/container/container.ts`:

| Method                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `container.use()`     | Replace active container with a `MockContainer` instance |
| `container.restore()` | Remove the delegate, restoring the real Awilix container |

### Layer 3: Frontend API Mocks (Angular component/store tests)

Each frontend API service has a co-located `*.mock.ts` file providing:

1. **Mock data factories** — `createMockX(overrides?)` functions for generating test fixtures
2. **Pre-built data lists** — `MOCK_USERS`, `MOCK_ROLES`, `MOCK_PERMISSIONS` constants for pagination testing
3. **`InMemory*Api` classes** — Stateful test doubles implementing the API interface with `Map` storage
4. **`provideXMock()` functions** — `EnvironmentProviders` wrappers for test registration

`provideXMock()` mirrors its production `provideX()` shape (`makeEnvironmentProviders`), swapping the `Http*Api` alias for a caller-supplied `InMemory*Api` via `useValue` so the test holds the exact instance the code under test receives. For the provider-function pattern and DI rationale, see [`angular-di.md`](angular-di.md) → "Frontend API Provider Pattern".

| Mock File                         | Factory Functions                                         | InMemory Class           | Data List               |
| --------------------------------- | --------------------------------------------------------- | ------------------------ | ----------------------- |
| `users/users.mock.ts`             | `createMockManagedUser()`                                 | `InMemoryUsersApi`       | `MOCK_USERS` (12)       |
| `roles/roles.mock.ts`             | `createMockRoleData()`, `createMockRoleWithPermissions()` | `InMemoryRolesApi`       | `MOCK_ROLES` (5)        |
| `permissions/permissions.mock.ts` | `createMockPermissionData()`                              | `InMemoryPermissionsApi` | `MOCK_PERMISSIONS` (13) |
| `auth/auth.mock.ts`               | `createMockLoginResponse()`, `createMockMeResponse()`     | `InMemoryAuthApi`        | —                       |
| `i18n/translation.mock.ts`        | —                                                         | `TranslationMock`        | `MOCK_TRANSLATIONS`     |

**InMemory class API pattern:**

```typescript
const usersApi = new InMemoryUsersApi()
usersApi.addUser(createMockManagedUser({ id: 1 }))
usersApi.addUser(createMockManagedUser({ id: 2, email: 'jane@example.com' }))
usersApi.setError('getAll', new Error('Network error')) // simulate failure
usersApi.clearErrors() // reset
usersApi.clear() // reset all data
```

**Store spec pattern (fn() stubs with shared factories):**

```typescript
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { createMockManagedUser } from '@providers/users/users.mock'

let usersApiMock: Record<keyof UsersApi, MockFn>

beforeEach(() => {
	clearAllMocks()
	usersApiMock = { getAll: fn(), getById: fn(), create: fn(), ... }
	usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
})
```

**Guard/page spec pattern (InMemory with provideXMock):**

```typescript
import { provideAuthMock, InMemoryAuthApi, createMockMeResponse } from '@providers/auth/auth.mock'

let authApi: InMemoryAuthApi

beforeEach(() => {
	authApi = new InMemoryAuthApi()
	TestBed.configureTestingModule({
		providers: [provideAuthMock(authApi)],
	})
})

it('should allow navigation when authenticated', () => {
	authApi.setAuthenticatedUser(createMockMeResponse())
	// ...
})
```

### Timer Wrappers

Always use `@test-utils` timer wrappers instead of `vi.useFakeTimers()` directly:

```typescript
import { advanceTimersByTime, useFakeTimers, useRealTimers } from '@test-utils'

beforeEach(() => {
	useFakeTimers()
})

afterEach(() => {
	useRealTimers()
})

it('should debounce calls', () => {
	triggerAction()
	advanceTimersByTime(300)
	expect(result).toBe(expected)
})
```

### Signal Effect Flushing in Tests

Use `TestBed.tick()` to synchronously flush pending signal effects in tests. `TestBed.flushEffects()` is **deprecated since Angular 20** — always use `tick()` instead.

```typescript
// ✅ Correct — use tick()
store.setPage(2)
TestBed.tick()

// ❌ Deprecated — do not use flushEffects()
store.setPage(2)
TestBed.flushEffects()
```

**When to call `TestBed.tick()`:** After any state change that triggers a computed signal update which in turn causes a reactive side effect (e.g., `patchState` on `currentPage` updates the `listParams` computed signal, which causes `rxMethod` to re-fire).

### Testing `@defer` Blocks

Components using `@defer` with `@placeholder (minimum Xms)` require two test setup steps:

1. **Enable playthrough behavior** via `deferBlockBehavior: DeferBlockBehavior.Playthrough` in the `render()` options — otherwise `@defer` blocks default to manual triggering in tests
2. **Advance fake timers** past the `@placeholder` minimum duration so the deferred content renders

```typescript
import { DeferBlockBehavior, TestBed } from '@angular/core/testing'
import { advanceTimersByTimeAsync, clearAllMocks, useFakeTimers, useRealTimers } from '@test-utils'
import { render, screen } from '@testing-library/angular'

describe('ComponentWithDefer', () => {
	beforeEach(() => {
		useFakeTimers()
		clearAllMocks()
	})

	afterEach(() => {
		useRealTimers()
	})

	async function renderComponent() {
		const { fixture } = await render(MyComponent, {
			deferBlockBehavior: DeferBlockBehavior.Playthrough,
			providers: [/* ... */],
		})
		TestBed.tick()
		// Advance past the @placeholder minimum (e.g., 500ms)
		await advanceTimersByTimeAsync(500)
		fixture.detectChanges()
	}

	it('should render deferred content after placeholder minimum', async () => {
		await renderComponent()

		expect(screen.getByText('Deferred content')).toBeInTheDocument()
	})
})
```

**Key rules:**

- Use `DeferBlockBehavior.Playthrough` — the default `Manual` mode prevents `when` triggers from firing
- Use `advanceTimersByTimeAsync` (not `advanceTimersByTime`) to properly flush async operations alongside timers
- Always pair `useFakeTimers()` in `beforeEach` with `useRealTimers()` in `afterEach`

### Store Test Mock Typing

Type API mocks as `Record<keyof ServiceClass, MockFn>` to keep the mock structurally linked to the real service. If a method is added to the service, TypeScript will catch the missing mock key.

```typescript
// ✅ Correct — structurally linked to the real service
let usersApiMock: Record<keyof UsersApiService, MockFn>

// ❌ Incorrect — inline object literal, silently drifts from the real service
let usersApiMock: {
	getAll: MockFn<[params?: SearchPaginationParams], Observable<PaginatedResponse<ManagedUser>>>
	create: MockFn<[CreateUserRequest], Observable<CreateUserResponse>>
}
```

### Store Error State Assertions

With per-operation structured errors, assert the specific operation key rather than the whole object (except in initial-state and clearErrors tests where the full shape matters):

```typescript
// ✅ Correct — assert the specific operation key
expect(store.mutationError().create).toBe('Failed to create user')
expect(store.readError().list).toBe('Failed to load users')

// ✅ Correct — assert full shape for initial state or clearErrors
expect(store.readError()).toEqual({ list: null })
expect(store.mutationError()).toEqual({ create: null, update: null, delete: null })
```

### ESLint Enforcement

The `viRestrictedSyntax` ESLint rules forbid direct usage of `vi.fn()`, `vi.mock()`, `vi.useFakeTimers()`, and related Vitest globals. Use the `@test-utils` wrappers instead.

---

## Backend Integration Tests

Integration tests verify API endpoints against a real PostgreSQL database. They are **mandatory** for every backend endpoint — new or modified.

### Running Integration Tests

```bash
npm run test:integration    # Run all integration tests
npm run test                # Unit tests only (integration tests excluded)
```

### File Structure

```
src/api/integration/
  setup/
    global-setup.ts         # Schema push + seed (runs once)
    integration-setup.ts    # Env vars + Zod extension (per file)
    test-app.ts             # createTestApp() factory
    db-helpers.ts           # DB utilities (getTestDb, seedBaseData, etc.)
    auth-helpers.ts         # Auth utilities (loginAsAdmin, etc.)
    load-env.ts             # .env file parser
  health/
    health.integration.spec.ts
  auth/
    login.integration.spec.ts
    me.integration.spec.ts
    refresh.integration.spec.ts
    logout.integration.spec.ts
  access/
    roles.integration.spec.ts
    permissions.integration.spec.ts
  user/
    user-management.integration.spec.ts
    user-roles.integration.spec.ts
```

### Setup Helpers

| Helper                                  | Purpose                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `createTestApp()`                       | Creates an OpenAPIHono instance with all middleware and routes          |
| `loginAsAdmin(app)`                     | Logs in as the seeded admin user, returns cookies                       |
| `loginAsRestricted(app)`                | Logs in as the seeded restricted user (no permissions), returns cookies |
| `authenticatedRequest(app, path, opts)` | Makes an HTTP request with auth cookies attached                        |
| `getTestDb()`                           | Returns a Drizzle instance connected to the test database               |
| `getSeededAdminIds(db)`                 | Returns `{ adminUserId, adminRoleId }` via direct DB lookup             |
| `getRestrictedUserCredentials()`        | Returns email/password for the pre-seeded restricted user               |
| `truncateAllTables(db)`                 | Truncates all tables with CASCADE                                       |
| `seedBaseData(db)`                      | Seeds admin user, restricted user, roles, and permissions               |

### Test Pattern

```typescript
import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('Endpoint description (/api/path)', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
	})

	describe('GET /api/path', () => {
		it('returns expected data', async () => {
			const response = await authenticatedRequest(app, '/api/path', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(200)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/path')
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, '/api/path', {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})
})
```

### Key Rules

- **Never** create per-test users for auth — use `loginAsAdmin()` / `loginAsRestricted()`
- **Never** resolve IDs via HTTP list calls — use `getSeededAdminIds()` for direct DB lookup
- **Always** use `authenticatedRequest()` to attach cookies
- Tests run sequentially (`fileParallelism: false`) to avoid DB race conditions
- Noop email provider and bcrypt cost 1 are configured automatically in the test environment
- Group tests by HTTP method + path inside `describe` blocks
- Cover: happy path, 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict)

---

## Storybook Story Conventions

Every new UI component in `src/app/components/` must include a `*.stories.ts` file. Stories serve as living documentation, visual regression baselines, and interactive component catalogs.

### Meta Configuration

```typescript
import type { Meta, StoryObj } from '@storybook/angular'
import { MyComponent } from './my-component'

type Story = StoryObj<MyComponent>

const meta: Meta<MyComponent> = {
	component: MyComponent,
	title: 'Components/My Component',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
Description of the component with Features and Usage sections.
				`,
			},
			canvas: { sourceState: 'shown' },
		},
	},
	argTypes: {
		// Map each input() to a control
		myInput: {
			control: 'select',
			options: ['a', 'b'],
			description: 'What this input does',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: "'a'" },
			},
		},
	},
}

export default meta
```

### Required Elements

| Element                                       | Requirement                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `tags: ['autodocs']`                          | Always include — generates docs page automatically                     |
| `parameters.docs.description.component`       | Markdown description with Features and Usage sections                  |
| `parameters.docs.canvas.sourceState: 'shown'` | Shows source code in docs                                              |
| `argTypes`                                    | Define for every public `input()` with control, description, and table |

### Decorator Patterns

| Pattern                                  | When to use                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `moduleMetadata({ imports, providers })` | Per-story component imports and icon providers                             |
| `applicationConfig({ providers })`       | Global services needed by the component (e.g., Router, Theme, Translation) |

### Story Patterns

**Simple component (no dependencies):** Render directly with `args` and inline template.

**Component with DI dependencies:** Use `applicationConfig` decorator with mock providers.

**Component that cannot render standalone** (e.g., requires portal context, toast manager): Create a wrapper `@Component` that triggers the real component through its normal API. The story exercises the integration, not the isolated component.

```typescript
// Wrapper pattern for context-dependent components
@Component({
	selector: 'app-story-wrapper',
	imports: [Button],
	template: `
		<button (click)="trigger()" appButton>Trigger</button>
	`,
})
class StoryWrapper {
	private readonly service = inject(SomeService)
	protected trigger(): void {
		this.service.doThing()
	}
}
```

### Existing Stories (Reference)

| Component       | File                         | Pattern                                                           |
| --------------- | ---------------------------- | ----------------------------------------------------------------- |
| Loading Spinner | `loading-spinner.stories.ts` | Simple, no args, fullscreen layout                                |
| Button          | `button.stories.ts`          | argTypes, multiple variants, per-story `moduleMetadata` for icons |
| FormField       | `form-field.stories.ts`      | Wrapper component, `applicationConfig`, signal forms              |
| Select          | `select.stories.ts`          | argTypes, `applicationConfig` with providers                      |
| Alert           | `alert.stories.ts`           | Multiple variants via separate stories                            |

### Key Rules

- **Always** update existing stories when component inputs, visual states, or public API change
- **Use `applicationConfig`** for global providers (Router, services), **`moduleMetadata`** for component-level imports (icons)
- **One story per visual state** — default, loading, error, collapsed, etc.
- **Wrapper components** for components that depend on injection context not available in isolation
- Stories are required only for shared UI components in `src/app/components/`. Page-level components in `src/app/pages/` are exempt.

---

## Translation Fallback Testing in `packages/ui` Components

Components in `packages/ui/src/lib/` that inject `Translation` MUST pass an English fallback as the second argument to every `instant(key, fallback)` call (see CLAUDE.md → "Translation Fallbacks in Reusable UI Components"). Tests for these components must include a dedicated fallback-path test for every translated string the component renders. The fallback path is what Storybook actually exercises — leaving it untested means Storybook regressions slip through.

### Pattern

```typescript
describe('fallback strings (no Translation provider)', () => {
	// Mirrors the real Translation.instant() contract: when a fallback is supplied,
	// return it; otherwise return the raw key. Components rendered with this stub
	// behave exactly as they would inside an unwired Storybook story.
	const fallbackProvider = {
		provide: Translation,
		useValue: { instant: (key: string, fallback?: string) => fallback ?? key },
	}

	it('should render "Pagination" nav aria-label when translations are not loaded (LABEL)', async () => {
		await render(Pagination, {
			inputs: { currentPage: 1, totalPages: 5 },
			providers: [fallbackProvider],
		})

		expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
	})
})
```

### Rules

1. **One fallback-path test per translated string.** If a component uses six translation keys, add six fallback tests. The assertion verifies the exact English text from `en.ts`.
2. **Use the documented stub shape exactly.** Do not assert against a `*_DEFAULTS` constant or a shared `fallbackStrings` helper — assert against the literal expected string. A test that imports the constant from the production file silently passes when the constant gets mangled.
3. **Apply normal query priority.** The fallback-path test must use the same query priority (`getByRole`, `getByLabelText`, …) as the loaded-translation path. The fallback test is not a loophole for `getByTestId`.
4. **Include any non-translation DI the component needs.** E.g. `DataTable` requires `BreakpointObserver` even in fallback tests because its CDK observers run unconditionally — see `data-table.spec.ts`.
5. **Reference implementations.** See `packages/ui/src/lib/pagination/pagination.spec.ts`, `data-table/data-table.spec.ts`, and `form-field/form-field.spec.ts` — these collectively cover all 18 translation keys touched by `packages/ui`.

### Scope

This requirement applies to **`packages/ui/src/lib/**/_.spec.ts`** only. Component specs in `apps/_/src/app/`do not need fallback-path tests because apps always wire`provideTranslation()` — the fallback path is unreachable in production.

---

## Permission String Literal Testing

Every file that uses permission identifier string literals (e.g., `'admin:users:read'`) **must** have a corresponding test that validates each literal against `PERMISSION_DEFINITIONS`. This catches typos and stale references when permissions are renamed or removed.

### Pattern

```typescript
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:create')).toBe(true)
		expect(validIdentifiers.has('admin:users:read')).toBe(true)
		// one assertion per unique literal used in the source file
	})
})
```

### Rules

- The `describe('permission identifiers')` block must be at the **top level** of the spec file, not nested inside other describe blocks
- Every unique permission string literal in the source file must have a corresponding assertion
- The test imports `PERMISSION_DEFINITIONS` from contracts — if the array changes, stale references fail at test time
- This applies to: route data (`requiredPermission`), navigation config (`permission` field), directive inputs (`*hasPermission`), and `hasPermission()` calls in computed signals

### Files currently requiring coverage

| Source file                 | Test file                        | Literals                                                         |
| --------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `users-list.ts`             | `users-list.spec.ts`             | `admin:users:create`, `admin:users:update`, `admin:users:delete` |
| `roles-list.ts`             | `roles-list.spec.ts`             | `admin:roles:create`, `admin:roles:update`, `admin:roles:delete` |
| `dashboard.routes.ts`       | `dashboard.spec.ts`              | `admin:users:read`, `admin:permissions:read`, `admin:roles:read` |
| `users.navigation.ts`       | `users.navigation.spec.ts`       | `admin:users:read`                                               |
| `roles.navigation.ts`       | `roles.navigation.spec.ts`       | `admin:roles:read`                                               |
| `permissions.navigation.ts` | `permissions.navigation.spec.ts` | `admin:permissions:read`                                         |

## Permission Description Translation Coverage

Each `PERMISSION_DEFINITIONS` entry carries an English `description`. That string is the source of truth for the **database** — it seeds the `permission.description` column and is what `GET /api/access/permissions` returns — but it is **not** the display text. The Permissions page resolves the description it renders from `PERMISSIONS.DESCRIPTIONS[<identifier>]` in the active language's translation file, passing the catalogue string as the `Translation.instant()` fallback.

That fallback means a forgotten translation degrades silently into English rather than failing loudly, so the parity is enforced by a test instead: `apps/reference-app/src/app/providers/i18n/permission-descriptions.spec.ts` asserts, for **every** language file, that each catalogue identifier has a non-empty entry and that no entry exists for an identifier the catalogue no longer defines. It also asserts the Spanish text differs from the English, which catches a placeholder copy-paste.

### Rules

- Adding a permission to `PERMISSION_DEFINITIONS` means adding its description to `en.ts` **and** `es.ts` (and any language file a fork adds) under `PERMISSIONS.DESCRIPTIONS`, keyed by the full `module:resource:action` identifier.
- Removing a permission means removing those entries — the orphan assertion fails otherwise.
- Adding a new language file means adding it to the `languages` list at the top of the spec; the per-language assertions are generated from that list.
- Components must never render `permission.description` directly. Resolve the key via `permissionDescriptionKey(identifier)` and pass the raw description as the fallback.
