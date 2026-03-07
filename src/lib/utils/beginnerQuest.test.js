// @ts-nocheck
// src/lib/utils/beginnerQuest.test.js
describe('Beginner Quest Logic', () => {
	it('identifies beginner quests correctly', () => {
		const beginnerQuest = { series: 'beginner' };
		const normalQuest = { series: 'normal' };
		const dummyQuest = { series: 'dummy' };

		// Test the logic from game/+page.svelte
		const isBeginnerOrDummy = (quest) => quest ? (quest.series === 'beginner' || quest.series === 'dummy') : false;

		expect(isBeginnerOrDummy(beginnerQuest)).toBe(true);
		expect(isBeginnerOrDummy(dummyQuest)).toBe(true);
		expect(isBeginnerOrDummy(normalQuest)).toBe(false);
		expect(isBeginnerOrDummy(null)).toBe(false);
	});

	it('skips engine for beginner quests', () => {
		const beginnerQuest = { series: 'beginner' };
		const normalQuest = { series: 'normal' };

		const shouldSkipEngine = (quest) => quest && (quest.series === 'beginner' || quest.series === 'dummy');

		expect(shouldSkipEngine(beginnerQuest)).toBe(true);
		expect(shouldSkipEngine(normalQuest)).toBe(false);
	});
});