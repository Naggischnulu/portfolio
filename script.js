// Ab dieser Breite steht Bischnablu in der rechten Spalte (gleicher Wert in style.css)
const WIDE = matchMedia('(min-width: 840px)');
const DESKTOP_NAV = matchMedia('(min-width: 1120px)');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

let isDragging = false;
let lastPointerType = 'mouse';
addEventListener('pointerdown', e => { lastPointerType = e.pointerType; }, true);


// =============================================== //
// NAVIGATION                                      //
// =============================================== //

const nav = $('.site-nav');
const navToggle = $('.nav-toggle');
const navLinks = $$('.nav-list a');

function setMenuOpen(open) {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', open);
}

navToggle.addEventListener('click', () => setMenuOpen(!nav.classList.contains('is-open')));

// Klick auf einen Link oder den abgedunkelten Hintergrund schließt das Menü
nav.addEventListener('click', e => {
    if (e.target === nav || e.target.closest('.nav-list a')) setMenuOpen(false);
});

addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenuOpen(false);
        navToggle.focus();
    }
});

DESKTOP_NAV.addEventListener('change', () => setMenuOpen(false));

// Aktiven Abschnitt markieren: der Abschnitt, der gerade bei 40 % der Fensterhöhe liegt
const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach(link => {
            if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }
}, { rootMargin: '-40% 0px -59% 0px' });

navLinks.forEach(link => {
    const section = document.getElementById(link.hash.slice(1));
    if (section) sectionObserver.observe(section);
});


// =============================================== //
// SPRECHBLASE                                     //
// =============================================== //

const stage = $('.mascot-stage');
const bubble = $('.bubble');
const bubbleText = $('.bubble-text');
const bubbleAction = $('.bubble-action');
const bubbleIcon = $('use', bubbleAction);

const ALLOWED_TAGS = new Set(['B', 'I', 'EM', 'STRONG', 'BR']);
const VIDEO_HINT = {
    mouse: '<br><i>[click the image to see more]</i>',
    touch: '<br><i>[tap the image again to see more]</i>',
};

let currentItem = null;  // Projekt, über das Bischnablu gerade spricht
let currentMode = null;  // 'hover' | 'focus' | 'touch'
let armedItem = null;    // Touch: zweites Antippen desselben Projekts öffnet Link/Video

// Link oder Video eines Projekts (für Touch-Knopf und Icon)
function getAction(item) {
    const video = $('[data-video]', item);
    if (video) return { element: video, icon: 'play', label: 'Play video' };

    const link = $('a[href]', item);
    if (!link) return null;
    const icon = link.hostname.includes('instagram') ? 'instagram'
        : link.hostname.includes('youtu') ? 'play'
        : 'link';
    return { element: link, icon, label: 'Open link' };
}

// Schreibt den Text Buchstabe für Buchstabe in die Blase (<b>, <i>, <br> bleiben erhalten)
function writeText(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    let index = 0;

    const copy = (from, to) => {
        for (const node of from.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                for (const char of node.data) {
                    const letter = document.createElement('span');
                    letter.textContent = char;
                    letter.style.animationDelay = `${index++ * 21}ms`;
                    to.append(letter);
                }
            } else if (ALLOWED_TAGS.has(node.nodeName)) {
                copy(node, to.appendChild(document.createElement(node.nodeName)));
            }
        }
    };

    bubbleText.replaceChildren();
    copy(template.content, bubbleText);
}

