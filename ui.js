// Tooltip data
const tooltipData = {
    'audio-toggle': 'Toggle Audio',
    'save-btn': 'Save Game',
    'load-btn': 'Load Game',
    'reset-btn': 'Reset Game',
    'import-btn': 'Import Game Data',
    'export-btn': 'Export Game Data',
    'settings-btn': 'Game Settings',
    'game-info-btn': 'Game Information',
    'avatar-container': 'Click to upload avatar',
    '[data-window="adventure-card"]': 'Adventure Card',
    '[data-window="inventory"]': 'Equipment & Inventory',
    '[data-window="quests"]': 'Active Quests',
    '[data-window="status"]': 'Status & Skills',
    '[data-window="map"]': 'Map',
    '[data-window="achievements"]': 'Achievements'
};

// DOM Elements
const avatarContainer = document.getElementById('avatar-container');
const avatarUpload = document.getElementById('avatar-upload');
const avatar = document.getElementById('avatar');
const avatarPlaceholder = document.getElementById('avatar-placeholder');
const customTooltip = document.getElementById('custom-tooltip');

// Create upload progress element
const uploadProgress = document.createElement('div');
uploadProgress.className = 'upload-progress';
uploadProgress.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Uploading...</span>';
avatarContainer.appendChild(uploadProgress);

// Set up custom tooltips
function setupTooltips() {
    try {
        const elements = document.querySelectorAll('.icon-btn, .window-toggle, #avatar-container');
        
        elements.forEach(element => {
            let tooltipId = element.id;
            if (!tooltipId) {
                tooltipId = element.getAttribute('data-window') ? `[data-window="${element.getAttribute('data-window')}"]` : element.id;
            }
            
            element.addEventListener('mouseenter', (e) => {
                const tooltipText = tooltipData[tooltipId];
                if (tooltipText) {
                    customTooltip.textContent = tooltipText;
                    customTooltip.classList.add('show');
                    
                    const rect = element.getBoundingClientRect();
                    const isRightSide = rect.left > window.innerWidth / 2;
                    
                    if (isRightSide) {
                        customTooltip.classList.add('right-side');
                    } else {
                        customTooltip.classList.remove('right-side');
                    }
                    
                    positionTooltip(e, isRightSide);
                }
            });
            
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const isRightSide = rect.left > window.innerWidth / 2;
                positionTooltip(e, isRightSide);
            });
            
            element.addEventListener('mouseleave', () => {
                customTooltip.classList.remove('show');
                customTooltip.classList.remove('right-side');
            });
        });
    } catch (error) {
        console.error('Error setting up tooltips:', error);
    }
}

function positionTooltip(e, isRightSide = false) {
    try {
        const element = e.currentTarget;
        const rect = element.getBoundingClientRect();
        
        if (isRightSide) {
            const x = rect.left - customTooltip.offsetWidth - 5;
            const y = rect.top + (rect.height / 2) - (customTooltip.offsetHeight / 2);
            customTooltip.style.left = Math.max(5, x) + 'px';
            customTooltip.style.top = Math.max(5, y) + 'px';
        } else {
            const x = rect.right + 5;
            const y = rect.top + (rect.height / 2) - (customTooltip.offsetHeight / 2);
            customTooltip.style.left = Math.min(window.innerWidth - customTooltip.offsetWidth - 5, x) + 'px';
            customTooltip.style.top = Math.max(5, y) + 'px';
        }
        
        customTooltip.style.zIndex = '3000';
    } catch (error) {
        console.error('Error positioning tooltip:', error);
    }
}

// Handle avatar click
function handleAvatarClick() {
    try {
        if (gameState.uploadInProgress) {
            showError('Upload already in progress');
            return;
        }
        avatarUpload.click();
    } catch (error) {
        console.error('Error handling avatar click:', error);
        showError('Failed to open file selector');
    }
}

// Handle avatar upload with comprehensive error handling
function handleAvatarUpload(e) {
    try {
        if (gameState.uploadInProgress) {
            showError('Upload already in progress');
            return;
        }
        
        const file = e.target.files[0];
        
        if (!file) {
            throw new Error('No file selected');
        }
        
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file (JPEG, PNG, GIF, etc.)');
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File size too large. Please select an image smaller than 5MB.');
        }
        
        const dangerousTypes = ['image/svg+xml'];
        if (dangerousTypes.includes(file.type)) {
            throw new Error('SVG files are not allowed for security reasons.');
        }
        
        gameState.uploadInProgress = true;
        showUploadProgress(true);
        
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = function(event) {
            img.onload = function() {
                try {
                    const maxDimension = 2000;
                    if (img.width > maxDimension || img.height > maxDimension) {
                        throw new Error('Image dimensions too large. Maximum allowed is 2000x2000 pixels.');
                    }
                    
                    const minDimension = 50;
                    if (img.width < minDimension || img.height < minDimension) {
                        throw new Error('Image dimensions too small. Minimum required is 50x50 pixels.');
                    }
                    
                    avatar.src = event.target.result;
                    avatar.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                    avatar.setAttribute('alt', 'Player avatar');
                    
                    console.log('Avatar uploaded successfully');
                    showUploadProgress(false);
                    gameState.uploadInProgress = false;
                    
                } catch (error) {
                    console.error('Error processing image:', error);
                    showError(error.message);
                    resetAvatarUpload();
                }
            };
            
            img.onerror = function() {
                console.error('Error loading image');
                showError('Failed to load the selected image. The file may be corrupted.');
                resetAvatarUpload();
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = function() {
            console.error('Error reading file');
            showError('Failed to read the selected file.');
            resetAvatarUpload();
        };
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                updateUploadProgress(percentLoaded);
            }
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showError(error.message);
        resetAvatarUpload();
    }
}

// Show/hide upload progress
function showUploadProgress(show) {
    try {
        if (show) {
            uploadProgress.classList.add('active');
            uploadProgress.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Uploading... 0%</span>';
        } else {
            uploadProgress.classList.remove('active');
        }
    } catch (error) {
        console.error('Error toggling upload progress:', error);
    }
}

// Update upload progress
function updateUploadProgress(percent) {
    try {
        uploadProgress.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Uploading... ${percent}%</span>`;
    } catch (error) {
        console.error('Error updating upload progress:', error);
    }
}

// Reset avatar upload field
function resetAvatarUpload() {
    try {
        avatarUpload.value = '';
        avatar.style.display = 'none';
        avatarPlaceholder.style.display = 'block';
        showUploadProgress(false);
        gameState.uploadInProgress = false;
    } catch (error) {
        console.error('Error resetting avatar upload:', error);
    }
}

// Add UI event listeners
function setupUIEventListeners() {
    try {
        // Avatar upload
        avatarContainer.addEventListener('click', handleAvatarClick);
        avatarUpload.addEventListener('change', handleAvatarUpload);
        
        // Import button - remove any old listeners first
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.replaceWith(importBtn.cloneNode(true)); // Remove all listeners
            document.getElementById('import-btn').addEventListener('click', handleImportClick);
        }
        
    } catch (error) {
        console.error('Error setting up UI event listeners:', error);
    }
}

function handleImportClick() {
    console.log('Import clicked'); // Debug
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        console.log('File selected:', e.target.files[0]); // Debug
        if (e.target.files[0]) {
            saveManager.importSave(e.target.files[0]);
        }
    };
    input.click();
}

// Initialize UI components
function initUI() {
    setupTooltips();
    setupUIEventListeners();
}