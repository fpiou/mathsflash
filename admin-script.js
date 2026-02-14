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
    initializeSandbox();
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

// Mettre à jour les thèmes disponibles selon le niveau sélectionné
function updateThemeFilter() {
    const levelFilter = document.getElementById('filter-level').value;
    const themeSelect = document.getElementById('filter-theme');
    
    // Filtrer les questions selon le niveau
    const questionsToFilter = levelFilter 
        ? allQuestions.filter(q => q.level === levelFilter)
        : allQuestions;
    
    // Obtenir les thèmes disponibles
    const themes = [...new Set(questionsToFilter.map(q => q.theme))].sort();
    
    // Sauvegarder la valeur actuelle
    const currentValue = themeSelect.value;
    
    // Vider et repeupler le select
    themeSelect.innerHTML = '<option value="">Tous les thèmes</option>';
    
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelect.appendChild(option);
    });
    
    // Restaurer la valeur si elle existe encore
    if (currentValue && themes.includes(currentValue)) {
        themeSelect.value = currentValue;
    }
    
    // Mettre à jour les compétences car le niveau a changé
    updateCompetenceFilter();
}

// Mettre à jour les compétences disponibles selon le niveau et thème sélectionnés
function updateCompetenceFilter() {
    const levelFilter = document.getElementById('filter-level').value;
    const themeFilter = document.getElementById('filter-theme').value;
    const competenceSelect = document.getElementById('filter-competence');
    
    // Filtrer les questions selon niveau et thème
    let questionsToFilter = allQuestions;
    if (levelFilter) {
        questionsToFilter = questionsToFilter.filter(q => q.level === levelFilter);
    }
    if (themeFilter) {
        questionsToFilter = questionsToFilter.filter(q => q.theme === themeFilter);
    }
    
    // Obtenir les compétences disponibles
    const competences = [...new Set(questionsToFilter.map(q => q.competence))].sort();
    
    // Sauvegarder la valeur actuelle
    const currentValue = competenceSelect.value;
    
    // Vider et repeupler le select
    competenceSelect.innerHTML = '<option value="">Toutes les compétences</option>';
    
    competences.forEach(competence => {
        const option = document.createElement('option');
        option.value = competence;
        option.textContent = competence;
        competenceSelect.appendChild(option);
    });
    
    // Restaurer la valeur si elle existe encore
    if (currentValue && competences.includes(currentValue)) {
        competenceSelect.value = currentValue;
    }
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

    const html = filteredQuestions.map((q, index) => {
        // Trouver l'index original dans allQuestions
        const originalIndex = allQuestions.indexOf(q);
        const jsonLine = `Ligne ~${originalIndex * 14 + 2}`; // Estimation de la ligne dans JSON (14 lignes par question en moyenne)
        
        return `
        <div class="question-card" data-index="${index}" data-original-index="${originalIndex}">
            <div class="question-header">
                <div class="question-id-group">
                    <div class="question-id">Question #${index + 1}</div>
                    <div class="json-location">
                        <span class="json-index" title="Index dans questions.json (${jsonLine})">JSON[${originalIndex}]</span>
                        <button class="copy-search-btn" onclick="copySearchString(${originalIndex}, event)" title="Copier une recherche pour retrouver cette question">
                            📋
                        </button>
                    </div>
                </div>
                <div class="question-badges">
                    <span class="badge badge-level">${escapeHtml(levelNames[q.level] || q.level)}</span>
                    <span class="badge badge-theme">${escapeHtml(q.theme)}</span>
                    <span class="badge badge-competence">${escapeHtml(q.competence)}</span>
                </div>
            </div>
            <div class="question-text">
                ${escapeHtml(q.question)}
                ${q.formula ? `<div class="question-formula">$${q.formula}$</div>` : ''}
                ${q.graphFunction ? `<div class="graph-container"><canvas id="graph-${index}" width="400" height="200"></canvas></div>` : ''}
            </div>
            <button class="question-expand" onclick="toggleQuestionDetails(${index})">
                Voir les détails ▼
            </button>
            <div class="question-full-details" id="details-${index}">
                <h4>Choix de réponses:</h4>
                <ul class="choices">
                    ${q.answers.map((answer, i) => {
                        const hasGraph = answer.graphFunction;
                        return `
                        <li class="${answer.correct ? 'correct' : ''}">
                            ${answer.text || ''}${answer.formula ? `$${answer.formula}$` : ''}
                            ${hasGraph ? `<div class="answer-graph"><canvas id="graph-${index}-answer-${i}" width="300" height="150"></canvas></div>` : ''}
                            ${answer.correct ? '✓ Bonne réponse' : ''}
                        </li>
                    `}).join('')}
                </ul>
                ${q.explanation ? `
                    <div class="explanation">
                        <h4>Explication:</h4>
                        <p>${q.explanation}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');

    container.innerHTML = html;
    renderKaTeX();
    renderGraphs();
}

// Copier une chaîne de recherche pour retrouver la question dans questions.json
function copySearchString(originalIndex, event) {
    const question = allQuestions[originalIndex];
    
    // Créer une chaîne de recherche unique basée sur la question complète
    const searchString = `"question": "${question.question}"`;
    
    // Copier dans le presse-papier
    navigator.clipboard.writeText(searchString).then(() => {
        // Afficher un feedback visuel
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
        
        // Afficher un message
        console.log(`Recherche copiée pour la question JSON[${originalIndex}]`);
        alert(`Chaîne de recherche copiée !\n\nUtilisez Ctrl+F dans questions.json et collez pour trouver:\nIndex JSON: ${originalIndex}\n\nLa question complète a été copiée dans le presse-papier.`);
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        alert(`Impossible de copier. Recherchez manuellement:\n"${searchString}"`);
    });
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
        // Re-render les graphiques des réponses quand on ouvre les détails
        const question = filteredQuestions[index];
        question.answers.forEach((answer, i) => {
            if (answer.graphFunction) {
                const canvas = document.getElementById(`graph-${index}-answer-${i}`);
                if (canvas && !canvas.dataset.rendered) {
                    const graphData = prepareGraphData(answer.graphFunction, answer.graphParams);
                    drawGraph(canvas, graphData);
                    canvas.dataset.rendered = 'true';
                }
            }
        });
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
    
    // Mise à jour en cascade des filtres
    document.getElementById('filter-level').addEventListener('change', () => {
        updateThemeFilter();
    });
    
    document.getElementById('filter-theme').addEventListener('change', () => {
        updateCompetenceFilter();
    });
    
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
        }, 10);
    }
}

