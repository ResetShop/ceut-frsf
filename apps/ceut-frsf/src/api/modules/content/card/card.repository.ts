import type { CardData } from '@contracts/card/card.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { card } from '@schema/card'
import { CardHistoryAction, cardHistory } from '@schema/card-history'
import { type SQL, and, count, eq, ilike, isNull, or } from 'drizzle-orm'
import { BaseRepository } from '../../../helpers/base.repository'
import type { DrizzleTransaction } from '../../../helpers/drizzle-postgres-connector'
import { findUniqueViolationConstraint } from '../../../helpers/postgres-errors'
import type { PaginatedResponse } from '../../../interfaces'
import { CardConflictError } from './card.errors'
import type { CardRepository, CreateCardParams, ListCardsParams, UpdateCardParams } from './interfaces'

const cardColumns = {
	id: card.id,
	legacyId: card.legacyId,
	internalName: card.internalName,
	title: card.title,
	type: card.type,
	imageUrl: card.imageUrl,
	content: card.content,
	link: card.link,
	footerContent: card.footerContent,
	footerSeparator: card.footerSeparator,
	enabled: card.enabled,
	isPinned: card.isPinned,
	pinnedPosition: card.pinnedPosition,
	position: card.position,
	deletedAt: card.deletedAt,
	createdAt: card.createdAt,
	updatedAt: card.updatedAt,
}

/**
 * Repository for card database operations.
 *
 * Deletion is soft (`deletedAt` is set) and every write records a full-row snapshot in
 * `card_history` inside the same transaction, so the audit trail can never diverge from the row.
 * Unique-constraint violations on writes surface as `CardConflictError`, so a request that loses a
 * race past the service's uniqueness check still gets the same conflict as a sequential duplicate.
 */
export class DrizzleCardRepository extends BaseRepository implements CardRepository {
	/**
	 * Finds a live (not soft-deleted) card by its primary key.
	 *
	 * @param id - The card's primary key
	 * @returns The card data if found and not deleted, null otherwise
	 */
	public async findById(id: number): Promise<CardData | null> {
		const result = await this.db
			.select(cardColumns)
			.from(card)
			.where(and(eq(card.id, id), isNull(card.deletedAt)))
			.limit(1)

		return result[0] ?? null
	}

	/**
	 * Finds a card by its unique internal name, including soft-deleted cards, since the
	 * database unique constraint spans them too.
	 *
	 * @param internalName - The card's unique internal name
	 * @returns The card data if found, null otherwise
	 */
	public async findByInternalName(internalName: string): Promise<CardData | null> {
		const result = await this.db.select(cardColumns).from(card).where(eq(card.internalName, internalName)).limit(1)

		return result[0] ?? null
	}

	/**
	 * Finds a card by its unique legacy id, including soft-deleted cards, since the database
	 * unique constraint spans them too.
	 *
	 * @param legacyId - The card's legacy (migration source) id
	 * @returns The card data if found, null otherwise
	 */
	public async findByLegacyId(legacyId: number): Promise<CardData | null> {
		const result = await this.db.select(cardColumns).from(card).where(eq(card.legacyId, legacyId)).limit(1)

		return result[0] ?? null
	}

	/**
	 * Finds the live card pinned at the given slot.
	 *
	 * @param pinnedPosition - The pinned slot (0-2)
	 * @returns The card holding the slot, or null if it is free
	 */
	public async findPinnedAt(pinnedPosition: number): Promise<CardData | null> {
		const result = await this.db
			.select(cardColumns)
			.from(card)
			.where(and(eq(card.isPinned, true), eq(card.pinnedPosition, pinnedPosition), isNull(card.deletedAt)))
			.limit(1)

		return result[0] ?? null
	}

	/**
	 * Retrieves live cards with pagination, ordered by `position` then `id`.
	 *
	 * @param params - Optional list parameters
	 * @param params.offset - Number of records to skip (default: 0)
	 * @param params.limit - Maximum records to return (default: 10)
	 * @param params.search - Case-insensitive match on internal name or title
	 * @param params.enabled - Restricts the list to visible (true) or hidden (false) cards
	 * @returns Paginated response containing cards and metadata
	 */
	public async findAll(params?: ListCardsParams): Promise<PaginatedResponse<CardData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET
		const where = and(
			isNull(card.deletedAt),
			this.buildSearchCondition(params?.search),
			params?.enabled === undefined ? undefined : eq(card.enabled, params.enabled),
		)

		const [data, totalResult] = await Promise.all([
			this.db.select(cardColumns).from(card).where(where).orderBy(card.position, card.id).limit(limit).offset(offset),
			this.db.select({ count: count() }).from(card).where(where),
		])

