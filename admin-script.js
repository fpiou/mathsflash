// Variables globales
let allQuestions = [];
let filteredQuestions = [];

// Mapping des noms de niveaux
const levelNames = {
    '2de': 'Seconde G.T.',
    '1reS': 'Première Spécialité Mathématiques'
};

// Fonction pour échapper les caractères HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chargement des données au démarrage
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    initializeInterface();
    setupEventListeners();
});

// Charger les questions depuis le fichier JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        // Le JSON contient directement un tableau de questions
        allQuestions = Array.isArray(data) ? data : [];
        filteredQuestions = [...allQuestions];
    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        alert('Erreur lors du chargement des questions. Vérifiez que questions.json est accessible.');
    }
}

// Initialiser l'interface
function initializeInterface() {
    updateGlobalStats();
    populateFilters();
    updateDetailedStats();
    displayQuestions();
}

// Mettre à jour les statistiques globales
function updateGlobalStats() {
    const levels = new Set(allQuestions.map(q => q.level));
    const themes = new Set(allQuestions.map(q => q.theme));
    const competences = new Set(allQuestions.map(q => q.competence));

    document.getElementById('total-questions').textContent = allQuestions.length;
    document.getElementById('total-levels').textContent = levels.size;
    document.getElementById('total-themes').textContent = themes.size;
    document.getElementById('total-competences').textContent = competences.size;
}

// Peupler les filtres
function populateFilters() {
    const levels = [...new Set(allQuestions.map(q => q.level))].sort();
    const themes = [...new Set(allQuestions.map(q => q.theme))].sort();
    const competences = [...new Set(allQuestions.map(q => q.competence))].sort();

    const levelSelect = document.getElementById('filter-level');
    const themeSelect = document.getElementById('filter-theme');
    const competenceSelect = document.getElementById('filter-competence');

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

    competences.forEach(competence => {
        const option = document.createElement('option');
        option.value = competence;
        option.textContent = competence;
        competenceSelect.appendChild(option);
    });
}

// Mettre à jour les statistiques détaillées
function updateDetailedStats() {
    updateLevelStats();
    updateThemeStats();
    updateCompetenceStats();
}

