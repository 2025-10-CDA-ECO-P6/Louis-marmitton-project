# Marmitton Project

## Objectif du Projet

Créer une API RESTful pour gérer des recettes de cuisine avec opérations CRUD (Create, Read, Update, Delete).

### Technologies utilisées
- **Strapi** : Headless CMS pour la gestion de contenu
- **Express.js** : Framework Node.js pour créer l'API
- **SQLite** : Base de données relationnelle
- **JWT** : Authentification sécurisée

---

## Étapes de Réalisation

### Phase 1 : Strapi

1. **Installation et configuration**
   - Créer un nouveau projet Strapi
   
2. **Création de la collection "recettes"**
   - Champs : titre, temps de préparation, difficulté, budget, description
   
3. **Ajout de recettes**
   - Source : https://encuisine.adrienrossignol.fr/recette/ (recettes 1 à 45)
   - Utiliser REST Client VSCode pour insérer les données
   
4. **Sécurisation**
   - Comprendre l'implementaion des JWT pour l'authentification avec lkes endpoint crée dans strapi
   
5. **Documentation**
   - Ajouter Swagger via le plugin Documentation

6. **Bonus**
   - GraphQL --> a faire
   - Scraping avec Puppeteer --> a faire

### Phase 2 : Express

1. **Setup du projet**
   ```bash
   npm init -y
   npm install express sqlite3 sqlite bcrypt dotenv jsonwebtoken
   ```
   - Ajouter `"type": "module"` dans package.json

2. **Base de données SQLite**
   - Créer les tables : utilisateurs et recettes
   - Crées dasn le ficher index.js ligne 27 - 80
   
3. **Routes CRUD**
   - Implémenter les opérations pour les recettes
   
4. **Authentification**
   - Ajouter JWT:
        - création de nouvelles routes (/auth/local/register /auth/local) 
        - Implémentation des routes dans index.js
   - Configuration des routes protégé par JWT:
        - création de "Middleware" qui sont des fonction que l'on peut insérer dans les endpoint désirer 
        - Insertion des middleware dasn les enpoint a protegé examnple (/recipes /ingredients ...)
   
5. **Relations (avancé)**
   - Ajouter la gestion des ingrédients
   - Créer les relations entre recettes et ingrédients

---

## Structure du Projet

- `my-strapi-project/` : API Strapi
- `express_API/` : API Express personnalisée
