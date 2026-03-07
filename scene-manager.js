class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
        this.modes = new Map();
        this.sceneHistory = [];
    }

    registerMode(modeName, modeClass) {
        this.modes.set(modeName, modeClass);
    }

    addScene(sceneData) {
        this.scenes.set(sceneData.title, sceneData);
    }

    async loadScene(sceneTitle) {
        // Check if trying to load ritual but already completed
        if (sceneTitle.startsWith('Ritual-')) {
            const savedData = JSON.parse(localStorage.getItem('game_save_data') || '{}');
            if (savedData.personality_completed || savedData.character?.class) {
                // Skip to appropriate scene
                if (savedData.character?.class) {
                    sceneTitle = 'Scene047';
                } else {
                    sceneTitle = 'PickClass';
                }
            }
        }

        // SPECIAL CASE: Redirect to pick-class.html for pick-class scenes
        if (sceneTitle === 'PickClass') {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'loadScene',
                    sceneType: 'pick-class',
                    sceneTitle: 'PickClass'
                }, '*');
            } else {
                window.location.href = 'pick-class.html?scene=PickClass';
            }
            return;
        }

        if (sceneTitle === 'name-input') {
            window.location.href = 'name-input.html';
            return;
        }

        if (sceneTitle === 'game') {
            window.location.href = 'game.html';
            return;
        }

        // Stop if trying to load current scene
        if (this.currentScene && this.currentScene.title === sceneTitle) {
            console.log('Already on scene:', sceneTitle);
            return;
        }

        const scene = this.scenes.get(sceneTitle);
        if (!scene) {
            console.error(`Scene not found: ${sceneTitle}`);
            return;
        }

        // IFRAME SOLUTION - Only redirect if changing page types
        if (window.parent !== window) {
            const currentPage = window.location.pathname;
            const shouldRedirect =
                (scene.type === 'conversation' && !currentPage.includes('conversation.html')) ||
                (scene.type === 'narrative' && !currentPage.includes('narrative.html')) ||
                (scene.type === 'choice' && !currentPage.includes('choice.html'));

            if (shouldRedirect) {
                window.parent.postMessage({
                    type: 'loadScene',
                    sceneType: scene.type,
                    sceneTitle: sceneTitle
                }, '*');
                return;
            }
        }

        // Hide current scene if exists
        if (this.currentScene && this.currentScene.modeInstance) {
            this.currentScene.modeInstance.hide();
        }

        // Get mode class
        const ModeClass = this.modes.get(scene.type);
        if (!ModeClass) {
            console.error(`Mode not registered: ${scene.type}`);
            return;
        }

        // Create new mode instance every time
        const modeInstance = new ModeClass();

        this.currentScene = { title: sceneTitle, modeInstance, data: scene };

        // Add to history
        if (this.sceneHistory[this.sceneHistory.length - 1] !== sceneTitle) {
            this.sceneHistory.push(sceneTitle);
        }

        await modeInstance.start([scene]);
    }

    getNextScene(currentTitle) {
        const scene = this.scenes.get(currentTitle);
        return scene?.nextScene;
    }

    getPreviousScene(currentTitle) {
        const scene = this.scenes.get(currentTitle);
        return scene?.previousScene;
    }

    async next() {
        const nextTitle = this.getNextScene(this.currentScene.title);
        if (nextTitle) {
            await this.loadScene(nextTitle);
        } else {
            console.log('Game completed');
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'gameComplete' }, '*');
            } else {
                window.location.href = 'index.html';
            }
        }
    }

    async back() {
        const previousTitle = this.getPreviousScene(this.currentScene.title);
        if (previousTitle) {
            await this.loadScene(previousTitle);
            return true;
        }
        return false;
    }
}

// Global instance
const sceneManager = new SceneManager();

// Auto-register available modes
if (typeof NarrativeMode !== 'undefined') {
    sceneManager.registerMode('narrative', NarrativeMode);
}
if (typeof ConversationMode !== 'undefined') {
    sceneManager.registerMode('conversation', ConversationMode);
}
if (typeof ChoiceMode !== 'undefined') {
    sceneManager.registerMode('choice', ChoiceMode);
}
if (typeof PickClassMode !== 'undefined') {
    sceneManager.registerMode('pick-class', PickClassMode);
}