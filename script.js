/**
 * Valentine's Day Interactive Page
 * ================================
 * Two modes:
 * 1. CREATE MODE: Generate personalized Valentine links with optional Quiz
 * 2. QUIZ MODE: Answer questions before seeing the proposal
 * 3. VALENTINE MODE: The big question (NO dodges, YES celebrates!)
 */

// ============================================
// DOM Elements
// ============================================
const createScreen = document.getElementById('createScreen');
const quizScreen = document.getElementById('quizScreen');
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
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionsContainer = document.getElementById('questionsContainer');

// Quiz screen elements
const quizTitle = document.getElementById('quizTitle');
const questionText = document.getElementById('questionText');
const quizAnswerInput = document.getElementById('quizAnswerInput');
const hintContainer = document.getElementById('hintContainer');
const hintText = document.getElementById('hintText');
const submitQuizBtn = document.getElementById('submitQuizBtn');
const showHintBtn = document.getElementById('showHintBtn');
const quizFeedback = document.getElementById('quizFeedback');
const progressIndicator = document.getElementById('progressIndicator');

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
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function safeName(x) {
    if (!x) return '';
    return x.toString().trim().slice(0, 30);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Base64URL Encoding/Decoding
function encodePayload(payload) {
    try {
        const jsonStr = JSON.stringify(payload);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        console.error('Encoding error:', e);
        return null;
    }
}

function decodePayload(str) {
    try {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Decoding error:', e);
        return null;
    }
}

// ============================================
// Configuration
// ============================================
const CONFIG = {
    dodgeThreshold: 120,
    dodgePadding: 20,
    dodgeDebounce: 100,
    tapMessages: ['No', 'Are you sure?', 'Really? 🤔', 'Come on! 😅', 'Nope! 😂', 'Nice try 😏', 'Not happening 🙅', 'Think again 💭', 'Wrong answer! ❌', 'Try the other button 👆', 'Still no? 🥺', 'Please? 🥹', 'Pretty please? 💕', '👀'],
    emojis: ['💖', '🌹', '😘', '💘', '🌸', '❤️', '💕', '💗', '💝', '✨'],
    maxEmojis: 80,
    spawnRate: 100,
    fallDuration: { min: 3, max: 6 },
    emojiSize: { min: 1, max: 2.5 },
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
    mode: 'create', // create, quiz, valentine
    quizData: null,
    currentQuestionIndex: 0,
    fromName: '',
    toName: ''
};

// ============================================
// Initialization
// ============================================
function initApp() {
    detectHoverDevice();
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    const fromParam = params.get('from');
    const toParam = params.get('to');

    if (dataParam) {
        const payload = decodePayload(dataParam);
        if (payload) {
            state.fromName = safeName(payload.from) || 'Someone';
            state.toName = safeName(payload.to) || 'you';
            state.quizData = payload.quiz || [];
            
            if (state.quizData.length > 0) {
                initQuizMode();
            } else {
                initValentineMode();
            }
        } else {
            console.error('Invalid payload');
            initCreateMode();
        }
    } else if (fromParam || toParam) {
        state.fromName = safeName(fromParam) || 'Someone';
        state.toName = safeName(toParam) || 'you';
        initValentineMode();
    } else {
        initCreateMode();
    }
}

// ============================================
// CREATE MODE
// ============================================
function initCreateMode() {
    state.mode = 'create';
    show(createScreen);
    hide(quizScreen);
    hide(viewerScreen);
    
    addQuestionBtn.addEventListener('click', addQuestionInput);
    makeLinkBtn.addEventListener('click', generateLink);
    copyBtn.addEventListener('click', copyLink);
    
    // Allow Enter key to generate link in name fields
    toInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateLink();
    });
}

function addQuestionInput() {
    const questionCount = questionsContainer.children.length;
    if (questionCount >= 5) {
        alert("Max 5 questions allowed! Keeps it fun 😉");
        return;
    }

    const div = document.createElement('div');
    div.className = 'question-block';
    div.innerHTML = `
        <h3>Question ${questionCount + 1}</h3>
        <button class="remove-question-btn" type="button" onclick="this.parentElement.remove()">×</button>
        <div class="form-group">
            <input type="text" class="input-field q-input" placeholder="e.g. Where did we meet?" maxlength="80">
        </div>
        <div class="form-group">
            <input type="text" class="input-field a-input" placeholder="Answer (e.g. Coffee shop)" maxlength="40">
        </div>
        <div class="form-group">
            <input type="text" class="input-field h-input" placeholder="Hint (optional)" maxlength="60">
        </div>
    `;
    questionsContainer.appendChild(div);
}

function generateLink() {
    const fromName = safeName(fromInput.value);
    const toName = safeName(toInput.value);
    
    if (!fromName || !toName) {
        if (!fromName) highlightError(fromInput);
        if (!toName) highlightError(toInput);
        return;
    }

    // Gather quiz data
    const questionBlocks = document.querySelectorAll('.question-block');
    const quiz = [];
    
    let isValid = true;
    questionBlocks.forEach(block => {
        const q = block.querySelector('.q-input').value.trim();
        const a = block.querySelector('.a-input').value.trim();
        const h = block.querySelector('.h-input').value.trim();
        
        if (!q || !a) {
            isValid = false;
            block.style.border = '2px solid var(--red-love)';
        } else {
            quiz.push({ q, a, h });
            block.style.border = '1px solid var(--pink-light)';
        }
    });

    if (!isValid) {
        alert("Please fill in all questions and answers!");
        return;
    }

    const payload = { from: fromName, to: toName, quiz };
    const encoded = encodePayload(payload);
    
    if (!encoded) {
        alert("Error generating link. Try simpler text.");
        return;
    }

    const link = `${location.origin}${location.pathname}?data=${encoded}`;
    shareLink.value = link;
    show(linkBox);
    shareLink.focus();
    shareLink.select();
}

