// Niveaux et thèmes disponibles
// const levels = ['2de', '1re', '1reSpécialité', 'TleSpécialité'];
const levels = ['2de'];
const themes = ['Fonctions', 'Dérivées', 'Intégrales', 'Équations-Inéquations', 'Géométrie', 'Trigonométrie', 'Calcul littéral', 'Probabilités', 'Statistiques'];

// Système de suivi des compétences
class SkillsTracker {
    constructor() {
        this.skills = this.loadSkills();
        this.questionsBySkill = {}; // Stocke le nombre de questions par compétence
    }

    loadSkills() {
        const saved = localStorage.getItem('mathSkills');
        return saved ? JSON.parse(saved) : {};
    }

    saveSkills() {
        localStorage.setItem('mathSkills', JSON.stringify(this.skills));
    }

    // Analyser toutes les questions pour compter le nombre de questions par compétence
    analyzeQuestions(allQuestions) {
        this.questionsBySkill = {};
        allQuestions.forEach(q => {
            if (q.competence) {
                if (!this.questionsBySkill[q.competence]) {
                    this.questionsBySkill[q.competence] = 0;
                }
                this.questionsBySkill[q.competence]++;
            }
        });
    }

    getSkill(competence) {
        if (!this.skills[competence]) {
            this.skills[competence] = {
                name: competence,
                attempts: 0,
                successes: 0,
                validatedQuestions: [], // IDs des questions réussies
                lastAttempt: null,
                level: 0,
                maxLevel: 0
            };
        }
        
        // S'assurer que validatedQuestions existe (pour compatibilité avec anciennes données)
        if (!this.skills[competence].validatedQuestions) {
            this.skills[competence].validatedQuestions = [];
        }
        
        // Mettre à jour le niveau max basé sur le nombre de questions
        const totalQuestions = this.questionsBySkill[competence] || 0;
        this.skills[competence].maxLevel = Math.floor(totalQuestions / 3);
        
        return this.skills[competence];
    }

    recordAttempt(competence, questionId, isCorrect) {
        const skill = this.getSkill(competence);
        skill.attempts++;
        
        // Vérifier si cette question a déjà été validée
        const alreadyValidated = skill.validatedQuestions.includes(questionId);
        
        if (isCorrect && !alreadyValidated) {
            skill.successes++;
            skill.validatedQuestions.push(questionId);
        }
        
        skill.lastAttempt = new Date().toISOString();
        
        // Calculer le niveau actuel basé sur les paliers de 3
        const currentLevel = Math.floor(skill.successes / 3);
        skill.level = Math.min(currentLevel, skill.maxLevel);
        
        this.saveSkills();
        
        // Retourner si c'est une nouvelle validation
        return isCorrect && !alreadyValidated;
    }

    getAllSkills() {
        return Object.values(this.skills);
    }

    getSkillProgress(competence) {
        const skill = this.getSkill(competence);
        if (skill.maxLevel === 0) return 0;
        return Math.round((skill.level / skill.maxLevel) * 100);
    }

    resetAllSkills() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les compétences ? Cette action est irréversible.')) {
            this.skills = {};
            this.saveSkills();
            return true;
        }
        return false;
    }

    getMasteredCount() {
        return this.getAllSkills().filter(s => s.level === s.maxLevel && s.maxLevel > 0).length;
    }

    getTotalCount() {
        return this.getAllSkills().length;
    }

    isSkillMastered(competence) {
        const skill = this.getSkill(competence);
        return skill.level === skill.maxLevel && skill.maxLevel > 0;
    }

    getValidatedQuestionsCount(competence) {
        const skill = this.getSkill(competence);
        return skill.validatedQuestions.length;
    }

    getTotalQuestionsCount(competence) {
        return this.questionsBySkill[competence] || 0;
    }
}

const skillsTracker = new SkillsTracker();

// Fonction pour mélanger un tableau aléatoirement (algorithme Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Fonction pour convertir une chaîne en fonction
function parseFunction(funcString) {
    return new Function('x', `return ${funcString}`);
}

// Convertir les graphiques JSON en objets avec fonctions
function processQuizData(data) {
    return data.map((question, index) => {
        const processedQuestion = { ...question };
        
        // Ajouter un ID unique si la question n'en a pas
        if (!processedQuestion.id) {
            processedQuestion.id = `q_${index}_${Date.now()}`;
        }
        
        // Traiter le graphique de la question si présent
        if (question.graphFunction) {
            // Gérer le cas où graphFunction est un tableau (plusieurs fonctions)
            if (Array.isArray(question.graphFunction)) {
                processedQuestion.graph = {
                    type: 'line',
                    functions: question.graphFunction.map(f => parseFunction(f)),
                    ...question.graphParams
                };
            } else {
                processedQuestion.graph = {
                    type: 'line',
                    function: parseFunction(question.graphFunction),
                    ...question.graphParams
                };
            }
            delete processedQuestion.graphFunction;
            delete processedQuestion.graphParams;
        }
        
        // Traiter les graphiques dans les réponses
        if (question.answers) {
            processedQuestion.answers = question.answers.map(answer => {
                if (answer.graphFunction) {
                    return {
                        graph: {
                            function: parseFunction(answer.graphFunction),
                            ...answer.graphParams
                        },
                        correct: answer.correct
                    };
                }
                return answer;
            });
        }
        
        return processedQuestion;
    });
}

