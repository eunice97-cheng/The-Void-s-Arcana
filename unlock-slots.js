// Unlock all save slots for development testing
// Run this in the browser console at http://localhost:5174

// Access the saveSlotsManager store
import { saveSlotsManager } from './src/lib/stores/saveSlotsManager.js';

// Call the unlockAllSlots method
saveSlotsManager.unlockAllSlots();

// Log the result

console.log('All save slots unlocked for development testing!');
