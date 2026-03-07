// DOM Elements
const windowToggles = document.querySelectorAll('.window-toggle');
const windows = document.querySelectorAll('.window');
const closeWindowBtns = document.querySelectorAll('.close-window');

// Toggle window visibility
function toggleWindow(windowId) {
    try {
        console.log('Toggle window called:', windowId); // Debug log
        
        if (!windowId) {
            throw new Error('No window ID specified');
        }
        
        // If clicking the same window that's already open, close it
        if (gameState.currentWindow === windowId) {
            closeCurrentWindow();
            return;
        }
        
        // Close any currently open window
        closeCurrentWindow();
        
        const targetWindow = document.getElementById(windowId);
        const targetToggle = document.querySelector(`[data-window="${windowId}"]`);
        
        if (!targetWindow) {
            throw new Error(`Window not found: ${windowId}`);
        }
        
        // Open the new window
        targetWindow.classList.add('active');
        targetWindow.setAttribute('aria-hidden', 'false');
        
        if (targetToggle) {
            targetToggle.classList.add('active');
        }
        
        gameState.currentWindow = windowId;
        console.log('Window opened:', windowId); // Debug log
        
    } catch (error) {
        console.error('Error toggling window:', error);
        showError('Failed to open window.');
    }
}

// Close current window
function closeCurrentWindow() {
    try {
        if (gameState.currentWindow) {
            const window = document.getElementById(gameState.currentWindow);
            const toggle = document.querySelector(`[data-window="${gameState.currentWindow}"]`);
            
            if (window) {
                window.classList.remove('active');
                window.setAttribute('aria-hidden', 'true');
            }
            
            if (toggle) {
                toggle.classList.remove('active');
            }
            
            console.log('Window closed:', gameState.currentWindow); // Debug log
            gameState.currentWindow = null;
        }
    } catch (error) {
        console.error('Error closing window:', error);
    }
}

function setupWindowEventListeners() {
    try {
        console.log('Setting up window listeners...');
        
        // Remove existing listeners by replacing with simpler approach
        const freshToggles = document.querySelectorAll('.window-toggle');
        const freshCloseBtns = document.querySelectorAll('.close-window');
        
        // Clear all existing click events
        freshToggles.forEach(toggle => {
            toggle.onclick = null;
        });
        freshCloseBtns.forEach(btn => {
            btn.onclick = null;
        });
        
        // Add new event listeners
        freshToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('Toggle clicked:', this.dataset.window);
                toggleWindow(this.dataset.window);
            });
        });
        
        freshCloseBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeCurrentWindow();
            });
        });
        
        console.log('Window listeners setup complete');
        
    } catch (error) {
        console.error('Error setting up window event listeners:', error);
    }
}

// Initialize window management
function initWindows() {
    setupWindowEventListeners();
}