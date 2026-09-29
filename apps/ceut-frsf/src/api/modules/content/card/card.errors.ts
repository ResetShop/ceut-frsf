export const CARD_ERRORS = Object.freeze({
	NOT_FOUND: 'Card not found',
	INTERNAL_NAME_EXISTS: 'A card with this internal name already exists',
	LEGACY_ID_EXISTS: 'A card with this legacy ID already exists',
	INVALID_PINNING: 'pinnedPosition must be set (0-2) when isPinned is true, and unset otherwise',
} as const)

/**
 * Error thrown when a card does not exist or has been soft-deleted.
 */
export class CardNotFoundError extends Error {
	constructor(id: number) {
		super(`${CARD_ERRORS.NOT_FOUND} (id: ${id})`)
		this.name = 'CardNotFoundError'
	}
}

/**
 * Error thrown when a unique card field is already held by another card (including a deleted one).
 */
export class CardConflictError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CardConflictError'
	}

	public static internalName(internalName: string): CardConflictError {
		return new CardConflictError(`${CARD_ERRORS.INTERNAL_NAME_EXISTS} (internalName: ${internalName})`)
	}

	public static legacyId(legacyId: number): CardConflictError {
		return new CardConflictError(`${CARD_ERRORS.LEGACY_ID_EXISTS} (legacyId: ${legacyId})`)
	}
}

/**
 * Error thrown when a partial update would leave the card's `isPinned` / `pinnedPosition`
 * pair inconsistent once merged with the stored row.
 */
export class CardValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CardValidationError'
	}
}
