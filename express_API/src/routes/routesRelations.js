import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const recipeIngredientsRouter = Router()

recipeIngredientsRouter.use(express.json(), checkToken)

// GET all ingredients pour une recette
recipeIngredientsRouter.get('/recipe/:recipeId/ingredients', async (req, res) => {
  const { recipeId } = req.params
  
  const ingredients = await db.all(`
    SELECT i.id, i.nom, ri.id as recipe_ingredient_id
    FROM ingredients i
    INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
    WHERE ri.recette_id = ?
  `, [recipeId])
  
  res.json(ingredients)
})

// GET all recettes pour un ingredient specifique
recipeIngredientsRouter.get('/ingredient/:ingredientId/recipes', async (req, res) => {
  const { ingredientId } = req.params
  
  const recipes = await db.all(`
    SELECT r.id, r.titre, r.temps_de_preparation, r.difficulte, r.budget, r.description
    FROM recipes r
    INNER JOIN recipe_ingredients ri ON r.id = ri.recette_id
    WHERE ri.ingredient_id = ?
  `, [ingredientId])
  
  res.json(recipes)
})

// POST add an ingredient to a recipe
recipeIngredientsRouter.post('/recipe/:recipeId/ingredient/:ingredientId', async (req, res) => {
  const { recipeId, ingredientId } = req.params
  
  try {
    const result = await db.run(`
      INSERT INTO recipe_ingredients (recette_id, ingredient_id)
      VALUES (?, ?)
    `, [recipeId, ingredientId])
    
    res.status(201).json({
      id: result.lastID,
      recette_id: recipeId,
      ingredient_id: ingredientId,
      message: 'Ingredient added to recipe successfully'
    })
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'This ingredient is already associated with this recipe' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// POST add multiple ingredients to a recipe at once
recipeIngredientsRouter.post('/recipe/:recipeId/ingredients', async (req, res) => {
  const { recipeId } = req.params
  const { ingredientIds } = req.body // Expected to be an array of ingredient IDs
  
  if (!Array.isArray(ingredientIds)) {
    return res.status(400).json({ error: 'ingredientIds must be an array' })
  }
  
  try {
    const insertPromises = ingredientIds.map(ingredientId => 
      db.run(`
        INSERT INTO recipe_ingredients (recette_id, ingredient_id)
        VALUES (?, ?)
      `, [recipeId, ingredientId])
    )
    
    await Promise.all(insertPromises)
    
    res.status(201).json({
      message: `${ingredientIds.length} ingredients added to recipe successfully`,
      recette_id: recipeId,
      added_ingredient_ids: ingredientIds
    })
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'One or more ingredients are already associated with this recipe' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// DELETE remove an ingredient from a recipe
recipeIngredientsRouter.delete('/recipe/:recipeId/ingredient/:ingredientId', async (req, res) => {
  const { recipeId, ingredientId } = req.params
  
  await db.run(`
    DELETE FROM recipe_ingredients
    WHERE recette_id = ? AND ingredient_id = ?
  `, [recipeId, ingredientId])
  
  res.status(204).end()
})

// DELETE remove all ingredients from a recipe
recipeIngredientsRouter.delete('/recipe/:recipeId/ingredients', async (req, res) => {
  const { recipeId } = req.params
  
  await db.run(`
    DELETE FROM recipe_ingredients
    WHERE recette_id = ?
  `, [recipeId])
  
  res.status(204).end()
})  
