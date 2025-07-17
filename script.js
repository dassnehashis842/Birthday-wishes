/* ========================================
   BIRTHDAY WEBSITE - OPTIMIZED SCRIPT.JS
   Interactive features and animations
   ======================================== */

// Global variables
let isPlaying = false;
let audioContext = null; // Use AudioContext directly for better control
let oscillator = null;
let gainNode = null;
let hasRevealedSketch = false;
let emojiInterval = null;
let animationFrameId = null;
let observerInstance = null;

// Performance optimization flags
let isScrolling = false;
let isReducedMotion = false;

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    try {
        // Check for reduced motion preference first
        checkReducedMotion();

        // Initialize core features
        initializeAnimations();
        initializeAudio(); // Audio initialization moved here
        initializeScrollAnimations();
        initializeAccessibility();

        // Create initial visual effects
        createConfetti();

        // Start background effects after a delay to ensure page elements are rendered
        setTimeout(() => {
            startFloatingEmojis();
            observeElements(); // Start observing for scroll animations
        }, 1000); // Small delay to allow initial render

    } catch (error) {
        console.error('Initialization error:', error);
        // Graceful fallback - still show content without animations
        document.body.classList.add('no-animations');
        // Ensure critical UI elements are still visible if JS fails
        hideAudioButton(); // Hide if audio fails to prevent a broken button
    }
});

// ========================================
// PERFORMANCE & ACCESSIBILITY
// ========================================

/**
 * Checks for the 'prefers-reduced-motion' media query and adjusts animations.
 * Toggles 'reduced-motion' class on body for CSS adjustments.
 */
function checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleReducedMotion = (e) => {
        isReducedMotion = e.matches;
        document.body.classList.toggle('reduced-motion', e.matches);

        if (e.matches) {
            // Stop resource-intensive animations when reduced motion is preferred
            stopFloatingEmojis();
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null; // Clear the ID
            }
            // Also stop audio if playing, as continuous sound can be distracting
            if (isPlaying) {
                stopAudio();
            }
        } else {
            // Restart animations if they were stopped and not explicitly paused by user
            startFloatingEmojis();
        }
    };

    handleReducedMotion(mediaQuery); // Initial check
    mediaQuery.addEventListener('change', handleReducedMotion); // Listen for changes
}

/**
 * Debounce function to limit how often a function is called.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to wait.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit how often a function is called within a given time frame.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time in milliseconds during which the function can only be called once.
 * @returns {Function} - The throttled function.
 */
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// CONFETTI ANIMATION
// ========================================

/**
 * Creates and appends a confetti container and individual confetti pieces.
 * Confetti pieces are dynamically generated and animated.
 */
function createConfetti() {
    if (isReducedMotion) return;

    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container'; // CSS handles fixed positioning and z-index
    confettiContainer.setAttribute('aria-hidden', 'true'); // Hide from accessibility tree
    document.body.appendChild(confettiContainer);

    // Adjust confetti count based on screen width for performance on smaller devices
    const confettiCount = window.innerWidth < 768 ? 15 : 30; // Increased for a slightly fuller burst

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            createConfettiPiece(confettiContainer);
        }, i * 70); // Stagger the creation of each piece
    }

    // Clean up container after a reasonable time (longer than max individual piece animation)
    setTimeout(() => {
        if (confettiContainer.parentNode) {
            confettiContainer.remove();
        }
    }, 6000); // Ensure all pieces have finished animating before removal
}

/**
 * Creates a single confetti piece and adds it to the specified container.
 * @param {HTMLElement} container - The DOM element to append the confetti piece to.
 */
