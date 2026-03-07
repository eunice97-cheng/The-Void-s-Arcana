// playwright.setup.js
import { webcrypto } from 'crypto';

// Polyfill webcrypto if not available
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

console.log('Setting up TransformStream polyfill...');

// Polyfill TransformStream if not available
if (!globalThis.TransformStream) {
  // Use the web-streams-polyfill package if available, otherwise simple implementation
  try {
    const { TransformStream } = require('web-streams-polyfill');
    globalThis.TransformStream = TransformStream;
    console.log('TransformStream polyfill applied from web-streams-polyfill');
  } catch (e) {
    console.log('web-streams-polyfill not available, using fallback');
    // Fallback simple implementation
    globalThis.TransformStream = class TransformStream {
      constructor(transformer) {
        this.transformer = transformer;
        this.readable = {
          getReader() {
            return {
              read() {
                return Promise.resolve({ done: true, value: undefined });
              }
            };
          }
        };
        this.writable = {
          getWriter() {
            return {
              write() {
                return Promise.resolve();
              },
              close() {
                return Promise.resolve();
              }
            };
          }
        };
      }
    };
  }
} else {
  console.log('TransformStream already available');
}