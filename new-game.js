// new-game.js
document.addEventListener('DOMContentLoaded', function() {
    let selectedSex = null;
    let selectedDOB = null;
    
    // Sex selection
    document.querySelectorAll('.sex-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            document.querySelectorAll('.sex-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            this.classList.add('selected');
            selectedSex = this.dataset.sex;
            
            // Update summary
            updateSummary();
            checkFormCompletion();
        });
    });
    
    // DOB input
    document.getElementById('dob').addEventListener('change', function() {
        selectedDOB = this.value;
        
        // Update summary
        updateSummary();
        checkFormCompletion();
    });
    
    // Back button
    document.getElementById('back-to-guest').addEventListener('click', function() {
        document.getElementById('newgame-container').style.animation = 'fadeOut 1s forwards';
        setTimeout(function() {
            window.location.href = 'guest-menu.html';
        }, 1000);
    });
    
    // Start game button
    document.getElementById('start-game-btn').addEventListener('click', function() {
        if (selectedSex && selectedDOB) {
            // Create initial game data without name
            const gameData = {
                character: {
                    sex: selectedSex,
                    dob: selectedDOB,
                    age: calculateAge(selectedDOB)
                    // name will be added later in name-input
                },
                timestamp: Date.now(),
                playerData: {
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
                }
            };
            
            // Store the game data
            localStorage.setItem('game_save_data', JSON.stringify(gameData));
            
            // Show loading and redirect to game container
            document.getElementById('newgame-container').style.animation = 'fadeOut 1s forwards';
            setTimeout(function() {
                window.location.href = 'game-container.html';
            }, 1000);
        }
    });
    
    function updateSummary() {
        const summarySex = document.getElementById('summary-sex');
        const summaryDOB = document.getElementById('summary-dob');
        const summaryAge = document.getElementById('summary-age');
        
        if (selectedSex) {
            summarySex.textContent = selectedSex.charAt(0).toUpperCase() + selectedSex.slice(1);
        }
        
        if (selectedDOB) {
            const formattedDate = new Date(selectedDOB).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            summaryDOB.textContent = formattedDate;
            
            const age = calculateAge(selectedDOB);
            summaryAge.textContent = age + ' years';
        }
    }
    
    function calculateAge(dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    function checkFormCompletion() {
        const startBtn = document.getElementById('start-game-btn');
        
        if (selectedSex && selectedDOB) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }
    
    // Add fadeOut animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: scale(1.1);
            }
        }
    `;
    document.head.appendChild(style);
});