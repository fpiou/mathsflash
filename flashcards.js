// Variables globales
let allFlashcards = [];
let sessionCards = [];
let currentCardIndex = 0;
let currentMode = '';
let isFlipped = false;
let sessionStats = {
    cardsStudied: 0,
    newCards: 0,
    ratings: []
};
let intraSessionQueue = []; // File pour les cartes à revoir dans la session
let frontChartInstance = null; // Instance du graphique du recto
let backChartInstance = null; // Instance du graphique du verso

// Configuration SRS v2
const SRS_CONFIG = {
    learningStepsMins: [10, 1440], // 10min, 1 jour
    relearningStepsMins: [10],
    easyIntervalDays: 4,
    goodFirstIntervalDays: 2,
    hardFactor: 1.2,
    easeMin: 1.3,
    easeMax: 2.8,
    easeDelta: {
        again: -0.2,
        hard: -0.15,
        good: 0.0,
        easy: 0.1
    },
    maxIntervalDays: 3650,
    newPerSession: 15,
    maxReviewsPerSession: 60,
    maxTotal: 80,
    debugLogs: true // Mettre à false en production
};

// Mapping des noms de niveaux
const levelNames = {
    '2de': 'Seconde G.T.',
    '1reS': 'Première Spécialité Math.'
};

// Fonction de log pour debug
function debugLog(...args) {
    if (SRS_CONFIG.debugLogs) {
        console.log('[SRS v2]', ...args);
    }
}

