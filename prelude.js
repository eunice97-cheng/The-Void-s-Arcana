
document.addEventListener('DOMContentLoaded', function () {
    // Page management
    const pages = document.querySelectorAll('.story-page');
    const dots = document.querySelectorAll('.page-dot');
    const backBtn = document.getElementById('back-btn');
    const continueBtn = document.getElementById('continue-btn');
    let currentPage = 1;
    const totalPages = pages.length;

    // Initialize text animations for first page
    animateTextOnPage(1);

    function showPage(pageNumber) {
        // Hide all pages
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(`page-${pageNumber}`).classList.add('active');

        // Update dots
        dots.forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.dataset.page) === pageNumber) {
                dot.classList.add('active');
            }
        });

        // Update buttons
        continueBtn.innerHTML = pageNumber === totalPages ?
            'Begin Journey <i class="fas fa-play"></i>' :
            'Continue <i class="fas fa-arrow-right"></i>';

        // Animate text for the new page
        animateTextOnPage(pageNumber);

        currentPage = pageNumber;
    }

    function animateTextOnPage(pageNumber) {
        const currentPageElement = document.getElementById(`page-${pageNumber}`);
        const paragraphs = currentPageElement.querySelectorAll('.story-text p');

        paragraphs.forEach((paragraph, index) => {
            paragraph.style.setProperty('--paragraph-index', index);
            paragraph.style.animation = 'none';
            setTimeout(() => {
                paragraph.style.animation = `textReveal 1s forwards ${index * 0.5}s`;
            }, 10);
        });
    }

    // Navigation events
    backBtn.addEventListener('click', () => {
        if (currentPage === 1) {
            // Go back to cover
            window.location.href = 'cover.html';
        } else if (currentPage > 1) {
            showPage(currentPage - 1);
        }
    });

    continueBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            showPage(currentPage + 1);
        } else {
            // Start the game
            document.getElementById('prelude-container').style.animation = 'fadeOut 1.5s forwards';
            setTimeout(() => {
                window.location.href = 'landing.html'; // Change to your main game page
            }, 1500);
        }
    });

    // Dot navigation
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const pageNumber = parseInt(dot.dataset.page);
            showPage(pageNumber);
        });
    });

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

    // Audio toggle
    const audioToggle = document.getElementById('audio-toggle');
    let audioEnabled = true;

    audioToggle.addEventListener('click', function () {
        audioEnabled = !audioEnabled;
        const icon = audioToggle.querySelector('i');

        if (audioEnabled) {
            icon.className = 'fas fa-volume-up';
            audioToggle.setAttribute('aria-label', 'Mute audio');
        } else {
            icon.className = 'fas fa-volume-mute';
            audioToggle.setAttribute('aria-label', 'Unmute audio');
        }
    });
});