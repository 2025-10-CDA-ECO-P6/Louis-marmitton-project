import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const ingredientsRouter = Router()

ingredientsRouter.use(express.json(), checkToken)

// GET ingredients
ingredientsRouter.get('/', async (req, res) => {
  const ingredients = await db.all('SELECT * FROM ingredients')
  res.json(ingredients)
})

ingredientsRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const ingredient = await db.get('SELECT * FROM ingredients WHERE id = ?', [id])
  res.json(ingredient)
})

// POST new ingredient
ingredientsRouter.post('/', async (req, res) => {
  const { nom } = req.body
  const result = await db.run(`
    INSERT INTO ingredients (nom)
    VALUES (?)
  `, [nom])
  res.status(201).json({
    id: result.lastID,
    nom
  })
})

// PUT update an ingredient by ID
ingredientsRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { nom } = req.body
  await db.run(`
    UPDATE ingredients
    SET nom = ?
    WHERE id = ?
  `, [nom, id])
  res.json({
    id,
    nom
  })
})

// DELETE an ingredient by ID
ingredientsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  await db.run('DELETE FROM ingredients WHERE id = ?', [id])
  res.status(204).end()
})
