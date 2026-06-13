# Système de Gestion des Fiches Matériel (FGM) - VIPNET

Un système complet de gestion numérique des fiches d'entrée/sortie de matériel avec workflow de signatures digitales sécurisé.

## 🚀 Fonctionnalités

- **Gestion des Fiches** : Création, modification et consultation des fiches matériel
- **Signatures Digitales** : Canvas interactif avec import d'images pour signatures
- **Workflow Sécurisé** : Signatures obligatoires (Demandeur + DG) et optionnelles
- **Impression Professionnelle** : Format demi-page A4 fidèle au modèle PDF
- **Authentification RBAC** : Gestion des rôles et permissions
- **Interface Responsive** : Optimisée pour desktop et mobile
- **Historique Complet** : Suivi des modifications et signatures

## 📋 Prérequis

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13.0
- **npm** ou **yarn**

## 🛠️ Installation

### 1. Cloner le dépôt
```bash
git clone <repository-url>
cd fgm-system
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de la base de données PostgreSQL

#### Créer la base de données
```sql
CREATE DATABASE Vipnet_fiche;
CREATE USER fgm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE Vipnet_fiche TO fgm_user;
```

#### Exécuter le script SQL
```bash
psql -U fgm_user -d Vipnet_fiche -f supabase/migrations/20250628135034_pale_fountain.sql
```

### 4. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Server Configuration
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here

# Database Configuration
DB_USER=fgm_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Vipnet_fiche

# Frontend Configuration (optionnel)
VITE_API_URL=http://localhost:5000/api
```

### 5. Démarrer l'application

#### Mode développement (recommandé)
```bash
npm run dev
```
Cette commande démarre simultanément le serveur backend et le client frontend.

#### Mode production
```bash
# Build du frontend
npm run build

# Démarrer le serveur backend
npm run dev:server
```

## 🎯 Utilisation

### Accès à l'application
- **URL** : http://localhost:3000
- **API** : http://localhost:5000/api

### Comptes par défaut
Après l'installation, vous pouvez créer des comptes via l'interface d'inscription ou utiliser les comptes de test (si configurés).

### Workflow des signatures

1. **Demandeur** : Crée une fiche et la signe
2. **Signataires optionnels** : Peuvent signer selon leurs rôles
3. **DG** : Signature finale qui verrouille la fiche

## 👥 Rôles et Permissions

| Rôle | Permissions |
|------|-------------|
| **Demandeur** | Créer, modifier, supprimer ses fiches (avant validation DG) |
| **DG** | Signer et valider toutes les fiches |
| **Suppléteur Hiderctrique** | Consulter et signer les fiches |
| **Contrôle Qualité** | Consulter et signer les fiches |
| **Contrôle Gestion** | Consulter et signer les fiches |
| **Directeur Filiale** | Consulter et signer les fiches |
| **Magasinier** | Consulter et signer les fiches |

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/          # Composants React
│   ├── Dashboard.tsx    # Tableau de bord
│   ├── FDPForm.tsx     # Formulaire de création
│   ├── FDPDetail.tsx   # Détail et signatures
│   ├── Layout.tsx      # Layout principal
│   ├── Login.tsx       # Authentification
│   ├── Register.tsx    # Inscription
│   └── SignatureCanvas.tsx # Canvas de signature
├── context/            # Contextes React
├── api/               # Configuration API
├── types/             # Types TypeScript
└── App.tsx           # Composant principal
```

### Backend (Node.js + Express)
```
server/
└── index.ts          # Serveur Express avec API REST
```

### Base de données (PostgreSQL)
```
Tables principales :
├── users              # Utilisateurs et rôles
├── fiches            # Fiches matériel
└── signatures        # Signatures digitales
```

## 🔧 Scripts disponibles

```bash
# Développement (client + serveur)
npm run dev

# Client uniquement
npm run dev:client

# Serveur uniquement
npm run dev:server

# Build production
npm run build

# Linting
npm run lint

# Preview production
npm run preview
```

## 🔒 Sécurité

- **Authentification JWT** avec expiration
- **Hachage des mots de passe** avec bcrypt
- **Validation des entrées** côté client et serveur
- **Protection CORS** configurée
- **Vérification des rôles** sur chaque endpoint

## 📱 Responsive Design

L'application est optimisée pour :
- **Desktop** : Interface complète avec sidebar
- **Tablet** : Layout adaptatif
- **Mobile** : Interface mobile-first avec navigation hamburger

## 🖨️ Impression

- **Format** : Demi-page A4 (économie papier)
- **Fidélité** : Reproduction exacte du modèle PDF
- **Optimisation** : CSS print spécialisé

## 🐛 Dépannage

### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Vérifier les permissions
psql -U fgm_user -d Vipnet_fiche -c "SELECT 1;"
```

### Port déjà utilisé
```bash
# Changer le port dans .env
PORT=5001

# Ou tuer le processus
lsof -ti:5000 | xargs kill -9
```

### Problèmes de dépendances
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 📊 Monitoring et Logs

Les logs sont affichés dans la console en mode développement. Pour la production, configurez un système de logging approprié.

## 🚀 Déploiement

### Variables d'environnement production
```env
NODE_ENV=production
JWT_SECRET=your-production-secret
DB_HOST=your-production-db-host
# ... autres variables
```

### Build et déploiement
```bash
npm run build
# Déployer le dossier dist/ et server/
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- **Email** : support@vipnet.bf
- **Documentation** : Voir ce README
- **Issues** : Utiliser le système d'issues GitHub

## 🔄 Changelog

### Version 1.0.0
- ✅ Système d'authentification complet
- ✅ Gestion des fiches matériel
- ✅ Workflow de signatures digitales
- ✅ Interface responsive
- ✅ Impression professionnelle
- ✅ Base de données PostgreSQL

---



--------------------------------------------
FEB/
│
├── .bolt/
├── server/
│ └── index.ts
├── src/
│ ├── api/
│ │ └── index.ts
│ │
│ ├── components/
│ │ ├── Dashboard.tsx
│ │ ├── FDPDetail.tsx
│ │ ├── FDPForm.tsx
│ │ ├── Layout.tsx
│ │ ├── Login.tsx
│ │ └── SignatureCanvas.tsx
│ │ └── Register.tsx
│ │
│ ├── context/
│ │ └── AuthContext.tsx
│ │
│ ├── types/
│ │ └── index.ts
│ │
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ └── vite-env.d.ts
│
├── codesql/
│ └── code.sql
│
├── .env
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts

**Développé avec ❤️ pour VIPNET**