// Générer un UID stable pour une flashcard
function generateStableUID() {
    return `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Générer un hash de contenu (pour mapping)
function generateContentHash(card) {
    const content = [
        card.front || '',
        card.back || '',
        card.level || '',
        card.theme || '',
        card.type || ''
    ].join('|');
    
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) + hash) + content.charCodeAt(i);
    }
    return `hash_${Math.abs(hash).toString(36)}`;
}

// Gestionnaire d'UID stables
class UIDManager {
    constructor() {
        this.uidMap = this.loadUIDMap();
    }

    loadUIDMap() {
        try {
            const saved = localStorage.getItem('flashcards_uidMap');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            debugLog('Erreur chargement uidMap:', e);
            return {};
        }
    }

    saveUIDMap() {
        try {
            localStorage.setItem('flashcards_uidMap', JSON.stringify(this.uidMap));
        } catch (e) {
            debugLog('Erreur sauvegarde uidMap:', e);
        }
    }

    getOrCreateUID(card) {
        const hash = generateContentHash(card);
        
        if (!this.uidMap[hash]) {
            this.uidMap[hash] = generateStableUID();
            this.saveUIDMap();
            debugLog(`Nouveau UID créé: ${hash} -> ${this.uidMap[hash]}`);
        }
        
        return this.uidMap[hash];
    }

    // Migration: tenter de retrouver l'ancien ID
    findOldID(card) {
        // L'ancien système utilisait le hash comme ID
        return generateContentHash(card);
    }
}

const uidManager = new UIDManager();

// Fonction pour convertir le Markdown basique en HTML
function convertMarkdown(text) {
    if (!text) return text;
    
    // Protéger les formules mathématiques $...$ et $$...$$ AVANT toute conversion
    const mathPlaceholders = [];
    let counter = 0;
    
    // Sauvegarder les formules $$...$$ (display) - doit être fait en premier
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        const placeholder = `___MATH_DISPLAY_${counter}___`;
        mathPlaceholders.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    // Sauvegarder les formules $...$ (inline)
    text = text.replace(/\$((?:[^$]|\\\$)*?)\$/g, (match) => {
        const placeholder = `___MATH_INLINE_${counter}___`;
        mathPlaceholders.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    // Convertir les sauts de ligne en <br>
    text = text.replace(/\n/g, '<br>');
    
    // Maintenant appliquer les conversions Markdown
    // Gras: **texte** -> <strong>texte</strong>
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italique: *texte* -> <em>texte</em>
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Restaurer les formules mathématiques
    mathPlaceholders.forEach(({ placeholder, content }) => {
        text = text.replace(placeholder, content);
    });
    
    return text;
}

// Fonction pour parser les fonctions mathématiques des graphiques
function parseFunction(fnString) {
    // Remplacer les opérations mathématiques courantes
    fnString = fnString.replace(/Math\./g, 'Math.');
    fnString = fnString.replace(/pi/gi, 'Math.PI');
    
    // Créer une fonction à partir de la chaîne
    return new Function('x', `return ${fnString};`);
}

// Fonction pour dessiner un graphique dans un canvas
function drawGraph(graphData, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Détruire l'instance précédente si elle existe
    if (canvasId === 'front-graph-canvas' && frontChartInstance) {
        frontChartInstance.destroy();
        frontChartInstance = null;
    } else if (canvasId === 'back-graph-canvas' && backChartInstance) {
        backChartInstance.destroy();
        backChartInstance = null;
    }
    
    // Gérer les différents types de graphiques
    if (graphData.type === 'vectors') {
        drawVectorGraph(graphData, canvasId);
        return;
    }
    
    // Générer les datasets pour les fonctions
    const datasets = [];
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    
    if (graphData.functions) {
        // Plusieurs fonctions
        const functionLabels = ['f', 'g', 'h', 'i', 'j'];
        graphData.functions.forEach((func, index) => {
            const step = (graphData.xMax - graphData.xMin) / 100;
            const dataPoints = [];
            
            for (let x = graphData.xMin; x <= graphData.xMax; x += step) {
                dataPoints.push({
                    x: x,
                    y: func(x)
                });
            }
            
            datasets.push({
                label: functionLabels[index] || `Fonction ${index + 1}`,
                data: dataPoints,
                borderColor: colors[index % colors.length],
                backgroundColor: `${colors[index % colors.length]}20`,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            });
        });
    } else if (graphData.function) {
        // Une seule fonction
        const step = (graphData.xMax - graphData.xMin) / 100;
        const dataPoints = [];
        
        for (let x = graphData.xMin; x <= graphData.xMax; x += step) {
            dataPoints.push({
                x: x,
                y: graphData.function(x)
            });
        }
        
        datasets.push({
            label: graphData.label || 'f',
            data: dataPoints,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
        });
    }
    
    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            scales: {
                x: {
                    type: 'linear',
                    min: graphData.xMin,
                    max: graphData.xMax,
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    },
                    ticks: {
                        callback: function(value) {
                            if (Math.abs(value / Math.PI - Math.round(value / Math.PI)) < 0.01) {
                                const piMultiple = Math.round(value / Math.PI);
                                if (piMultiple === 0) return '0';
                                if (piMultiple === 1) return 'π';
                                if (piMultiple === -1) return '-π';
                                return piMultiple + 'π';
                            }
                            return value.toFixed(1);
                        }
                    }
                },
                y: {
                    type: 'linear',
                    min: graphData.yMin,
                    max: graphData.yMax,
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return `(${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)})`;
                        }
                    }
                }
            }
        }
    });
    
    // Stocker l'instance
    if (canvasId === 'front-graph-canvas') {
        frontChartInstance = chartInstance;
    } else if (canvasId === 'back-graph-canvas') {
        backChartInstance = chartInstance;
    }
}

// Fonction pour dessiner un graphique de vecteurs avec Canvas natif
function drawVectorGraph(graphData, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Définir la taille du canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = Math.min(canvas.offsetWidth / 2, 250);
    
    // Calculer les échelles
    const xMin = graphData.xMin || 0;
    const xMax = graphData.xMax || 5;
    const yMin = graphData.yMin || 0;
    const yMax = graphData.yMax || 5;
    
    const padding = 40;
    const scaleX = (canvas.width - 2 * padding) / (xMax - xMin);
    const scaleY = (canvas.height - 2 * padding) / (yMax - yMin);
    
    // Fonction pour convertir coordonnées mathématiques en coordonnées canvas
    const toCanvasX = (x) => padding + (x - xMin) * scaleX;
    const toCanvasY = (y) => canvas.height - padding - (y - yMin) * scaleY;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner la grille
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), padding);
        ctx.lineTo(toCanvasX(x), canvas.height - padding);
        ctx.stroke();
    }
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
        ctx.beginPath();
        ctx.moveTo(padding, toCanvasY(y));
        ctx.lineTo(canvas.width - padding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Dessiner les axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Axe X (si y=0 est visible)
    if (yMin <= 0 && yMax >= 0) {
        ctx.beginPath();
        ctx.moveTo(padding, toCanvasY(0));
        ctx.lineTo(canvas.width - padding, toCanvasY(0));
        ctx.stroke();
    }
    
    // Axe Y (si x=0 est visible)
    if (xMin <= 0 && xMax >= 0) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(0), padding);
        ctx.lineTo(toCanvasX(0), canvas.height - padding);
        ctx.stroke();
    }
    
    // Dessiner les graduations et labels des axes
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
        if (x !== 0) {
            ctx.fillText(x.toString(), toCanvasX(x), canvas.height - padding + 20);
        }
    }
    ctx.textAlign = 'right';
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
        if (y !== 0) {
            ctx.fillText(y.toString(), padding - 10, toCanvasY(y) + 4);
        }
    }
    
    // Dessiner les vecteurs (flèches)
    if (graphData.vectors) {
        graphData.vectors.forEach((vector, index) => {
            const x1 = toCanvasX(vector.from.x);
            const y1 = toCanvasY(vector.from.y);
            const x2 = toCanvasX(vector.to.x);
            const y2 = toCanvasY(vector.to.y);
            
            ctx.strokeStyle = vector.color || '#667eea';
            ctx.fillStyle = vector.color || '#667eea';
            ctx.lineWidth = 3;
            
            // Dessiner la ligne
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Dessiner la pointe de la flèche
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6;
            
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(
                x2 - arrowLength * Math.cos(angle - arrowAngle),
                y2 - arrowLength * Math.sin(angle - arrowAngle)
            );
            ctx.moveTo(x2, y2);
            ctx.lineTo(
                x2 - arrowLength * Math.cos(angle + arrowAngle),
                y2 - arrowLength * Math.sin(angle + arrowAngle)
            );
            ctx.stroke();
            
            // Label du vecteur (au milieu)
            if (vector.label) {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                ctx.fillStyle = vector.color || '#667eea';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(vector.label, midX, midY - 8);
            }
        });
    }
    
    // Dessiner les points
    if (graphData.points) {
        graphData.points.forEach((point) => {
            const x = toCanvasX(point.x);
            const y = toCanvasY(point.y);
            
            // Point
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            // Label du point
            if (point.label) {
                ctx.fillStyle = '#000';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(point.label, x, y - 12);
            }
        });
    }
}


// Système de répétition espacée v2 (Anki-like)
class SRSManager {
    constructor() {
        this.migrateLegacyData();
        this.cardData = this.loadCardData();
    }

    loadCardData() {
        try {
            const saved = localStorage.getItem('flashcardsSRS_v2');
            if (!saved) return { schemaVersion: 2, cards: {} };
            
            const data = JSON.parse(saved);
            if (!data.schemaVersion || data.schemaVersion < 2) {
                debugLog('Schema ancien détecté, migration nécessaire');
                return { schemaVersion: 2, cards: {} };
            }
            return data;
        } catch (e) {
            debugLog('Erreur chargement SRS v2, création nouveau:', e);
            // Backup corrompu
            try {
                const corrupted = localStorage.getItem('flashcardsSRS_v2');
                if (corrupted) {
                    localStorage.setItem(`flashcardsSRS_v2_corrupted_${Date.now()}`, corrupted);
                }
            } catch {}
            return { schemaVersion: 2, cards: {} };
        }
    }

    saveCardData() {
        try {
            localStorage.setItem('flashcardsSRS_v2', JSON.stringify(this.cardData));
        } catch (e) {
            debugLog('Erreur sauvegarde SRS v2:', e);
        }
    }

    migrateLegacyData() {
        try {
            const legacy = localStorage.getItem('flashcardsSRS');
            if (!legacy) {
                debugLog('Pas de données legacy à migrer');
                return;
            }

            // Backup avant migration
            const timestamp = Date.now();
            localStorage.setItem(`flashcardsSRS_backup_${timestamp}`, legacy);
            debugLog(`Backup legacy créé: flashcardsSRS_backup_${timestamp}`);

            const legacyData = JSON.parse(legacy);
            const v2Data = { schemaVersion: 2, cards: {} };

            // Migration best-effort
            for (const [oldId, oldCard] of Object.entries(legacyData)) {
                // Essayer de retrouver le UID correspondant
                // On ne peut pas mapper automatiquement, donc on garde l'ancien ID comme UID temporaire
                v2Data.cards[oldId] = {
                    state: oldCard.repetitions > 0 ? 'review' : 'new',
                    due: new Date(oldCard.dueDate).getTime(),
                    lastReview: oldCard.lastReview ? new Date(oldCard.lastReview).getTime() : null,
                    ease: oldCard.easeFactor || 2.5,
                    intervalDays: oldCard.interval || 0,
                    reps: oldCard.repetitions || 0,
                    lapses: 0,
                    stepIndex: 0,
                    suspended: false
                };
            }

            localStorage.setItem('flashcardsSRS_v2', JSON.stringify(v2Data));
            debugLog(`Migration terminée: ${Object.keys(legacyData).length} cartes migrées`);
            
            // Ne pas supprimer l'ancien pour permettre rollback
        } catch (e) {
            debugLog('Erreur migration legacy:', e);
        }
    }

    getCardInfo(uid) {
        if (!this.cardData.cards[uid]) {
            this.cardData.cards[uid] = {
                state: 'new',
                due: Date.now(),
                lastReview: null,
                ease: 2.5,
                intervalDays: 0,
                reps: 0,
                lapses: 0,
                stepIndex: 0,
                suspended: false
            };
        }
        return this.cardData.cards[uid];
    }

    // Fonction pure: calculer le nouvel état après rating
    scheduleCard(state, grade, nowMs) {
        const newState = { ...state };
        const config = SRS_CONFIG;

        // grade: 1=Again, 3=Good, 4=Easy (2=Hard si implémenté)
        
        if (newState.state === 'new' || newState.state === 'learning') {
            if (grade === 1) {
                // Again: recommencer learning
                newState.state = 'learning';
                newState.stepIndex = 0;
                newState.due = nowMs + config.learningStepsMins[0] * 60 * 1000;
                newState.lapses++;
            } else if (grade === 4) {
                // Easy: passer directement en review avec intervalle étendu
                newState.state = 'review';
                newState.intervalDays = config.easyIntervalDays;
                newState.due = nowMs + newState.intervalDays * 24 * 60 * 60 * 1000;
                newState.reps++;
                newState.stepIndex = 0;
                newState.ease = Math.min(config.easeMax, newState.ease + config.easeDelta.easy);
            } else {
                // Good: avancer dans learning steps
                newState.stepIndex = (newState.stepIndex || 0) + 1;
                
                if (newState.stepIndex >= config.learningStepsMins.length) {
                    // Graduation: passer en review
                    newState.state = 'review';
                    newState.intervalDays = config.goodFirstIntervalDays;
                    newState.due = nowMs + newState.intervalDays * 24 * 60 * 60 * 1000;
                    newState.reps++;
                    newState.stepIndex = 0;
                } else {
                    // Continuer learning
                    newState.state = 'learning';
                    newState.due = nowMs + config.learningStepsMins[newState.stepIndex] * 60 * 1000;
                }
            }
        } else if (newState.state === 'review') {
            if (grade === 1) {
                // Again: passer en relearning
                newState.state = 'relearning';
                newState.stepIndex = 0;
                newState.due = nowMs + config.relearningStepsMins[0] * 60 * 1000;
                newState.lapses++;
                newState.ease = Math.max(config.easeMin, newState.ease + config.easeDelta.again);
            } else {
                // Good ou Easy: rester en review avec intervalle calculé
                const easeMod = grade === 4 ? config.easeDelta.easy : config.easeDelta.good;
                newState.ease = Math.max(config.easeMin, Math.min(config.easeMax, newState.ease + easeMod));
                
                if (grade === 4) {
                    newState.intervalDays = Math.min(config.maxIntervalDays, Math.round(newState.intervalDays * newState.ease * 1.3));
                } else {
                    newState.intervalDays = Math.min(config.maxIntervalDays, Math.round(newState.intervalDays * newState.ease));
                }
                
                newState.due = nowMs + newState.intervalDays * 24 * 60 * 60 * 1000;
                newState.reps++;
            }
        } else if (newState.state === 'relearning') {
            if (grade === 1) {
                // Again: recommencer relearning
                newState.stepIndex = 0;
                newState.due = nowMs + config.relearningStepsMins[0] * 60 * 1000;
                newState.lapses++;
            } else {
                // Good ou Easy: avancer dans relearning
                newState.stepIndex = (newState.stepIndex || 0) + 1;
                
                if (newState.stepIndex >= config.relearningStepsMins.length) {
                    // Retour en review avec intervalle réduit
                    newState.state = 'review';
                    newState.intervalDays = Math.max(1, Math.round(newState.intervalDays * 0.5));
                    newState.due = nowMs + newState.intervalDays * 24 * 60 * 60 * 1000;
                    newState.stepIndex = 0;
                    newState.reps++;
                } else {
                    newState.due = nowMs + config.relearningStepsMins[newState.stepIndex] * 60 * 1000;
                }
            }
        }

        newState.lastReview = nowMs;
        return newState;
    }

    // Preview du prochain délai sans modifier l'état
    previewSchedule(state, grade, nowMs) {
        const preview = this.scheduleCard(state, grade, nowMs);
        const delayMs = preview.due - nowMs;
        return this.formatDelay(delayMs);
    }

    formatDelay(delayMs) {
        const mins = Math.round(delayMs / (60 * 1000));
        const hours = Math.round(delayMs / (60 * 60 * 1000));
        const days = Math.round(delayMs / (24 * 60 * 60 * 1000));
        
        if (mins < 1) return '< 1 min';
        if (mins < 60) return `${mins} min`;
        if (hours < 24) return `${hours} h`;
        if (days < 30) return `${days} jours`;
        if (days < 365) return `${Math.round(days / 30)} mois`;
        return `${Math.round(days / 365)} an(s)`;
    }

    updateCard(uid, grade) {
        const nowMs = Date.now();
        const oldState = this.getCardInfo(uid);
        const newState = this.scheduleCard(oldState, grade, nowMs);
        
        this.cardData.cards[uid] = newState;
        this.saveCardData();
        
        debugLog(`Card ${uid} updated:`, {
            grade,
            oldState: `${oldState.state} due:${new Date(oldState.due).toLocaleString()}`,
            newState: `${newState.state} due:${new Date(newState.due).toLocaleString()}`
        });
        
        return newState;
    }

    isDue(uid, nowMs = Date.now()) {
        const card = this.getCardInfo(uid);
        return !card.suspended && card.due <= nowMs;
    }

    getDueCards(allCards, nowMs = Date.now()) {
        return allCards.filter(card => this.isDue(card.uid, nowMs));
    }

    getNewCards(allCards) {
        return allCards.filter(card => {
            const info = this.getCardInfo(card.uid);
            return info.state === 'new';
        });
    }

    getLearningCards(allCards, nowMs = Date.now()) {
        return allCards.filter(card => {
            const info = this.getCardInfo(card.uid);
            return (info.state === 'learning' || info.state === 'relearning') && info.due <= nowMs;
        });
    }

    getReviewCards(allCards, nowMs = Date.now()) {
        return allCards.filter(card => {
            const info = this.getCardInfo(card.uid);
            return info.state === 'review' && info.due <= nowMs;
        });
    }

    getNextReviewTime(grade, uid) {
        const state = this.getCardInfo(uid);
        return this.previewSchedule(state, grade, Date.now());
    }
}

const srsManager = new SRSManager();

// Builder de session avec priorités
function buildSession(filteredCards, mode, limits = {}) {
    const {
        newPerSession = SRS_CONFIG.newPerSession,
        maxReviewsPerSession = SRS_CONFIG.maxReviewsPerSession,
        maxTotal = SRS_CONFIG.maxTotal
    } = limits;
    
    const nowMs = Date.now();
    let session = [];

    if (mode === 'review') {
        // Priorité 1: Learning/Relearning dus
        const learningDue = srsManager.getLearningCards(filteredCards, nowMs);
        session.push(...learningDue);
        
        // Priorité 2: Review dus
        const reviewDue = srsManager.getReviewCards(filteredCards, nowMs);
        session.push(...reviewDue.slice(0, maxReviewsPerSession));
        
        // Priorité 3: Nouvelles (si quota non atteint)
        if (session.length < maxTotal) {
            const newCards = srsManager.getNewCards(filteredCards);
            const newSlots = Math.min(newPerSession, maxTotal - session.length);
            session.push(...newCards.slice(0, newSlots));
        }
    } else if (mode === 'learn') {
        const newCards = srsManager.getNewCards(filteredCards);
        session.push(...newCards.slice(0, Math.min(newPerSession, maxTotal)));
    } else {
        // Mode browse: toutes les cartes
        session = [...filteredCards];
    }

    // Mélange intelligent: éviter 2 cartes consécutives du même theme/type
    if (mode !== 'browse') {
        session = smartShuffle(session);
    }

    debugLog(`Session built: ${session.length} cards`, {
        mode,
        learning: session.filter(c => {
            const s = srsManager.getCardInfo(c.uid).state;
            return s === 'learning' || s === 'relearning';
        }).length,
        review: session.filter(c => srsManager.getCardInfo(c.uid).state === 'review').length,
        new: session.filter(c => srsManager.getCardInfo(c.uid).state === 'new').length
    });

    return session;
}

// Mélange intelligent pour éviter répétitions
function smartShuffle(cards) {
    if (cards.length <= 1) return cards;
    
    // D'abord mélanger aléatoirement
    const shuffled = shuffleArray(cards);
    
    // Ensuite tenter d'éviter répétitions de theme/type
    for (let i = 1; i < shuffled.length; i++) {
        if (shuffled[i].theme === shuffled[i-1].theme && shuffled[i].type === shuffled[i-1].type) {
            // Chercher un meilleur candidat dans les 10 prochaines cartes
            for (let j = i + 1; j < Math.min(i + 10, shuffled.length); j++) {
                if (shuffled[j].theme !== shuffled[i-1].theme || shuffled[j].type !== shuffled[i-1].type) {
                    // Échanger
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    break;
                }
            }
        }
    }
    
    return shuffled;
}

// Mélanger un tableau (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Chargement des données
document.addEventListener('DOMContentLoaded', async () => {
    await loadFlashcards();
    updateReviewCount();
    renderKaTeX();
});

// Charger les flashcards
async function loadFlashcards() {
    try {
        const response = await fetch('flashcards.json');
        const cardsData = await response.json();
        
        // Générer/récupérer les UID stables pour chaque carte et traiter les graphiques
        allFlashcards = cardsData.map(card => {
            const processedCard = { 
                ...card,
                uid: uidManager.getOrCreateUID(card)
            };
            
            // Traiter le graphique du recto si présent
            if (card.frontGraphFunction) {
                if (Array.isArray(card.frontGraphFunction)) {
                    processedCard.frontGraph = {
                        type: 'line',
                        functions: card.frontGraphFunction.map(f => parseFunction(f)),
                        ...card.frontGraphParams
                    };
                } else {
                    processedCard.frontGraph = {
                        type: 'line',
                        function: parseFunction(card.frontGraphFunction),
                        ...card.frontGraphParams
                    };
                }
                delete processedCard.frontGraphFunction;
                delete processedCard.frontGraphParams;
            }
            
            // Traiter les graphiques vectoriels du recto
            if (card.frontGraphData) {
                processedCard.frontGraph = {
                    type: 'vectors',
                    ...card.frontGraphData
                };
                delete processedCard.frontGraphData;
            }
            
            // Traiter le graphique du verso si présent
            if (card.backGraphFunction) {
                if (Array.isArray(card.backGraphFunction)) {
                    processedCard.backGraph = {
                        type: 'line',
                        functions: card.backGraphFunction.map(f => parseFunction(f)),
                        ...card.backGraphParams
                    };
                } else {
                    processedCard.backGraph = {
                        type: 'line',
                        function: parseFunction(card.backGraphFunction),
                        ...card.backGraphParams
                    };
                }
                delete processedCard.backGraphFunction;
                delete processedCard.backGraphParams;
            }
            
            // Traiter les graphiques vectoriels du verso
            if (card.backGraphData) {
                processedCard.backGraph = {
                    type: 'vectors',
                    ...card.backGraphData
                };
                delete processedCard.backGraphData;
            }
            
            return processedCard;
        });
        
        debugLog(`Loaded ${allFlashcards.length} flashcards with UIDs`);
        populateFilters();
    } catch (error) {
        console.error('Erreur lors du chargement des flashcards:', error);
        alert('Erreur lors du chargement des flashcards.');
    }
}

// Peupler les filtres
function populateFilters() {
    const levels = [...new Set(allFlashcards.map(c => c.level))].sort();
    const themes = [...new Set(allFlashcards.map(c => c.theme))].sort();

    const levelSelect = document.getElementById('filter-level');
    const themeSelect = document.getElementById('filter-theme');

    levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = levelNames[level] || level;
        levelSelect.appendChild(option);
    });

    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelect.appendChild(option);
    });
}

// Sélectionner un mode
function selectMode(mode) {
    currentMode = mode;
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('filters-container').style.display = 'block';
}

// Retour au choix du mode
document.getElementById('back-to-mode').addEventListener('click', () => {
    document.getElementById('filters-container').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'block';
});

// Démarrer une session
document.getElementById('start-session').addEventListener('click', () => {
    const levelFilter = document.getElementById('filter-level').value;
    const themeFilter = document.getElementById('filter-theme').value;
    const typeFilter = document.getElementById('filter-type').value;

    let filteredCards = allFlashcards.filter(card => {
        if (levelFilter && card.level !== levelFilter) return false;
        if (themeFilter && card.theme !== themeFilter) return false;
        if (typeFilter && card.type !== typeFilter) return false;
        return true;
    });

    sessionCards = buildSession(filteredCards, currentMode);
    intraSessionQueue = []; // Réinitialiser la file intra-session

    if (sessionCards.length === 0) {
        alert('Aucune carte à étudier avec ces filtres.');
        return;
    }

    currentCardIndex = 0;
    sessionStats = { cardsStudied: 0, newCards: 0, ratings: [] };

    startSession();
});

// Démarrer la session
function startSession() {
    document.getElementById('filters-container').style.display = 'none';
    document.getElementById('flashcard-session').style.display = 'block';
    showCard(0);
}

// Afficher une carte
function showCard(index) {
    const nowMs = Date.now();
    
    // Vérifier d'abord la file intra-session - seulement si la carte est due
    if (intraSessionQueue.length > 0) {
        const nextCard = intraSessionQueue[0]; // Peek sans shift
        const cardInfo = srsManager.getCardInfo(nextCard.uid);
        
        if (cardInfo.due <= nowMs) {
            // La carte est due, la montrer
            intraSessionQueue.shift(); // Maintenant on peut shift
            const cardIndex = sessionCards.findIndex(c => c.uid === nextCard.uid);
            if (cardIndex !== -1) {
                debugLog(`Affichage carte from queue: ${nextCard.uid} (due reached)`);
                showCardByIndex(cardIndex);
                return;
            }
        }
        // Sinon, la carte n'est pas encore due, continuer avec les cartes normales
    }

    if (index >= sessionCards.length) {
        endSession();
        return;
    }

    showCardByIndex(index);
}

function showCardByIndex(index) {
    currentCardIndex = index;
    const card = sessionCards[index];
    const flashcardElement = document.getElementById('flashcard');
    
    // Masquer temporairement la carte pendant le changement
    flashcardElement.style.opacity = '0';
    
    // Réinitialiser immédiatement l'état de retournement sans transition
    flashcardElement.style.transition = 'none';
    flashcardElement.classList.remove('flipped');
    isFlipped = false;
    
    // Forcer un reflow pour appliquer les changements immédiatement
    void flashcardElement.offsetHeight;

    // Mise à jour des compteurs
    document.getElementById('current-card').textContent = index + 1;
    document.getElementById('total-cards').textContent = sessionCards.length;

    // Nettoyer les anciens rendus KaTeX
    const frontContent = document.getElementById('front-content');
    
    // ===== REMPLIR UNIQUEMENT LE RECTO D'ABORD =====
    document.getElementById('card-type').textContent = card.type;
    document.getElementById('card-level').textContent = levelNames[card.level] || card.level;
    document.getElementById('card-theme').textContent = card.theme;
    frontContent.innerHTML = `<div>${convertMarkdown(card.front)}</div>`;

    // Gérer les graphiques du recto
    const frontGraphContainer = document.getElementById('front-graph-container');
    if (card.frontGraph) {
        frontGraphContainer.style.display = 'block';
        drawGraph(card.frontGraph, 'front-graph-canvas');
    } else {
        frontGraphContainer.style.display = 'none';
        if (frontChartInstance) {
            frontChartInstance.destroy();
            frontChartInstance = null;
        }
    }

    // Préparer les boutons selon le mode
    if (currentMode !== 'browse') {
        // Cacher les boutons au recto
        document.getElementById('rating-buttons').style.display = 'none';
        document.getElementById('browse-navigation').style.display = 'none';
        
        // Mettre à jour les temps de révision (preview)
        document.getElementById(`rating-1-time`).textContent = srsManager.getNextReviewTime(1, card.uid);
        document.getElementById(`rating-3-time`).textContent = srsManager.getNextReviewTime(3, card.uid);
        document.getElementById(`rating-4-time`).textContent = srsManager.getNextReviewTime(4, card.uid);
    } else {
        document.getElementById('rating-buttons').style.display = 'none';
        document.getElementById('browse-navigation').style.display = 'flex';
        document.getElementById('browse-prev').disabled = (currentCardIndex === 0);
        document.getElementById('browse-next').disabled = (currentCardIndex === sessionCards.length - 1);
    }

    // Forcer le re-rendu de KaTeX pour le recto et réafficher la carte
    requestAnimationFrame(() => {
        // Réactiver les transitions et réafficher la carte
        setTimeout(() => {
            flashcardElement.style.transition = '';
            flashcardElement.style.opacity = '1';
            
            // ===== MAINTENANT REMPLIR LE VERSO (APRÈS QUE LE RECTO SOIT VISIBLE) =====
            const backContent = document.getElementById('back-content');
            const explanation = document.getElementById('explanation');
            
            document.getElementById('card-type-back').textContent = card.type;
            document.getElementById('card-level-back').textContent = levelNames[card.level] || card.level;
            document.getElementById('card-theme-back').textContent = card.theme;
            backContent.innerHTML = `<div>${convertMarkdown(card.back)}</div>`;
            explanation.innerHTML = card.explanation ? `<strong>💡 Info:</strong> ${convertMarkdown(card.explanation)}` : '';

            // Gérer les graphiques du verso
            const backGraphContainer = document.getElementById('back-graph-container');
            if (card.backGraph) {
                backGraphContainer.style.display = 'block';
                drawGraph(card.backGraph, 'back-graph-canvas');
            } else {
                backGraphContainer.style.display = 'none';
                if (backChartInstance) {
                    backChartInstance.destroy();
                    backChartInstance = null;
                }
            }
            
            // Rendre KaTeX une seule fois pour tout (recto + verso)
            renderKaTeX();
        }, 10);
    });
}

// Retourner la carte
function flipCard() {
    if (!isFlipped) {
        document.getElementById('flashcard').classList.add('flipped');
        isFlipped = true;
        if (currentMode !== 'browse') {
            document.getElementById('rating-buttons').style.display = 'flex';
        }
    } else {
        document.getElementById('flashcard').classList.remove('flipped');
        isFlipped = false;
        if (currentMode !== 'browse') {
            document.getElementById('rating-buttons').style.display = 'none';
        }
    }
}

// Noter une carte
function rateCard(rating) {
    const card = sessionCards[currentCardIndex];
    
    // Si pas retournée, retourner d'abord
    if (!isFlipped) {
        flipCard();
        return; // Attendre que l'utilisateur clique à nouveau
    }
    
    // Traiter immédiatement (pas de setTimeout forcé)
    processRating(card, rating);
}

// Traiter l'évaluation
function processRating(card, rating) {
    const nowMs = Date.now();
    const oldState = srsManager.getCardInfo(card.uid);
    const newState = srsManager.updateCard(card.uid, rating);

    sessionStats.cardsStudied++;
    sessionStats.ratings.push(rating);

    if (oldState.state === 'new' && newState.state !== 'new') {
        sessionStats.newCards++;
    }

    // Si rating = Again (1) et dans learning/relearning, ajouter à la file intra-session
    if (rating === 1 && (newState.state === 'learning' || newState.state === 'relearning')) {
        // Ajouter à la fin de la file si pas déjà présente
        if (!intraSessionQueue.find(c => c.uid === card.uid)) {
            intraSessionQueue.push(card);
            debugLog(`Card ${card.uid} added to intra-session queue (due in ${srsManager.formatDelay(newState.due - nowMs)})`);
        }
    }

    // Passer à la carte suivante
    showCard(currentCardIndex + 1);
}

// Terminer la session
function endSession() {
    document.getElementById('flashcard-session').style.display = 'none';
    document.getElementById('stats-container').style.display = 'block';

    // Calculer les statistiques
    document.getElementById('stat-cards-studied').textContent = sessionStats.cardsStudied;
    document.getElementById('stat-new-cards').textContent = sessionStats.newCards;
    
    if (sessionStats.ratings.length > 0) {
        const avgRating = (sessionStats.ratings.reduce((a, b) => a + b, 0) / sessionStats.ratings.length).toFixed(1);
        document.getElementById('stat-avg-rating').textContent = avgRating;
    } else {
        document.getElementById('stat-avg-rating').textContent = '-';
    }

    updateReviewCount();
    
    debugLog('Session ended:', sessionStats);
}

// Bouton terminer session
document.getElementById('end-session').addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment terminer la session ?')) {
        endSession();
    }
});

// Nouvelle session
document.getElementById('new-session').addEventListener('click', () => {
    document.getElementById('stats-container').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'block';
});

// Mettre à jour le compteur de révisions
function updateReviewCount() {
    const nowMs = Date.now();
    const learningDue = srsManager.getLearningCards(allFlashcards, nowMs).length;
    const reviewDue = srsManager.getReviewCards(allFlashcards, nowMs).length;
    const totalDue = learningDue + reviewDue;
    
    document.getElementById('review-count').textContent = `${totalDue} carte(s)`;
    debugLog(`Review count updated: ${learningDue} learning + ${reviewDue} review = ${totalDue} total`);
}

// Navigation en mode parcourir
function browseNext() {
    if (currentCardIndex < sessionCards.length - 1) {
        showCard(currentCardIndex + 1);
    }
}

function browsePrevious() {
    if (currentCardIndex > 0) {
        showCard(currentCardIndex - 1);
    }
}

// Rendre les formules mathématiques avec KaTeX
function renderKaTeX() {
    if (typeof renderMathInElement !== 'undefined') {
        const elements = [
            document.getElementById('front-content'),
            document.getElementById('back-content'),
            document.getElementById('explanation')
        ].filter(el => el && el.textContent.trim() !== '');
        
        elements.forEach(element => {
            // Nettoyer les anciens spans KaTeX
            const katexElements = element.querySelectorAll('.katex');
            katexElements.forEach(el => {
                const parent = el.parentNode;
                if (parent) {
                    const textNode = document.createTextNode(el.textContent);
                    parent.replaceChild(textNode, el);
                }
            });
            
            // Rendre les nouvelles formules
            renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        });
    }
}