function highlightError(el) {
    el.style.animation = 'shake 0.5s ease';
    el.style.borderColor = 'var(--red-love)';
    setTimeout(() => {
        el.style.animation = '';
        el.style.borderColor = '';
    }, 500);
}

// ============================================
// QUIZ MODE
// ============================================
function initQuizMode() {
    state.mode = 'quiz';
    hide(createScreen);
    show(quizScreen);
    hide(viewerScreen);
    
    state.currentQuestionIndex = 0;
    renderQuizQuestion(0);
    
    submitQuizBtn.addEventListener('click', checkAnswer);
    showHintBtn.addEventListener('click', revealHint);
    
    quizAnswerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
}

function renderQuizQuestion(index) {
    const q = state.quizData[index];
    const total = state.quizData.length;
    
    quizTitle.textContent = `Question ${index + 1}/${total}`;
    questionText.textContent = q.q;
    quizAnswerInput.value = '';
    quizAnswerInput.focus();
    
    // Reset UI state
    hide(hintContainer);
    quizFeedback.textContent = '';
    quizFeedback.className = 'quiz-feedback';
    
    // Handle Hint Button
    if (q.h) {
        show(showHintBtn);
        hintText.textContent = q.h;
    } else {
        hide(showHintBtn);
    }
    
    // Update Progress Indicator
    progressIndicator.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = `progress-dot ${i === index ? 'active' : ''} ${i < index ? 'completed' : ''}`;
        progressIndicator.appendChild(dot);
    }
}

function normalizeAnswer(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function checkAnswer() {
    const userAnswer = normalizeAnswer(quizAnswerInput.value);
    const expectedAnswer = normalizeAnswer(state.quizData[state.currentQuestionIndex].a);
    
    if (!userAnswer) return;

    if (userAnswer === expectedAnswer) {
        // Correct!
        quizFeedback.textContent = "Correct! 🎉";
        quizFeedback.className = "quiz-feedback success";
        quizAnswerInput.style.borderColor = "#4CAF50";
        
        setTimeout(() => {
            if (state.currentQuestionIndex < state.quizData.length - 1) {
                state.currentQuestionIndex++;
                renderQuizQuestion(state.currentQuestionIndex);
                quizAnswerInput.style.borderColor = "";
            } else {
                finishQuiz();
            }
        }, 1000);
    } else {
        // Incorrect
        const wrongMessages = ["Not quite! 😅", "Try again! 🤔", "Close, but no!", "Think harder! 🧠"];
        quizFeedback.textContent = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
        quizFeedback.className = "quiz-feedback error";
        quizAnswerInput.style.animation = "shake 0.4s ease";
        quizAnswerInput.style.borderColor = "var(--red-love)";
        
        setTimeout(() => {
            quizAnswerInput.style.animation = "";
        }, 400);
    }
}

function revealHint() {
    show(hintContainer);
    hide(showHintBtn);
}

function finishQuiz() {
    // Transition to Valentine Screen
    quizScreen.style.opacity = '0';
    setTimeout(() => {
        hide(quizScreen);
        initValentineMode();
    }, 500);
}

// ============================================
// VALENTINE MODE
// ============================================
function initValentineMode() {
    state.mode = 'valentine';
    hide(createScreen);
    hide(quizScreen);
    show(viewerScreen);
    viewerScreen.style.opacity = '0';
    
    // Animate transition
    setTimeout(() => {
        viewerScreen.style.animation = 'fadeInUp 0.8s ease forwards';
        viewerScreen.style.opacity = '1';
    }, 100);
    
    titleText.innerHTML = `Hey ${escapeHtml(state.toName)} <span class="emoji">👀</span>`;
    subText.textContent = `${state.fromName} is asking: Will you be my Valentine?`;
    
    if (detectHoverDevice()) {
        initDesktopDodge();
    } else {
        initMobileTap();
    }
    
    yesBtn.addEventListener('click', handleYesClick);
}

// Copy link function
async function copyLink() {
    const link = shareLink.value;
    try {
        await navigator.clipboard.writeText(link);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied! ✅';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    } catch (err) {
        prompt('Copy this link:', link);
    }
}

// Helper for hover detection
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
    if (state.mode !== 'valentine') return;
    
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
    "The universe wants you to say YES ✨"
];

function showTeaseText() {
    const randomMessage = teaseMessages[Math.floor(Math.random() * teaseMessages.length)];
    teaseText.textContent = randomMessage;
    teaseText.classList.add('visible');
    setTimeout(() => teaseText.classList.remove('visible'), 2500);
}

// ============================================
// YES Button - Celebration
// ============================================
function handleYesClick() {
    // Hide button row
    hide(buttonRow);
    hide(teaseText);
    
    // Update celebration text with names
    yayText.textContent = 'YAAAY!! 💖';
    celebrateSub.textContent = `${state.toName} said YES to ${state.fromName}! 🥰`;
    loveMessage.textContent = `${state.fromName}, your heart just got happier! 💘`;
    
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