function showInfo(item, mode) {
    if (isDragging || (item === currentItem && mode === currentMode)) return;
    currentItem = item;
    currentMode = mode;

    const action = getAction(item);
    let text = item.dataset.text.trim();
    if (action?.element.hasAttribute('data-video')) {
        text += mode === 'touch' ? VIDEO_HINT.touch : VIDEO_HINT.mouse;
    }
    writeText(text);

    // Den Knopf in der Blase gibt es nur bei Touch (mit der Maus klickt man direkt aufs Bild)
    bubbleAction.hidden = mode !== 'touch' || !action;
    if (!bubbleAction.hidden) {
        bubbleIcon.setAttribute('href', '#i-' + action.icon);
        bubbleAction.setAttribute('aria-label', action.label);
    }

    bubble.classList.toggle('is-passive', mode === 'hover');
    bubble.hidden = false;

    if (!WIDE.matches) {
        placeNextTo(item, mode);
    } else if (mode !== 'hover') {
        // Bei Touch und Tastatur schaut Bischnablu zum Projekt (mit der Maus folgt er ohnehin dem Zeiger)
        const rect = item.getBoundingClientRect();
        lookAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
}

function hideInfo() {
    bubble.hidden = true;
    currentItem = currentMode = armedItem = null;
    $('.card.is-flipped')?.classList.remove('is-flipped');
}

// Schmale Bildschirme: Blase über dem Projekt, Spitze zeigt auf seine Mitte
function placeNextTo(item, mode) {
    const rect = item.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const anchor = clamp(rect.left + rect.width / 2, 24, viewportWidth - 24);
    const left = clamp(anchor - width * 0.3, 12, viewportWidth - width - 12);
    let top = rect.top - height - 14;

    if (top < 12) {
        if (mode === 'touch') {
            scrollBy({ top: top - 12, behavior: 'smooth' });
        } else {
            top = 12;
        }
    }

    // Die Spitze der Sprechblase sitzt 18 px rechts von der Mitte der Grafik
    bubble.style.setProperty('--tail-x', `${clamp(anchor - left - 18, 26, width - 26)}px`);
    bubble.style.left = `${left + scrollX}px`;
    bubble.style.top = `${top + scrollY}px`;
}

// Breite Bildschirme: Blase gehört zu Bischnablu, schmale: frei schwebend im Dokument
function applyLayout() {
    hideInfo();
    bubble.classList.toggle('is-floating', !WIDE.matches);
    bubble.style.left = bubble.style.top = '';
    bubble.style.removeProperty('--tail-x');
    (WIDE.matches ? stage : document.body).append(bubble);
}

applyLayout();
WIDE.addEventListener('change', applyLayout);

// Positionen stimmen nach einer Breitenänderung nicht mehr (Höhe ändert sich auf Handys beim Scrollen)
let lastWidth = innerWidth;
addEventListener('resize', () => {
    if (innerWidth !== lastWidth && !WIDE.matches) hideInfo();
    lastWidth = innerWidth;
});

// Maus: Hovern zeigt die Info
document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const item = e.target.closest('[data-text]');
    if (item) showInfo(item, 'hover');
});

document.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse' || WIDE.matches || currentMode !== 'hover') return;
    const item = e.target.closest('[data-text]');
    if (item && !item.contains(e.relatedTarget)) hideInfo();
});

// Tastatur: Fokus wirkt wie Hovern
document.addEventListener('focusin', e => {
    const item = e.target.closest('[data-text]');
    if (item && e.target.matches(':focus-visible')) showInfo(item, 'focus');
});

document.addEventListener('focusout', e => {
    if (!WIDE.matches && currentMode === 'focus' && !currentItem?.contains(e.relatedTarget)) hideInfo();
});

// Klicks: Video öffnen; bei Touch zeigt das erste Antippen die Info, das zweite öffnet
document.addEventListener('click', e => {
    if (e.target.closest('.bubble, .mascot-figure')) return;

    const item = e.target.closest('[data-text]');
    const isTouch = e.detail > 0 && lastPointerType !== 'mouse';  // Tastatur-Klicks haben detail 0

    if (!item) {
        if (isTouch) hideInfo();
        return;
    }

    if (isTouch) {
        item.classList.contains('card') && item.classList.toggle('is-flipped');
        if (armedItem !== item) {
            e.preventDefault();
            showInfo(item, 'touch');
            armedItem = item;
            return;
        }
        if (getAction(item)) hideInfo();
    }

    // Mit gedrückter Cmd/Strg/Shift-Taste öffnet der Browser das Video normal in einem neuen Tab
    const video = e.target.closest('[data-video]');
    if (video && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
        e.preventDefault();
        openVideo(video);
    }
});

bubbleAction.addEventListener('click', () => {
    const action = currentItem && getAction(currentItem);
    if (!action) return;
    if (action.element.hasAttribute('data-video')) openVideo(action.element);
    else window.open(action.element.href, '_blank', 'noopener');
    hideInfo();
});


