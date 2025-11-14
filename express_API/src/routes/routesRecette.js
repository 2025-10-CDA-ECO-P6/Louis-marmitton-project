import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const recipesRouter = Router()

recipesRouter.use(express.json(), checkToken)

// GET all recipes with Strapi-style pagination and filtering
recipesRouter.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 25, 
      populate, 
      filters = {} 
    } = req.query
    
    const offset = (page - 1) * pageSize
    const limit = parseInt(pageSize)
    
    // Build WHERE clause for filters
    let whereClause = ''
    let whereParams = []
    
    if (filters.budget && filters.budget.$eq) {
      whereClause = 'WHERE budget = ?'
      whereParams.push(filters.budget.$eq)
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM recipes ${whereClause}`
    const totalResult = await db.get(countQuery, whereParams)
    const total = totalResult.total
    
    // Get recipes with pagination
    const query = `SELECT * FROM recipes ${whereClause} ORDER BY id LIMIT ? OFFSET ?`
    const recipes = await db.all(query, [...whereParams, limit, offset])
    
    // Handle population
    let enrichedRecipes = recipes
    if (populate === '*' || populate === 'ingredients') {
      enrichedRecipes = await Promise.all(recipes.map(async (recipe) => {
        const ingredients = await db.all(`
          SELECT i.id, i.nom as name
          FROM ingredients i
          INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
          WHERE ri.recette_id = ?
        `, [recipe.id])
        
        return {
          id: recipe.id,
          documentId: recipe.documentId || `recipe_${recipe.id}`,
          attributes: {
            titre: recipe.titre,
            temps_de_preparation: recipe.temps_de_preparation,
            difficulte: recipe.difficulte,
            budget: recipe.budget,
            description: recipe.description,
            ...(populate === '*' || populate === 'ingredients' ? {
              ingredients: {
                data: ingredients.map(ing => ({
                  id: ing.id,
                  documentId: ing.documentId || `ingredient_${ing.id}`,
                  attributes: { name: ing.name }
                }))
              }
            } : {})
          }
        }
      }))
    } else {
      enrichedRecipes = recipes.map(recipe => ({
        id: recipe.id,
        documentId: recipe.documentId || `recipe_${recipe.id}`,
        attributes: {
          titre: recipe.titre,
          temps_de_preparation: recipe.temps_de_preparation,
          difficulte: recipe.difficulte,
          budget: recipe.budget,
          description: recipe.description
        }
      }))
    }
    
    const pageCount = Math.ceil(total / limit)
    
    res.json({
      data: enrichedRecipes,
      meta: {
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          pageCount,
          total
        }
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET recipe by ID with Strapi-style data format (supports both id and documentId)
recipesRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const { populate } = req.query
  
  try {
    // Try to find by id first, then by documentId if it exists
    let recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id])
    if (!recipe) {
      // If not found by id, try documentId (assuming documentId column exists)
      recipe = await db.get('SELECT * FROM recipes WHERE documentId = ?', [id])
    }
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    let responseData = {
      id: recipe.id,
      documentId: recipe.documentId || `recipe_${recipe.id}`, // Generate documentId if not exists
      attributes: {
        titre: recipe.titre,
        temps_de_preparation: recipe.temps_de_preparation,
        difficulte: recipe.difficulte,
        budget: recipe.budget,
        description: recipe.description
      }
    }
    
    // Handle population
    if (populate === '*' || populate === 'ingredients') {
      const ingredients = await db.all(`
        SELECT i.id, i.nom as name
        FROM ingredients i
        INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
        WHERE ri.recette_id = ?
      `, [id])
      
      responseData.attributes.ingredients = {
        data: ingredients.map(ing => ({
          id: ing.id,
          attributes: { name: ing.name }
        }))
      }
    }
    
    res.json({ data: responseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// POST new recipe with Strapi-style data format
recipesRouter.post('/', async (req, res) => {
  const { data } = req.body
  
  if (!data) {
    return res.status(400).json({ error: 'Request must include data object' })
  }
  
  const { titre, temps_de_preparation, difficulte, budget, description } = data
  
  if (!titre || temps_de_preparation === undefined || difficulte === undefined || budget === undefined) {
    return res.status(400).json({ error: 'Missing required fields: titre, temps_de_preparation, difficulte, budget' })
  }
  
  try {
    const result = await db.run(`
      INSERT INTO recipes (titre, temps_de_preparation, difficulte, budget, description)
      VALUES (?, ?, ?, ?, ?)
    `, [titre, temps_de_preparation, difficulte, budget, description])
    
    const newDocumentId = `recipe_${result.lastID}`
    
    // Update the record with documentId
    await db.run('UPDATE recipes SET documentId = ? WHERE id = ?', [newDocumentId, result.lastID])
    
    res.status(201).json({
      data: {
        id: result.lastID,
        documentId: newDocumentId,
        attributes: {
          titre,
          temps_de_preparation,
          difficulte,
          budget,
          description
        }
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// PUT update a recipe by ID with Strapi-style data format (supports documentId)
recipesRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { data } = req.body
  
  if (!data) {
    return res.status(400).json({ error: 'Request must include data object' })
  }
  
  // Get current recipe to merge with partial updates (try id first, then documentId)
  let currentRecipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id])
  if (!currentRecipe) {
    currentRecipe = await db.get('SELECT * FROM recipes WHERE documentId = ?', [id])
  }
  if (!currentRecipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  
  const {
    titre = currentRecipe.titre,
    temps_de_preparation = currentRecipe.temps_de_preparation,
    difficulte = currentRecipe.difficulte,
    budget = currentRecipe.budget,
    description = currentRecipe.description
  } = data
  
  try {
    const result = await db.run(`
      UPDATE recipes
      SET titre = ?, temps_de_preparation = ?, difficulte = ?, budget = ?, description = ?
      WHERE id = ?
    `, [titre, temps_de_preparation, difficulte, budget, description, id])
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    res.json({
      data: {
        id: currentRecipe.id,
        documentId: currentRecipe.documentId || `recipe_${currentRecipe.id}`,
        attributes: {
          titre,
          temps_de_preparation,
          difficulte,
          budget,
          description
        }
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE a recipe by ID (supports documentId)
recipesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // Try to delete by id first, then by documentId
    let result = await db.run('DELETE FROM recipes WHERE id = ?', [id])
    if (result.changes === 0) {
      result = await db.run('DELETE FROM recipes WHERE documentId = ?', [id])
    }
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
