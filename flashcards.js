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

// Mapping des noms de niveaux
const levelNames = {
    '2de': 'Seconde G.T.',
    '1reS': 'Première Spécialité Math.'
};

// Générer un hash unique basé sur le contenu de la flashcard
function generateFlashcardHash(card) {
    // Utiliser les champs stables de la flashcard pour créer l'ID
    const content = [
        card.front || '',
        card.back || '',
        card.level || '',
        card.theme || '',
        card.type || ''
    ].join('|');
    
    // Hash simple mais suffisant (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) + hash) + content.charCodeAt(i);
    }
    return `fc_${Math.abs(hash).toString(36)}`;
}

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

// Système de répétition espacée (Spaced Repetition System)
class SRSManager {
    constructor() {
        this.cardData = this.loadCardData();
    }

    loadCardData() {
        const saved = localStorage.getItem('flashcardsSRS');
        return saved ? JSON.parse(saved) : {};
    }

    saveCardData() {
        localStorage.setItem('flashcardsSRS', JSON.stringify(this.cardData));
    }

    getCardInfo(cardId) {
        if (!this.cardData[cardId]) {
            this.cardData[cardId] = {
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0,
                dueDate: new Date().toISOString(),
                lastReview: null
            };
        }
        return this.cardData[cardId];
    }

    // Algorithme SM-2 (SuperMemo 2) modifié
    updateCard(cardId, rating) {
        const card = this.getCardInfo(cardId);
        const now = new Date();

        if (rating >= 3) {
            // Réponse correcte
            if (card.repetitions === 0) {
                // Première fois : intervalles différenciés
                if (rating === 4) {
                    card.interval = 7; // Facile: 7 jours
                } else {
                    card.interval = 3; // Correct: 3 jours
                }
            } else if (card.repetitions === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            card.repetitions++;
        } else {
            // Réponse incorrecte
            card.repetitions = 0;
            card.interval = 1; // À revoir: 1 jour
        }

        // Ajuster le facteur de facilité
        card.easeFactor = card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        card.easeFactor = Math.max(1.3, card.easeFactor);

        // Calculer la prochaine date de révision
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + card.interval);
        card.dueDate = dueDate.toISOString();
        card.lastReview = now.toISOString();

        this.saveCardData();
        return card;
    }

    isDue(cardId) {
        const card = this.getCardInfo(cardId);
        const now = new Date();
        const dueDate = new Date(card.dueDate);
        return now >= dueDate;
    }

    getDueCards(allCards) {
        return allCards.filter(card => this.isDue(card.id));
    }

    getNewCards(allCards) {
        return allCards.filter(card => {
            const cardInfo = this.getCardInfo(card.id);
            return cardInfo.repetitions === 0 && !cardInfo.lastReview;
        });
    }

    getNextReviewTime(rating, cardId) {
        const card = this.getCardInfo(cardId);
        let interval;

        if (rating >= 3) {
            if (card.repetitions === 0) {
                // Première fois : intervalles différenciés
                interval = rating === 4 ? 7 : 3;
            } else if (card.repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(card.interval * card.easeFactor);
            }
        } else {
            interval = 1;
        }

        if (interval === 0) return '< 1 min';
        if (interval === 1) return '1 jour';
        if (interval < 30) return `${interval} jours`;
        if (interval < 365) return `${Math.round(interval / 30)} mois`;
        return `${Math.round(interval / 365)} an(s)`;
    }
}

