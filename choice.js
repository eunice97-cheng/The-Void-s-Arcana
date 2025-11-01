class ChoiceMode {
    constructor() {
        this.container = document.getElementById('choice-overlay');
        this.backBtn = document.getElementById('choice-back');
        this.npcText = document.getElementById('npc-text');
        this.playerText = document.getElementById('player-text');
        this.npcName = document.getElementById('npc-name');
        this.background = document.getElementById('choice-background');
        this.npcPortraitContainer = document.getElementById('npc-portrait-container');
        this.choicesContainer = document.getElementById('choices-container');
        this.isAnimating = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
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
        this.backBtn.style.display = canGoBack ? 'block' : 'none';
    }

    showScene() {
        const scene = this.scene;

        console.log('Choice scene data:', scene);

        if (this.background && scene.background) {
            this.background.style.background = scene.background;
        }

        if (this.npcName && scene.npcName) {
            this.npcName.textContent = scene.npcName;
        }

        if (this.npcPortraitContainer) {
            this.npcPortraitContainer.innerHTML = '';

            if (scene.npcPortrait && scene.npcPortrait !== "null" && scene.npcPortrait !== null) {
                const portraitImg = document.createElement('img');
                portraitImg.id = 'npc-portrait';
                portraitImg.src = scene.npcPortrait;
                portraitImg.alt = scene.npcName || 'NPC Character';
                portraitImg.onerror = function() {
                    console.error('Failed to load portrait:', scene.npcPortrait);
                };
                this.npcPortraitContainer.appendChild(portraitImg);
            }
        }

        if (this.npcText && scene.npcText) {
            const savedData = JSON.parse(localStorage.getItem('game_save_data') || '{}');
            const playerName = savedData.character?.name || 'Traveler';
            let processedText = scene.npcText.replace(/\[player name\]/g, playerName);
            
            this.npcText.textContent = processedText;
            this.npcText.classList.remove('fade-in');
            setTimeout(() => this.npcText.classList.add('fade-in'), 10);
        }

        this.choicesContainer.innerHTML = '';
        
        if (scene.choices && scene.choices.length > 0) {
            scene.choices.forEach((choice, index) => {
                const choiceButton = document.createElement('button');
                choiceButton.className = 'choice-btn fade-in';
                choiceButton.textContent = choice.text;
                choiceButton.addEventListener('click', () => this.selectChoice(this.scene.nextScene, choice.trait));
                choiceButton.style.animationDelay = `${index * 0.1}s`;
                this.choicesContainer.appendChild(choiceButton);
            });
        }

        this.updateBackButton();
    }

    selectChoice(nextScene, trait) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (trait) {
            let personality = JSON.parse(localStorage.getItem('personality_traits') || '{}');
            personality[trait] = (personality[trait] || 0) + 1;
            localStorage.setItem('personality_traits', JSON.stringify(personality));
            console.log('Stored trait:', trait, 'Current scores:', personality);
            
            // Auto-save when ritual is complete (after 10th question)
            const totalAnswers = Object.values(personality).reduce((sum, count) => sum + count, 0);
            if (totalAnswers >= 10) {
                setTimeout(() => {
                    if (typeof saveManager !== 'undefined') {
                        saveManager.saveGame();
                        console.log('Ritual completed - personality data saved');
                    }
                }, 500);
            }
        }

        if (nextScene) {
            sceneManager.loadScene(nextScene);
        } else {
            this.nextScene();
        }
        
        this.isAnimating = false;
    }

    nextScene() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const nextTitle = sceneManager.getNextScene(sceneManager.currentScene.title);
        if (nextTitle) {
            sceneManager.loadScene(nextTitle);
        } else {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'gameComplete' }, '*');
            } else {
                window.location.href = 'index.html';
            }
        }
        
        this.isAnimating = false;
    }

    previousScene() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        sceneManager.back();
        this.isAnimating = false;
    }

    hide() {
        this.container.style.display = 'none';
        this.backBtn.onclick = null;
    }
}

// Auto-register with SceneManager
if (typeof ChoiceMode !== 'undefined' && typeof sceneManager !== 'undefined') {
    sceneManager.registerMode('choice', ChoiceMode);
}