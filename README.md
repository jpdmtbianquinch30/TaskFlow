# TaskFlow

Application web de **gestion de projets et de tâches d'équipe** (M1 Génie Logiciel, séminaire Frontend 2025/2026).

- **Frontend** : Angular 22 (composants standalone, signals, Angular Material)
- **Données** : json-server (`db.json`)
- **Authentification et emails** : petit backend Node/Express (`backend/`)

---

## 1. Démarrage rapide

**Prérequis** : Node.js **22.22.3 ou plus** et npm.

```powershell
# 1. Installer les dépendances (frontend + backend)
npm install
npm install --prefix backend

# 2. Créer la configuration du backend
copy backend\.env.example backend\.env
```

Ouvrir `backend\.env` et remplir :

| Variable | Quoi mettre |
|---|---|
| `JWT_SECRET` | une clé de 32 caractères minimum. Pour en générer une : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | les identifiants d'un compte gratuit sur https://ethereal.email (il capture les emails sans les envoyer) |

```powershell
# 3. Tout lancer d'un coup
npm run dev
```

| Service | Adresse |
|---|---|
| Application Angular | http://localhost:4200 |
| json-server (projets, tâches, commentaires) | http://localhost:3000 |
| API d'authentification | http://localhost:4000 |

### Comptes de démonstration

Créés automatiquement au premier lancement du backend, déjà confirmés :

| Email | Mot de passe |
|---|---|
| `moustapha@taskflow.dev` | `moustapha123` |
| `sokhna@taskflow.dev` | `sokhna123` |
| `jean@taskflow.dev` | `jean123` |
| `mameaby@taskflow.dev` | `mameaby123` |

Les projets de `db.json` appartiennent à `moustapha@taskflow.dev`.

### Problèmes fréquents

| Message | Solution |
|---|---|
| `node: .env: not found` | Le fichier `backend\.env` n'existe pas (étape 2). |
| `Variables manquantes dans backend/.env` | Une variable du tableau ci-dessus est vide. |
| `EADDRINUSE` / `Port 4200 is already in use` | Une ancienne instance tourne encore. Trouver le processus : `netstat -ano \| findstr ":3000 :4200 :4000"`, puis `taskkill /PID <pid> /F`. |
| `The Angular CLI requires a minimum Node.js version` | Mettre à jour Node (22.22.3 minimum). |

---

## 2. Ce que fait l'application

Chaque utilisateur a un compte. Le menu contient **Accueil**, **Mes projets** et **Mes assignations**.

### Mes projets (ce que je crée)
- Je ne vois **que mes propres projets**, répartis en trois colonnes : **Actif / En pause / Terminé**.
- Je change le statut d'un projet par **glisser-déposer** d'une colonne à l'autre. Le statut est enregistré sur le projet : les personnes assignées le voient aussi.
- Je peux filtrer par statut et créer un nouveau projet.
- Dans un projet, je vois la liste des tâches, **filtrable par priorité**, et un bouton **Ajouter une tâche**.
- Créer ou modifier une tâche se fait sur une **page séparée**. Une tâche contient : titre, description, priorité (basse, moyenne, haute, urgente), assigné(s) par **email** et date limite. Il n'y a pas de statut. Tous ces champs sont obligatoires.
- Seul le créateur du projet peut ajouter, modifier ou supprimer ses tâches.

### Mes assignations (ce que les autres m'ont confié)
- Je vois les projets où une tâche m'a été assignée.
- Dans un projet, je ne vois **que mes tâches** et leurs informations.
- Je ne peux **ni ajouter, ni modifier, ni supprimer**, mais je peux **commenter**.

### Commentaires
Les commentaires d'une tâche sont visibles par le créateur du projet et par tous les assignés de la tâche.

---

## 3. Pages (routes)

| Route | Page | Accès |
|---|---|---|
| `/` | Accueil (futur tableau de bord) | public |
| `/login`, `/register` | Connexion, inscription | public |
| `/verify-email`, `/forgot-password`, `/reset-password` | Confirmation d'email, mot de passe oublié | public |
| `/projects` | Mes projets (colonnes + filtre) | connecté |
| `/projects/new` | Nouveau projet | connecté |
| `/projects/:id` | Un de mes projets : liste des tâches | connecté, créateur |
| `/projects/:id/tasks/new` | Nouvelle tâche | connecté, créateur |
| `/projects/:id/tasks/:taskId/edit` | Modifier une tâche | connecté, créateur |
| `/assignments` | Mes assignations | connecté |
| `/assignments/:id` | Un projet assigné (lecture seule + commentaires) | connecté, assigné |

---

## 4. Organisation du code

