// Game state
const gameState = {
    audioEnabled: true,
    currentWindow: null,
    gameInfoVisible: false,
    settingsVisible: false,
    uiVisible: true,
    playerData: {
        level: 1,
        exp: 0,
        maxExp: 100,
        hp: 100,
        maxHp: 100,
        sp: 100,
        maxSp: 100,
        stamina: 200,
        maxStamina: 100,
        gold: 0,
        silver: 0,
        diamonds: 0
    },
    uploadInProgress: false
};

// DOM Elements
const audioToggle = document.getElementById('audio-toggle');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const resetBtn = document.getElementById('reset-btn');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettings = document.getElementById('close-settings');
const settingsModal = document.getElementById('settings-modal');
const gameInfoBtn = document.getElementById('game-info-btn');
const gameInfoPanel = document.getElementById('game-info-panel');
const masterVolume = document.getElementById('master-volume');
const volumeValue = document.getElementById('volume-value');
const loadingIndicator = document.getElementById('loading-indicator');

// Initialize the game interface
function init() {
    try {
        if (!validateDOM()) {
            throw new Error('Required DOM elements missing');
        }

        setupEventListeners();
        initUI();
        initWindows(); // ← Make sure this is here
        updateGameUI();
        updateVolumeDisplays();
        startTimeUpdate();

        setTimeout(() => {
            document.getElementById('toggle-ui').addEventListener('click', toggleUI);
        }, 100);


        console.log('Game interface initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game interface:', error);
        showError('Failed to initialize game interface. Please refresh the page.');
    }
}

// Validate required DOM elements exist
function validateDOM() {
    const requiredElements = [
        audioToggle, saveBtn, loadBtn, resetBtn, importBtn, exportBtn,
        settingsBtn, closeSettings, settingsModal, gameInfoBtn, gameInfoPanel,
        masterVolume, volumeValue, loadingIndicator
    ];

    return requiredElements.every(element => {
        if (!element) {
            console.error('Missing required DOM element:', element);
            return false;
        }
        return true;
    });
}

// Set up all event listeners
function setupEventListeners() {
    try {
        // Audio toggle
        audioToggle.addEventListener('click', toggleAudio);

        // Game actions
        saveBtn.addEventListener('click', () => confirmAction('save'));
        loadBtn.addEventListener('click', () => confirmAction('load'));
        resetBtn.addEventListener('click', () => confirmAction('reset'));
        exportBtn.addEventListener('click', () => confirmAction('export'));

        // Settings
        settingsBtn.addEventListener('click', openSettings);
        closeSettings.addEventListener('click', closeSettingsModal);

        // Game info
        gameInfoBtn.addEventListener('click', toggleGameInfo);

        // Volume controls
        masterVolume.addEventListener('input', updateVolumeDisplays);

        // Settings modal close
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });

        setupUIEventListeners();
        setupWindowEventListeners();

        // Escape key to close settings and windows
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (gameState.settingsVisible) {
                    closeSettingsModal();
                }
                if (gameState.currentWindow) {
                    closeCurrentWindow();
                }
            }
        });

        // Error handling for failed resources
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                console.error('Failed to load image:', e.target.src);
                showError('Failed to load image resource');
            }
        }, true);

    } catch (error) {
        console.error('Error setting up event listeners:', error);
        showError('Some features may not work properly.');
    }
}

// Toggle audio on/off
function toggleAudio() {
    try {
        gameState.audioEnabled = !gameState.audioEnabled;
        const icon = audioToggle.querySelector('i');

        if (gameState.audioEnabled) {
            icon.className = 'fas fa-volume-up';
            audioToggle.setAttribute('aria-label', 'Mute audio');
        } else {
            icon.className = 'fas fa-volume-mute';
            audioToggle.setAttribute('aria-label', 'Unmute audio');
        }

        updateVolumeDisplays();
    } catch (error) {
        console.error('Error toggling audio:', error);
        showError('Failed to toggle audio settings.');
    }
}

