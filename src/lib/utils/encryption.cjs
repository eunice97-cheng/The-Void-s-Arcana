/* @ts-check */
/* global localStorage */
/**
 * Lightweight save encryption helpers.
 * This module provides functions to encrypt/decrypt save payloads using
 * crypto-js AES and to parse payloads that may be plaintext or encrypted.
 *
 * Kept as CommonJS because some parts of the codebase import this file as CJS.
 */
const crypto = require('crypto-js');

/** @type {string} */
const ENCRYPTION_KEY = 'voids-arcana-save-key';

/**
 * Encrypt a JS value to an AES ciphertext string.
 * @param {unknown} data
 * @returns {string}
 */
function encrypt(data) {
	return crypto.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an AES ciphertext string back into a JS value.
 * @param {string} encryptedData
 * @returns {unknown}
 */
function decrypt(encryptedData) {
	const bytes = crypto.AES.decrypt(encryptedData, ENCRYPTION_KEY);
	return JSON.parse(bytes.toString(crypto.enc.Utf8));
}

/**
 * Try to parse a save payload that might be encrypted or plaintext JSON.
 * If `autoMigrateKey` is provided and the payload is plaintext, the plaintext
 * will be re-saved to localStorage in encrypted form under that key.
 *
 * @param {string} raw - the raw saved string (possibly encrypted)
 * @param {string|null} [autoMigrateKey]
 * @returns {{data: any, wasEncrypted: boolean}}
 */
function parseMaybeEncrypted(raw, autoMigrateKey = null) {
	if (!raw) throw new Error('No save data provided');
	try {
		const decrypted = decrypt(raw);
		return { data: decrypted, wasEncrypted: true };
	} catch {
		try {
			const parsed = JSON.parse(raw);
			if (autoMigrateKey && typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(autoMigrateKey, encrypt(parsed));
				} catch {
					// ignore storage errors
				}
			}
			return { data: parsed, wasEncrypted: false };
		} catch {
			const err = new Error('Failed to parse save data');
			// attach originals for debugging, keep TS happy by using /** @type {any} */
			/** @type {any} */ (err).original = {
				/* decryptErr, parseErr */
			};
			throw err;
		}
	}
}

/**
 * Serialize a JS value, preferring encrypted output. On failure, falls back
 * to plaintext JSON.
 * @param {unknown} obj
 * @returns {string}
 */
function stringifyPreferEncrypted(obj) {
	try {
		return encrypt(obj);
	} catch {
		return JSON.stringify(obj);
	}
}

module.exports = { stringifyPreferEncrypted, parseMaybeEncrypted };
