import type { IPermission } from './permission.interface'

export class Permission implements IPermission {
	public readonly id: number
	public readonly name: string
	public readonly description: string | null
	public readonly module: string
	public readonly resource: string
	public readonly action: string

	constructor(id: number, name: string, description: string | null, module: string, resource: string, action: string) {
		this.id = id
		this.name = name
		this.description = description
		this.module = module
		this.resource = resource
		this.action = action
	}

	public get identifier(): string {
		return `${this.module}:${this.resource}:${this.action}`
	}
}