// Toggle UI visibility ← ADD THIS ENTIRE FUNCTION
function toggleUI() {
    const topLeftUI = document.getElementById('top-left-ui');
    const toggleBtn = document.getElementById('toggle-ui');
    const icon = toggleBtn.querySelector('i');

    gameState.uiVisible = !gameState.uiVisible;
    topLeftUI.classList.toggle('hidden', !gameState.uiVisible);

    if (gameState.uiVisible) {
        icon.className = 'fas fa-eye';
        toggleBtn.setAttribute('aria-label', 'Hide UI');
    } else {
        icon.className = 'fas fa-eye-slash';
        toggleBtn.setAttribute('aria-label', 'Show UI');
    }
}

// Confirm action with a dialog
function confirmAction(action) {
    // Import is handled separately in ui.js
    if (action === 'import') return;

    const messages = {
        save: 'Save your game progress?',
        load: 'Load saved game? Unsaved progress will be lost.',
        reset: 'Reset game? All progress will be lost.',
        export: 'Export your game data?'
    };

    if (confirm(messages[action])) {
        showLoading(true);

        setTimeout(() => {
            let success = false;
            switch (action) {
                case 'save': success = saveManager.saveGame(); break;
                case 'load': success = saveManager.loadGame(); break;
                case 'reset': success = saveManager.resetGame(); break;
                case 'export': success = saveManager.exportSave(); break;
            }
            showLoading(false);
        }, 500);
    }
}

// Open settings modal
function openSettings() {
    try {
        settingsModal.classList.add('active');
        settingsModal.setAttribute('aria-hidden', 'false');
        gameState.settingsVisible = true;

        const focusableElements = settingsModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

    } catch (error) {
        console.error('Error opening settings:', error);
        showError('Failed to open settings.');
    }
}

// Close settings modal
function closeSettingsModal() {
    try {
        settingsModal.classList.remove('active');
        settingsModal.setAttribute('aria-hidden', 'true');
        gameState.settingsVisible = false;

        if (settingsBtn) settingsBtn.focus();
    } catch (error) {
        console.error('Error closing settings:', error);
    }
}

// Toggle game info panel
function toggleGameInfo() {
    try {
        gameInfoPanel.classList.toggle('active');
        const isVisible = !gameState.gameInfoVisible;
        gameInfoPanel.setAttribute('aria-hidden', !isVisible);
        gameState.gameInfoVisible = isVisible;
    } catch (error) {
        console.error('Error toggling game info:', error);
        showError('Failed to toggle game information.');
    }
}

// Update volume display values
function updateVolumeDisplays() {
    try {
        const masterVol = gameState.audioEnabled ? masterVolume.value : 0;

        if (volumeValue) {
            volumeValue.textContent = `${masterVol}%`;
        }

        if (masterVolume) {
            masterVolume.setAttribute('aria-valuenow', masterVol);
        }
    } catch (error) {
        console.error('Error updating volume displays:', error);
    }
}