// Données des quiz - Chargées depuis questions.json
let quizData = [];

// Variables globales
let currentQuestion = 0;
let score = 0;
let userAnswers = [];
let chartInstance = null;
let filteredQuizData = [];
let selectedLevel = '';
let selectedTheme = '';
let selectedCompetence = '';
let shuffleQuestions = true;
let shuffledAnswers = []; // Réponses mélangées pour chaque question

// Éléments du DOM
const selectionContainer = document.getElementById('selection-container');
const levelSelect = document.getElementById('level-select');
const themeSelect = document.getElementById('theme-select');
const competenceSelect = document.getElementById('competence-select');
const shuffleQuestionsCheckbox = document.getElementById('shuffle-questions');
const startQuizBtn = document.getElementById('start-quiz-btn');
const questionSelect = document.getElementById('question-select');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const mathFormula = document.getElementById('math-formula');
const graphContainer = document.getElementById('graph-container');
const graphCanvas = document.getElementById('graph-canvas');
const answersContainer = document.getElementById('answers-container');
const feedback = document.getElementById('feedback');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const scoreDisplay = document.getElementById('score');
const totalDisplay = document.getElementById('total');
const progressBar = document.getElementById('progress');
const resultsContainer = document.getElementById('results-container');
const quizContainer = document.querySelector('.quiz-container');
const restartBtn = document.getElementById('restart-btn');
const viewSkillsBtn = document.getElementById('view-skills-btn');
const skillsContainer = document.getElementById('skills-container');
const closeSkillsBtn = document.getElementById('close-skills-btn');
const resetSkillsBtn = document.getElementById('reset-skills-btn');
const skillsList = document.getElementById('skills-list');
const totalSkillsDisplay = document.getElementById('total-skills');
const masteredSkillsDisplay = document.getElementById('mastered-skills');
const progressPercentageDisplay = document.getElementById('progress-percentage');
const headerSkillsBtn = document.getElementById('header-skills-btn');
const startLevelTestBtn = document.getElementById('start-level-test-btn');
const startThemeTestBtn = document.getElementById('start-theme-test-btn');
const showAnswersBtn = document.getElementById('show-answers-btn');

// Variables pour le mode test complet
let isLevelTestMode = false;
let isThemeTestMode = false;

// Charger les questions depuis le fichier JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`Erreur de chargement: ${response.status}`);
        }
        const data = await response.json();
        quizData = processQuizData(data);
        
        // Analyser les questions pour le système de compétences
        skillsTracker.analyzeQuestions(quizData);
        
        console.log(`${quizData.length} questions chargées avec succès`);
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        alert('Impossible de charger les questions. Vérifiez que le fichier questions.json est présent.');
        return false;
    }
}

// Initialisation de la page
async function initApp() {
    const loaded = await loadQuestions();
    if (loaded) {
        populateLevelSelect();
        // Cocher le mélange par défaut
        shuffleQuestionsCheckbox.checked = true;
    }
}

// Peupler le sélecteur de niveaux
function populateLevelSelect() {
    levelSelect.innerHTML = '<option value="">-- Sélectionner un niveau --</option>';
    levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        levelSelect.appendChild(option);
    });
}

// Peupler le sélecteur de thèmes
function populateThemeSelect() {
    themeSelect.innerHTML = '<option value="">-- Sélectionner un thème --</option>';
    
    // Obtenir les thèmes disponibles pour le niveau sélectionné
    const availableThemes = [...new Set(quizData
        .filter(q => q.level === selectedLevel)
        .map(q => q.theme))];
    
    availableThemes.sort();
    
    availableThemes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelect.appendChild(option);
    });
    themeSelect.disabled = false;
    
    // Afficher le bouton de test complet si un niveau est sélectionné
    if (selectedLevel) {
        const levelQuestions = quizData.filter(q => q.level === selectedLevel);
        if (levelQuestions.length >= 20) {
            startLevelTestBtn.style.display = 'block';
        } else {
            startLevelTestBtn.style.display = 'none';
        }
    }
}

