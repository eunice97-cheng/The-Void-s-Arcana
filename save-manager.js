// save-manager.js
class SaveManager {
    constructor() {
        this.saveKey = 'game_save_data';
        this.autoSaveInterval = null;
        this.autoSaveEnabled = false;
        this.pendingImport = null;
    }

    // Create a complete save data object
    createSaveData() {
        return {
            timestamp: Date.now(),
            version: '1.0.2',
            character: gameState.character || {},
            playerData: { ...gameState.playerData },
            personality: JSON.parse(localStorage.getItem('personality_traits') || '{}'),
            settings: {
                audioEnabled: gameState.audioEnabled,
                masterVolume: document.getElementById('master-volume')?.value || 80
            },
            avatar: document.getElementById('avatar')?.src || null,
            gameTime: this.getPlayTime(),
            currentScene: gameState.currentScene || 'game',
            personality_completed: localStorage.getItem('personality_completed') === 'true' || false
        };
    }

    // Save game to localStorage
    saveGame() {
        try {
            const saveData = this.createSaveData();
            const serializedData = JSON.stringify(saveData);
            localStorage.setItem(this.saveKey, serializedData);

            console.log('Game saved successfully');
            this.showSaveNotification('Game saved successfully!');
            return true;

        } catch (error) {
            console.error('Save failed:', error);
            this.showSaveNotification('Save failed!', true);
            return false;
        }
    }

    // Load game from localStorage
    loadGame() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (!savedData) {
                console.log('No saved game found');
                return { ok: false, reason: 'no-save' };
            }

            const saveData = JSON.parse(savedData);

            // Validate save data structure (be forgiving and fill defaults when possible)
            if (!this.validateSaveData(saveData)) {
                console.log('Invalid save data format');
                return { ok: false, reason: 'invalid' };
            }

            // Apply defaults to avoid page-specific failures
            const settings = saveData.settings || { audioEnabled: true, masterVolume: 80 };
            const character = saveData.character || {};
            const playerData = saveData.playerData || {};

            // Restore game state
            gameState.character = { ...character };
            gameState.playerData = { ...playerData };
            gameState.audioEnabled = !!settings.audioEnabled;
            gameState.currentScene = saveData.currentScene || 'game';

            // Restore personality traits
            if (saveData.personality) {
                try { localStorage.setItem('personality_traits', JSON.stringify(saveData.personality)); } catch (_) {}
            }

            // Restore personality completion flag
            if (saveData.personality_completed) {
                try { localStorage.setItem('personality_completed', 'true'); } catch (_) {}
            }

            // Restore volume setting
            const volumeSlider = document.getElementById('master-volume');
            if (volumeSlider && typeof settings.masterVolume !== 'undefined') {
                volumeSlider.value = settings.masterVolume;
            }

            // Restore avatar if exists
            if (saveData.avatar && typeof saveData.avatar === 'string' && saveData.avatar.startsWith('data:')) {
                const avatar = document.getElementById('avatar');
                const placeholder = document.getElementById('avatar-placeholder');
                if (avatar && placeholder) {
                    avatar.onerror = function () {
                        this.style.display = 'none';
                        placeholder.style.display = 'block';
                    };
                    avatar.src = saveData.avatar;
                    avatar.style.display = 'block';
                    placeholder.style.display = 'none';
                }
            }

            // Update UI (optional, only if available on this page)
            if (typeof updateGameUI === 'function') {
                try { updateGameUI(); } catch (_) {}
            }
            if (typeof updateVolumeDisplays === 'function') {
                try { updateVolumeDisplays(); } catch (_) {}
            }

