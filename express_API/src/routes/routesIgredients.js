import express from 'express'
import { Router } from 'express'
import { db } from '../index.js'
import { checkToken } from '../middleware/checkToken.js'

export const ingredientsRouter = Router()

ingredientsRouter.use(express.json(), checkToken)

// GET ingredients with Strapi-style pagination
ingredientsRouter.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 25, 
      populate 
    } = req.query
    
    const offset = (page - 1) * pageSize
    const limit = parseInt(pageSize)
    
    // Get total count
    const totalResult = await db.get('SELECT COUNT(*) as total FROM ingredients')
    const total = totalResult.total
    
    // Get ingredients with pagination
    const ingredients = await db.all('SELECT * FROM ingredients ORDER BY id LIMIT ? OFFSET ?', [limit, offset])
    
    // Handle population
    let enrichedIngredients = ingredients
    if (populate === '*' || populate === 'recipes') {
      enrichedIngredients = await Promise.all(ingredients.map(async (ingredient) => {
        const recipes = await db.all(`
          SELECT r.id, r.titre, r.temps_de_preparation, r.difficulte, r.budget, r.description
          FROM recipes r
          INNER JOIN recipe_ingredients ri ON r.id = ri.recette_id
          WHERE ri.ingredient_id = ?
        `, [ingredient.id])
        
        return {
          id: ingredient.id,
          documentId: ingredient.documentId || `ingredient_${ingredient.id}`,
          attributes: {
            name: ingredient.nom,
            ...(populate === '*' || populate === 'recipes' ? {
              recipes: {
                data: recipes.map(recipe => ({
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
            } : {})
          }
        }
      }))
    } else {
      enrichedIngredients = ingredients.map(ingredient => ({
        id: ingredient.id,
        documentId: ingredient.documentId || `ingredient_${ingredient.id}`,
        attributes: {
          name: ingredient.nom
        }
      }))
    }
    
    const pageCount = Math.ceil(total / limit)
    
    res.json({
      data: enrichedIngredients,
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

ingredientsRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const { populate } = req.query
  
  try {
    // Try to find by id first, then by documentId
    let ingredient = await db.get('SELECT * FROM ingredients WHERE id = ?', [id])
    if (!ingredient) {
      ingredient = await db.get('SELECT * FROM ingredients WHERE documentId = ?', [id])
    }
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' })
    }
    
    let responseData = {
      id: ingredient.id,
      documentId: ingredient.documentId || `ingredient_${ingredient.id}`,
      attributes: {
        name: ingredient.nom
      }
    }
    
    // Handle population
    if (populate === '*' || populate === 'recipes') {
      const recipes = await db.all(`
        SELECT r.id, r.titre, r.temps_de_preparation, r.difficulte, r.budget, r.description
        FROM recipes r
        INNER JOIN recipe_ingredients ri ON r.id = ri.recette_id
        WHERE ri.ingredient_id = ?
      `, [id])
      
      responseData.attributes.recipes = {
        data: recipes.map(recipe => ({
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
    }
    
    res.json({ data: responseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST new ingredient with Strapi-style data format
ingredientsRouter.post('/', async (req, res) => {
  const { data } = req.body
  
  if (!data) {
    return res.status(400).json({ error: 'Request must include data object' })
  }
  
  const { name, nom } = data
  const ingredientName = name || nom // Support both name (Strapi schema) and nom (legacy)
  
  if (!ingredientName) {
    return res.status(400).json({ error: 'Missing name field' })
  }
  
  try {
    const result = await db.run(`
      INSERT INTO ingredients (nom)
      VALUES (?)
    `, [ingredientName])
    
    const newDocumentId = `ingredient_${result.lastID}`
    
    // Update the record with documentId
    await db.run('UPDATE ingredients SET documentId = ? WHERE id = ?', [newDocumentId, result.lastID])
    
    res.status(201).json({
      data: {
        id: result.lastID,
        documentId: newDocumentId,
        attributes: {
          name: ingredientName
        }
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT update an ingredient by ID with Strapi-style data format (supports documentId)
ingredientsRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { data } = req.body
  
  if (!data) {
    return res.status(400).json({ error: 'Request must include data object' })
  }
  
  const { name, nom } = data
  const ingredientName = name || nom // Support both name (Strapi schema) and nom (legacy)
  
  if (!ingredientName) {
    return res.status(400).json({ error: 'Missing name field' })
  }
  
  try {
    // Find ingredient by id or documentId
    let ingredient = await db.get('SELECT * FROM ingredients WHERE id = ?', [id])
    if (!ingredient) {
      ingredient = await db.get('SELECT * FROM ingredients WHERE documentId = ?', [id])
    }
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' })
    }
    
    const result = await db.run(`
      UPDATE ingredients
      SET nom = ?
      WHERE id = ?
    `, [ingredientName, ingredient.id])
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ingredient not found' })
    }
    
    res.json({
      data: {
        id: ingredient.id,
        documentId: ingredient.documentId || `ingredient_${ingredient.id}`,
        attributes: {
          name: ingredientName
        }
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE an ingredient by ID (supports documentId)
ingredientsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // Try to delete by id first, then by documentId
    let result = await db.run('DELETE FROM ingredients WHERE id = ?', [id])
    if (result.changes === 0) {
      result = await db.run('DELETE FROM ingredients WHERE documentId = ?', [id])
    }
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ingredient not found' })
    }
    
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