// =============================================== //
// BISCHNABLU: AUGEN, KOPF, SCHIMMER, ZIEHEN       //
// =============================================== //

const figure = $('.mascot-figure');
const head = $('.mascot-head');
const pupils = $$('.pupil');
const label = $('.mascot-label');
const shimmerTexts = $$('.shimmer');

// Augen und Kopf gleiten zum Ziel (Maus oder angetipptes Projekt), statt zu springen.
// Beide Pupillen bewegen sich gemeinsam; je näher das Ziel am Gesicht ist, desto weniger
// weit schauen sie zur Seite – direkt über den Augen gibt es so kein Kippen oder Hängen.
const EYE_RANGE = 7;      // maximale Auslenkung der Pupillen (px)
const EYE_SOFTNESS = 50;  // ab etwa diesem Abstand (px) schauen die Pupillen ganz zur Seite
const HEAD_TILT = 20;     // maximale Kopfneigung (Grad)

let gazeTarget = null;
let gaze = { x: -4.95, y: -4.95 };  // Startblick nach links oben, wie in style.css
let headAngle = 0;
let gazeFrame = 0;
let lastFrameTime = 0;

function lookAt(x, y) {
    gazeTarget = { x, y };
    wakeGaze();
}

function wakeGaze() {
    if (gazeTarget && !gazeFrame && !isDragging && WIDE.matches) {
        gazeFrame = requestAnimationFrame(animateGaze);
    }
}

function animateGaze(time) {
    const dt = lastFrameTime ? clamp(time - lastFrameTime, 0, 50) : 16;
    lastFrameTime = time;

    // Die Kopfmitte liegt genau zwischen den Augen und bleibt beim Neigen an ihrem Platz
    const rect = head.getBoundingClientRect();
    const dx = gazeTarget.x - (rect.left + rect.width / 2);
    const dy = gazeTarget.y - (rect.top + rect.height / 2);
    const reach = EYE_RANGE / Math.hypot(dx, dy, EYE_SOFTNESS);
    const goalX = dx * reach;
    const goalY = dy * reach;
    const goalAngle = (gazeTarget.x / innerWidth - gazeTarget.y / innerHeight) * HEAD_TILT;

    // Weich hinterhergleiten (Pupillen schneller als der Kopf)
    gaze.x += (goalX - gaze.x) * (1 - Math.exp(-dt / 60));
    gaze.y += (goalY - gaze.y) * (1 - Math.exp(-dt / 60));
    headAngle += (goalAngle - headAngle) * (1 - Math.exp(-dt / 100));

    // Die Pupillen sitzen im geneigten Kopf: Neigung herausrechnen, damit sie genau zum Ziel schauen
    const angle = headAngle * Math.PI / 180;
    const localX = gaze.x * Math.cos(angle) + gaze.y * Math.sin(angle);
    const localY = gaze.y * Math.cos(angle) - gaze.x * Math.sin(angle);
    head.style.transform = `rotate(${headAngle}deg)`;
    pupils.forEach(pupil => { pupil.style.transform = `translate(${localX}px, ${localY}px)`; });

    const settled = Math.hypot(goalX - gaze.x, goalY - gaze.y) < 0.01 && Math.abs(goalAngle - headAngle) < 0.01;
    if (settled || isDragging) {
        gazeFrame = lastFrameTime = 0;
    } else {
        gazeFrame = requestAnimationFrame(animateGaze);
    }
}

// Schimmer-Text folgt der Maus
let pointer = null;
let pointerFrame = 0;

function updateShimmer() {
    pointerFrame = 0;
    const position = `${pointer.x / innerWidth * 100}% ${pointer.y / innerHeight * 100}%`;
    shimmerTexts.forEach(el => { el.style.backgroundPosition = position; });
}

document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer = { x: e.clientX, y: e.clientY };
    pointerFrame ||= requestAnimationFrame(updateShimmer);
    lookAt(e.clientX, e.clientY);
}, { passive: true });

