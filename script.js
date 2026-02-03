/**
 * Valentine's Day Interactive Page
 * ================================
 * Two modes:
 * 1. CREATE MODE: Generate personalized Valentine links
 * 2. VIEWER MODE: See the Valentine question (NO dodges, YES celebrates!)
 */

// ============================================
// DOM Elements
// ============================================
const createScreen = document.getElementById('createScreen');
const viewerScreen = document.getElementById('viewerScreen');
const container = document.getElementById('container');
const fallArea = document.getElementById('fallArea');

// Create screen elements
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const makeLinkBtn = document.getElementById('makeLinkBtn');
const linkBox = document.getElementById('linkBox');
const shareLink = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');

// Viewer screen elements
const titleText = document.getElementById('titleText');
const subText = document.getElementById('subText');
const buttonRow = document.getElementById('buttonRow');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const teaseText = document.getElementById('teaseText');
const celebration = document.getElementById('celebration');
const yayText = document.getElementById('yayText');
const celebrateSub = document.getElementById('celebrateSub');
const loveMessage = document.getElementById('loveMessage');

// ============================================
// Utility Functions
// ============================================
function show(el) {
    el.classList.remove('hidden');
}

function hide(el) {
    el.classList.add('hidden');
}

function safeName(x) {
    if (!x) return '';
    return x.toString().trim().slice(0, 30);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Dodge settings (desktop)
    dodgeThreshold: 120,
    dodgePadding: 20,
    dodgeDebounce: 100,
    
    // Mobile tap messages
    tapMessages: ['No', 'Are you sure?', 'Really? 🤔', 'Come on! 😅', 'Nope! 😂', 'Nice try 😏', 'Not happening 🙅', 'Think again 💭', 'Wrong answer! ❌', 'Try the other button 👆', 'Still no? 🥺', 'Please? 🥹', 'Pretty please? 💕', '👀'],
    
    // Falling emoji settings
    emojis: ['💖', '🌹', '😘', '💘', '🌸', '❤️', '💕', '💗', '💝', '✨'],
    maxEmojis: 80,
    spawnRate: 100,
    fallDuration: { min: 3, max: 6 },
    emojiSize: { min: 1, max: 2.5 },
    
    // YES button growth
    yesGrowthFactor: 1.05
};

// ============================================
// State
// ============================================
let state = {
    noTapCount: 0,
    lastDodgeTime: 0,
    activeEmojis: 0,
    emojiSpawnInterval: null,
    isHoverDevice: false,
    yesBtnScale: 1,
    isViewerMode: false,
    fromName: '',
    toName: ''
};

// ============================================
// Mode Detection & Initialization
// ============================================
function initApp() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const to = params.get('to');
    
    if (from || to) {
        // VIEWER MODE: Show the valentine question
        initViewerMode(from, to);
    } else {
        // CREATE MODE: Show link generator form
        initCreateMode();
    }
}

// ============================================
// CREATE MODE
// ============================================
function initCreateMode() {
    show(createScreen);
    hide(viewerScreen);
    
    // Generate link button
    makeLinkBtn.addEventListener('click', generateLink);
    
    // Copy button
    copyBtn.addEventListener('click', copyLink);
    
    // Allow Enter key to generate link
    toInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateLink();
    });
    
    console.log('💌 Create mode initialized!');
}

function generateLink() {
    const fromName = safeName(fromInput.value);
    const toName = safeName(toInput.value);
    
    if (!fromName || !toName) {
        // Add shake animation to empty inputs
        if (!fromName) {
            fromInput.style.animation = 'shake 0.5s ease';
            setTimeout(() => fromInput.style.animation = '', 500);
        }
        if (!toName) {
            toInput.style.animation = 'shake 0.5s ease';
            setTimeout(() => toInput.style.animation = '', 500);
        }
        return;
    }
    
    // Build the link
    const link = `${location.origin}${location.pathname}?from=${encodeURIComponent(fromName)}&to=${encodeURIComponent(toName)}`;
    
    // Show the link box
    shareLink.value = link;
    show(linkBox);
    
    // Select the link text
    shareLink.focus();
    shareLink.select();
}

