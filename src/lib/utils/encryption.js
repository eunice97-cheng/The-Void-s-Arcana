import crypto from 'crypto-js';

const ENCRYPTION_KEY = 'voids-arcana-save-key';

/**
 * Simple AES helpers around crypto-js
 */
export class SaveEncryption {
	/**
	 * @param {any} data
	 * @returns {string}
	 */
	static encrypt(data) {
		return crypto.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
	}

	/**
	 * @param {string} encryptedData
	 * @returns {any}
	 */
	static decrypt(encryptedData) {
		const bytes = crypto.AES.decrypt(encryptedData, ENCRYPTION_KEY);
		return JSON.parse(bytes.toString(crypto.enc.Utf8));
	}
}

// Try to parse a saved string which may be encrypted or plain JSON.
// Returns the parsed object or throws an Error if parsing fails.
// Try to parse a saved string which may be encrypted or plain JSON.
// Returns an object { data, wasEncrypted } where `wasEncrypted` is true
// if the string was successfully decrypted, false if plaintext JSON was used.
// If `autoMigrateKey` is provided and the payload was plaintext, this helper
// will attempt to rewrite the value at that key using the preferred
// (encrypted) serializer so older plaintext saves are migrated silently.
/**
 * Try to parse a saved string which may be encrypted or plain JSON.
 * @param {string} raw
 * @param {string|null} [autoMigrateKey=null] - if provided and raw is plaintext, the helper will write the encrypted payload back using this key
 * @returns {{data:any, wasEncrypted:boolean}}
 */
export function parseMaybeEncrypted(raw, autoMigrateKey = null) {
	if (!raw) throw new Error('No save data provided');
	// First attempt decryption
	try {
		const decrypted = SaveEncryption.decrypt(raw);
		return { data: decrypted, wasEncrypted: true };
	} catch (decryptErr) {
		// Fallback to plaintext JSON
		try {
			const parsed = JSON.parse(raw);
			// If requested, re-write the save using the preferred (encrypted) format
			if (autoMigrateKey && typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(autoMigrateKey, stringifyPreferEncrypted(parsed));
				} catch (e) {
					// non-fatal; we'll keep the parsed result
					console.warn('Auto-migration to encrypted save failed', e);
				}
			}
			return { data: parsed, wasEncrypted: false };
		} catch (parseErr) {
			const err = new Error('Failed to parse save data');
			/** @type {any} */ (err).original = { decryptErr, parseErr };
			throw err;
		}
	}
}

// Return a string representation of the object, preferring encrypted output.
// If encryption fails for any reason, falls back to JSON.stringify.
/**
 * @param {any} obj
 * @returns {string}
 */
export function stringifyPreferEncrypted(obj) {
	try {
		return SaveEncryption.encrypt(obj);
	} catch (e) {
		try {
			return JSON.stringify(obj);
		} catch (jse) {
			throw new Error('Failed to serialize save object');
		}
	}
}

// Convenience helper to write a save into localStorage using the preferred format.
/**
 * Convenience helper to write a save into localStorage using the preferred format.
 * @param {string} key
 * @param {any} obj
 */
export function writeSave(key, obj) {
	const payload = stringifyPreferEncrypted(obj);
	localStorage.setItem(key, payload);
}