		return { data, total: totalResult[0].count, offset, limit }
	}

	/**
	 * Creates a card and records a `created` history snapshot.
	 *
	 * @param params - The validated card creation parameters
	 * @param actorId - ID of the user performing the action
	 * @returns The newly created card data
	 */
	public async create(params: CreateCardParams, actorId: number): Promise<CardData> {
		return this.translateUniqueViolation(params, () => this.insertCard(params, actorId))
	}

	private async insertCard(params: CreateCardParams, actorId: number): Promise<CardData> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const [created] = await tx
				.insert(card)
				.values({ ...params, createdAt: now, updatedAt: now })
				.returning(cardColumns)

			await this.insertHistory(tx, created, CardHistoryAction.CREATED, actorId, now)
			return created
		})
	}

	/**
	 * Applies a partial update to a live card and records an `updated` history snapshot.
	 * Only defined fields are written; `updatedAt` is always refreshed.
	 *
	 * @param id - The card's primary key
	 * @param params - The fields to update
	 * @param actorId - ID of the user performing the action
	 * @returns The updated card data, or null if the card is missing or soft-deleted
	 */
	public async update(id: number, params: UpdateCardParams, actorId: number): Promise<CardData | null> {
		return this.translateUniqueViolation(params, () => this.updateCard(id, params, actorId))
	}

	private async updateCard(id: number, params: UpdateCardParams, actorId: number): Promise<CardData | null> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const definedFields = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
			const [updated] = await tx
				.update(card)
				.set({ ...definedFields, updatedAt: now })
				.where(and(eq(card.id, id), isNull(card.deletedAt)))
				.returning(cardColumns)

			if (!updated) return null

			await this.insertHistory(tx, updated, CardHistoryAction.UPDATED, actorId, now)
			return updated
		})
	}

	/**
	 * Soft-deletes a live card by setting `deletedAt` and records a `deleted` history snapshot.
	 *
	 * @param id - The card's primary key
	 * @param actorId - ID of the user performing the action
	 * @returns true if the card was deleted, false if it was missing or already deleted
	 */
	public async softDelete(id: number, actorId: number): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const [deleted] = await tx
				.update(card)
				.set({ deletedAt: now, updatedAt: now })
				.where(and(eq(card.id, id), isNull(card.deletedAt)))
				.returning(cardColumns)

			if (!deleted) return false

			await this.insertHistory(tx, deleted, CardHistoryAction.DELETED, actorId, now)
			return true
		})
	}

	/**
	 * Runs a write and rethrows a unique violation on `internal_name` / `legacy_id` as the matching
	 * `CardConflictError`. Any other error propagates unchanged.
	 */
	private async translateUniqueViolation<T>(
		values: { internalName?: string; legacyId?: number | null },
		write: () => Promise<T>,
	): Promise<T> {
		try {
			return await write()
		} catch (error) {
			const constraint = findUniqueViolationConstraint(error)
			if (constraint?.includes('internal_name') && values.internalName !== undefined) {
				throw CardConflictError.internalName(values.internalName)
			}
			if (constraint?.includes('legacy_id') && typeof values.legacyId === 'number') {
				throw CardConflictError.legacyId(values.legacyId)
			}
			throw error
		}
	}

	/**
	 * Builds a case-insensitive search condition over internal name and title.
	 *
	 * @param search - The search term to filter by
	 * @returns A SQL condition or undefined if no search term provided
	 */
	private buildSearchCondition(search?: string): SQL | undefined {
		if (!search || search.trim().length === 0) {
			return undefined
		}

		const escaped = search.trim().replace(/[%_]/g, '\\$&')
		const pattern = `%${escaped}%`
		return or(ilike(card.internalName, pattern), ilike(card.title, pattern))
	}

	/**
	 * Writes a full-row snapshot of the card to `card_history`.
	 */
	private async insertHistory(
		tx: DrizzleTransaction,
		snapshot: CardData,
		action: CardHistoryAction,
		actorId: number,
		changedAt: Date,
	): Promise<void> {
		await tx.insert(cardHistory).values({
			cardId: snapshot.id,
			action,
			internalName: snapshot.internalName,
			title: snapshot.title,
			type: snapshot.type,
			imageUrl: snapshot.imageUrl,
			content: snapshot.content,
			link: snapshot.link,
			footerContent: snapshot.footerContent,
			footerSeparator: snapshot.footerSeparator,
			enabled: snapshot.enabled,
			isPinned: snapshot.isPinned,
			pinnedPosition: snapshot.pinnedPosition,
			position: snapshot.position,
			changedBy: actorId,
			changedAt,
		})
	}
}
