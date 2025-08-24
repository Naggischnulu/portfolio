document.addEventListener('DOMContentLoaded', function() {
    // --- GRUNDLAGEN & ELEMENTE AUSWÄHLEN ---
    const projektItems = document.querySelectorAll('.projekt-item');
    const bischnablu = document.querySelector('.bischnablu');
    const bubble = document.querySelector('.bischnablu-bubble');
    const bubbleTextContainer = bubble?.querySelector('.bubble-text');
    const originalBubbleText = bubbleTextContainer?.innerHTML || '';
    const kopfContainer = document.querySelector('.bischnablu-head-container');
    const augen = document.querySelectorAll('.bischnablu-eye');
    const sections = document.querySelectorAll('main > section[id], header[id]');
    const navLinks = document.querySelectorAll('.sidebar a');
    const gradientElements = document.querySelectorAll('.gradient-text-hover');
    const mascotNameElement = document.querySelector('.interaction .mascot-name');
    const mascot2 = document.querySelector('.mascot2');
    const videoThumbs = document.querySelectorAll('.video-thumb'); // Behalten wir für die Desktop-Logik
    const overlay = document.getElementById('video-overlay');
    const overlayVideo = document.getElementById('overlay-video');
    const closeBtn = document.getElementById('close-overlay');
    
    const SCROLL_OFFSET = 200; // Pixels vom oberen Bildschirmrand
    const ACTIVE_SECTION_THRESHOLD = 300; // Frühere Markierung bei weniger Scroll

    let currentBubbleText = '';
    let typingTimeout;
    let isDragging = false;

    const preloadImg = new Image();
    preloadImg.src = "images/bischnablu_head_closed.png";

    // SMOOTH SCROLL FÜR NAVBAR-LINKS
    function setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.sidebar a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const targetPosition = targetElement.offsetTop - SCROLL_OFFSET;
                    
                    window.scrollTo({
                        top: Math.max(0, targetPosition),
                        behavior: 'smooth'
                    });

                    this.blur();  // Fokus entfernen, um den :focus-Stil nach dem Klick zu deaktivieren
                }
            });
        });
    }


    if (!bischnablu || !bubble || !bubbleTextContainer) {
        console.warn('Missing essential elements for Bischnablu');
        return;
    }

    function setFixedInitialEyePosition() {
        const augen = document.querySelectorAll('.bischnablu-eye');
        const radius = 7;
        const angle = -3 * Math.PI / 4;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        augen.forEach(auge => {
            auge.style.transform = `translate(${x}px, ${y}px)`;
        });
    }
    setFixedInitialEyePosition();


    // --- HELPER: TEXT ANIMATION ---
    function animateText(container, text) {
        container.innerHTML = '';
        let charIndex = 0;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;

        function processNode(node, parent) {
            if (node.nodeType === Node.TEXT_NODE) {
                const letters = node.textContent.split('');
                const wordWrapper = document.createElement('span');
                wordWrapper.style.display = 'inline-block';
                letters.forEach(letter => {
                    const letterSpan = document.createElement('span');
                    letterSpan.textContent = letter;
                    letterSpan.style.animationDelay = `${charIndex * 21}ms`;
                    wordWrapper.appendChild(letterSpan);
                    charIndex++;
                });
                parent.appendChild(wordWrapper);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const newElement = document.createElement(node.tagName.toLowerCase());
                [...node.attributes].forEach(attr => newElement.setAttribute(attr.name, attr.value));
                node.childNodes.forEach(child => processNode(child, newElement));
                parent.appendChild(newElement);
            }
        }

        tempDiv.childNodes.forEach(node => processNode(node, container));
    }

    // --- UPDATE BUBBLE TEXT (BASE) ---
    function updateBubbleText(newText) {
        if (newText === currentBubbleText || isDragging) return;
       
        bubble.style.visibility = "visible";
        currentBubbleText = newText;
        clearTimeout(typingTimeout);
        animateText(bubbleTextContainer, newText);
    }

    // --- UPDATE BUBBLE TEXT WITH LINK ---
    function updateBubbleTextWithLink(text, actionElement) {
        if (text === currentBubbleText || isDragging) return;

        bubble.style.visibility = "visible";
        currentBubbleText = text;
        clearTimeout(typingTimeout);
        bubbleTextContainer.innerHTML = '';

        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.alignItems = 'center';
        contentWrapper.style.gap = '10px';

        const textContainer = document.createElement('span');
        textContainer.style.flex = '1';
        animateText(textContainer, text);
        contentWrapper.appendChild(textContainer);

        if (actionElement) {
            const linkIcon = document.createElement('div');
            linkIcon.className = 'bubble-link-icon';
            
            // --- NEUE LOGIK: Icon-Auswahl für Links und Videos ---
            let iconSymbol = '🔗'; // Standard-Icon
            const videoSrc = actionElement.getAttribute('data-video');
            const linkHref = actionElement.href;

            if (videoSrc) {
                iconSymbol = '🎬'; // Video-Icon für lokale Videos
            } else if (linkHref) {
                if (linkHref.includes('youtube.com') || linkHref.includes('youtu.be')) iconSymbol = '🎬';
                else if (linkHref.includes('instagram.com')) iconSymbol = '📷';
                else if (linkHref.includes('toornament.com')) iconSymbol = '🎮';
            }
            
            linkIcon.innerHTML = iconSymbol;
            linkIcon.style.cssText = `
                cursor: pointer; font-size: 1.2em; padding: 8px; border-radius: 50%;
                background: rgba(255,255,255,0.2); transition: all 0.2s ease; user-select: none;
                animation: pulseIcon 2s ease-in-out infinite; min-width: 32px; min-height: 32px;
                display: flex; align-items: center; justify-content: center;
            `;
            linkIcon.setAttribute('role', 'button');
            linkIcon.setAttribute('aria-label', `Aktion ausführen für ${text}`);
            linkIcon.setAttribute('tabindex', '0');

            linkIcon.addEventListener('mouseenter', () => {
                linkIcon.style.background = 'rgba(255,255,255,0.4)';
                linkIcon.style.transform = 'scale(1.1)';
                linkIcon.style.animationPlayState = 'paused';
            });
            linkIcon.addEventListener('mouseleave', () => {
                linkIcon.style.background = 'rgba(255,255,255,0.2)';
                linkIcon.style.transform = 'scale(1)';
                linkIcon.style.animationPlayState = 'running';
            });

            // --- NEUE LOGIK: Click-Handler für Links UND Videos ---
            linkIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (videoSrc) {
                    // Video-Overlay öffnen
                    overlayVideo.querySelector('source').setAttribute('src', videoSrc);
                    overlayVideo.load();
                    overlay.classList.add('active');
                    overlayVideo.play();
                } else if (linkHref) {
                    // Normalen Link öffnen
                    (actionElement.target === '_blank') ? window.open(linkHref, '_blank') : window.location.href = linkHref;
                }
                bischnablu.style.display = 'none';
                currentBubbleText = '';
            });

            linkIcon.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') linkIcon.click();
            });

            contentWrapper.appendChild(linkIcon);
        }

        bubbleTextContainer.appendChild(contentWrapper);
    }

    // --- THROTTLE HELPER ---
    function throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                fn(...args);
                lastCall = now;
            }
        };
    }

    // --- GERÄTE-ERKENNUNG ---
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (isTouchDevice) {
        // --- TOUCH LOGIK ---
        mascotNameElement.textContent = 'Tap';
        bischnablu.querySelector('.bischnablu-grafik').style.display = 'none';
        bischnablu.style.position = 'absolute';
        bischnablu.style.display = 'none';
        currentBubbleText = '';
        bischnablu.style.zIndex = '1000';
        bubble.style.position = 'absolute';
        bubble.style.bottom = '20px';

        // --- NEUE LOGIK: Ein Event-Listener für alle interaktiven Items (inkl. Videos) ---
        projektItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const linkElement = this.querySelector('a');
                const isVideo = this.hasAttribute('data-video');

                // Verhindert das sofortige Öffnen des Links oder eine andere Standardaktion
                if (linkElement || isVideo) {
                    e.preventDefault();
                }

                if (!this.dataset.text) return;

                // Bestimmt, welches Element die Aktion auslöst (ein Link oder das Item selbst für ein Video)
                const actionElement = linkElement || this;

                bubble.style.left = '-90px';
                const rect = this.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                bischnablu.style.left = `${rect.left + scrollLeft + rect.width / 2}px`;
                bischnablu.style.top = `${rect.top + scrollTop}px`;
                bischnablu.style.display = 'block';

                updateBubbleTextWithLink(this.dataset.text, actionElement);

                // RANDKORREKTUR
                const bubbleRect = bubble.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const edgePadding = 10;
                let offsetX = 0;
                if (bubbleRect.right > viewportWidth - edgePadding) {
                    offsetX = (viewportWidth - edgePadding) - bubbleRect.right;
                } else if (bubbleRect.left < edgePadding) {
                    offsetX = edgePadding - bubbleRect.left;
                }
                bubble.style.left = `${-90 + offsetX}px`;

                // SCROLL KORREKTUR
                const topEdgePadding = 30;
                if (bubbleRect.top < topEdgePadding) {
                    window.scrollBy({ top: bubbleRect.top - topEdgePadding, behavior: 'smooth' });
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.projekt-item') && !e.target.closest('.bischnablu')) {
                bischnablu.style.display = 'none';
                currentBubbleText = '';
            }
        }, true);
    } else {
        // --- DESKTOP LOGIK ---
        // (Unverändert, direkte Klicks auf Videos funktionieren hier weiterhin)
        const wideScreenMouseOver = (e) => updateBubbleText(e.currentTarget.dataset.text);
        const wideScreenMouseLeave = () => {
            clearTimeout(typingTimeout);
            
        };
        const narrowScreenMouseOver = function() {
            const linkElement = this.querySelector('a');
            if (!this.dataset.text) return;
            
            bubble.style.pointerEvents = 'none';
            bubble.style.left = '-90px';
            const rect = this.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            bischnablu.style.left = `${rect.left + scrollLeft + rect.width / 2}px`;
            bischnablu.style.top = `${rect.top + scrollTop}px`;
            bischnablu.style.display = 'block';

            updateBubbleTextWithLink(this.dataset.text, linkElement);

            // RANDKORREKTUR
            const bubbleRect = bubble.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const edgePadding = 10;
            let offsetX = 0;
            if (bubbleRect.right > viewportWidth - edgePadding) {
                offsetX = (viewportWidth - edgePadding) - bubbleRect.right;
            } else if (bubbleRect.left < edgePadding) {
                offsetX = edgePadding - bubbleRect.left;
            }
            bubble.style.left = `${-90 + offsetX}px`;
        };
        const narrowScreenMouseLeave = () => {
            bischnablu.style.display = 'none';
            currentBubbleText = '';
        };

        const throttledMouseMove = throttle((e) => {
            rotateElement(e, kopfContainer);
            augen.forEach(auge => moveEye(e, auge));
            updateGradient(e);
        }, 16);

        const cleanupMouseEvents = () => {
            projektItems.forEach(item => {
                item.removeEventListener('mouseover', wideScreenMouseOver);
                item.removeEventListener('mouseover', narrowScreenMouseOver);
                item.removeEventListener('mouseleave', narrowScreenMouseLeave);
            });
            document.querySelectorAll('.projekt-galerie, .logo-grid').forEach(gallery => {
                gallery.removeEventListener('mouseleave', wideScreenMouseLeave);
            });
            document.removeEventListener('mousemove', throttledMouseMove);
        };

        const handleDesktopLayout = () => {
            cleanupMouseEvents();
            mascotNameElement.textContent = 'Hover';
            bubble.style.left = '';

            if (window.innerWidth < 840) {
                bischnablu.querySelector('.bischnablu-grafik').style.display = 'none';
                bischnablu.style.position = 'absolute';
                bischnablu.style.display = 'none';
                currentBubbleText = '';
                bischnablu.style.zIndex = '1000';
                bubble.style.position = 'absolute';
                bubble.style.bottom = '20px';

                projektItems.forEach(item => {
                    item.addEventListener('mouseover', narrowScreenMouseOver);
                    item.addEventListener('mouseleave', narrowScreenMouseLeave);
                });
            } else {
                bischnablu.querySelector('.bischnablu-grafik').style.display = 'block';
                bischnablu.style.display = 'block';
                bischnablu.style.position = '';
                bischnablu.style.zIndex = '';
                bischnablu.style.top = '';
                bischnablu.style.left = '';
                bubble.style.bottom = '';
                bubble.style.position = '';

                projektItems.forEach(item => item.addEventListener('mouseover', wideScreenMouseOver));
                document.querySelectorAll('.projekt-galerie, .logo-grid').forEach(gallery => 
                    gallery.addEventListener('mouseleave', wideScreenMouseLeave)
                );
                document.addEventListener('mousemove', throttledMouseMove);
            }
        };

        handleDesktopLayout();
        let resizeTimeout;
        window.addEventListener('resize', () => {
            bischnablu.style.display = 'none'; 
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleDesktopLayout, 200);
        });
    }

    // --- UNABHÄNGIGE FUNKTIONEN ---
   const highlightActiveLink = () => {
        let currentActiveSectionId = '';
        const sections = document.querySelectorAll('main > section[id], header[id]');
        const navLinks = document.querySelectorAll('.sidebar a');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const scrollPosition = window.scrollY + ACTIVE_SECTION_THRESHOLD;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentActiveSectionId = section.getAttribute('id');
            }
        });
        
        if (!currentActiveSectionId) {
            sections.forEach(section => {
                if (window.scrollY + ACTIVE_SECTION_THRESHOLD >= section.offsetTop - 50) {
                    currentActiveSectionId = section.getAttribute('id');
                }
            });
        }
        
        navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === '#' + currentActiveSectionId;
            link.classList.toggle('active', isActive);
        });
    };

    // INITIALISIERUNG
    setupSmoothScrolling();
    
    window.addEventListener('scroll', highlightActiveLink);
    highlightActiveLink(); // Initiale Ausführung
    
    // --- NEUE LOGIK: Video-Listener nur für Desktop ---
    if (!isTouchDevice) {
    // Suche nach allen Elementen, die Videos haben können
    const videoElements = document.querySelectorAll('[data-video]');
    
    videoElements.forEach(element => {
        element.addEventListener('click', (e) => {
            // Verhindere das Standardverhalten für Links
            e.preventDefault();
            
            const videoSrc = element.getAttribute('data-video');
            if (videoSrc) {
                overlayVideo.querySelector('source').setAttribute('src', videoSrc);
                overlayVideo.load();
                overlay.classList.add('active');
                overlayVideo.play();
            }
        });
        
        // Cursor-Style für bessere UX
        element.style.cursor = 'pointer';
    });
}

    closeBtn.addEventListener('click', () => {
        overlayVideo.pause();
        overlay.classList.remove('active');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlayVideo.pause();
            overlay.classList.remove('active');
        }
    });
        
    function rotateElement(event, element) {
        if (!element) return;
        const maxRotationX = 10, maxRotationY = 10;
        const relativeX = (event.clientX / window.innerWidth - 0.5) * 2;
        const relativeY = (event.clientY / window.innerHeight - 0.5) * 2;
        element.style.transform = `rotate(${relativeX * maxRotationX - relativeY * maxRotationY}deg)`;
    }

    function moveEye(event, auge) {
        if (!auge) return;
        const radius = 7;
        const rect = auge.getBoundingClientRect();
        const augeX = rect.left + rect.width / 2;
        const augeY = rect.top + rect.height / 2;
        const deltaX = event.clientX - augeX;
        const deltaY = event.clientY - augeY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const deadZone = 25;
        if (distance < deadZone) return;
        const angleRad = Math.atan2(deltaY, deltaX);
        auge.style.transform = `translate(${radius * Math.cos(angleRad)}px, ${radius * Math.sin(angleRad)}px)`;
    }

    const movementStrength = 100;
    function updateGradient(e) {
        const xPos = 50 - (movementStrength / 2) + ((e.clientX / window.innerWidth) * movementStrength);
        const yPos = 50 - (movementStrength / 2) + ((e.clientY / window.innerHeight) * movementStrength);
        gradientElements.forEach(el => el.style.backgroundPosition = `${xPos}% ${yPos}%`);
    }

    const style = document.createElement('style');
    style.textContent = `@keyframes pulseIcon { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }`;
    document.head.appendChild(style);

    const hideAt = 100;
    window.addEventListener('scroll', () => {
        mascot2?.classList.toggle('hidden', window.scrollY > hideAt);
    });
    if (mascot2) {
        mascot2.classList.toggle('hidden', window.scrollY > hideAt);
    }

    if (!isTouchDevice) {
        const draggable = document.querySelector('.bischnablu-container');
        if (draggable) {
            isDragging = false;
            let startX = 0, startY = 0;
            let offsetX = 0, offsetY = 0;
            let lastX = 0, lastY = 0;
            let velocityX = 0;
            let rotation = 0;
            let rotationVelocity = 0;
            let animationFrameId;
            const rotationFactor = 0.3;
            const springConstant = 0.1;
            const dampingFactor = 0.8;
            const head = kopfContainer.querySelector('.bischnablu-head');

            draggable.style.cursor = 'grab';

            const startDrag = (e) => {
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
                lastX = e.clientX;
                lastY = e.clientY;
                head.src = "images/bischnablu_head_closed.png";
                augen.forEach(auge => {
                    auge.hidden = true;
                });
                draggable.style.transition = 'none';
                draggable.style.cursor = 'grabbing';
                e.preventDefault();
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                updateAnimation();
            };

            const drag = (e) => {
                if (!isDragging) return;
                const currentX = e.clientX;
                velocityX = (currentX - lastX);
                lastX = currentX;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
            };

            const endDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                draggable.style.cursor = 'grab';
                velocityX = 0;
                draggable.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                draggable.style.setProperty('--drag-x', '0px');
                draggable.style.setProperty('--drag-y', '0px');
                setTimeout(() => {
                    draggable.style.transition = '';
                    if (!isDragging) {
                        cancelAnimationFrame(animationFrameId);
                        draggable.style.transition = 'transform 0.3s ease-out';
                        draggable.style.setProperty('--drag-rotate-z', '0deg');
                        head.src = "images/bischnablu_head.png";
                        augen.forEach(auge => {
                            auge.hidden = false;
                        });
                    }
                }, 400);
                offsetX = 0;
                offsetY = 0;
            };
            
            const updateAnimation = () => {
                if (!isDragging) {
                    if (Math.abs(rotation) < 0.1 && Math.abs(rotationVelocity) < 0.1) {
                        rotation = 0;
                        rotationVelocity = 0;
                        draggable.style.setProperty('--drag-rotate-z', `0deg`);
                        return;
                    }
                }
                const targetRotation = velocityX * rotationFactor;
                const springForce = (targetRotation - rotation) * springConstant;
                rotationVelocity += springForce;
                rotationVelocity *= dampingFactor;
                rotation += rotationVelocity;
                draggable.style.setProperty('--drag-x', `${offsetX}px`);
                draggable.style.setProperty('--drag-y', `${offsetY}px`);
                draggable.style.setProperty('--drag-rotate-z', `${rotation}deg`);
                animationFrameId = requestAnimationFrame(updateAnimation);
            };

            draggable.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);
        }
    }

    // --- NEU: BURGER MENU LOGIK ---
const burgerButton = document.querySelector('.burger-menu-button');
const navLinksList = document.getElementById('nav-links-list');
const navLinksItems = navLinksList.querySelectorAll('a');

if (burgerButton && navLinksList) {
    burgerButton.addEventListener('click', () => {
        const isOpen = navLinksList.classList.toggle('is-open');
        burgerButton.setAttribute('aria-expanded', isOpen);
        document.body.classList.toggle('menu-open', isOpen);
    });

    // Menü schließen, wenn ein Link geklickt wird
    navLinksItems.forEach(link => {
        link.addEventListener('click', () => {
            if (navLinksList.classList.contains('is-open')) {
                navLinksList.classList.remove('is-open');
                burgerButton.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('menu-open');
            }
        });
    });

    // Menü schließen, wenn außerhalb geklickt wird
    document.addEventListener('click', (e) => {
        // Überprüfen, ob das Menü offen ist und der Klick außerhalb des Menüs und des Buttons stattfand
        if (navLinksList.classList.contains('is-open') && !navLinksList.contains(e.target) && !burgerButton.contains(e.target)) {
            navLinksList.classList.remove('is-open');
            burgerButton.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        }
    });
}
});