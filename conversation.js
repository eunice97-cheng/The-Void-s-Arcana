class ConversationMode {
    constructor() {
        this.container = document.getElementById('conversation-overlay');
        this.continueBtn = document.getElementById('conversation-continue');
        this.backBtn = document.getElementById('conversation-back');
        this.npcText = document.getElementById('npc-text');
        this.playerText = document.getElementById('player-text');
        this.npcName = document.getElementById('npc-name');
        this.background = document.getElementById('conversation-background');
        this.npcPortraitContainer = document.getElementById('npc-portrait-container');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.continueBtn.addEventListener('click', () => this.nextScene());
        this.backBtn.addEventListener('click', () => this.previousScene());
    }

    async start(sceneArray) {
        this.scene = sceneArray[0];
        this.showScene();
        this.container.style.display = 'flex';
        this.updateBackButton();
    }

    updateBackButton() {
        const previousTitle = sceneManager.getPreviousScene(sceneManager.currentScene.title);
        const canGoBack = previousTitle !== undefined && previousTitle !== null;
        this.backBtn.disabled = !canGoBack;
    }

    showScene() {
        const scene = this.scene;

        if (this.background && scene.background) {
            this.background.style.background = scene.background;
        }

        if (this.npcName && scene.npcName) {
            this.npcName.textContent = scene.npcName;
        }

        if (this.npcPortraitContainer) {
            this.npcPortraitContainer.innerHTML = '';

            if (scene.npcPortrait) {
                const portraitImg = document.createElement('img');
                portraitImg.id = 'npc-portrait';
                portraitImg.src = scene.npcPortrait;
                portraitImg.alt = scene.npcName || 'NPC Character';
                this.npcPortraitContainer.appendChild(portraitImg);
            }
        }

        // Get player name from save data
        const savedData = JSON.parse(localStorage.getItem('game_save_data') || '{}');
        const playerName = savedData.character?.name || 'Traveler';

        if (this.npcText && scene.npcText) {
            // Replace [player name] with actual name from save
            let processedText = scene.npcText;
            processedText = processedText.replace(/\[player name\]/g, playerName);

            this.npcText.textContent = processedText;
            this.npcText.classList.remove('fade-in');
            setTimeout(() => this.npcText.classList.add('fade-in'), 10);
        }

        if (this.playerText && scene.playerText) {
            // Replace [player name] in player text as well
            let processedPlayerText = scene.playerText;
            processedPlayerText = processedPlayerText.replace(/\[player name\]/g, playerName);

            this.playerText.textContent = processedPlayerText;
            this.playerText.classList.remove('fade-in');
            setTimeout(() => this.playerText.classList.add('fade-in'), 10);
        }

        this.continueBtn.disabled = false;
        this.updateBackButton();
    }

    nextScene() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const nextTitle = sceneManager.getNextScene(sceneManager.currentScene.title);
        if (nextTitle) {
            sceneManager.loadScene(nextTitle);
        } else {
            // Game complete
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'gameComplete' }, '*');
            } else {
                window.location.href = 'index.html';
            }
        }
    }

    previousScene() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    sceneManager.back();
}

    hide() {
        this.container.style.display = 'none';
        // Remove event listeners  
        this.continueBtn.onclick = null;
        this.backBtn.onclick = null;
    }
}