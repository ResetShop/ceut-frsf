import { toMenuGroups } from './menu-groups'

describe('toMenuGroups', () => {
	const edit = { label: 'Edit' }
	const archive = { label: 'Archive' }
	const remove = { label: 'Delete' }

	it('wraps a flat list into a single group', () => {
		expect(toMenuGroups([edit, archive])).toEqual([[edit, archive]])
	})

	it('keeps the groups of a grouped list in order', () => {
		expect(toMenuGroups([[edit, archive], [remove]])).toEqual([[edit, archive], [remove]])
	})

	it('drops empty groups so no separator is rendered for them', () => {
		expect(toMenuGroups([[], [edit], [], [remove]])).toEqual([[edit], [remove]])
	})

	it('returns no groups for an empty list or a list of empty groups', () => {
		expect(toMenuGroups([])).toEqual([])
		expect(toMenuGroups([[], []])).toEqual([])
	})
})
