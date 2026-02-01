# Quiz Mathématiques - Application Web

Une application web interactive pour afficher des quiz mathématiques avec support des formules mathématiques (via KaTeX) et des graphiques de fonctions (via Chart.js).

## Fonctionnalités

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
├── index.html        # Page principale
├── styles.css        # Feuille de styles
├── script.js         # Logique de l'application
├── questions.json    # Base de données des questions
└── README.md         # Documentation
```

## Comment utiliser

1. Ouvrez le fichier `index.html` dans votre navigateur web (via serveur HTTP)
2. Sélectionnez un niveau et un thème
3. Cliquez sur "Démarrer le quiz"
4. Répondez aux questions
5. Naviguez entre les questions avec les boutons
6. Consultez vos résultats à la fin

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
