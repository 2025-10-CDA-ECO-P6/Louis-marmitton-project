import express from 'express'
import { Router } from 'express'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import dotenv from 'dotenv'
import { recipesRouter } from './routes/routes.js'
import { authRouter } from './routes/auth.js'

// Load environment variables
dotenv.config()

const app = express()
const port = 3000
app.use(express.json())

const apiRouter = Router()
apiRouter.use('/recipes', recipesRouter)
apiRouter.use('/auth', authRouter)
app.use('/api', apiRouter)

export const dbPromise = open({
  filename: './db.db',
  driver: sqlite3.Database
})

// Creation de la table recipes si elle n'existe pas
dbPromise.then(async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      temps_de_preparation INTEGER NOT NULL,
      difficulte INTEGER NOT NULL,
      budget INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `)
}).catch((err) => {
  console.error("Failed to create the recipes table:", err);
});

// Creation de la table ingredients si elle n'existe pas
dbPromise.then(async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL
    )
  `)
}).catch((err) => {
  console.error("Failed to create the ingredients table:", err);
});

// Creation de la table de jonction pour la relation many-to-many
dbPromise.then(async (db) => {
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
}).catch((err) => {
  console.error("Failed to create the recipe_ingredients table:", err);
});

// Creation de la table users pour l'authentification
dbPromise.then(async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}).catch((err) => {
  console.error("Failed to create the users table:", err);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
