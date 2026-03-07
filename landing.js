document.addEventListener('DOMContentLoaded', function () {
    // Create stars
    const starsContainer = document.getElementById('stars-container');
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.classList.add('star');

        // Random size between 1-3px
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        // Random animation delay
        star.style.animationDelay = `${Math.random() * 5}s`;

        starsContainer.appendChild(star);
    }

    // Animate title characters (fixed spacing)
    const title = "THE VOID'S ARCANA";
    const titleElement = document.getElementById('game-title');
    titleElement.innerHTML = '';

    for (let i = 0; i < title.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.classList.add('title-char');
        charSpan.textContent = title[i];
        charSpan.style.animationDelay = `${1 + i * 0.1}s`;
        titleElement.appendChild(charSpan);
    }

    // Add CSS for character animation
    const style = document.createElement('style');
    style.textContent = `
        .title-char {
            display: inline-block;
            opacity: 0;
            transform: translateY(20px);
            animation: charAppear 0.5s forwards;
        }
        
        @keyframes charAppear {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Button functionality
    document.getElementById('guest-btn').addEventListener('click', function () {
        // Add exit animation
        document.getElementById('main-cover').style.animation = 'fadeOut 1.5s forwards';

        // Navigate to guest menu after animation
        setTimeout(function () {
            window.location.href = 'guest-menu.html';
        }, 1500);
    });

    // Add fadeOut animation to CSS
    const fadeStyle = document.createElement('style');
    fadeStyle.textContent = `
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: scale(1.1);
            }
        }
    `;
    document.head.appendChild(fadeStyle);
});