// Bischnablu greifen, schleudern und zurückfedern lassen – eine kleine Physik-Simulation:
// Er hängt an der Stelle, an der man ihn packt, und schwingt der Bewegung hinterher. Beim
// Loslassen behält er seinen Schwung, eine Feder zieht ihn zurück und er wackelt nach.
const RETURN_STIFFNESS = 150;  // Rückholfeder (höher = schneller zurück)
const RETURN_DAMPING = 16;     // niedriger = stärkeres Überschwingen
const SWING = 0.0002;          // Neigung pro px/s Geschwindigkeit (rad)
const SWING_MAX = 0.5;         // maximale Neigung (rad, ≈ 29°)
const SWING_STIFFNESS = 100;   // Pendel nach dem Loslassen: wie schnell er sich wieder aufrichtet
const SWING_DAMPING = 14;      // Pendel nach dem Loslassen: niedriger = längeres Nachwackeln
const HELD_STIFFNESS = 250;    // Pendel beim Ziehen: höher = folgt der Maus direkter
const HELD_DAMPING = 22;
const LIFT = 1.03;             // beim Greifen etwas größer, als würde er hochgehoben
const MAX_THROW = 1500;        // höchste Wurfgeschwindigkeit (px/s)
const CENTER_OF_MASS_Y = 110;  // Schwerpunkt in der Figur (px von oben)
const STEP = 1 / 240;          // feste Zeitschritte: gleiches Verhalten bei 60 und 120 Hz

let pos = { x: 0, y: 0 };      // Verschiebung gegenüber der Ruheposition (px)
let vel = { x: 0, y: 0 };      // Geschwindigkeit (px/s)
let tilt = 0;                  // Neigung (rad)
let tiltVel = 0;
let scale = 1;
let scaleVel = 0;
let pivot = null;              // Griffpunkt in Figur-Koordinaten = Drehpunkt
let hang = 1;                  // +1 am Kopf gehalten, −1 an den Füßen, 0 am Schwerpunkt
let grabOffset = null;
let trail = [];                // letzte Positionen beim Ziehen, für die Wurfgeschwindigkeit
let physicsFrame = 0;
let physicsTime = 0;
let leftover = 0;

figure.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    figure.setPointerCapture(e.pointerId);

    // Griffpunkt in Figur-Koordinaten – stimmt auch, wenn er gerade noch zurückfliegt
    const stageRect = stage.getBoundingClientRect();
    const origin = pivot ?? { x: figure.offsetWidth / 2, y: figure.offsetHeight / 2 };
    const rx = e.clientX - stageRect.left - figure.offsetLeft - origin.x - pos.x;
    const ry = e.clientY - stageRect.top - figure.offsetTop - origin.y - pos.y;
    const cos = Math.cos(tilt), sin = Math.sin(tilt);
    const grip = { x: origin.x + (cos * rx + sin * ry) / scale, y: origin.y + (cos * ry - sin * rx) / scale };

    // Drehpunkt auf den Griffpunkt verlegen, ohne dass die Figur dabei springt
    const dx = origin.x - grip.x, dy = origin.y - grip.y;
    pos.x += dx - (cos * dx - sin * dy) * scale;
    pos.y += dy - (sin * dx + cos * dy) * scale;
    pivot = grip;
    hang = clamp((CENTER_OF_MASS_Y - grip.y) / 60, -1, 1);

    grabOffset = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    trail = [];
    isDragging = true;
    figure.classList.add('is-held', 'eyes-closed');
    startPhysics();
});

figure.addEventListener('pointermove', e => {
    if (isDragging) pos = { x: e.clientX - grabOffset.x, y: e.clientY - grabOffset.y };
});

function releaseFigure() {
    if (!isDragging) return;
    isDragging = false;
    figure.classList.remove('is-held');
    const speed = Math.hypot(vel.x, vel.y);
    if (speed > MAX_THROW) {
        vel.x *= MAX_THROW / speed;
        vel.y *= MAX_THROW / speed;
    }
}

figure.addEventListener('pointerup', releaseFigure);
figure.addEventListener('pointercancel', releaseFigure);
figure.addEventListener('lostpointercapture', releaseFigure);

function startPhysics() {
    if (!physicsFrame) {
        physicsTime = 0;
        physicsFrame = requestAnimationFrame(simulate);
    }
}