async function copyLink() {
    const link = shareLink.value;
    
    try {
        await navigator.clipboard.writeText(link);
        // Visual feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied! ✅';
        copyBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        prompt('Copy this link:', link);
    }
}

// ============================================
// VIEWER MODE
// ============================================
function initViewerMode(from, to) {
    state.isViewerMode = true;
    state.fromName = safeName(from) || 'Someone';
    state.toName = safeName(to) || 'you';
    
    hide(createScreen);
    show(viewerScreen);
    
    // Update the title and subtitle with safe text content
    titleText.innerHTML = `Hey ${escapeHtml(state.toName)} <span class="emoji">👀</span>`;
    subText.textContent = `${state.fromName} is asking: Will you be my Valentine?`;
    
    // Detect device type
    detectHoverDevice();
    
    // Initialize button behaviors
    if (state.isHoverDevice) {
        initDesktopDodge();
    } else {
        initMobileTap();
    }
    
    // YES button click handler
    yesBtn.addEventListener('click', handleYesClick);
    
    console.log('💖 Viewer mode initialized!');
    console.log(`From: ${state.fromName}, To: ${state.toName}`);
    console.log(`Device type: ${state.isHoverDevice ? 'Desktop (hover)' : 'Mobile (touch)'}`);
}

// ============================================
// Device Detection
// ============================================
function detectHoverDevice() {
    state.isHoverDevice = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    return state.isHoverDevice;
}

// ============================================
// NO Button - Desktop Dodge Logic
// ============================================
function initDesktopDodge() {
    // Make NO button absolutely positioned for dodging
    positionNoButtonInitially();
    
    // Add mousemove listener
    document.addEventListener('mousemove', handleMouseMove);
    
    // Also dodge on focus (keyboard navigation)
    noBtn.addEventListener('focus', () => {
        dodgeButton();
    });
    
    // Prevent NO button click from doing anything except dodge
    noBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dodgeButton();
    });
}

function positionNoButtonInitially() {
    noBtn.style.position = 'absolute';
    noBtn.style.right = '0';
    noBtn.style.top = '50%';
    noBtn.style.transform = 'translateY(-50%)';
}

function handleMouseMove(e) {
    if (!state.isViewerMode) return;
    
    const now = Date.now();
    if (now - state.lastDodgeTime < CONFIG.dodgeDebounce) return;
    
    const noBtnRect = noBtn.getBoundingClientRect();
    const noBtnCenterX = noBtnRect.left + noBtnRect.width / 2;
    const noBtnCenterY = noBtnRect.top + noBtnRect.height / 2;
    
    const distance = Math.hypot(e.clientX - noBtnCenterX, e.clientY - noBtnCenterY);
    
    if (distance < CONFIG.dodgeThreshold) {
        dodgeButton();
        state.lastDodgeTime = now;
    }
}

function dodgeButton() {
    const cardRect = viewerScreen.getBoundingClientRect();
    const noBtnRect = noBtn.getBoundingClientRect();
    
    const padding = CONFIG.dodgePadding;
    const minX = padding;
    const maxX = cardRect.width - noBtnRect.width - padding;
    const minY = padding;
    const maxY = buttonRow.offsetHeight - noBtnRect.height - padding;
    
    const newX = Math.random() * (maxX - minX) + minX;
    const newY = Math.random() * (maxY - minY) + minY;
    
    noBtn.style.left = `${newX}px`;
    noBtn.style.right = 'auto';
    noBtn.style.top = `${newY}px`;
    noBtn.style.transform = 'none';
    
    noBtn.classList.add('dodging');
    setTimeout(() => noBtn.classList.remove('dodging'), 200);
    
    growYesButton();
    
    if (Math.random() > 0.5) {
        showTeaseText();
    }
}

// ============================================
// NO Button - Mobile Tap Logic
// ============================================
function initMobileTap() {
    noBtn.addEventListener('click', handleMobileTap);
    noBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMobileTap();
    }, { passive: false });
}

