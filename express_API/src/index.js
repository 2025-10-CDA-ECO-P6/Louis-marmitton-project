import express from 'express'
import { Router } from 'express'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import dotenv from 'dotenv'
import { recipesRouter } from './routes/routesRecette.js'
import { ingredientsRouter } from './routes/routesIgredients.js'
import { recipeIngredientsRouter } from './routes/routesRelations.js'
import { authRouter } from './routes/auth.js'

// Load environment variables
dotenv.config()

const app = express()
const port = 3000
app.use(express.json())

const apiRouter = Router()
apiRouter.use('/recipes', recipesRouter)
apiRouter.use('/ingredients', ingredientsRouter)
apiRouter.use('/recipe-ingredients', recipeIngredientsRouter)
apiRouter.use('/auth', authRouter)
app.use('/api', apiRouter)

export const db = await open({
  filename: './db.db',
  driver: sqlite3.Database
})

// Creation de la table recipes si elle n'existe pas
await db.run(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documentId TEXT UNIQUE,
    titre TEXT NOT NULL,
    temps_de_preparation INTEGER NOT NULL,
    difficulte INTEGER NOT NULL,
    budget INTEGER NOT NULL,
    description TEXT NOT NULL
  )
`)

// Add documentId column to existing recipes if it doesn't exist
try {
  await db.run('ALTER TABLE recipes ADD COLUMN documentId TEXT UNIQUE')
} catch (error) {
  // Column already exists, ignore error
}

// Creation de la table ingredients si elle n'existe pas
await db.run(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documentId TEXT UNIQUE,
    nom TEXT NOT NULL
  )
`)

// Add documentId column to existing ingredients if it doesn't exist
try {
  await db.run('ALTER TABLE ingredients ADD COLUMN documentId TEXT UNIQUE')
} catch (error) {
  // Column already exists, ignore error
}

// Creation de la table de jonction pour la relation many-to-many
await db.run(`
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recette_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    FOREIGN KEY (recette_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE(recette_id, ingredient_id)
  )
`)

// Creation de la table users pour l'authentification
await db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