function simulate(time) {
    const dt = physicsTime ? clamp((time - physicsTime) / 1000, 0, 0.05) : STEP;
    physicsTime = time;

    if (isDragging) {
        // Die Figur klebt am Zeiger; Geschwindigkeit aus den letzten 40 ms
        trail.push({ time, x: pos.x, y: pos.y });
        while (trail.length > 2 && time - trail[0].time > 40) trail.shift();
        const span = (time - trail[0].time) / 1000;
        vel = span > 0.01
            ? { x: (pos.x - trail[0].x) / span, y: (pos.y - trail[0].y) / span }
            : { x: 0, y: 0 };
    }

    for (leftover += dt; leftover >= STEP; leftover -= STEP) {
        if (!isDragging) {
            vel.x += (-RETURN_STIFFNESS * pos.x - RETURN_DAMPING * vel.x) * STEP;
            vel.y += (-RETURN_STIFFNESS * pos.y - RETURN_DAMPING * vel.y) * STEP;
            pos.x += vel.x * STEP;
            pos.y += vel.y * STEP;
        }
        // Der Körper schwingt der Bewegung wie ein Pendel hinterher
        const swingGoal = clamp(hang * vel.x * SWING, -SWING_MAX, SWING_MAX);
        const stiffness = isDragging ? HELD_STIFFNESS : SWING_STIFFNESS;
        const damping = isDragging ? HELD_DAMPING : SWING_DAMPING;
        tiltVel += (stiffness * (swingGoal - tilt) - damping * tiltVel) * STEP;
        tilt += tiltVel * STEP;
        scaleVel += (400 * ((isDragging ? LIFT : 1) - scale) - 22 * scaleVel) * STEP;
        scale += scaleVel * STEP;
    }

    figure.style.transformOrigin = `${pivot.x}px ${pivot.y}px`;
    figure.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${tilt}rad) scale(${scale})`;

    const distance = Math.hypot(pos.x, pos.y);
    const speed = Math.hypot(vel.x, vel.y);

    // Gelandet: Augen auf, auch wenn er noch etwas nachwackelt
    if (!isDragging && distance < 3 && speed < 60 && figure.classList.contains('eyes-closed')) {
        figure.classList.remove('eyes-closed');
        wakeGaze();
    }

    const resting = !isDragging && distance < 0.3 && speed < 3
        && Math.abs(tilt) < 0.001 && Math.abs(tiltVel) < 0.01 && Math.abs(scale - 1) < 0.001;
    if (resting) {
        pos = { x: 0, y: 0 };
        vel = { x: 0, y: 0 };
        tilt = tiltVel = scaleVel = 0;
        scale = 1;
        pivot = null;
        figure.style.transform = figure.style.transformOrigin = '';
        physicsFrame = 0;
        wakeGaze();
    } else {
        physicsFrame = requestAnimationFrame(simulate);
    }
}

// "This is Bischnablu" verschwindet nach dem ersten Scrollen
const updateLabel = () => label.classList.toggle('is-hidden', scrollY > 100);
addEventListener('scroll', updateLabel, { passive: true });
updateLabel();


// =============================================== //
// VIDEOS                                          //
// =============================================== //

const videoDialog = $('.video-dialog');
const dialogVideo = $('video', videoDialog);
let videoOpener = null;

function openVideo(trigger) {
    videoOpener = trigger;
    dialogVideo.src = trigger.href;
    videoDialog.showModal();
    dialogVideo.play().catch(() => {});
}

videoDialog.addEventListener('close', () => {
    dialogVideo.pause();
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
    videoOpener?.focus({ preventScroll: true });
});

// Klick neben das Video schließt das Overlay (Esc schließt es automatisch)
videoDialog.addEventListener('click', e => {
    if (e.target === videoDialog) videoDialog.close();
});

$('.dialog-close').addEventListener('click', () => videoDialog.close());

// Endlos-Videos (ersetzen GIFs) laufen nur, solange sie sichtbar sind
const autoplayObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
    }
}, { rootMargin: '200px 0px' });

$$('video[data-autoplay]').forEach(video => autoplayObserver.observe(video));
