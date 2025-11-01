class NarrativeMode {
    constructor() {
        this.container = document.getElementById('narrative-container');
        this.background = document.getElementById('narrative-background');
        this.text = document.getElementById('narrative-text');
        this.backBtn = document.getElementById('narrative-back');
        this.continueBtn = document.getElementById('narrative-continue');
        this.pageIndicators = document.getElementById('page-indicators');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.backBtn.addEventListener('click', () => this.previousScene());
        this.continueBtn.addEventListener('click', () => this.nextScene());
    }

    async start(sceneArray) {
        this.scene = sceneArray[0];
        this.showScene();
        this.container.classList.add('active');
        this.updateBackButton();
    }

    updateBackButton() {
        const previousTitle = sceneManager.getPreviousScene(sceneManager.currentScene.title);
        const canGoBack = previousTitle !== undefined && previousTitle !== null;
        this.backBtn.style.display = canGoBack ? 'block' : 'none';
        this.backBtn.disabled = !canGoBack;
    }

    showScene() {
    this.isAnimating = false;
    
    const scene = this.scene;

    if (this.background && scene.background) {
        this.background.style.background = scene.background;
    }

    if (this.text) {
        // Force opacity to 0 before any changes
        this.text.style.opacity = '0';
        
        this.text.classList.remove('fade-in');
        this.text.textContent = scene.description || scene.text || '';
        this.text.style.color = scene.textColor || '#e6e6fa';
        
        // Remove the inline opacity and start animation
        setTimeout(() => {
            this.text.style.opacity = '';
            this.text.classList.add('fade-in');
        }, 10);
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
        this.container.classList.remove('active');
        this.continueBtn.onclick = null;
        this.backBtn.onclick = null;
    }
}