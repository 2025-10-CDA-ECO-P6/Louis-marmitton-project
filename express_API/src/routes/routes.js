import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const recipesRouter = Router()
export const ingredientsRouter = Router()
export const recipeIngredientsRouter = Router()

recipesRouter.use(express.json(), checkToken)
recipeIngredientsRouter.use(express.json(), checkToken)
ingredientsRouter.use(express.json(), checkToken)

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


// ============================================
// RECIPE-INGREDIENTS ROUTES RELATIONNEL
// ============================================

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