// Statistiques par niveau
function updateLevelStats() {
    const stats = {};
    allQuestions.forEach(q => {
        stats[q.level] = (stats[q.level] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(stats));
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Niveau</th>
                    <th>Nombre de questions</th>
                    <th>Répartition</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([level, count]) => `
                    <tr>
                        <td><strong>${escapeHtml(levelNames[level] || level)}</strong></td>
                        <td><span class="count">${count}</span></td>
                        <td>
                            <div class="bar-container">
                                <div class="bar" style="width: ${(count / maxCount * 100)}%"></div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('level-stats').innerHTML = html;
}

// Statistiques par thème
function updateThemeStats() {
    const stats = {};
    allQuestions.forEach(q => {
        stats[q.theme] = (stats[q.theme] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(stats));
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Thème</th>
                    <th>Nombre de questions</th>
                    <th>Répartition</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([theme, count]) => `
                    <tr>
                        <td><strong>${escapeHtml(theme)}</strong></td>
                        <td><span class="count">${count}</span></td>
                        <td>
                            <div class="bar-container">
                                <div class="bar" style="width: ${(count / maxCount * 100)}%"></div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('theme-stats').innerHTML = html;
}

// Statistiques par compétence
function updateCompetenceStats() {
    const stats = {};
    allQuestions.forEach(q => {
        stats[q.competence] = (stats[q.competence] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(stats));
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Compétence</th>
                    <th>Nombre de questions</th>
                    <th>Répartition</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([competence, count]) => `
                    <tr>
                        <td><strong>${escapeHtml(competence)}</strong></td>
                        <td><span class="count">${count}</span></td>
                        <td>
                            <div class="bar-container">
                                <div class="bar" style="width: ${(count / maxCount * 100)}%"></div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('competence-stats').innerHTML = html;
}

// Afficher les questions
function displayQuestions() {
    const container = document.getElementById('questions-list');
    document.getElementById('filtered-count').textContent = filteredQuestions.length;

    if (filteredQuestions.length === 0) {
        container.innerHTML = '<div class="empty-message">Aucune question ne correspond aux filtres sélectionnés.</div>';
        return;
    }

    const html = filteredQuestions.map((q, index) => `
        <div class="question-card" data-index="${index}">
            <div class="question-header">
                <div class="question-id">Question #${index + 1}</div>
                <div class="question-badges">
                    <span class="badge badge-level">${escapeHtml(levelNames[q.level] || q.level)}</span>
                    <span class="badge badge-theme">${escapeHtml(q.theme)}</span>
                    <span class="badge badge-competence">${escapeHtml(q.competence)}</span>
                </div>
            </div>
            <div class="question-text">
                ${escapeHtml(q.question)}
                ${q.formula ? `<div class="question-formula">$${q.formula}$</div>` : ''}
            </div>
            <button class="question-expand" onclick="toggleQuestionDetails(${index})">
                Voir les détails ▼
            </button>
            <div class="question-full-details" id="details-${index}">
                <h4>Choix de réponses:</h4>
                <ul class="choices">
                    ${q.answers.map((answer, i) => `
                        <li class="${answer.correct ? 'correct' : ''}">
                            ${answer.text || ''}${answer.formula ? `$${answer.formula}$` : ''} ${answer.correct ? '✓ Bonne réponse' : ''}
                        </li>
                    `).join('')}
                </ul>
                ${q.explanation ? `
                    <div class="explanation">
                        <h4>Explication:</h4>
                        <p>${q.explanation}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
    renderKaTeX();
}

// Basculer l'affichage des détails d'une question
function toggleQuestionDetails(index) {
    const details = document.getElementById(`details-${index}`);
    const button = details.previousElementSibling;
    
    if (details.classList.contains('show')) {
        details.classList.remove('show');
        button.textContent = 'Voir les détails ▼';
    } else {
        details.classList.add('show');
        button.textContent = 'Masquer les détails ▲';
        renderKaTeX();
    }
}

// Appliquer les filtres
function applyFilters() {
    const levelFilter = document.getElementById('filter-level').value;
    const themeFilter = document.getElementById('filter-theme').value;
    const competenceFilter = document.getElementById('filter-competence').value;
    const searchFilter = document.getElementById('filter-search').value.toLowerCase();

    filteredQuestions = allQuestions.filter(q => {
        if (levelFilter && q.level !== levelFilter) return false;
        if (themeFilter && q.theme !== themeFilter) return false;
        if (competenceFilter && q.competence !== competenceFilter) return false;
        if (searchFilter) {
            const answersText = q.answers.map(a => (a.text || '') + (a.formula || '')).join(' ');
            const searchText = `${q.question} ${q.formula || ''} ${answersText} ${q.explanation || ''}`.toLowerCase();
            if (!searchText.includes(searchFilter)) return false;
        }
        return true;
    });

    displayQuestions();
    
    // Faire défiler vers les résultats
    document.querySelector('.questions-list-container').scrollIntoView({ behavior: 'smooth' });
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('filter-level').value = '';
    document.getElementById('filter-theme').value = '';
    document.getElementById('filter-competence').value = '';
    document.getElementById('filter-search').value = '';
    filteredQuestions = [...allQuestions];
    displayQuestions();
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Filtres
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Appliquer les filtres en appuyant sur Entrée dans la recherche
    document.getElementById('filter-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });

    // Onglets des statistiques
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Retirer la classe active de tous les boutons et contenus
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Ajouter la classe active au bouton et contenu sélectionnés
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Rendre les formules mathématiques avec KaTeX
function renderKaTeX() {
    if (typeof renderMathInElement !== 'undefined') {
        setTimeout(() => {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }, 100);
    }
}
