class NameInput {
    constructor() {
        this.container = document.getElementById('name-input-container');
        this.background = document.getElementById('name-input-background');
        this.title = document.getElementById('name-input-title');
        this.inputField = document.getElementById('name-input-field');
        this.continueBtn = document.getElementById('name-input-continue');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.continueBtn.addEventListener('click', () => this.submitName());
        this.inputField.addEventListener('input', () => this.validateInput());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitName();
        });
    }

    validateInput() {
        const name = this.inputField.value;
        
        // Rule 1: 12 character max
        if (name.length > 12) {
            this.inputField.value = name.substring(0, 12);
        }
        
        // Rule 2: Alphabet and numbers only
        const filtered = this.inputField.value.replace(/[^a-zA-Z0-9]/g, '');
        if (filtered !== this.inputField.value) {
            this.inputField.value = filtered;
        }
        
        const trimmedName = this.inputField.value.trim();
        this.continueBtn.disabled = trimmedName.length === 0;
    }

    submitName() {
        const name = this.inputField.value.trim();
        if (name.length > 0) {
            // Prompt confirmation
            const confirmed = confirm(`Confirm your name: "${name}"\n\nThis name cannot be changed later.`);
            
            if (confirmed) {
                // Get existing save data
                const savedData = JSON.parse(localStorage.getItem('game_save_data') || '{}');
                
                // Add name to character data
                if (!savedData.character) savedData.character = {};
                savedData.character.name = name;
                
                // Update save data
                localStorage.setItem('game_save_data', JSON.stringify(savedData));
                
                // Trigger auto save
                if (window.parent !== window && window.parent.saveManager) {
                    window.parent.saveManager.saveGame();
                    window.parent.saveManager.showSaveNotification('Name saved successfully!');
                }

                
                // Proceed to narrative
                window.location.href = 'narrative.html?scene=Scene017';
            }
        }
    }

    show() {
        this.container.style.display = 'flex';
        this.inputField.focus();
    }

    hide() {
        this.container.style.display = 'none';
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    const nameInput = new NameInput();
    nameInput.show();
});