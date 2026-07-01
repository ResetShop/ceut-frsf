import type { IPermission } from '@domain/access/permission.interface'

export interface PermissionsReadError {
	list: string | null
}

export interface PermissionsState {
	permissions: IPermission[]
	isLoading: boolean
	isCached: boolean
	readError: PermissionsReadError
}

export const initialPermissionsState: PermissionsState = {
	permissions: [],
	isLoading: false,
	isCached: false,
	readError: { list: null },
}
