import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type {
	AssignPermissionsRequest,
	CreateRoleRequest,
	RoleData,
	UpdateRoleRequest,
} from '@contracts/role/role.types'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import { HttpRolesApi } from './roles'
import { createMockRoleData } from './roles.mock'

describe('HttpRolesApi', () => {
	let service: HttpRolesApi
	let httpMock: HttpTestingController

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [HttpRolesApi, provideHttpClient(), provideHttpClientTesting()],
		})

		service = TestBed.inject(HttpRolesApi)
		httpMock = TestBed.inject(HttpTestingController)
	})

	afterEach(() => {
		httpMock.verify()
	})

	describe('getAll', () => {
		it('should make GET request to /api/access/roles with default pagination', () => {
			const mockResponse: PaginatedResponse<RoleData> = {
				data: [createMockRoleData()],
				total: 1,
				offset: QUERY_DEFAULTS.OFFSET,
				limit: QUERY_DEFAULTS.LIMIT,
			}

			service.getAll().subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne(
				(r) =>
					r.url === '/api/access/roles' &&
					r.params.get('offset') === String(QUERY_DEFAULTS.OFFSET) &&
					r.params.get('limit') === String(QUERY_DEFAULTS.LIMIT),
			)
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})

		it('should include search param when provided', () => {
			const mockResponse: PaginatedResponse<RoleData> = {
				data: [],
				total: 0,
				offset: 0,
				limit: 10,
			}

			service.getAll({ search: 'admin', offset: 0, limit: 10 }).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne((r) => r.url === '/api/access/roles' && r.params.get('search') === 'admin')
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})

		it('should omit search param when not provided', () => {
			service.getAll({ offset: 0, limit: 10 }).subscribe()

			const req = httpMock.expectOne((r) => r.url === '/api/access/roles')
			expect(req.request.params.has('search')).toBe(false)

			req.flush({ data: [], total: 0, offset: 0, limit: 10 })
		})
	})

	describe('getAllUnpaginated', () => {
		it('should make GET request to /api/access/roles with max limit', () => {
			const mockResponse: PaginatedResponse<RoleData> = {
				data: [createMockRoleData()],
				total: 1,
				offset: 0,
				limit: QUERY_DEFAULTS.MAX_LIMIT,
			}

			service.getAllUnpaginated().subscribe((result) => {
				expect(result).toEqual([createMockRoleData()])
			})

			const req = httpMock.expectOne(
				(r) =>
					r.url === '/api/access/roles' &&
					r.params.get('limit') === String(QUERY_DEFAULTS.MAX_LIMIT) &&
					r.params.get('offset') === '0',
			)
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})

		it('should extract data array from paginated response', () => {
			const roles = [createMockRoleData({ id: 1 }), createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })]
			const mockResponse: PaginatedResponse<RoleData> = {
				data: roles,
				total: 2,
				offset: 0,
				limit: QUERY_DEFAULTS.MAX_LIMIT,
			}

			service.getAllUnpaginated().subscribe((result) => {
				expect(result).toHaveLength(2)
				expect(result).toEqual(roles)
			})

			const req = httpMock.expectOne((r) => r.url === '/api/access/roles')
			req.flush(mockResponse)
		})
	})

	describe('getByIdWithPermissions', () => {
		it('should make parallel GET requests for role and permissions', () => {
			const mockRole = createMockRoleData({ id: 5, name: 'Editor', code: 'editor' })
			const mockPermissions = [
				createMockPermissionData({ id: 1 }),
				createMockPermissionData({ id: 2, name: 'Write Users', action: 'write' }),
			]

			service.getByIdWithPermissions(5).subscribe((result) => {
				expect(result).toEqual({
					...mockRole,
					permissions: mockPermissions,
				})
			})

			const roleReq = httpMock.expectOne('/api/access/roles/5')
			expect(roleReq.request.method).toBe('GET')

			const permReq = httpMock.expectOne(
				(r) =>
					r.url === '/api/access/roles/5/permissions' && r.params.get('limit') === String(QUERY_DEFAULTS.MAX_LIMIT),
			)
			expect(permReq.request.method).toBe('GET')

			roleReq.flush(mockRole)
			permReq.flush({ data: mockPermissions, total: 2, offset: 0, limit: QUERY_DEFAULTS.MAX_LIMIT })
		})
	})

	describe('create', () => {
		it('should make POST request to /api/access/roles', () => {
			const body: CreateRoleRequest = { name: 'Viewer', code: 'viewer' }
			const mockResponse = createMockRoleData({ id: 3, name: 'Viewer', code: 'viewer' })

			service.create(body).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/access/roles')
			expect(req.request.method).toBe('POST')
			expect(req.request.body).toEqual(body)

			req.flush(mockResponse)
		})
	})

	describe('update', () => {
		it('should make PUT request to /api/access/roles/:id', () => {
			const body: UpdateRoleRequest = { name: 'Updated Role' }
			const mockResponse = createMockRoleData({ name: 'Updated Role' })

			service.update(1, body).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/access/roles/1')
			expect(req.request.method).toBe('PUT')
			expect(req.request.body).toEqual(body)

			req.flush(mockResponse)
		})
	})

	describe('delete', () => {
		it('should make DELETE request to /api/access/roles/:id', () => {
			service.delete(1).subscribe()

			const req = httpMock.expectOne('/api/access/roles/1')
			expect(req.request.method).toBe('DELETE')

			req.flush(null)
		})
	})

	describe('assignPermissions', () => {
		it('should make PUT request to /api/access/roles/:id/permissions', () => {
			const body: AssignPermissionsRequest = { permissionIds: [1, 2, 3] }

			service.assignPermissions(1, body).subscribe()

			const req = httpMock.expectOne('/api/access/roles/1/permissions')
			expect(req.request.method).toBe('PUT')
			expect(req.request.body).toEqual(body)

			req.flush(null)
		})
	})

	describe('error handling', () => {
		it('should propagate HTTP errors', () => {
			service.getAll().subscribe({
				next: () => expect.unreachable('should have failed'),
				error: (error) => {
					expect(error.status).toBe(500)
				},
			})

			const req = httpMock.expectOne((r) => r.url === '/api/access/roles')
			req.flush(null, { status: 500, statusText: 'Internal Server Error' })
		})
	})
})