function createConfettiPiece(container) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece'; // Leverage CSS for core styles

    // Use CSS custom properties for colors for consistency
    const colors = [
        'var(--primary-pink)',
        'var(--primary-purple)',
        'var(--secondary-pink)',
        'var(--accent-light)',
        'var(--accent-purple)'
    ];
    const size = Math.random() * 8 + 5; // Size between 5px and 13px
    const duration = Math.random() * 2 + 3; // Duration between 3s and 5s
    const delay = Math.random() * 1; // Delay up to 1s

    confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        top: -10px; /* Start slightly above the viewport */
        width: ${size}px;
        height: ${size}px;
        background-color: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'}; /* Randomly make some circles */
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
        transform-origin: center;
        opacity: 0; /* Start hidden for smooth animation reveal */
    `;

    container.appendChild(confetti);

    // Apply initial opacity immediately after appending for smooth start
    requestAnimationFrame(() => {
        confetti.style.opacity = '1';
    });

    // Clean up individual pieces after their animation is complete
    setTimeout(() => {
        if (confetti.parentNode) {
            confetti.remove();
        }
    }, (duration + delay) * 1000 + 100); // Add a small buffer
}

// ========================================
// AUDIO SYSTEM
// ========================================

/**
 * Initializes the Web Audio API to create a simple background tone.
 * Sets up a global toggle function for the music button.
 */
function initializeAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('Web Audio API not supported by this browser.');
            hideAudioButton();
            return;
        }

        audioContext = new AudioContext();

        // Expose toggleAudio to the global scope for the HTML button
        window.toggleMusic = toggleMusic;
        updateMusicButton(); // Set initial button state
    } catch (error) {
        console.error('Audio initialization failed:', error);
        hideAudioButton();
    }
}

// ... (rest of your script.js code above) ...

/**
 * Starts the background audio.
 * This now loads and plays an actual audio file.
 */
function startAudio() {
    if (isReducedMotion || isPlaying) return;

    try {
        // Resume context if it was suspended (e.g., after user interaction)
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("AudioContext resume failed:", e));
        }

        // Create an audio element to load the music
        // --- IMPORTANT CHANGE HERE: Update the path to 'assets/happy-birthday.mp3' ---
        const audio = new Audio('assets/happy-birthday.mp3');
        audio.loop = true; // Make the music loop continuously
        audio.volume = 0.7; // Start with a low volume (e.g., 0.1 for 10% volume)

        // Play the audio
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Audio started successfully
                console.log('Background music playing.');
                isPlaying = true;
                updateMusicButton();

                // Store the audio element so we can stop it later
                // Re-purpose 'oscillator' and 'gainNode' for the media element source
                oscillator = audioContext.createMediaElementSource(audio);
                gainNode = audioContext.createGain(); // Still useful for volume control/fades

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // If you had a setTimeout to stop the old tone, you can remove it here
                // if you want your background music to play indefinitely
            }).catch(error => {
                // Autoplay was prevented. User will need to interact to play.
                console.warn('Autoplay prevented. User interaction required to play music.', error);
                isPlaying = false; // Ensure state is correct
                updateMusicButton();
            });
        }
    } catch (error) {
        console.error('Error starting audio:', error);
        hideAudioButton();
    }
}

/**
 * Stops the background audio.
 */
function stopAudio() {
    // Check if the source node (which holds the audio element) exists
    if (oscillator && oscillator.mediaElement) {
        // Fade out before pausing (optional, but nice)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        setTimeout(() => {
            oscillator.mediaElement.pause();
            oscillator.mediaElement.currentTime = 0; // Reset to start
            console.log('Background music paused.');
            // Disconnect and nullify after the fade and pause
            if (oscillator) oscillator.disconnect();
            if (gainNode) gainNode.disconnect();
            oscillator = null;
            gainNode = null;
        }, 500); // Wait for fade out
    } else {
        // Fallback for the old oscillator-based audio or if no audio element is present
        if (oscillator && gainNode) {
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
                oscillator = null;
                gainNode = null;
            };
        }
    }
    isPlaying = false;
    updateMusicButton();
}

// ... (rest of your script.js code below) ...

/**
 * Toggles the music play/pause state.
 * This function is directly called from the HTML button.
 */
function toggleMusic() {
    if (isPlaying) {
        stopAudio();
    } else {
        startAudio();
    }
}

/**
 * Updates the music button's text content, class, and ARIA label
 * based on the current play state.
 */
function updateMusicButton() {
    const musicButton = document.getElementById('musicButton');
    const musicIcon = document.getElementById('musicIcon');

    if (musicButton && musicIcon) {
        musicIcon.textContent = isPlaying ? '🔊' : '🎵'; // Speaker icon for playing, note for paused
        musicButton.classList.toggle('playing', isPlaying); // Add/remove 'playing' class
        musicButton.setAttribute('aria-label',
            isPlaying ? 'Stop background music' : 'Play background music'
        );
        musicButton.setAttribute('aria-pressed', isPlaying); // Indicate pressed state for accessibility
    }
}

/**
 * Hides the music control button. Useful if audio fails or is unsupported.
 */
function hideAudioButton() {
    const musicControl = document.querySelector('.music-control'); // Select the parent container
    if (musicControl) {
        musicControl.style.display = 'none';
        musicControl.setAttribute('aria-hidden', 'true'); // Hide from accessibility tree
    }
}

// ========================================
// SKETCH REVEAL ANIMATION
// ========================================

/**
 * Reveals the sketch image with a fade and scale animation.
 * Triggers celebration particles and accessibility announcements.
 */
function revealSketch() {
    if (hasRevealedSketch || isReducedMotion) return; // Prevent multiple reveals or if reduced motion

    try {
        const placeholder = document.getElementById('sketchPlaceholder');
        const sketchImage = document.getElementById('sketchImage');
        const sketchBox = document.querySelector('.sketch-box');

        if (!placeholder || !sketchImage || !sketchBox) {
            console.warn('Sketch elements not found. Cannot reveal sketch.');
            return;
        }

        hasRevealedSketch = true;

        // Animate placeholder fade out using Web Animations API for smooth performance
        placeholder.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards'
        }).onfinish = () => {
            placeholder.style.display = 'none'; // Hide completely after fade
            sketchBox.setAttribute('aria-live', 'polite'); // Announce changes inside box
            sketchBox.removeAttribute('tabindex'); // No longer interactable for reveal
            sketchBox.removeAttribute('role');
            sketchBox.removeAttribute('aria-label');

            // Show and animate sketch image
            sketchImage.style.display = 'block';
            sketchImage.animate([
                { opacity: 0, transform: 'scale(0.8)' },
                { opacity: 1, transform: 'scale(1)' }
            ], {
                duration: 500,
                easing: 'ease-out',
                fill: 'forwards'
            }).onfinish = () => {
                sketchBox.classList.add('revealed'); // Add class for potential CSS effects
                if (!isReducedMotion) {
                    sketchBox.style.boxShadow = '0 0 30px rgba(255, 107, 157, 0.3)'; // Add subtle glow
                }
            };

            // Create celebration effect
            createCelebrationParticles();

            // Accessibility announcement
            announceChange('Sketch portrait revealed! A beautiful hand-drawn portrait.');
        };

    } catch (error) {
        console.error('Sketch reveal error:', error);
        // Fallback: just show the image if animation fails
        document.getElementById('sketchPlaceholder').style.display = 'none';
        document.getElementById('sketchImage').style.display = 'block';
        document.getElementById('sketchImage').style.opacity = '1';
    }
}

/**
 * Creates and animates small celebration particles originating from the sketch box.
 */
function createCelebrationParticles() {
    const sketchContainer = document.querySelector('.sketch-container');
    if (!sketchContainer) return;

    // Get the center of the sketch container for particle origin
    const rect = sketchContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleCount = window.innerWidth < 768 ? 8 : 15; // More particles for larger screens

    for (let i = 0; i < particleCount; i++) {
        // Stagger particle creation for a burst effect
        setTimeout(() => {
            createParticle(centerX, centerY, i, particleCount);
        }, i * 30);
    }
}

/**
 * Creates a single celebration particle and animates it.
 * @param {number} centerX - The X coordinate of the particle's origin.
 * @param {number} centerY - The Y coordinate of the particle's origin.
 * @param {number} index - The index of the particle in the burst (for angle calculation).
 * @param {number} total - The total number of particles (for angle calculation).
 */
function createParticle(centerX, centerY, index, total) {
    const particle = document.createElement('div');
    particle.className = 'celebration-particle'; // Leverage CSS for base particle styles
    particle.setAttribute('aria-hidden', 'true'); // Hide from accessibility tree

    // Randomize color and shape
    const colors = ['#ffd700', '#ff6b9d', '#ffb3d1', '#e6e6fa', '#d8b4fe'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const isCircle = Math.random() > 0.5;

    particle.style.cssText = `
        position: fixed;
        width: ${Math.random() * 6 + 4}px; /* 4-10px */
        height: ${Math.random() * 6 + 4}px;
        background: ${randomColor};
        border-radius: ${isCircle ? '50%' : '2px'};
        pointer-events: none;
        z-index: 100;
        left: ${centerX}px;
        top: ${centerY}px;
        transform: translate(-50%, -50%); /* Center the particle on its origin */
    `;

    document.body.appendChild(particle);

    // Calculate unique trajectory for each particle
    const angle = (index / total) * 2 * Math.PI + (Math.random() * 0.5 - 0.25); // Add slight randomness to angle
    const distance = 80 + Math.random() * 70; // Distance 80-150px
    const endX = centerX + Math.cos(angle) * distance;
    const endY = centerY + Math.sin(angle) * distance;

    const finalTransformX = endX - centerX; // Relative translation from origin
    const finalTransformY = endY - centerY;

    particle.animate([
        {
            opacity: 1,
            transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)'
        },
        {
            opacity: 1,
            transform: `translate(calc(-50% + ${finalTransformX * 0.7}px), calc(-50% + ${finalTransformY * 0.7}px)) scale(1) rotate(${Math.random() * 360}deg)`,
            offset: 0.7 // Hold full opacity/scale for longer
        },
        {
            opacity: 0,
            transform: `translate(calc(-50% + ${finalTransformX * 1.2}px), calc(-50% + ${finalTransformY * 1.2}px)) scale(0) rotate(${Math.random() * 720}deg)`
        }
    ], {
        duration: 1500 + Math.random() * 500, // Duration 1.5s to 2s
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease-out curve
        fill: 'forwards'
    }).onfinish = () => {
        particle.remove(); // Clean up particle from DOM after animation
    };
}

// ========================================
// SCROLL ANIMATIONS
// ========================================

/**
 * Initializes scroll-based animations, including parallax for hearts.
 */
function initializeScrollAnimations() {
    if (isReducedMotion) return; // Skip if reduced motion is preferred

    const updateParallax = throttle(() => {
        // Only run if scrolling is actively detected to save CPU cycles
        if (!isScrolling) return;

        const scrolled = window.pageYOffset;
        const parallaxHearts = document.querySelectorAll('.floating-hearts .heart');

        parallaxHearts.forEach((heart, index) => {
            // Vary speed for a more dynamic parallax effect
            const speed = 0.2 + (index * 0.08); // Hearts move at different speeds
            const yPos = -(scrolled * speed);
            heart.style.transform = `translateY(${yPos}px)`;
        });
    }, 1000 / 60); // Throttle to roughly 60 frames per second (16.67ms)

    let scrollTimeout;
    window.addEventListener('scroll', () => {
        isScrolling = true;
        updateParallax();

        // Clear previous timeout and set a new one to detect when scrolling stops
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150); // Consider scrolling stopped after 150ms of no scroll events
    }, { passive: true }); // Use passive listener for better scroll performance
}

/**
 * Sets up an Intersection Observer to apply 'animate' class to elements
 * as they enter the viewport, triggering CSS animations.
 */
function observeElements() {
    if (observerInstance) {
        observerInstance.disconnect(); // Disconnect existing observer if re-initializing
    }

    const observerOptions = {
        root: null, // Observe against the viewport
        rootMargin: '0px 0px -100px 0px', // Trigger when 100px from bottom of viewport
        threshold: 0.1 // Trigger when 10% of element is visible
    };

    observerInstance = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add 'animate' class to trigger CSS transitions/animations
                entry.target.classList.add('animate');

                // Stagger animations for story items for a cascade effect
                if (entry.target.classList.contains('story-item') && !isReducedMotion) {
                    const siblings = Array.from(entry.target.parentNode.children);
                    const index = siblings.indexOf(entry.target);
                    // Apply delay only if it's an observed item to prevent conflicts
                    entry.target.style.transitionDelay = `${index * 0.15}s`;
                    // Remove delay after animation to allow hover effects to be instant
                    entry.target.addEventListener('transitionend', () => {
                        entry.target.style.transitionDelay = '';
                    }, { once: true });
                }

                // Stop observing once animated to save resources
                observerInstance.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements that should animate on scroll
    const animatableElements = document.querySelectorAll(`
        .photo-section,
        .story-title,
        .story-item,
        .sketch-section,
        .letter-section
    `);

    animatableElements.forEach(element => {
        observerInstance.observe(element);
    });
}

// ========================================
// FLOATING EMOJIS (OPTIMIZED)
// ========================================

/**
 * Starts an interval to periodically create floating emojis on the screen.
 * Emojis are animated using Web Animations API for performance.
 */
function startFloatingEmojis() {
    if (isReducedMotion || emojiInterval) return; // Prevent multiple intervals or if reduced motion is on

    const emojis = ['💖', '✨', '🌟', '💕', '💫', '🌸', '💜', '🎈']; // Expanded emoji set
    const maxEmojis = window.innerWidth < 768 ? 4 : 7; // Adjust max concurrent emojis

    let currentEmojis = 0; // Counter for active emojis

    emojiInterval = setInterval(() => {
        if (currentEmojis >= maxEmojis) {
            return; // Don't create more than max allowed
        }

        const emoji = document.createElement('div');
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const size = Math.random() * 15 + 20; // Size between 20px and 35px
        const duration = Math.random() * 4000 + 6000; // Duration 6s to 10s for slower, graceful float

        emoji.textContent = randomEmoji;
        emoji.className = 'floating-emoji'; // CSS defines initial styles (fixed position, z-index)
        emoji.setAttribute('aria-hidden', 'true'); // Hide from accessibility tree

        // Start emoji from a random point just outside the bottom of the viewport
        emoji.style.left = `${Math.random() * 100}vw`;
        emoji.style.top = `${100 + Math.random() * 20}vh`; // Start below viewport

        document.body.appendChild(emoji);
        currentEmojis++;

        // Animate using Web Animations API
        emoji.animate([
            {
                opacity: 0,
                transform: 'translateY(0) translateX(0) scale(0.5) rotate(0deg)'
            },
            {
                opacity: 0.8,
                transform: `translateY(${-100 - (Math.random() * 50)}vh) translateX(${(Math.random() - 0.5) * 100}px) scale(1) rotate(${Math.random() * 360}deg)`,
                offset: 0.8 // Reach peak opacity/scale earlier
            },
            {
                opacity: 0,
                transform: `translateY(${-200}vh) translateX(${(Math.random() - 0.5) * 200}px) scale(0.2) rotate(${Math.random() * 720}deg)`
            }
        ], {
            duration: duration,
            easing: 'ease-in-out',
            fill: 'forwards'
        }).onfinish = () => {
            emoji.remove();
            currentEmojis--; // Decrement counter when an emoji finishes animation and is removed
        };
    }, 2000); // Create a new emoji every 2 seconds
}

/**
 * Stops the floating emoji animation and removes existing emojis from the DOM.
 */
function stopFloatingEmojis() {
    if (emojiInterval) {
        clearInterval(emojiInterval);
        emojiInterval = null;
    }

    // Clean up any existing floating emojis immediately
    document.querySelectorAll('.floating-emoji').forEach(emoji => {
        emoji.remove();
    });
}

// ========================================
// ACCESSIBILITY ENHANCEMENTS
// ========================================

/**
 * Initializes accessibility features, including keyboard navigation and ARIA attributes.
 */
function initializeAccessibility() {
    // Keyboard navigation for sketch reveal
    const sketchBox = document.querySelector('.sketch-box');
    if (sketchBox) {
        sketchBox.setAttribute('tabindex', '0'); // Make focusable
        sketchBox.setAttribute('role', 'button'); // Indicate it's a button
        sketchBox.setAttribute('aria-label', 'Click or press Enter to reveal a special hand-drawn portrait.');

        sketchBox.addEventListener('keydown', (e) => {
            // Trigger reveal on Enter or Space key press
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent default scroll behavior for spacebar
                revealSketch();
            }
        });

        sketchBox.addEventListener('click', revealSketch);
    }

    // Music button accessibility handled by initializeAudio and updateMusicButton functions.

    // Focus management for keyboard users
    initializeFocusManagement();
}

/**
 * Manages focus indicators for keyboard users.
 */
function initializeFocusManagement() {
    // Add 'keyboard-navigation' class to body when tab key is used
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });

    // Remove 'keyboard-navigation' class when mouse is used
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
}

/**
 * Creates a visually hidden live region for screen reader announcements.
 * @param {string} message - The message to announce.
 */
function announceChange(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite'); // Announce changes politely
    announcement.setAttribute('aria-atomic', 'true'); // Announce the entire region content
    announcement.className = 'sr-only'; // Visually hidden but available to screen readers
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove announcement after a short delay to clean up DOM
    setTimeout(() => {
        if (announcement.parentNode) {
            announcement.remove();
        }
    }, 2000); // Give screen readers enough time to announce
}

// ========================================
// ADDITIONAL VISUAL ANIMATIONS
// ========================================

/**
 * Initializes various visual animations not tied to scroll or specific interactions.
 */
function initializeAnimations() {
    // Initialize smooth scrolling for anchor links
    initializeSmoothScroll();

    // Initialize touch gestures for mobile swipe navigation
    initializeTouchGestures();

    // Animate the floating hearts that are part of the static HTML
    animateFloatingHearts();

    // Start background sparkle effects
    if (!isReducedMotion) {
        createSparkles();
    }
}

/**
 * Enables smooth scrolling for all anchor links pointing to sections within the page.
 */
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default jump behavior
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth', // Smooth scroll animation
                    block: 'start' // Align the top of the element with the top of the viewport
                });
                // Update URL hash without jumping
                history.pushState(null, '', this.getAttribute('href'));
            }
        });
    });
}

/**
 * Implements basic swipe-up gesture detection for mobile navigation between sections.
 */
function initializeTouchGestures() {
    let touchStartY = 0;
    let touchEndY = 0;
    const swipeThreshold = 50; // Minimum vertical pixel distance for a swipe

    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true }); // Use passive to avoid blocking scroll

    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        const swipeDistance = touchStartY - touchEndY; // Positive for swipe up

        // If it's a significant swipe up, try to scroll to the next section
        if (swipeDistance > swipeThreshold) {
            scrollToNextSection();
        }
    }, { passive: true });
}

/**
 * Scrolls the viewport to the next logical section on the page.
 */
function scrollToNextSection() {
    const currentScroll = window.pageYOffset;
    const sections = document.querySelectorAll('section'); // Assuming your main content divisions are <section>

    let nextSection = null;
    for (const section of sections) {
        // Find the first section whose top is below the current scroll position + a buffer
        if (section.offsetTop > currentScroll + 50) { // Add 50px buffer
            nextSection = section;
            break;
        }
    }

    if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // If no next section, scroll to top or bottom as a fallback
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

/**
 * Applies random animation delays and durations to static floating hearts.
 */
function animateFloatingHearts() {
    const hearts = document.querySelectorAll('.floating-hearts .heart');
    hearts.forEach((heart, index) => {
        const delay = Math.random() * 2; // Random delay up to 2 seconds
        const duration = 8 + Math.random() * 4; // Random duration between 8 and 12 seconds
        heart.style.animationDelay = `${delay}s`;
        heart.style.animationDuration = `${duration}s`;
        // Ensure animation is running if not reduced motion
        if (!isReducedMotion) {
            heart.style.animationPlayState = 'running';
        } else {
            heart.style.animationPlayState = 'paused';
        }
    });
}

/**
 * Creates and animates subtle background sparkles across the screen.
 */
function createSparkles() {
    if (isReducedMotion) return;

    const sparkleContainer = document.createElement('div');
    sparkleContainer.className = 'sparkle-container'; // CSS handles fixed positioning and z-index
    sparkleContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sparkleContainer);

    const sparkleCount = window.innerWidth < 768 ? 8 : 15; // More sparkles for larger screens

    for (let i = 0; i < sparkleCount; i++) {
        // Stagger sparkle creation
        setTimeout(() => {
            createSparkle(sparkleContainer);
        }, i * 400);
    }
}

/**
 * Creates a single sparkle element and applies its animation.
 * @param {HTMLElement} container - The container element for the sparkle.
 */
function createSparkle(container) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle'; // CSS handles core animation and styling
    sparkle.textContent = '✨'; // The actual sparkle character
    sparkle.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        font-size: ${Math.random() * 10 + 10}px; /* Size between 10px and 20px */
        animation-delay: ${Math.random() * 2}s; /* Randomize start time of sparkle animation */
    `;

    container.appendChild(sparkle);

    // Remove sparkle after two animation cycles (as animation is infinite, remove after a duration)
    // Assuming sparkle animation is 2s, remove after 4-5 seconds
    setTimeout(() => {
        if (sparkle.parentNode) {
            sparkle.remove();
        }
    }, 4500 + Math.random() * 1000); // Small random duration added for diversity
}

// ========================================
// ERROR HANDLING & CLEANUP
// ========================================

/**
 * Global error handler to log errors and add a graceful degradation class to the body.
 */
window.addEventListener('error', (e) => {
    console.error('An unhandled script error occurred:', e.message, 'in', e.filename, 'at line', e.lineno);
    // Add a class to the body to apply fallback styles if JS breaks
    document.body.classList.add('error-state');
    // Attempt to stop all animations for user comfort in error state
    stopFloatingEmojis();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (observerInstance) {
        observerInstance.disconnect();
    }
    if (isPlaying) {
        stopAudio();
    }
});

/**
 * Cleans up intervals, observers, and animation frames before the user leaves the page.
 */
window.addEventListener('beforeunload', () => {
    stopFloatingEmojis();
    if (observerInstance) {
        observerInstance.disconnect();
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    // Attempt to stop audio gracefully
    if (isPlaying) {
        stopAudio();
    }
    // Disconnect audio context to free up resources
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(e => console.error("Error closing audio context:", e));
    }
});