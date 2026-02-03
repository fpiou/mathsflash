# Quiz Mathématiques - Application Web

Une application web interactive pour les quiz mathématiques et l'apprentissage par flashcards avec répétition espacée (SRS). Support complet des formules mathématiques (KaTeX) et des graphiques de fonctions (Chart.js).

## Fonctionnalités

### Quiz
- ✅ Affichage de formules mathématiques élégantes avec KaTeX
- ✅ Graphiques interactifs de fonctions avec quadrillage
- ✅ Questions à choix multiples
- ✅ Réponses mélangées aléatoirement
- ✅ Feedback immédiat après chaque réponse
- ✅ Suivi du score en temps réel
- ✅ Barre de progression
- ✅ Sélection par niveau et thème
- ✅ Résultats détaillés à la fin du quiz
- ✅ Design responsive et moderne
- ✅ **Questions stockées en JSON** pour faciliter l'ajout et la modification

### Flashcards (Système de Répétition Espacée v2)
- ✅ **Algorithme SRS inspiré d'Anki** pour une mémorisation optimale
- ✅ **États d'apprentissage** : nouveau → apprentissage → révision (avec réapprentissage)
- ✅ **Étapes d'apprentissage** : 10 min → 1 jour avant graduation
- ✅ **Réapprentissage** : retour à 10 min si oublié
- ✅ **UID stables** : les cartes conservent leur historique même si le contenu est modifié
- ✅ **File intra-session** : les cartes ratées reviennent après leur délai (pas immédiatement)
- ✅ **4 niveaux de notation** : À revoir (1) / Difficile (2) / Correct (3) / Facile (4)
- ✅ **Migration automatique** depuis l'ancien système avec backup
- ✅ **Logs de debug** pour suivre l'évolution de chaque carte
- ✅ Filtres par niveau, thème, type et compétence
- ✅ Modes : Apprentissage (nouvelles cartes) / Révision (cartes à réviser) / Mixte

## Technologies utilisées

- **HTML5** - Structure de la page
- **CSS3** - Styles et animations
- **JavaScript (Vanilla)** - Logique de l'application
- **KaTeX** - Rendu des formules mathématiques
- **Chart.js** - Création de graphiques
- **JSON** - Stockage des questions

## Structure du projet

```
quizs/
├── index.html           # Page principale (quiz)
├── styles.css           # Feuille de styles (quiz)
├── script.js            # Logique du quiz
├── questions.json       # Base de données des questions
├── flashcards.html      # Page des flashcards
├── flashcards.js        # Logique SRS et flashcards
├── flashcards.json      # Base de données des flashcards
├── admin.html           # Interface d'administration
├── admin-script.js      # Logique de l'admin
├── admin-styles.css     # Styles de l'admin
└── README.md            # Documentation
```

## Comment utiliser

### Quiz
1. Ouvrez le fichier `index.html` dans votre navigateur web (via serveur HTTP)
2. Sélectionnez un niveau et un thème
3. Cliquez sur "Démarrer le quiz"
4. Répondez aux questions
5. Naviguez entre les questions avec les boutons
6. Consultez vos résultats à la fin

### Flashcards
1. Ouvrez le fichier `flashcards.html` dans votre navigateur web (via serveur HTTP)
2. Sélectionnez les filtres souhaités (niveau, thème, type, compétence)
3. Choisissez un mode :
   - **Apprentissage** : nouvelles cartes uniquement
   - **Révision** : cartes à réviser aujourd'hui
   - **Mixte** : combinaison des deux (15 nouvelles max + 60 révisions max)
4. Cliquez pour retourner la carte
5. Évaluez votre mémorisation avec les boutons :
   - **À revoir (1)** : carte oubliée → retour à 10 min
   - **Difficile (2)** : réponse hésitante → intervalle réduit
   - **Correct (3)** : réponse correcte → intervalle normal
   - **Facile (4)** : réponse immédiate → intervalle augmenté
6. Les cartes ratées reviennent dans la session après leur délai
7. Consultez vos statistiques à la fin

## ⚠️ Important : Serveur local requis

L'application doit être servie via HTTP/HTTPS (pas en `file://`) à cause du chargement du fichier JSON.

### Solutions :

**1. Extension VS Code "Live Server"** (recommandé)
- Installez l'extension "Live Server"
- Clic droit sur `index.html` → "Open with Live Server"

**2. Serveur Python**
```bash
# Python 3
python -m http.server 8000
# Puis ouvrir http://localhost:8000
```

**3. Serveur Node.js**
```bash
npx http-server
```

## Système de Répétition Espacée (SRS v2)

### Principes de l'algorithme

Le système utilise un algorithme inspiré d'Anki pour optimiser la mémorisation :

#### États des cartes
1. **Nouveau** : carte jamais étudiée
2. **Apprentissage** : en cours de mémorisation initiale (étapes : 10 min → 1 jour)
3. **Révision** : mémorisée, intervalles croissants (2j → 5j → 12j → 30j...)
4. **Réapprentissage** : oubliée, retour à 10 min

#### Progression
- **Nouvelles cartes** : 10 min → 1 jour → graduation en révision
- **Cartes oubliées** : retour à 10 min (réapprentissage)
- **Facteur d'aisance** : ajusté selon vos réponses (1.3 à 2.8)
- **Intervalle maximum** : 3650 jours (10 ans)