// Update game UI with current state
function updateGameUI() {
    try {
        // Update progress bars
        const hpPercent = (gameState.playerData.hp / gameState.playerData.maxHp) * 100;
        const spPercent = (gameState.playerData.sp / gameState.playerData.maxSp) * 100;
        const staminaPercent = (gameState.playerData.stamina / gameState.playerData.maxStamina) * 100;
        const expPercent = (gameState.playerData.exp / gameState.playerData.maxExp) * 100;

        const hpBar = document.getElementById('hp-bar');
        const spBar = document.getElementById('sp-bar');
        const staminaBar = document.getElementById('stamina-bar');
        const expProgress = document.getElementById('exp-progress');

        if (hpBar) hpBar.style.width = `${hpPercent}%`;
        if (spBar) spBar.style.width = `${spPercent}%`;
        if (staminaBar) staminaBar.style.width = `${staminaPercent}%`;
        if (expProgress) expProgress.style.width = `${expPercent}%`;

        // Update ARIA values for accessibility
        if (hpBar) hpBar.setAttribute('aria-valuenow', gameState.playerData.hp);
        if (spBar) spBar.setAttribute('aria-valuenow', gameState.playerData.sp);
        if (staminaBar) staminaBar.setAttribute('aria-valuenow', gameState.playerData.stamina);
        if (expProgress) expProgress.setAttribute('aria-valuenow', gameState.playerData.exp);

        // Update bar values text
        const barValues = document.querySelectorAll('.bar-value');
        if (barValues[0]) barValues[0].textContent = `${gameState.playerData.hp}/${gameState.playerData.maxHp}`;
        if (barValues[1]) barValues[1].textContent = `${gameState.playerData.sp}/${gameState.playerData.maxSp}`;
        if (barValues[2]) barValues[2].textContent = `${gameState.playerData.stamina}/${gameState.playerData.maxStamina}`;

        // Update currency displays
        const currencyItems = document.querySelectorAll('.currency-item span');
        if (currencyItems[0]) currencyItems[0].textContent = gameState.playerData.gold.toLocaleString();
        if (currencyItems[1]) currencyItems[1].textContent = gameState.playerData.silver.toLocaleString();
        if (currencyItems[2]) currencyItems[2].textContent = gameState.playerData.diamonds;

        // Update experience info text
        const expInfo = document.querySelector('#exp-info');
        if (expInfo) {
            const expSpans = expInfo.querySelectorAll('span');
            if (expSpans[0]) expSpans[0].textContent = `Level ${gameState.playerData.level}`;
            if (expSpans[1]) expSpans[1].textContent =
                `${gameState.playerData.exp.toLocaleString()}/${gameState.playerData.maxExp.toLocaleString()} XP`;
        }

    } catch (error) {
        console.error('Error updating game UI:', error);
        showError('Failed to update game interface.');
    }
}

// Malaysia timezone functions
function updateMalaysiaTime() {
    try {
        const now = new Date();

        const malaysiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));

        const isSmallScreen = window.innerWidth <= 550;

        const dateOptions = isSmallScreen ? {
            month: 'short',
            day: 'numeric'
        } : {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        const timeOptions = isSmallScreen ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        } : {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        const dateString = malaysiaTime.toLocaleDateString('en-MY', dateOptions);
        const timeString = malaysiaTime.toLocaleTimeString('en-MY', timeOptions);

        const currentDate = document.getElementById('current-date');
        const currentTime = document.getElementById('current-time');

        if (currentDate) currentDate.textContent = dateString;
        if (currentTime) currentTime.textContent = timeString;
    } catch (error) {
        console.error('Error updating time:', error);
    }
}

// Update time immediately and then every second
function startTimeUpdate() {
    try {
        updateMalaysiaTime();
        setInterval(updateMalaysiaTime, 1000);
    } catch (error) {
        console.error('Error starting time update:', error);
    }
}

// Show loading indicator
function showLoading(show) {
    try {
        if (show) {
            loadingIndicator.classList.remove('hidden');
            loadingIndicator.setAttribute('aria-hidden', 'false');
        } else {
            loadingIndicator.classList.add('hidden');
            loadingIndicator.setAttribute('aria-hidden', 'true');
        }
    } catch (error) {
        console.error('Error toggling loading indicator:', error);
    }
}

// Show error message to user
function showError(message) {
    try {
        alert(`Error: ${message}`);
    } catch (error) {
        console.error('Failed to show error message:', error);
    }
}

// Close current window
function closeCurrentWindow() {
    try {
        if (gameState.currentWindow) {
            const window = document.getElementById(gameState.currentWindow);
            if (window) {
                window.classList.remove('active');
                window.setAttribute('aria-hidden', 'true');
            }
            const toggle = document.querySelector(`[data-window="${gameState.currentWindow}"]`);
            if (toggle) {
                toggle.classList.remove('active');
            }
            gameState.currentWindow = null;
        }
    } catch (error) {
        console.error('Error closing window:', error);
        showError('Failed to close window');
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle page visibility changes
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        console.log('Page hidden - game paused');
    } else {
        console.log('Page visible - game resumed');
    }
});

// Export game state for debugging
window.getGameState = function () {
    return JSON.parse(JSON.stringify(gameState));
};

// Global error handler
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
    showError('An unexpected error occurred. Please refresh the page.');
});

// Promise rejection handler
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
    showError('An unexpected error occurred. Please refresh the page.');
});