import type { ManagedUser } from '@contracts/user/user.types'
import type { IManagedUser, IManagedUserRole } from './managed-user.interface'

export function mapManagedUserResponse(data: ManagedUser): IManagedUser {
	return {
		id: data.id,
		email: data.email,
		firstName: data.firstName,
		lastName: data.lastName,
		fullName: `${data.firstName} ${data.lastName}`.trim(),
		status: data.status,
		statusChangedAt: data.statusChangedAt,
		statusChangedBy: data.statusChangedBy,
		deletedAt: data.deletedAt,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		roles: data.roles.map(
			(r): IManagedUserRole => ({
				id: r.id,
				name: r.name,
				code: r.code,
				description: r.description,
				removable: r.removable,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
			}),
		),
	}
}
