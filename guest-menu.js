// guest-menu.js
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing save
    checkForSave();
    
    // Back button
    document.getElementById('back-btn').addEventListener('click', function() {
        document.getElementById('guest-container').style.animation = 'fadeOut 1s forwards';
        setTimeout(function() {
            window.location.href = 'landing.html';
        }, 1000);
    });
    
    // Load save button
    document.getElementById('load-btn').addEventListener('click', function() {
        const saveData = localStorage.getItem('game_save_data');
        if (saveData) {
            try {
                const parsedData = JSON.parse(saveData);
                // In a real implementation, this would load the game
                alert('Save loaded successfully! Taking you to your last saved location...');
                // Redirect to game with loaded data
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (e) {
                alert('Error loading save file. The file may be corrupted.');
            }
        } else {
            alert('No saved game found. Please start a new game or import a save file.');
        }
    });
    
    // Import save button
    document.getElementById('import-btn').addEventListener('click', function() {
        document.getElementById('import-modal').classList.add('active');
    });
    
    // New game button
    document.getElementById('newgame-btn').addEventListener('click', function() {
        document.getElementById('guest-container').style.animation = 'fadeOut 1s forwards';
        setTimeout(function() {
            window.location.href = 'new-game.html';
        }, 1000);
    });
    
    // Import modal functionality
    document.getElementById('close-import').addEventListener('click', closeImportModal);
    document.getElementById('cancel-import').addEventListener('click', closeImportModal);
    
    document.getElementById('import-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const confirmBtn = document.getElementById('confirm-import');
        const resultDiv = document.getElementById('import-result');
        
        if (file) {
            confirmBtn.disabled = false;
            resultDiv.innerHTML = `<span style="color: #4CAF50;">File selected: ${file.name}</span>`;
        } else {
            confirmBtn.disabled = true;
            resultDiv.innerHTML = '';
        }
    });
    
    document.getElementById('confirm-import').addEventListener('click', function() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const saveData = JSON.parse(e.target.result);
                    
                    // Validate the save data structure
                    if (saveData && saveData.playerData && saveData.timestamp) {
                        // Store the imported save
                        localStorage.setItem('game_save_data', JSON.stringify(saveData));
                        
                        document.getElementById('import-result').innerHTML = 
                            '<span style="color: #4CAF50;">Save imported successfully!</span>';
                        
                        setTimeout(function() {
                            closeImportModal();
                            alert('Save imported! Loading your game...');
                            window.location.href = 'index.html';
                        }, 1000);
                    } else {
                        document.getElementById('import-result').innerHTML = 
                            '<span style="color: #ff4444;">Invalid save file format</span>';
                    }
                } catch (error) {
                    document.getElementById('import-result').innerHTML = 
                        '<span style="color: #ff4444;">Error reading file: ' + error.message + '</span>';
                }
            };
            
            reader.onerror = function() {
                document.getElementById('import-result').innerHTML = 
                    '<span style="color: #ff4444;">Error reading file</span>';
            };
            
            reader.readAsText(file);
        }
    });
    
    function closeImportModal() {
        document.getElementById('import-modal').classList.remove('active');
        document.getElementById('import-file').value = '';
        document.getElementById('import-result').innerHTML = '';
        document.getElementById('confirm-import').disabled = true;
    }
    
    function checkForSave() {
        const saveData = localStorage.getItem('game_save_data');
        const saveInfo = document.getElementById('save-info');
        
        if (saveData) {
            try {
                const parsedData = JSON.parse(saveData);
                const saveDate = new Date(parsedData.timestamp).toLocaleDateString();
                saveInfo.innerHTML = `Saved game detected (Last saved: ${saveDate})`;
                saveInfo.style.color = '#4CAF50';
            } catch (e) {
                saveInfo.innerHTML = 'Corrupted save file detected';
                saveInfo.style.color = '#ff4444';
            }
        } else {
            saveInfo.innerHTML = 'No saved game detected';
            saveInfo.style.color = '#aaa';
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