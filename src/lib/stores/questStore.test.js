// src/lib/stores/questStore.test.js
import { serverNow } from './questStore';

describe('questStore', () => {
	describe('serverNow', () => {
		it('returns current time adjusted by server offset', () => {
			const mockNow = 1000000;
			jest.spyOn(Date, 'now').mockReturnValue(mockNow);
			expect(serverNow()).toBe(mockNow);
		});
	});
});