// Peupler le sélecteur de compétences
function populateCompetenceSelect() {
    competenceSelect.innerHTML = '<option value="">-- Toutes les compétences --</option>';
    
    // Obtenir les compétences disponibles pour le niveau et thème sélectionnés
    const availableCompetences = [...new Set(quizData
        .filter(q => q.level === selectedLevel && q.theme === selectedTheme && q.competence)
        .map(q => q.competence))];
    
    availableCompetences.sort();
    
    availableCompetences.forEach(competence => {
        const option = document.createElement('option');
        option.value = competence;
        
        // Ajouter le nombre de questions pour cette compétence
        const questionsCount = quizData.filter(q => 
            q.level === selectedLevel && 
            q.theme === selectedTheme && 
            q.competence === competence
        ).length;
        
        // Ajouter les stats de validation si disponibles
        const validatedCount = skillsTracker.getValidatedQuestionsCount(competence);
        const level = skillsTracker.getSkill(competence).level;
        const maxLevel = skillsTracker.getSkill(competence).maxLevel;
        
        if (validatedCount > 0) {
            option.textContent = `${competence} (${validatedCount}/${questionsCount} - Niv ${level}/${maxLevel})`;
        } else {
            option.textContent = `${competence} (${questionsCount} questions)`;
        }
        
        competenceSelect.appendChild(option);
    });
    competenceSelect.disabled = false;
    
    // Afficher le bouton de test complet du thème si un thème est sélectionné
    if (selectedTheme) {
        const themeQuestions = quizData.filter(q => q.level === selectedLevel && q.theme === selectedTheme);
        if (themeQuestions.length >= 20) {
            startThemeTestBtn.style.display = 'block';
        } else {
            startThemeTestBtn.style.display = 'none';
        }
    }
}

// Filtrer les questions disponibles
function filterQuestions() {
    filteredQuizData = quizData.filter(q => {
        const matchLevel = q.level === selectedLevel;
        const matchTheme = q.theme === selectedTheme;
        const matchCompetence = !selectedCompetence || q.competence === selectedCompetence;
        return matchLevel && matchTheme && matchCompetence;
    });
    
    if (filteredQuizData.length > 0) {
        startQuizBtn.disabled = false;
        startQuizBtn.textContent = `Démarrer le quiz (${filteredQuizData.length} question${filteredQuizData.length > 1 ? 's' : ''})`;
    } else {
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Démarrer le quiz';
        alert(`Aucune question disponible pour cette sélection.`);
    }
}

// Initialisation du quiz
function init() {
    // Récupérer l'option de mélange
    shuffleQuestions = shuffleQuestionsCheckbox.checked;
    
    // Mélanger les questions aléatoirement si l'option est cochée
    if (shuffleQuestions) {
        filteredQuizData = shuffleArray(filteredQuizData);
    }
    
    currentQuestion = 0;
    score = 0;
    userAnswers = new Array(filteredQuizData.length).fill(null);
    shuffledAnswers = new Array(filteredQuizData.length).fill(null);
    totalDisplay.textContent = filteredQuizData.length;
    scoreDisplay.textContent = score;
    
    // Peupler le menu déroulant de navigation
    populateQuestionSelect();
    
    showQuestion();
}

// Démarrer un test complet du niveau (20 questions aléatoires)
function startLevelTest() {
    isLevelTestMode = true;
    
    // Récupérer toutes les questions du niveau
    const levelQuestions = quizData.filter(q => q.level === selectedLevel);
    
    // Sélectionner 20 questions aléatoires
    filteredQuizData = shuffleArray(levelQuestions).slice(0, 20);
    
    // Masquer la sélection et afficher le quiz
    selectionContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    
    // Initialiser le quiz
    currentQuestion = 0;
    score = 0;
    userAnswers = new Array(20).fill(null);
    shuffledAnswers = new Array(20).fill(null);
    totalDisplay.textContent = 20;
    scoreDisplay.textContent = score;
    
    populateQuestionSelect();
    showQuestion();
}

// Démarrer un test complet du thème (20 questions aléatoires)
function startThemeTest() {
    isLevelTestMode = false;
    isThemeTestMode = true;
    
    // Récupérer toutes les questions du thème
    const themeQuestions = quizData.filter(q => q.level === selectedLevel && q.theme === selectedTheme);
    
    // Sélectionner 20 questions aléatoires
    filteredQuizData = shuffleArray(themeQuestions).slice(0, 20);
    
    // Masquer la sélection et afficher le quiz
    selectionContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    
    // Initialiser le quiz
    currentQuestion = 0;
    score = 0;
    userAnswers = new Array(20).fill(null);
    shuffledAnswers = new Array(20).fill(null);
    totalDisplay.textContent = 20;
    scoreDisplay.textContent = score;
    
    populateQuestionSelect();
    showQuestion();
}