#### Configuration
```javascript
SRS_CONFIG = {
    learningStepsMins: [10, 1440],      // 10 min, 1 jour
    relearningStepsMins: [10],           // 10 min
    easyIntervalDays: 4,                 // Facile : 4 jours
    goodFirstIntervalDays: 2,            // Bon premier intervalle : 2 jours
    hardFactor: 1.2,                     // Multiplicateur difficile
    easeMin: 1.3,                        // Aisance minimale
    easeMax: 2.8,                        // Aisance maximale
    maxIntervalDays: 3650,               // 10 ans max
    newPerSession: 15,                   // 15 nouvelles max/session
    maxReviewsPerSession: 60,            // 60 révisions max/session
    maxTotal: 80                         // 80 cartes max/session
}
```

#### Migration depuis l'ancien système
Au premier chargement après mise à jour :
- Création automatique d'un backup : `flashcardsSRS_backup_[timestamp]`
- Migration des données historiques vers le nouveau format
- Génération d'UID stables pour toutes les cartes
- Conservation de la progression (intervalles, dates d'échéance)

### Format des flashcards (flashcards.json)

```json
{
    "level": "2de",
    "theme": "Ensembles de nombres",
    "type": "Définition",
    "front": "Qu'est-ce que ℕ ?",
    "back": "L'ensemble des **entiers naturels** : 0, 1, 2, 3, ...",
    "explanation": "ℕ commence à 0 et contient tous les entiers positifs."
}
```

**Champs obligatoires** :
- `level` : niveau scolaire
- `theme` : thème mathématique
- `type` : type de flashcard (Définition, Formule, Propriété, etc.)
- `front` : question (recto)
- `back` : réponse (verso)

**Champ optionnel** :
- `explanation` : explication complémentaire

**Support LaTeX** : utilisez la syntaxe KaTeX dans front/back/explanation

## Ajouter de nouvelles questions

### Modifier le fichier `questions.json`

Le fichier `questions.json` contient toutes les questions du quiz. Ajoutez simplement de nouveaux objets au tableau JSON.

### Format d'une question

#### Question simple avec formule :
```json
{
    "question": "Texte de la question",
    "formula": "x^2 + 2x + 1",
    "level": "2de",
    "theme": "Équations",
    "answers": [
        { "text": "Réponse 1", "correct": true },
        { "text": "Réponse 2", "correct": false }
    ],
    "explanation": "Explication de la réponse correcte"
}
```

#### Question avec graphique :
```json
{
    "question": "Quelle est la période de cette fonction ?",
    "level": "1reSpécialité",
    "theme": "Trigonométrie",
    "graphFunction": "Math.sin(x)",
    "graphParams": {
        "xMin": -6.28,
        "xMax": 6.28,
        "yMin": -1.5,
        "yMax": 1.5,
        "label": "y = sin(x)"
    },
    "answers": [
        { "text": "2π", "correct": true }
    ],
    "explanation": "Explication..."
}
```

#### Réponses avec formules mathématiques :
```json
"answers": [
    { "formula": "\\int x \\, dx", "correct": true },
    { "formula": "\\int x^2 \\, dx", "correct": false }
]
```

#### Réponses avec graphiques :
```json
"answers": [
    { 
        "graphFunction": "-x * x + 4",
        "graphParams": {
            "xMin": -3,
            "xMax": 3,
            "yMin": -2,
            "yMax": 5,
            "label": "A"
        },
        "correct": true 
    }
]
```

### Fonctions graphiques supportées

Vous pouvez utiliser toutes les fonctions JavaScript standard dans `graphFunction` :
- **Opérations** : `+`, `-`, `*`, `/`, `**` (puissance)
- **Math** : `Math.sin(x)`, `Math.cos(x)`, `Math.tan(x)`, `Math.sqrt(x)`, `Math.abs(x)`, `Math.exp(x)`, `Math.log(x)`
- **Exemples** : 
  - `"x * x"` → x²
  - `"2 * x + 3"` → ligne
  - `"Math.sin(2 * x)"` → sinus avec période modifiée
  - `"-x * x + 4"` → parabole inversée

## Modifier les niveaux et thèmes

Éditez directement les tableaux dans `script.js` :

```javascript
const levels = ['2de', '1re', '1reSpécialité', 'TleSpécialité'];
const themes = ['Fonctions', 'Dérivées', 'Intégrales', 'Équations', 'Géométrie', 'Trigonométrie'];
```

## Formules mathématiques

Utilisez la syntaxe LaTeX pour les formules. Exemples :
- `x^2` pour x²
- `\frac{a}{b}` pour a/b
- `\int_{0}^{1} x dx` pour une intégrale
- `\sqrt{x}` pour √x

## Scalabilité

Cette architecture permet de gérer facilement :
- ✅ Jusqu'à **1000+ questions** sans problème de performance
- ✅ Ajout/modification facile via JSON
- ✅ Maintenance simple (séparation données/code)
- ✅ Possibilité de diviser en plusieurs fichiers JSON par niveau si nécessaire

## Compatibilité

Compatible avec tous les navigateurs modernes :
- Chrome/Edge (recommandé)
- Firefox
- Safari
- Opera

## Licence

Ce projet est libre d'utilisation pour des fins éducatives.
