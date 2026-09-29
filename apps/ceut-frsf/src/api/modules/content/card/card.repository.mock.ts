import type { CardData } from '@contracts/card/card.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type { PaginatedResponse } from '../../../interfaces'
import type { CardRepository, CreateCardParams, ListCardsParams, UpdateCardParams } from './interfaces'

/**
 * In-memory card repository for unit tests. Mirrors the Drizzle repository's semantics:
 * id and list reads skip soft-deleted cards, while the unique-field lookups still see them.
 */
export class InMemoryCardRepository implements CardRepository {
	private cards: Map<number, CardData> = new Map()
	private nextId = 1

	/**
	 * Add a card to the mock repository for testing.
	 */
	public addCard(card: CardData): void {
		this.cards.set(card.id, card)
		this.nextId = Math.max(this.nextId, card.id + 1)
	}

	/**
	 * Clear all data from the mock repository.
	 */
	public clear(): void {
		this.cards.clear()
		this.nextId = 1
	}

	public async findById(id: number): Promise<CardData | null> {
		const found = this.cards.get(id)
		return found && found.deletedAt === null ? found : null
	}

	public async findByInternalName(internalName: string): Promise<CardData | null> {
		return Array.from(this.cards.values()).find((c) => c.internalName === internalName) ?? null
	}

	public async findByLegacyId(legacyId: number): Promise<CardData | null> {
		return Array.from(this.cards.values()).find((c) => c.legacyId === legacyId) ?? null
	}

	public async findAll(params?: ListCardsParams): Promise<PaginatedResponse<CardData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET
		const searchLower = params?.search?.trim().toLowerCase()

		const matching = Array.from(this.cards.values())
			.filter((c) => c.deletedAt === null)
			.filter((c) => params?.enabled === undefined || c.enabled === params.enabled)
			.filter(
				(c) =>
					!searchLower ||
					c.internalName.toLowerCase().includes(searchLower) ||
					(c.title?.toLowerCase().includes(searchLower) ?? false),
			)
			.sort((a, b) => a.position - b.position || a.id - b.id)

		return {
			data: matching.slice(offset, offset + limit),
			total: matching.length,
			offset,
			limit,
		}
	}

	public async create(params: CreateCardParams, actorId: number): Promise<CardData> {
		void actorId
		const now = new Date()
		const created: CardData = {
			id: this.nextId++,
			legacyId: params.legacyId ?? null,
			internalName: params.internalName,
			title: params.title ?? null,
			type: params.type,
			imageUrl: params.imageUrl ?? null,
			content: params.content ?? null,
			link: params.link ?? null,
			footerContent: params.footerContent ?? null,
			footerSeparator: params.footerSeparator,
			enabled: params.enabled,
			isPinned: params.isPinned,
			pinnedPosition: params.pinnedPosition ?? null,
			position: params.position ?? 0,
			deletedAt: null,
			createdAt: now,
			updatedAt: now,
		}

		this.cards.set(created.id, created)
		return created
	}

	public async update(id: number, params: UpdateCardParams, actorId: number): Promise<CardData | null> {
		void actorId
		const existing = await this.findById(id)
		if (!existing) return null

		const definedFields = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
		const updated: CardData = { ...existing, ...definedFields, updatedAt: new Date() }

		this.cards.set(id, updated)
		return updated
	}

	public async softDelete(id: number, actorId: number): Promise<boolean> {
		void actorId
		const existing = await this.findById(id)
		if (!existing) return false

		const now = new Date()
		this.cards.set(id, { ...existing, deletedAt: now, updatedAt: now })
		return true
	}
}
