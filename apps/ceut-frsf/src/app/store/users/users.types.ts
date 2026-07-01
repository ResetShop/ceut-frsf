import type { IManagedUser } from '@domain/user-management/managed-user.interface'

export interface UsersReadError {
	list: string | null
	detail: string | null
}

export interface UsersMutationError {
	create: string | null
	update: string | null
	updateStatus: string | null
	delete: string | null
	resetPassword: string | null
}

export interface UsersState {
	users: IManagedUser[]
	selectedUser: IManagedUser | null
	currentPage: number
	pageSize: number
	totalItems: number
	searchQuery: string
	isLoadingList: boolean
	isLoadingDetail: boolean
	isCreating: boolean
	isUpdating: boolean
	isDeleting: boolean
	isResettingPassword: boolean
	readError: UsersReadError
	mutationError: UsersMutationError
}

export const initialUsersState: UsersState = {
	users: [],
	selectedUser: null,
	currentPage: 1,
	pageSize: 10,
	totalItems: 0,
	searchQuery: '',
	isLoadingList: false,
	isLoadingDetail: false,
	isCreating: false,
	isUpdating: false,
	isDeleting: false,
	isResettingPassword: false,
	readError: { list: null, detail: null },
	mutationError: { create: null, update: null, updateStatus: null, delete: null, resetPassword: null },
}
