// Test file to verify trait history system
// Run this in browser console: node scripts/test-traits.mjs

import {
	traitHistory,
	addTraitChange,
	getCurrentTraits,
	migrateFromOldFormat,
	getTraitBreakdown
} from '../src/lib/stores/traitHistory.js';
import { get } from 'svelte/store';

console.log('=== Testing Trait History System ===\n');

// Test 1: Add trait changes
console.log('Test 1: Adding trait changes');
addTraitChange('E', 1, 'ritual', { sourceId: 'Scene001', description: 'Ritual question 1' });
addTraitChange('O', 1, 'ritual', { sourceId: 'Scene002', description: 'Ritual question 2' });
addTraitChange('E', 1, 'quest', {
	sourceId: 'daily-glimmering-moss',
	description: 'Completed daily quest'
});
console.log('Current traits:', getCurrentTraits());
console.log('E breakdown:', getTraitBreakdown('E'));
console.log('O breakdown:', getTraitBreakdown('O'));

// Test 2: Migrate from old format
console.log('\nTest 2: Migrating from old format');
const oldTraits = { E: 5, O: 5, A: 0, C: 0, N: 0 };
migrateFromOldFormat(oldTraits);
console.log('After migration:', getCurrentTraits());
console.log('E breakdown after migration:', getTraitBreakdown('E'));

// Test 3: Full history
console.log('\nTest 3: Full history');
const data = get(traitHistory);
console.log('History entries:', data.history.length);
console.log('History:', data.history);

console.log('\n=== All tests passed ===');