            console.log('Game loaded successfully');
            this.showSaveNotification('Game loaded successfully!');
            return { ok: true };

        } catch (error) {
            console.error('Load failed:', error);
            this.showSaveNotification('Load failed: ' + error.message, true);
            return { ok: false, reason: 'error', error };
        }
    }

    // Validate save data structure
    validateSaveData(saveData) {
        return saveData &&
               saveData.character !== undefined &&
               saveData.playerData !== undefined &&
               saveData.settings !== undefined;
    }

    // Export save data as downloadable file
    exportSave() {
        try {
            const saveData = this.createSaveData();
            const dataStr = JSON.stringify(saveData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `game_save_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showSaveNotification('Game data exported!');
            return true;

        } catch (error) {
            console.error('Export failed:', error);
            this.showSaveNotification('Export failed!', true);
            return false;
        }
    }

    // Import save data from file
    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const saveData = JSON.parse(e.target.result);

                    if (!this.validateSaveData(saveData)) {
                        throw new Error('Invalid save file format');
                    }

                    // Store the imported data temporarily
                    this.pendingImport = saveData;

                    if (confirm('This will overwrite your current game. Continue?')) {
                        this.applyImportedData();
                        this.showSaveNotification('Game data imported successfully!');
                        resolve(true);
                    } else {
                        this.pendingImport = null;
                        resolve(false);
                    }

                } catch (error) {
                    console.error('Import failed:', error);
                    this.showSaveNotification('Import failed: Invalid file', true);
                    reject(error);
                }
            };

            reader.onerror = () => {
                this.showSaveNotification('Failed to read file', true);
                reject(new Error('File read error'));
            };

            reader.readAsText(file);
        });
    }

    // Apply imported data to game
    applyImportedData() {
        if (!this.pendingImport) return;

        // Restore character data including name
        gameState.character = { ...this.pendingImport.character };
        gameState.playerData = { ...this.pendingImport.playerData };
        gameState.audioEnabled = this.pendingImport.settings.audioEnabled;
        gameState.currentScene = this.pendingImport.currentScene || 'game';

        // Restore personality traits
        if (this.pendingImport.personality) {
            localStorage.setItem('personality_traits', JSON.stringify(this.pendingImport.personality));
        }

        // Restore personality completion flag
        if (this.pendingImport.personality_completed) {
            localStorage.setItem('personality_completed', 'true');
        }

        const volumeSlider = document.getElementById('master-volume');
        if (volumeSlider && this.pendingImport.settings.masterVolume) {
            volumeSlider.value = this.pendingImport.settings.masterVolume;
        }

        if (this.pendingImport.avatar && this.pendingImport.avatar.startsWith('data:')) {
            const avatar = document.getElementById('avatar');
            const placeholder = document.getElementById('avatar-placeholder');
            if (avatar && placeholder) {
                avatar.onerror = function () {
                    this.style.display = 'none';
                    placeholder.style.display = 'block';
                };
                avatar.src = this.pendingImport.avatar;
                avatar.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        if (typeof updateGameUI === 'function') {
            updateGameUI();
        }
        if (typeof updateVolumeDisplays === 'function') {
            updateVolumeDisplays();
        }
        this.pendingImport = null;
    }

    // Reset game to initial state
    resetGame() {
        if (!confirm('This will erase all progress and cannot be undone. Continue?')) {
            return false;
        }

        try {
            // Reset to initial player data
            gameState.playerData = {
                level: 1,
                exp: 0,
                maxExp: 100,
                hp: 100,
                maxHp: 100,
                sp: 100,
                maxSp: 100,
                stamina: 100,
                maxStamina: 100,
                gold: 0,
                silver: 0,
                diamonds: 0
            };

            // Clear character data including name
            gameState.character = {};
            gameState.currentScene = 'game';

            // Clear personality traits
            localStorage.removeItem('personality_traits');
            localStorage.removeItem('personality_completed');

            // Reset avatar
            const avatar = document.getElementById('avatar');
            const placeholder = document.getElementById('avatar-placeholder');
            if (avatar && placeholder) {
                avatar.style.display = 'none';
                placeholder.style.display = 'block';
                avatar.removeAttribute('src');
            }

            // Clear save data
            localStorage.removeItem(this.saveKey);

            // Update UI
            if (typeof updateGameUI === 'function') {
                updateGameUI();
            }

            console.log('Game reset successfully');
            this.showSaveNotification('Game reset!');
            return true;

        } catch (error) {
            console.error('Reset failed:', error);
            this.showSaveNotification('Reset failed!', true);
            return false;
        }
    }

    // Show save/load notification
    showSaveNotification(message, isError = false) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#ff4444' : '#4CAF50'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Calculate play time (simplified)
    getPlayTime() {
        return '15h 32m'; // This would need proper tracking implementation
    }
}

// Initialize save manager
const saveManager = new SaveManager();

// Provide a global, page-safe helper to load from anywhere
window.loadGameAnywhere = function loadGameAnywhere(options = {}) {
    const { navigateToGame = false, gamePage = 'game.html' } = options;
    const result = saveManager.loadGame();

    if (result && result.ok) {
        // If requested, navigate to the main game page when not already there
        if (navigateToGame) {
            try {
                const isAlreadyOnGamePage = typeof window !== 'undefined' && window.location && window.location.pathname.endsWith(gamePage);
                if (!isAlreadyOnGamePage) {
                    window.location.href = gamePage;
                }
            } catch (_) {}
        }
        return true;
    }

    // Show user-friendly message based on reason
    if (result && result.reason === 'no-save') {
        saveManager.showSaveNotification('No save found to load.', true);
    } else if (result && result.reason === 'invalid') {
        saveManager.showSaveNotification('Saved data is invalid or corrupted.', true);
    } else {
        saveManager.showSaveNotification('Failed to load saved game.', true);
    }
    return false;
};

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);