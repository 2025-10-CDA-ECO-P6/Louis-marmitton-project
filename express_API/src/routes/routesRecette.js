import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const recipesRouter = Router()

recipesRouter.use(express.json(), checkToken)

// GET all recipes
recipesRouter.get('/', async (req, res) => {
  const recipes = await db.all('SELECT * FROM recipes')
  res.json(recipes)
})

// GET recipe by ID
recipesRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id])
  res.json(recipe)
})


// POST new recipe
recipesRouter.post('/', async (req, res) => {
  const { titre, temps_de_preparation, difficulte, budget, description } = req.body
  const result = await db.run(`
    INSERT INTO recipes (titre, temps_de_preparation, difficulte, budget, description)
    VALUES (?, ?, ?, ?, ?)
  `, [titre, temps_de_preparation, difficulte, budget, description])
  res.status(201).json({
    id: result.lastID,
    titre,
    temps_de_preparation,
    difficulte,
    budget,
    description
  })
})


// PUT update a recipe by ID
recipesRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { titre, temps_de_preparation, difficulte, budget, description } = req.body
  await db.run(`
    UPDATE recipes
    SET titre = ?, temps_de_preparation = ?, difficulte = ?, budget = ?, description = ?
    WHERE id = ?
  `, [titre, temps_de_preparation, difficulte, budget, description, id])
  res.json({
    id,
    titre,
    temps_de_preparation,
    difficulte,
    budget,
    description
  })
})

// DELETE a recipe by ID
recipesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  await db.run('DELETE FROM recipes WHERE id = ?', [id])
  res.status(204).end()
})