// Peupler le menu déroulant des questions
function populateQuestionSelect() {
    questionSelect.innerHTML = '';
    filteredQuizData.forEach((q, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Question ${index + 1}`;
        questionSelect.appendChild(option);
    });
}

// Afficher une question
function showQuestion() {
    const question = filteredQuizData[currentQuestion];
    
    // Mélanger les réponses pour cette question si ce n'est pas déjà fait
    if (!shuffledAnswers[currentQuestion]) {
        const answersWithIndex = question.answers.map((answer, index) => ({
            ...answer,
            originalIndex: index
        }));
        shuffledAnswers[currentQuestion] = shuffleArray(answersWithIndex);
    }
    
    // Mettre à jour le numéro de question
    questionNumber.textContent = `Question ${currentQuestion + 1}`;
    
    // Mettre à jour le select de navigation
    questionSelect.value = currentQuestion;
    
    // Mettre à jour la barre de progression
    const progress = ((currentQuestion + 1) / filteredQuizData.length) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Afficher le texte de la question
    questionText.innerHTML = question.question;
    // Rendre les formules mathématiques dans le texte de la question
    renderMathInElement(questionText, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ]
    });
    
    // Afficher la formule mathématique si présente
    if (question.formula) {
        mathFormula.style.display = 'block';
        mathFormula.textContent = `$$${question.formula}$$`;
        // Rendre la formule avec KaTeX
        renderMathInElement(mathFormula, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ]
        });
    } else {
        mathFormula.style.display = 'none';
    }
    
    // Afficher le graphique si présent
    if (question.graph) {
        graphContainer.classList.add('active');
        drawGraph(question.graph);
    } else {
        graphContainer.classList.remove('active');
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }
    
    // Préparer les réponses mais ne pas les afficher automatiquement
    displayAnswers();
    
    // Cacher le feedback
    feedback.classList.remove('show');
    
    // Gérer l'affichage du bouton et des réponses
    if (userAnswers[currentQuestion] !== null) {
        // Question déjà répondue : afficher les réponses directement
        answersContainer.style.display = 'block';
        showAnswersBtn.style.display = 'none';
    } else {
        // Question non répondue : cacher les réponses et afficher le bouton
        answersContainer.style.display = 'none';
        showAnswersBtn.style.display = 'block';
    }
    
    // Gérer les boutons de navigation
    prevBtn.disabled = currentQuestion === 0;
    
    if (currentQuestion === filteredQuizData.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

// Afficher les réponses
function displayAnswers() {
    answersContainer.innerHTML = '';
    const shuffled = shuffledAnswers[currentQuestion];
    
    shuffled.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-option';
        
        if (userAnswers[currentQuestion] !== null) {
            answerDiv.classList.add('disabled');
            if (index === userAnswers[currentQuestion]) {
                answerDiv.classList.add('selected');
                if (answer.correct) {
                    answerDiv.classList.add('correct');
                } else {
                    answerDiv.classList.add('incorrect');
                }
            } else if (answer.correct) {
                answerDiv.classList.add('correct');
            }
        } else {
            answerDiv.addEventListener('click', () => selectAnswer(index));
        }
        
        const label = document.createElement('span');
        label.className = 'answer-label';
        label.textContent = `${String.fromCharCode(65 + index)}.`;
        answerDiv.appendChild(label);
        
        // Créer le contenu de la réponse
        const contentDiv = document.createElement('div');
        contentDiv.className = 'answer-content';
        
        if (answer.text) {
            // Réponse texte - peut contenir des formules entre $...$ ou \\(...\\)
            const textDiv = document.createElement('div');
            textDiv.className = 'answer-text';
            textDiv.innerHTML = answer.text;
            contentDiv.appendChild(textDiv);
            // Rendre les formules éventuelles avec KaTeX
            setTimeout(() => {
                renderMathInElement(textDiv, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ]
                });
            }, 10);
        } else if (answer.formula) {
            // Réponse avec formule mathématique
            const formulaDiv = document.createElement('div');
            formulaDiv.className = 'answer-formula';
            formulaDiv.textContent = `$${answer.formula}$`;
            contentDiv.appendChild(formulaDiv);
            // Rendre la formule avec KaTeX
            setTimeout(() => {
                renderMathInElement(formulaDiv, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ]
                });
            }, 10);
        } else if (answer.graph) {
            // Réponse avec graphique
            const graphDiv = document.createElement('div');
            graphDiv.className = 'answer-graph-container';
            const canvas = document.createElement('canvas');
            canvas.id = `answer-graph-${index}`;
            graphDiv.appendChild(canvas);
            contentDiv.appendChild(graphDiv);
            
            // Dessiner le graphique pour cette réponse
            setTimeout(() => drawAnswerGraph(canvas, answer.graph), 50);
        }
        
        answerDiv.appendChild(contentDiv);
        answersContainer.appendChild(answerDiv);
    });
}

// Sélectionner une réponse
function selectAnswer(index) {
    const shuffled = shuffledAnswers[currentQuestion];
    const answer = shuffled[index];
    userAnswers[currentQuestion] = index;
    
    // Cacher le bouton d'affichage des propositions
    showAnswersBtn.style.display = 'none';
    
    const isCorrect = answer.correct;
    const currentCompetence = filteredQuizData[currentQuestion].competence;
    const questionId = filteredQuizData[currentQuestion].id;
    
    // Enregistrer la tentative pour la compétence et obtenir si c'est une nouvelle validation
    let isNewValidation = false;
    if (currentCompetence && questionId) {
        isNewValidation = skillsTracker.recordAttempt(currentCompetence, questionId, isCorrect);
    }
    
    if (isCorrect) {
        score++;
        scoreDisplay.textContent = score;
        feedback.className = 'feedback show correct';
        feedback.innerHTML = `<strong>✓ Correct !</strong><br>${filteredQuizData[currentQuestion].explanation}`;
        
        // Afficher si la compétence est maîtrisée
        if (currentCompetence) {
            const skill = skillsTracker.getSkill(currentCompetence);
            const validatedCount = skillsTracker.getValidatedQuestionsCount(currentCompetence);
            const totalCount = skillsTracker.getTotalQuestionsCount(currentCompetence);
            
            if (isNewValidation) {
                if (skillsTracker.isSkillMastered(currentCompetence)) {
                    feedback.innerHTML += `<br><span class="skill-mastered">🏆 Compétence totalement maîtrisée ! Niveau ${skill.level}/${skill.maxLevel} (${validatedCount}/${totalCount} questions)</span>`;
                } else if (skill.level > 0) {
                    const previousLevel = Math.floor((skill.successes - 1) / 3);
                    if (skill.level > previousLevel) {
                        feedback.innerHTML += `<br><span class="skill-level-up">⭐ Niveau supérieur ! Niveau ${skill.level}/${skill.maxLevel} (${validatedCount}/${totalCount} questions validées)</span>`;
                    } else {
                        feedback.innerHTML += `<br><span class="skill-progress">📈 Progression : Niveau ${skill.level}/${skill.maxLevel} - ${validatedCount}/${totalCount} questions (${skill.successes % 3}/3 pour le prochain niveau)</span>`;
                    }
                } else {
                    feedback.innerHTML += `<br><span class="skill-progress">📊 Progression : ${skill.successes}/3 pour le niveau 1 (${validatedCount}/${totalCount} questions)</span>`;
                }
            } else {
                feedback.innerHTML += `<br><span class="skill-already-validated">✅ Question déjà validée - Progression actuelle : ${validatedCount}/${totalCount} questions validées</span>`;
            }
        }
        
        // Rendre les formules dans le feedback
        setTimeout(() => {
            renderMathInElement(feedback, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ]
            });
        }, 10);
    } else {
        feedback.className = 'feedback show incorrect';
        const correctAnswer = shuffled.find(a => a.correct);
        let correctText;
        if (correctAnswer.text) {
            correctText = correctAnswer.text;
        } else if (correctAnswer.formula) {
            correctText = `$${correctAnswer.formula}$`;
        } else {
            correctText = `Graphique ${String.fromCharCode(65 + shuffled.indexOf(correctAnswer))}`;
        }
        feedback.innerHTML = `<strong>✗ Incorrect.</strong><br><strong>Bonne réponse :</strong> ${correctText}<br>${filteredQuizData[currentQuestion].explanation}`;
        // Rendre les formules dans le feedback
        setTimeout(() => {
            renderMathInElement(feedback, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ]
            });
        }, 10);
    }
    
    displayAnswers();
}

// Dessiner un graphique pour une réponse
function drawAnswerGraph(canvas, graphData) {
    const step = (graphData.xMax - graphData.xMin) / 80;
    const dataPoints = [];
    
    for (let x = graphData.xMin; x <= graphData.xMax; x += step) {
        dataPoints.push({
            x: x,
            y: graphData.function(x)
        });
    }
    
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: graphData.label,
                data: dataPoints,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
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
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    },
                    ticks: {
                        font: { size: 9 },
                        maxTicksLimit: 5
                    }
                },
                y: {
                    type: 'linear',
                    position: {x: 0},
                    min: graphData.yMin,
                    max: graphData.yMax,
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    },
                    ticks: {
                        font: { size: 9 },
                        maxTicksLimit: 5
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    enabled: false
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        onZoomComplete: function({chart}) {
                            chart.update('none');
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        onPanComplete: function({chart}) {
                            chart.update('none');
                        }
                    }
                }
            }
        }
    });
}

// Dessiner un graphique
function drawGraph(graphData) {
    if (chartInstance) {
        chartInstance.destroy();
    }
    
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
    } else {
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
            label: graphData.label,
            data: dataPoints,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
        });
    }
    
    const ctx = graphCanvas.getContext('2d');
    
    chartInstance = new Chart(ctx, {
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
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        onZoomComplete: function({chart}) {
                            chart.update('none');
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        onPanComplete: function({chart}) {
                            chart.update('none');
                        }
                    }
                }
            }
        }
    });
}

// Afficher les propositions de réponse
showAnswersBtn.addEventListener('click', () => {
    answersContainer.style.display = 'block';
    showAnswersBtn.style.display = 'none';
});

// Navigation
prevBtn.addEventListener('click', () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentQuestion < filteredQuizData.length - 1) {
        currentQuestion++;
        showQuestion();
    }
});

submitBtn.addEventListener('click', () => {
    showResults();
});

restartBtn.addEventListener('click', () => {
    resultsContainer.style.display = 'none';
    
    // Si on était en mode test complet, relancer un nouveau test
    if (isLevelTestMode) {
        startLevelTest();
    } else if (isThemeTestMode) {
        startThemeTest();
    } else {
        selectionContainer.style.display = 'block';
        levelSelect.value = '';
        themeSelect.value = '';
        themeSelect.disabled = true;
        competenceSelect.value = '';
        competenceSelect.disabled = true;
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Démarrer le quiz';
    }
});

// Bouton pour voir les compétences
viewSkillsBtn.addEventListener('click', () => {
    showSkillsPanel();
});

closeSkillsBtn.addEventListener('click', () => {
    skillsContainer.style.display = 'none';
    // Retourner à l'écran de sélection par défaut
    selectionContainer.style.display = 'block';
});

resetSkillsBtn.addEventListener('click', () => {
    if (skillsTracker.resetAllSkills()) {
        showSkillsPanel();
    }
});

headerSkillsBtn.addEventListener('click', () => {
    // Cacher tous les conteneurs
    selectionContainer.style.display = 'none';
    quizContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    showSkillsPanel();
});

// Événements de sélection
levelSelect.addEventListener('change', (e) => {
    selectedLevel = e.target.value;
    if (selectedLevel) {
        populateThemeSelect();
        themeSelect.value = '';
        competenceSelect.value = '';
        competenceSelect.disabled = true;
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Démarrer le quiz';
    } else {
        themeSelect.disabled = true;
        themeSelect.innerHTML = '<option value="">-- Sélectionner un thème --</option>';
        competenceSelect.disabled = true;
        competenceSelect.innerHTML = '<option value="">-- Toutes les compétences --</option>';
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Démarrer le quiz';
        startLevelTestBtn.style.display = 'none';
        startThemeTestBtn.style.display = 'none';
    }
});

themeSelect.addEventListener('change', (e) => {
    selectedTheme = e.target.value;
    if (selectedTheme) {
        populateCompetenceSelect();
        competenceSelect.value = '';
        filterQuestions();
    } else {
        competenceSelect.disabled = true;
        competenceSelect.innerHTML = '<option value="">-- Toutes les compétences --</option>';
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Démarrer le quiz';
        startThemeTestBtn.style.display = 'none';
    }
});

competenceSelect.addEventListener('change', (e) => {
    selectedCompetence = e.target.value;
    filterQuestions();
});

startQuizBtn.addEventListener('click', () => {
    isLevelTestMode = false;
    isThemeTestMode = false;
    selectionContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    init();
});

// Démarrer un test complet du niveau
startLevelTestBtn.addEventListener('click', () => {
    startLevelTest();
});

// Démarrer un test complet du thème
startThemeTestBtn.addEventListener('click', () => {
    startThemeTest();
});

// Navigation via le menu déroulant
questionSelect.addEventListener('change', (e) => {
    const selectedIndex = parseInt(e.target.value);
    if (selectedIndex >= 0 && selectedIndex < filteredQuizData.length) {
        currentQuestion = selectedIndex;
        showQuestion();
    }
});

// Afficher les résultats
function showResults() {
    quizContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    
    const finalScore = document.getElementById('final-score');
    const scorePercentage = document.getElementById('score-percentage');
    const resultsDetails = document.getElementById('results-details');
    
    finalScore.textContent = `${score}/${filteredQuizData.length}`;
    
    // Afficher un message spécial pour le mode test complet
    const resultsHeader = resultsContainer.querySelector('h2');
    if (isLevelTestMode) {
        resultsHeader.textContent = `🎯 Résultats du Test Complet - ${selectedLevel}`;
    } else if (isThemeTestMode) {
        resultsHeader.textContent = `🎯 Résultats du Test Complet - ${selectedTheme}`;
    } else {
        resultsHeader.textContent = 'Résultats du Quiz';
    }
    
    const percentage = (score / filteredQuizData.length) * 100;
    scorePercentage.style.setProperty('--score-width', `${percentage}%`);
    
    // Afficher les détails de chaque question
    resultsDetails.innerHTML = '';
    filteredQuizData.forEach((question, index) => {
        const resultItem = document.createElement('div');
        const userAnswerIndex = userAnswers[index];
        const isCorrect = userAnswerIndex !== null && question.answers[userAnswerIndex].correct;
        
        resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        const questionTitle = document.createElement('h4');
        questionTitle.textContent = `Question ${index + 1}: ${question.question}`;
        resultItem.appendChild(questionTitle);
        
        if (question.formula) {
            const formulaP = document.createElement('p');
            formulaP.innerHTML = `<em>Formule: $${question.formula}$</em>`;
            resultItem.appendChild(formulaP);
        }
        
        // Afficher la réponse de l'utilisateur
        const userAnswerP = document.createElement('p');
        userAnswerP.innerHTML = 'Votre réponse: ';
        const userAnswerSpan = document.createElement('span');
        userAnswerSpan.className = 'user-answer';
        if (userAnswerIndex !== null) {
            const userAnswer = shuffledAnswers[index][userAnswerIndex];
            if (userAnswer.text) {
                userAnswerSpan.innerHTML = userAnswer.text;
            } else if (userAnswer.formula) {
                userAnswerSpan.innerHTML = `$${userAnswer.formula}$`;
            } else {
                userAnswerSpan.textContent = `Graphique ${String.fromCharCode(65 + userAnswerIndex)}`;
            }
        } else {
            userAnswerSpan.textContent = 'Pas de réponse';
        }
        userAnswerP.appendChild(userAnswerSpan);
        resultItem.appendChild(userAnswerP);
        
        // Afficher la réponse correcte
        const correctAnswerP = document.createElement('p');
        correctAnswerP.innerHTML = 'Réponse correcte: ';
        const correctAnswerSpan = document.createElement('span');
        correctAnswerSpan.className = 'correct-answer';
        const correctAnswer = question.answers.find(a => a.correct);
        const correctIndex = question.answers.findIndex(a => a.correct);
        if (correctAnswer.text) {
            correctAnswerSpan.innerHTML = correctAnswer.text;
        } else if (correctAnswer.formula) {
            correctAnswerSpan.innerHTML = `$${correctAnswer.formula}$`;
        } else {
            correctAnswerSpan.textContent = `Graphique ${String.fromCharCode(65 + correctIndex)}`;
        }
        correctAnswerP.appendChild(correctAnswerSpan);
        resultItem.appendChild(correctAnswerP);
        
        // Explication
        const explanationP = document.createElement('p');
        explanationP.innerHTML = question.explanation;
        resultItem.appendChild(explanationP);
        
        resultsDetails.appendChild(resultItem);
    });
    
    // Rendre toutes les formules mathématiques dans les résultats
    setTimeout(() => {
        renderMathInElement(resultsDetails, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ]
        });
    }, 50);
}

// Afficher le panneau de compétences
function showSkillsPanel() {
    resultsContainer.style.display = 'none';
    selectionContainer.style.display = 'none';
    skillsContainer.style.display = 'block';
    
    updateSkillsStats();
    displaySkillsList('all');
    
    // Gérer les filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            displaySkillsList(this.dataset.filter);
        });
    });
}

// Mettre à jour les statistiques des compétences
function updateSkillsStats() {
    const allSkills = skillsTracker.getAllSkills();
    const totalCount = allSkills.length;
    const masteredCount = skillsTracker.getMasteredCount();
    const percentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
    
    totalSkillsDisplay.textContent = totalCount;
    masteredSkillsDisplay.textContent = masteredCount;
    progressPercentageDisplay.textContent = `${percentage}%`;
}

// Afficher la liste des compétences
function displaySkillsList(filter) {
    const allSkills = skillsTracker.getAllSkills();
    
    // Filtrer les compétences selon le filtre actif
    let filteredSkills = allSkills;
    if (filter === 'mastered') {
        filteredSkills = allSkills.filter(s => s.level === s.maxLevel && s.maxLevel > 0);
    } else if (filter === 'in-progress') {
        filteredSkills = allSkills.filter(s => s.attempts > 0 && s.level < s.maxLevel);
    } else if (filter === 'not-started') {
        filteredSkills = allSkills.filter(s => s.attempts === 0);
    }
    
    // Trier par niveau décroissant puis par taux de réussite
    filteredSkills.sort((a, b) => {
        const progressA = a.maxLevel > 0 ? a.level / a.maxLevel : 0;
        const progressB = b.maxLevel > 0 ? b.level / b.maxLevel : 0;
        if (progressB !== progressA) return progressB - progressA;
        const rateA = a.attempts > 0 ? a.successes / a.attempts : 0;
        const rateB = b.attempts > 0 ? b.successes / b.attempts : 0;
        return rateB - rateA;
    });
    
    skillsList.innerHTML = '';
    
    if (filteredSkills.length === 0) {
        skillsList.innerHTML = '<p class="no-skills">Aucune compétence dans cette catégorie.</p>';
        return;
    }
    
    filteredSkills.forEach(skill => {
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card';
        
        const successRate = skill.attempts > 0 ? Math.round((skill.successes / skill.attempts) * 100) : 0;
        const progressToNextLevel = skill.maxLevel > 0 ? ((skill.level / skill.maxLevel) * 100) : 0;
        const successesInCurrentLevel = skill.successes % 3;
        const validatedCount = skill.validatedQuestions ? skill.validatedQuestions.length : skill.successes;
        const totalQuestionsAvailable = skillsTracker.getTotalQuestionsCount(skill.name);
        
        // Déterminer le statut
        let status = 'not-started';
        let statusIcon = '⚪';
        let statusText = 'Non commencé';
        
        if (skill.level === skill.maxLevel && skill.maxLevel > 0) {
            status = 'mastered';
            statusIcon = '🏆';
            statusText = 'Maîtrisé';
        } else if (skill.attempts > 0) {
            status = 'in-progress';
            statusIcon = '🔄';
            statusText = 'En cours';
        }
        
        skillCard.setAttribute('data-status', status);
        
        skillCard.innerHTML = `
            <div class="skill-header">
                <span class="skill-icon">${statusIcon}</span>
                <h3 class="skill-name">${skill.name}</h3>
                <span class="skill-status ${status}">${statusText}</span>
            </div>
            <div class="skill-level-display">
                <div class="level-badge">Niveau ${skill.level}/${skill.maxLevel}</div>
                ${skill.level < skill.maxLevel ? `<div class="level-progress-text">${successesInCurrentLevel}/3 pour le niveau ${skill.level + 1}</div>` : ''}
            </div>
            <div class="skill-questions-count">
                <span class="questions-validated">${validatedCount}</span>/<span class="questions-total">${totalQuestionsAvailable}</span> questions validées
            </div>
            <div class="skill-stats-detail">
                <div class="skill-stat">
                    <span class="stat-label">Tentatives:</span>
                    <span class="stat-value">${skill.attempts}</span>
                </div>
                <div class="skill-stat">
                    <span class="stat-label">Réussites:</span>
                    <span class="stat-value">${skill.successes}</span>
                </div>
                <div class="skill-stat">
                    <span class="stat-label">Taux de réussite:</span>
                    <span class="stat-value">${successRate}%</span>
                </div>
            </div>
            <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: ${progressToNextLevel}%"></div>
            </div>
            ${skill.lastAttempt ? `<div class="skill-last-attempt">Dernière tentative: ${new Date(skill.lastAttempt).toLocaleDateString('fr-FR')}</div>` : ''}
        `;
        
        skillsList.appendChild(skillCard);
    });
}

// Démarrer l'application au chargement de la page
window.addEventListener('load', () => {
    // Attendre que KaTeX soit chargé puis initialiser
    setTimeout(initApp, 100);
    
    // Ajouter le gestionnaire de plein écran pour les graphiques (délégation d'événements)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'fullscreen-btn') {
            e.preventDefault();
            e.stopPropagation();
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.classList.toggle('fullscreen');
                
                // Pas de redimensionnement automatique pour éviter le zoom
                // Le canvas s'adaptera automatiquement via CSS
            }
        }
    });
    
    // Support tactile pour mobile
    document.addEventListener('touchend', (e) => {
        if (e.target && e.target.id === 'fullscreen-btn') {
            e.preventDefault();
            e.stopPropagation();
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.classList.toggle('fullscreen');
                
                // Pas de redimensionnement automatique pour éviter le zoom
                // Le canvas s'adaptera automatiquement via CSS
            }
        }
    });
    
    // Permettre de fermer le plein écran avec la touche Escape
    document.addEventListener('keydown', (e) => {
        const graphContainer = document.getElementById('graph-container');
        if (e.key === 'Escape' && graphContainer && graphContainer.classList.contains('fullscreen')) {
            graphContainer.classList.remove('fullscreen');
            // Pas de redimensionnement automatique pour éviter le zoom
        }
    });
});
