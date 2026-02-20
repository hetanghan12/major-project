/**
 * AI Routes
 * ===========
 * Defines routes for AI assistant queries.
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();

const { queryAI, getChatHistory, healthCheck } = require('../controllers/ai.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

/**
 * @route   GET /api/ai/health
 * @desc    Health check for AI service
 * @access  Public
 */
router.get('/health', healthCheck);

// Protected routes require authentication
router.use(verifyFirebaseToken);

/**
 * @route   POST /api/ai/query
 * @desc    Query AI assistant with user's question
 * @access  Protected
 * 
 * SECURITY: The AI only uses documents from the current user's namespace.
 * No data leakage between users is possible.
 * 
 * Request body:
 * {
 *   "question": "string" - The user's question
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "answer": "string" - AI generated response,
 *   "sources": ["string"] - Document names used for the response
 * }
 */
router.post('/query', queryAI);

/**
 * @route   GET /api/ai/history
 * @desc    Get chat history for current user
 * @access  Protected
 */
router.get('/history', getChatHistory);

module.exports = router;
