export interface IPermission {
	readonly id: number
	readonly name: string
	readonly description: string | null
	readonly module: string
	readonly resource: string
	readonly action: string
	readonly identifier: string
}