```
backend/                     API d'authentification (Node/Express) : routes /auth/*, emails, utilisateurs
db.json                      Données json-server : projects, tasks, comments
src/app/
├── core/                    Ce qui sert à toute l'application
│   ├── auth/                AuthService (session JWT), modèle User
│   ├── users/               UsersService (liste des membres)
│   ├── guard/               authGuard : protège /projects et /assignments
│   ├── interceptors/        authInterceptor (jeton), errorInterceptor (401)
│   ├── layout/header/       Barre de navigation
│   └── utils/query.ts       Aides pour construire les requêtes json-server
├── features/
│   ├── auth/                Connexion, inscription, mot de passe oublié
│   ├── home/                Accueil
│   ├── projects/            Mes projets
│   │   ├── pages/           project-list (colonnes), project-form, project-detail
│   │   ├── components/      project-card, project-preview
│   │   └── services/        ProjetsService
│   ├── tasks/               Tâches et commentaires
│   │   ├── pages/           task-form-page (création / modification)
│   │   ├── components/      task-form, task-item, task-comments
│   │   └── services/        TasksService, CommentsService
│   └── assignments/         Mes assignations
│       ├── pages/           assignment-list, assignment-detail
│       └── services/        AssignmentsService
└── shared/components/       Composants réutilisables (panel)
```

Les routes sont définies dans `src/app/app.routes.ts` (chargement paresseux).

### Modèle de données

```ts
interface Project {
  id: number;
  name: string;
  description: string;
  status: 'actif' | 'en_pause' | 'termine';
  tasksCount: number;
  ownerEmail: string;   // créateur, en minuscules
  ownerName: string;
}

interface Task {         // pas de statut
  id: number;
  projectId: number;
  title: string;
  description: string;
  priority: 'basse' | 'moyenne' | 'haute' | 'urgente';
  assigneeEmails: string[];
  dueDate: string;       // AAAA-MM-JJ
  createdAt: string;
}

interface TaskComment {
  id: number;
  taskId: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}
```

### Qui voit quoi : où c'est géré

| Règle | Fichier |
|---|---|
| Mes projets = ceux dont je suis le créateur | `ProjetsService.loadMine()` et `isOwner()` |
| Changement de statut par glisser-déposer | `ProjectList.onDrop()` et `ProjetsService.updateStatus()` |
| Mes tâches assignées et leurs projets | `AssignmentsService.load()` |
| Lecture seule pour l'assigné | `TaskItem` avec `editable = false` |
| Champs obligatoires d'une tâche | `TaskForm` |
| Email assigné = compte existant | `AuthService.emailExists()` |

---

## 5. Authentification (backend)

| Route | Rôle |
|---|---|
| `POST /auth/register` | Inscription : le compte reste inactif tant que l'email n'est pas confirmé |
| `POST /auth/verify-email` | Confirmation via le lien reçu par email |
| `POST /auth/login` | Connexion : renvoie un JWT (valable 1 h) |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Mot de passe oublié |
| `GET /auth/email-exists?email=` | Un compte existe-t-il avec cet email ? |
| `GET /auth/users` | Liste des membres (réservée aux connectés) |

Règle de mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre. Les mots de passe sont hachés (bcrypt), les liens par email sont à usage unique et expirent.

Avec Ethereal, aucun vrai email n'est envoyé : l'aperçu s'affiche sous forme de lien dans la console du backend.

---

## 6. Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Lance Angular, json-server et le backend ensemble |
| `npm start` | Angular seul |
| `npm run api` | json-server seul |
| `npm run auth` | Backend d'authentification seul |
| `npx ng test --watch=false` | Lance les tests unitaires (Vitest) une seule fois |
| `npx ng build` | Compile pour vérifier qu'il n'y a pas d'erreur |

Les tests actuels couvrent les services (projets, assignations), les pages principales et les composants de base. La CI GitHub Actions (`.github/workflows/ci.yml`) construit et teste à chaque push.

---

## 7. Tester à la main

Ouvrir deux sessions : une fenêtre normale (`moustapha@taskflow.dev`) et une fenêtre privée (`jean@taskflow.dev`).

1. **Moustapha** crée un projet, puis une tâche assignée à `jean@taskflow.dev`.
2. **Jean** ouvre « Mes assignations » : le projet et la tâche apparaissent, sans bouton de modification.
3. **Jean** écrit un commentaire. **Moustapha** le voit et répond.
4. **Moustapha** glisse le projet dans « Terminé ». **Jean** recharge la page : le statut a changé.
5. **Jean** essaie d'ouvrir `/projects/<id>` du projet de Moustapha : « Ce projet n'existe pas ».

---

## 8. Limites connues

- **json-server n'applique aucune règle d'accès.** Le filtrage « mes projets » et « mes assignations » est fait par les requêtes du front : quelqu'un qui appelle `http://localhost:3000` directement peut tout lire. Une vraie application ferait ces vérifications dans l'API Node avec le JWT.
- Les changements d'un utilisateur n'apparaissent pas en direct chez les autres : il faut recharger la page.
- Le JWT est stocké dans le `localStorage` et ne peut pas être révoqué avant son expiration.
- Les utilisateurs sont dans un fichier JSON (`backend/data/users.json`) : suffisant pour un projet de cours, à remplacer par une vraie base de données.

---

## 9. Feuille de route

- Tableau de bord sur l'accueil (graphiques de suivi des performances).
- Filtre des projets par date.
- Email envoyé à la personne quand une tâche lui est assignée.
- Projets et tâches derrière l'API Node, avec vérification du JWT.

---

*Projet pédagogique : M1 Génie Logiciel, séminaire Frontend 2025/2026.*