function handleMobileTap() {
    state.noTapCount++;
    
    noBtn.classList.add('shaking');
    setTimeout(() => noBtn.classList.remove('shaking'), 500);
    
    if (state.noTapCount < CONFIG.tapMessages.length) {
        noBtn.textContent = CONFIG.tapMessages[state.noTapCount];
    }
    
    const shrinkFactor = Math.max(0.5, 1 - (state.noTapCount * 0.1));
    noBtn.style.transform = `scale(${shrinkFactor})`;
    
    if (state.noTapCount >= CONFIG.tapMessages.length - 1) {
        noBtn.classList.add('btn-hidden');
        setTimeout(() => {
            state.noTapCount = 0;
            noBtn.textContent = CONFIG.tapMessages[0];
            noBtn.style.transform = 'scale(1)';
            noBtn.classList.remove('btn-hidden');
        }, 1500);
    }
    
    growYesButton();
    showTeaseText();
}

// ============================================
// YES Button Growth
// ============================================
function growYesButton() {
    state.yesBtnScale *= CONFIG.yesGrowthFactor;
    state.yesBtnScale = Math.min(state.yesBtnScale, 1.4);
    yesBtn.style.transform = `scale(${state.yesBtnScale})`;
}

// ============================================
// Tease Text
// ============================================
const teaseMessages = [
    "Hey… you can't say no 😂",
    "The NO button is broken 🙃",
    "Just say YES already! 💕",
    "Nice try! 😏",
    "That's not how this works 😄",
    "You know you want to! 💖",
    "The universe wants you to say YES ✨",
    `Come on, ${state.toName}! 😊`
];

function showTeaseText() {
    const randomMessage = teaseMessages[Math.floor(Math.random() * teaseMessages.length)];
    teaseText.textContent = randomMessage;
    teaseText.classList.add('visible');
    
    setTimeout(() => {
        teaseText.classList.remove('visible');
    }, 2500);
}

// ============================================
// YES Button - Celebration
// ============================================
function handleYesClick() {
    // Hide button row
    hide(buttonRow);
    hide(teaseText);
    
    // Update celebration text with names
    yayText.innerHTML = `YAAAY!! <span class="emoji">💖</span>`;
    celebrateSub.textContent = `${state.toName} said YES to ${state.fromName}! 🥰`;
    loveMessage.textContent = `You just made someone very happy 💖`;
    
    // Show celebration
    celebration.classList.add('active');
    
    // Start the emoji rain!
    startEmojiRain();
    
    // Clean up listeners
    document.removeEventListener('mousemove', handleMouseMove);
}

// ============================================
// Falling Emoji Animation
// ============================================
function startEmojiRain() {
    let spawnCount = 0;
    const maxSpawns = 60;
    
    state.emojiSpawnInterval = setInterval(() => {
        if (spawnCount >= maxSpawns || state.activeEmojis >= CONFIG.maxEmojis) {
            clearInterval(state.emojiSpawnInterval);
            return;
        }
        
        const batchSize = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < batchSize; i++) {
            createFallingEmoji();
            spawnCount++;
        }
    }, CONFIG.spawnRate);
}

function createFallingEmoji() {
    if (state.activeEmojis >= CONFIG.maxEmojis) return;
    
    const emoji = document.createElement('span');
    emoji.className = 'falling-emoji';
    emoji.textContent = CONFIG.emojis[Math.floor(Math.random() * CONFIG.emojis.length)];
    
    const xPos = Math.random() * window.innerWidth;
    const size = CONFIG.emojiSize.min + Math.random() * (CONFIG.emojiSize.max - CONFIG.emojiSize.min);
    const duration = CONFIG.fallDuration.min + Math.random() * (CONFIG.fallDuration.max - CONFIG.fallDuration.min);
    const rotate = Math.random() * 360;
    
    emoji.style.setProperty('--size', `${size}rem`);
    emoji.style.setProperty('--duration', `${duration}s`);
    emoji.style.setProperty('--rotate', `${rotate}deg`);
    emoji.style.left = `${xPos}px`;
    
    fallArea.appendChild(emoji);
    state.activeEmojis++;
    
    setTimeout(() => {
        emoji.remove();
        state.activeEmojis--;
    }, duration * 1000);
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