// Rendre les graphiques avec Chart.js
function renderGraphs() {
    filteredQuestions.forEach((q, index) => {
        // Graphique de la question
        if (q.graphFunction) {
            const canvas = document.getElementById(`graph-${index}`);
            if (canvas) {
                const graphData = prepareGraphData(q.graphFunction, q.graphParams);
                drawGraph(canvas, graphData);
            }
        }
        
        // Graphiques dans les réponses
        q.answers.forEach((answer, i) => {
            if (answer.graphFunction) {
                const canvas = document.getElementById(`graph-${index}-answer-${i}`);
                if (canvas) {
                    const graphData = prepareGraphData(answer.graphFunction, answer.graphParams);
                    drawGraph(canvas, graphData);
                }
            }
        });
    });
}

// Préparer les données du graphique
function prepareGraphData(functionString, params) {
    const parseFunction = (funcString) => new Function('x', `return ${funcString}`);
    
    // Gérer le cas où c'est un tableau de fonctions
    if (Array.isArray(functionString)) {
        return {
            type: 'line',
            functions: functionString.map(f => parseFunction(f)),
            xMin: params?.xMin ?? -10,
            xMax: params?.xMax ?? 10,
            yMin: params?.yMin ?? -10,
            yMax: params?.yMax ?? 10,
            label: params?.label ?? 'f(x)'
        };
    } else {
        return {
            type: 'line',
            function: parseFunction(functionString),
            xMin: params?.xMin ?? -10,
            xMax: params?.xMax ?? 10,
            yMin: params?.yMin ?? -10,
            yMax: params?.yMax ?? 10,
            label: params?.label ?? 'f(x)'
        };
    }
}