const srsManager = new SRSManager();

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
        
        // Générer les IDs basés sur le contenu pour chaque carte
        allFlashcards = cardsData.map(card => ({
            ...card,
            id: generateFlashcardHash(card)
        }));
        
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

    if (currentMode === 'review') {
        sessionCards = srsManager.getDueCards(filteredCards);
    } else if (currentMode === 'learn') {
        sessionCards = srsManager.getNewCards(filteredCards).slice(0, 20);
    } else {
        sessionCards = filteredCards;
    }

    if (sessionCards.length === 0) {
        alert('Aucune carte à étudier avec ces filtres.');
        return;
    }

    // Mélanger les cartes
    sessionCards = shuffleArray(sessionCards);
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
    if (index >= sessionCards.length) {
        endSession();
        return;
    }

    currentCardIndex = index;
    const card = sessionCards[index];
    isFlipped = false;

    // Réinitialiser la carte
    document.getElementById('flashcard').classList.remove('flipped');

    // Mise à jour des compteurs
    document.getElementById('current-card').textContent = index + 1;
    document.getElementById('total-cards').textContent = sessionCards.length;

    // Nettoyer les anciens rendus KaTeX en réinitialisant le contenu
    const frontContent = document.getElementById('front-content');
    const backContent = document.getElementById('back-content');
    const explanation = document.getElementById('explanation');
    
    // Remplir les informations de la carte (recto)
    document.getElementById('card-type').textContent = card.type;
    document.getElementById('card-level').textContent = levelNames[card.level] || card.level;
    document.getElementById('card-theme').textContent = card.theme;
    frontContent.innerHTML = `<div>${convertMarkdown(card.front)}</div>`;

    // Remplir les informations de la carte (verso)
    document.getElementById('card-type-back').textContent = card.type;
    document.getElementById('card-level-back').textContent = levelNames[card.level] || card.level;
    document.getElementById('card-theme-back').textContent = card.theme;
    backContent.innerHTML = `<div>${convertMarkdown(card.back)}</div>`;
    explanation.innerHTML = card.explanation ? `<strong>💡 Info:</strong> ${convertMarkdown(card.explanation)}` : '';

    // Préparer les boutons selon le mode
    if (currentMode !== 'browse') {
        // Cacher les boutons au recto, ils seront affichés au verso
        document.getElementById('rating-buttons').style.display = 'none';
        document.getElementById('browse-navigation').style.display = 'none';
        // Mettre à jour les temps de révision
        document.getElementById(`rating-1-time`).textContent = srsManager.getNextReviewTime(1, card.id);
        document.getElementById(`rating-3-time`).textContent = srsManager.getNextReviewTime(3, card.id);
        document.getElementById(`rating-4-time`).textContent = srsManager.getNextReviewTime(4, card.id);
    } else {
        document.getElementById('rating-buttons').style.display = 'none';
        document.getElementById('browse-navigation').style.display = 'flex';
        // Mettre à jour l'état des boutons de navigation
        document.getElementById('browse-prev').disabled = (currentCardIndex === 0);
        document.getElementById('browse-next').disabled = (currentCardIndex === sessionCards.length - 1);
    }

    // Forcer le re-rendu de KaTeX après mise à jour du DOM
    requestAnimationFrame(() => {
        renderKaTeX();
    });
}

// Retourner la carte
function flipCard() {
    if (!isFlipped) {
        document.getElementById('flashcard').classList.add('flipped');
        isFlipped = true;
        // Afficher les boutons de notation au verso (sauf en mode parcourir)
        if (currentMode !== 'browse') {
            document.getElementById('rating-buttons').style.display = 'flex';
        }
    } else {
        // Revenir au recto
        document.getElementById('flashcard').classList.remove('flipped');
        isFlipped = false;
        // Cacher les boutons de notation au recto (sauf en mode parcourir)
        if (currentMode !== 'browse') {
            document.getElementById('rating-buttons').style.display = 'none';
        }
    }
}

// Noter une carte
function rateCard(rating) {
    const card = sessionCards[currentCardIndex];
    
    // Si la carte n'est pas encore retournée, la retourner d'abord
    if (!isFlipped) {
        flipCard();
        // Attendre que l'utilisateur voie la réponse avant de passer à la suivante
        setTimeout(() => {
            processRating(card, rating);
        }, 2000); // 2 secondes pour voir la réponse
    } else {
        processRating(card, rating);
    }
}

// Traiter l'évaluation et passer à la carte suivante
function processRating(card, rating) {
    srsManager.updateCard(card.id, rating);

    sessionStats.cardsStudied++;
    sessionStats.ratings.push(rating);

    const cardInfo = srsManager.getCardInfo(card.id);
    if (cardInfo.repetitions === 1) {
        sessionStats.newCards++;
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
    const dueCards = srsManager.getDueCards(allFlashcards);
    document.getElementById('review-count').textContent = `${dueCards.length} carte(s)`;
}

// Mélanger un tableau
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
                // Remplacer le span KaTeX par son contenu original
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
