class PickClassMode {
    constructor() {
        this.container = document.getElementById('pick-class-container');
        this.background = document.getElementById('pick-class-background');
        this.classCards = document.getElementById('class-cards');
        this.popup = document.getElementById('class-popup');
        this.popupName = document.getElementById('popup-class-name');
        this.popupDesc = document.getElementById('popup-class-desc');
        this.popupBack = document.getElementById('popup-back');
        this.popupConfirm = document.getElementById('popup-confirm');

        this.selectedClass = null;
        this.personalityScores = {};

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.popupBack.addEventListener('click', () => this.hidePopup());
        this.popupConfirm.addEventListener('click', () => this.confirmClass());
    }

    async start() {
        this.loadPersonalityScores();
        this.generateClassCards();
        this.container.style.display = 'flex';
    }

    loadPersonalityScores() {
        const saved = localStorage.getItem('personality_traits');
        this.personalityScores = saved ? JSON.parse(saved) : {};
        console.log('Personality scores:', this.personalityScores);
    }

    getRecommendedClass() {
        const scores = this.personalityScores;
        if (!scores) return { top: 'warrior', second: 'acolyte' };

        // Calculate class points based on OCEAN scores
        const classPoints = {
            archer: (scores.O || 0) + (scores.C || 0),
            rogue: (scores.O || 0) + (scores.E || 0),
            mage: (scores.C || 0) + (scores.N || 0),
            tinkerer: (scores.C || 0) + (scores.N || 0),
            warrior: (scores.C || 0) + (scores.E || 0) + (scores.A || 0),
            acolyte: (scores.E || 0) + (scores.A || 0) + (scores.N || 0)
        };

        // Find top two classes
        const sorted = Object.entries(classPoints)
            .sort((a, b) => b[1] - a[1]);

        return {
            top: sorted[0][0],      // Highest score
            second: sorted[1][0]    // Second highest
        };
    }

    generateClassCards() {
        const classes = [
            { id: 'warrior', name: 'Warrior', desc: 'Masters of martial combat, strong and resilient.' },
            { id: 'archer', name: 'Archer', desc: 'Precise ranged fighters with keen eyesight.' },
            { id: 'mage', name: 'Mage', desc: 'Wielders of arcane magic and elemental forces.' },
            { id: 'rogue', name: 'Rogue', desc: 'Stealthy experts in deception and precision strikes.' },
            { id: 'acolyte', name: 'Acolyte', desc: 'Healers and supporters with divine blessings.' },
            { id: 'tinkerer', name: 'Tinkerer', desc: 'Inventors and alchemists mastering technology.' }
        ];

        const recommended = this.getRecommendedClass();

        this.classCards.innerHTML = classes.map(cls => {
            let hint = '';
            if (cls.id === recommended.top) {
                hint = '<div class="class-hint blood-recommended">Blood Recommended</div>';
            } else if (cls.id === recommended.second) {
                hint = '<div class="class-hint recommended">Recommended</div>';
            }

            return `
                <div class="class-card ${cls.id === recommended.top ? 'blood-recommended' : ''}" 
                     data-class="${cls.id}">
                    <div class="class-name">${cls.name}</div>
                    ${hint}
                </div>
            `;
        }).join('');

        // Add click events to cards
        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const classId = e.currentTarget.dataset.class;
                this.showClassDetails(classId, classes.find(c => c.id === classId));
            });
        });
    }

    showClassDetails(classId, classData) {
        this.selectedClass = classId;
        this.popupName.textContent = classData.name;
        this.popupDesc.textContent = classData.desc;
        this.popup.classList.remove('popup-hidden');
    }

    hidePopup() {
        this.popup.classList.add('popup-hidden');
        this.selectedClass = null;
    }

    confirmClass() {
        if (!this.selectedClass) return;

        // Save class choice
        this.saveClassChoice();

        console.log('Confirming class, calling proceedToNextScene');
        this.proceedToNextScene();
    }

    saveClassChoice() {
        // Save to game state
        if (window.gameState) {
            gameState.character = gameState.character || {};
            gameState.character.class = this.selectedClass;
        }

        // Trigger auto-save
        if (window.saveManager) {
            saveManager.saveGame();
        }
    }

    proceedToNextScene() {
        // Navigate directly to Scene047
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'loadScene',
                sceneType: 'conversation',
                sceneTitle: 'Scene047'
            }, '*');
        } else {
            window.location.href = 'conversation.html?scene=Scene047';
        }
    }
}

const pickClassMode = new PickClassMode();
pickClassMode.start();