// Dessiner un graphique avec Chart.js (même logique que script.js)
function drawGraph(canvas, graphData) {
    if (!canvas || !graphData) return;
    
    const ctx = canvas.getContext('2d');
    
    // Générer les datasets (un ou plusieurs selon si functions ou function)
    const datasets = [];
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    
    if (graphData.functions) {
        // Plusieurs fonctions
        const functionLabels = ['f', 'g', 'h', 'i', 'j'];
        graphData.functions.forEach((func, index) => {
            const step = (graphData.xMax - graphData.xMin) / 100;
            const dataPoints = [];
            
            for (let x = graphData.xMin; x <= graphData.xMax; x += step) {
                try {
                    const y = func(x);
                    if (isFinite(y)) {
                        dataPoints.push({ x: x, y: y });
                    }
                } catch (e) {
                    // Ignorer les erreurs de calcul
                }
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
    } else {
        // Une seule fonction
        const step = (graphData.xMax - graphData.xMin) / 100;
        const dataPoints = [];
        
        for (let x = graphData.xMin; x <= graphData.xMax; x += step) {
            try {
                const y = graphData.function(x);
                if (isFinite(y)) {
                    dataPoints.push({ x: x, y: y });
                }
            } catch (e) {
                // Ignorer les erreurs de calcul
            }
        }
        
        datasets.push({
            label: graphData.label,
            data: dataPoints,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
        });
    }
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            scales: {
                x: {
                    type: 'linear',
                    position: {y: 0},
                    min: graphData.xMin,
                    max: graphData.xMax,
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1,
                        drawOnChartArea: true
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
                    position: {x: 0},
                    min: graphData.yMin,
                    max: graphData.yMax,
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1,
                        drawOnChartArea: true
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
}

// ==============================
// BAC À SABLE
// ==============================

let sandboxQuestions = [];
let currentSandboxIndex = 0;

function initializeSandbox() {
    // Toggle affichage du bac à sable
    document.getElementById('toggle-sandbox').addEventListener('click', () => {
        const content = document.getElementById('sandbox-content');
        if (content.style.display === 'none') {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });

    // Boutons d'action
    document.getElementById('parse-json').addEventListener('click', parseAndDisplayQuestions);
    document.getElementById('clear-sandbox').addEventListener('click', clearSandbox);
    
    // Navigation
    document.getElementById('prev-sandbox-question').addEventListener('click', () => navigateSandbox(-1));
    document.getElementById('next-sandbox-question').addEventListener('click', () => navigateSandbox(1));
}

function parseAndDisplayQuestions() {
    let jsonInput = document.getElementById('sandbox-json-input').value.trim();
    const errorDiv = document.getElementById('json-error');
    const questionsDiv = document.getElementById('sandbox-questions');
    
    // Masquer les erreurs précédentes
    errorDiv.style.display = 'none';
    errorDiv.innerHTML = '';
    
    if (!jsonInput) {
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = '<strong>Erreur:</strong> Veuillez coller du code JSON.';
        return;
    }
    
    try {
        // Si le JSON commence par { et ne commence pas par [, on ajoute les crochets automatiquement
        if (jsonInput.trim().startsWith('{') && !jsonInput.trim().startsWith('[')) {
            // Enlever la virgule finale si elle existe (cas où on copie plusieurs objets)
            jsonInput = jsonInput.trim();
            if (jsonInput.endsWith(',')) {
                jsonInput = jsonInput.slice(0, -1);
            }
            // Entourer de crochets
            jsonInput = '[' + jsonInput + ']';
        }
        
        // Parser le JSON
        let parsed = JSON.parse(jsonInput);
        
        // Si c'est un objet unique, le mettre dans un tableau
        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }
        
        // Valider que ce sont bien des questions
        if (parsed.length === 0) {
            throw new Error('Aucune question trouvée dans le JSON');
        }
        
        // Valider chaque question
        parsed.forEach((q, index) => {
            if (!q.question) throw new Error(`Question ${index + 1}: champ "question" manquant`);
            if (!q.level) throw new Error(`Question ${index + 1}: champ "level" manquant`);
            if (!q.theme) throw new Error(`Question ${index + 1}: champ "theme" manquant`);
            if (!q.competence) throw new Error(`Question ${index + 1}: champ "competence" manquant`);
            if (!q.answers || !Array.isArray(q.answers)) throw new Error(`Question ${index + 1}: champ "answers" manquant ou invalide`);
            if (q.answers.length < 2) throw new Error(`Question ${index + 1}: au moins 2 réponses requises`);
            if (!q.answers.some(a => a.correct)) throw new Error(`Question ${index + 1}: au moins une réponse correcte requise`);
        });
        
        // Tout est OK, stocker les questions
        sandboxQuestions = parsed;
        currentSandboxIndex = 0;
        
        // Afficher la section des questions
        questionsDiv.style.display = 'block';
        document.getElementById('sandbox-count').textContent = sandboxQuestions.length;
        
        // Afficher la première question
        displaySandboxQuestion();
        
        // Faire défiler jusqu'aux questions
        questionsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `<strong>Erreur de parsing JSON:</strong><br>${escapeHtml(error.message)}`;
        console.error('Erreur JSON:', error);
    }
}

function navigateSandbox(direction) {
    const newIndex = currentSandboxIndex + direction;
    
    if (newIndex < 0 || newIndex >= sandboxQuestions.length) {
        return;
    }
    
    currentSandboxIndex = newIndex;
    displaySandboxQuestion();
}

function displaySandboxQuestion() {
    if (sandboxQuestions.length === 0) return;
    
    const question = sandboxQuestions[currentSandboxIndex];
    
    // Mettre à jour la position
    document.getElementById('sandbox-position').textContent = 
        `Question ${currentSandboxIndex + 1} / ${sandboxQuestions.length}`;
    
    // Activer/désactiver les boutons de navigation
    document.getElementById('prev-sandbox-question').disabled = currentSandboxIndex === 0;
    document.getElementById('next-sandbox-question').disabled = currentSandboxIndex === sandboxQuestions.length - 1;
    
    // Afficher la prévisualisation
    displaySandboxPreview(question);
    
    // Afficher le mode test
    displaySandboxTest(question);
}

function displaySandboxPreview(question) {
    const contentDiv = document.getElementById('sandbox-preview-content');
    
    contentDiv.innerHTML = `
        <div class="question-card">
            <div class="question-header">
                <div class="question-badges">
                    <span class="badge badge-level">${escapeHtml(levelNames[question.level] || question.level)}</span>
                    <span class="badge badge-theme">${escapeHtml(question.theme)}</span>
                    <span class="badge badge-competence">${escapeHtml(question.competence)}</span>
                </div>
            </div>
            <div class="question-text">
                ${escapeHtml(question.question)}
                ${question.formula ? `<div class="question-formula">$${question.formula}$</div>` : ''}
                ${question.graphFunction ? `<div class="graph-container"><canvas id="sandbox-preview-graph" width="400" height="200"></canvas></div>` : ''}
            </div>
            <h4>Choix de réponses:</h4>
            <ul class="choices">
                ${question.answers.map((answer, i) => `
                    <li class="${answer.correct ? 'correct' : ''}">
                        ${answer.text ? escapeHtml(answer.text) : ''}
                        ${answer.formula ? `$${answer.formula}$` : ''}
                        ${answer.correct ? ' ✓ Bonne réponse' : ''}
                        ${answer.graphFunction ? `<div class="answer-graph"><canvas id="sandbox-preview-answer-${i}" width="300" height="150"></canvas></div>` : ''}
                    </li>
                `).join('')}
            </ul>
            ${question.explanation ? `
                <div class="explanation">
                    <h4>Explication:</h4>
                    <p>${question.explanation}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    renderKaTeX();
    
    // Rendre les graphiques si présents
    if (question.graphFunction) {
        const canvas = document.getElementById('sandbox-preview-graph');
        if (canvas) {
            const graphData = prepareGraphData(question.graphFunction, question.graphParams);
            drawGraph(canvas, graphData);
        }
    }
    
    question.answers.forEach((answer, i) => {
        if (answer.graphFunction) {
            const canvas = document.getElementById(`sandbox-preview-answer-${i}`);
            if (canvas) {
                const graphData = prepareGraphData(answer.graphFunction, answer.graphParams);
                drawGraph(canvas, graphData);
            }
        }
    });
}

function displaySandboxTest(question) {
    const contentDiv = document.getElementById('sandbox-test-content');
    const resultDiv = document.getElementById('sandbox-test-result');
    
    // Mélanger les réponses pour le test
    const shuffledAnswers = [...question.answers].sort(() => Math.random() - 0.5);
    
    contentDiv.innerHTML = `
        <div class="test-question-card">
            <div class="question-badges" style="margin-bottom: 15px;">
                <span class="badge badge-level">${escapeHtml(levelNames[question.level] || question.level)}</span>
                <span class="badge badge-theme">${escapeHtml(question.theme)}</span>
                <span class="badge badge-competence">${escapeHtml(question.competence)}</span>
            </div>
            <div class="question-text" style="margin-bottom: 20px;">
                <strong>${escapeHtml(question.question)}</strong>
                ${question.formula ? `<div class="question-formula">$${question.formula}$</div>` : ''}
                ${question.graphFunction ? `<div class="graph-container"><canvas id="sandbox-test-graph" width="400" height="200"></canvas></div>` : ''}
            </div>
            <div class="test-answers">
                ${shuffledAnswers.map((answer, index) => `
                    <div class="test-answer" data-index="${index}" data-correct="${answer.correct}">
                        ${answer.text ? escapeHtml(answer.text) : ''}
                        ${answer.formula ? `<span class="answer-formula-inline">$${answer.formula}$</span>` : ''}
                        ${answer.graphFunction ? `<div class="answer-graph"><canvas id="sandbox-test-answer-${index}" width="300" height="150"></canvas></div>` : ''}
                    </div>
                `).join('')}
            </div>
            <button id="submit-sandbox-test" class="btn btn-primary" style="margin-top: 20px;">Valider ma réponse</button>
            <button id="reset-sandbox-test" class="btn btn-secondary" style="margin-top: 20px;">Réinitialiser</button>
        </div>
    `;
    
    resultDiv.style.display = 'none';
    resultDiv.className = '';
    resultDiv.innerHTML = '';
    
    renderKaTeX();
    
    // Rendre les graphiques si présents
    if (question.graphFunction) {
        const canvas = document.getElementById('sandbox-test-graph');
        if (canvas) {
            const graphData = prepareGraphData(question.graphFunction, question.graphParams);
            drawGraph(canvas, graphData);
        }
    }
    
    shuffledAnswers.forEach((answer, i) => {
        if (answer.graphFunction) {
            const canvas = document.getElementById(`sandbox-test-answer-${i}`);
            if (canvas) {
                const graphData = prepareGraphData(answer.graphFunction, answer.graphParams);
                drawGraph(canvas, graphData);
            }
        }
    });
    
    // Gérer la sélection des réponses
    const answerDivs = contentDiv.querySelectorAll('.test-answer');
    answerDivs.forEach(div => {
        div.addEventListener('click', function() {
            if (!this.classList.contains('disabled')) {
                answerDivs.forEach(d => d.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });
    
    // Gérer la soumission
    document.getElementById('submit-sandbox-test').addEventListener('click', () => {
        const selectedAnswer = contentDiv.querySelector('.test-answer.selected');
        if (!selectedAnswer) {
            alert('Veuillez sélectionner une réponse');
            return;
        }
        
        const isCorrect = selectedAnswer.dataset.correct === 'true';
        
        // Désactiver toutes les réponses et afficher les corrections
        answerDivs.forEach(div => {
            div.classList.add('disabled');
            if (div.dataset.correct === 'true') {
                div.classList.add('correct');
            } else if (div.classList.contains('selected')) {
                div.classList.add('incorrect');
            }
        });
        
        // Afficher le résultat
        resultDiv.style.display = 'block';
        if (isCorrect) {
            resultDiv.className = 'success show';
            resultDiv.innerHTML = `
                <strong>✓ Correct !</strong>
                ${question.explanation ? `<p style="margin-top: 10px;">${question.explanation}</p>` : ''}
            `;
        } else {
            resultDiv.className = 'error show';
            resultDiv.innerHTML = `
                <strong>✗ Incorrect</strong>
                ${question.explanation ? `<p style="margin-top: 10px;">${question.explanation}</p>` : ''}
            `;
        }
        
        renderKaTeX();
        
        // Désactiver le bouton de validation
        document.getElementById('submit-sandbox-test').disabled = true;
        document.getElementById('submit-sandbox-test').style.opacity = '0.5';
    });
    
    // Gérer la réinitialisation
    document.getElementById('reset-sandbox-test').addEventListener('click', () => {
        displaySandboxTest(question);
    });
}

function clearSandbox() {
    if (!confirm('Êtes-vous sûr de vouloir effacer le bac à sable ?')) {
        return;
    }
    
    // Réinitialiser le champ JSON
    document.getElementById('sandbox-json-input').value = '';
    
    // Masquer les sections
    document.getElementById('json-error').style.display = 'none';
    document.getElementById('sandbox-questions').style.display = 'none';
    
    // Réinitialiser les données
    sandboxQuestions = [];
    currentSandboxIndex = 0;
}
