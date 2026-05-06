const express = require('express');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

const STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'how', 'why', 'the', 'a',
  'an', 'and', 'but', 'or', 'for', 'nor', 'so', 'yet', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
  'to', 'of', 'in', 'on', 'at', 'by', 'from', 'with', 'about', 'this', 'that',
  'these', 'those', 'it', 'its', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'his', 'her', 'they', 'their', 'i', 'not', 'please', 'tell', 'explain',
  'describe', 'give', 'show', 'need', 'want', 'mean', 'means', 'like', 'just',
  'does', 'define', 'definition', 'example', 'examples', 'use', 'used', 'using'
]);

// Submit a question
router.post('/query', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || question.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a valid question' });
    }

    const userResult = await pool.query(
      'SELECT course_id FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { course_id } = userResult.rows[0];

    const keywords = question
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));

    if (keywords.length === 0) {
      const fallback = 'Your question is too general. Please ask something more specific about your course content.';
      const ins = await pool.query(
        `INSERT INTO ai_queries (user_id, question, response, source_reference, timestamp)
         VALUES ($1, $2, $3, NULL, NOW()) RETURNING query_id`,
        [req.user.userId, question.trim(), fallback]
      );
      return res.json({ response: fallback, source_reference: null, materials_found: false, question: question.trim(), query_id: ins.rows[0].query_id });
    }

    const wordPatterns = keywords.map(k => `\\y${k}\\y`);

    const conditions = wordPatterns
      .map((_, i) => `(LOWER(content) ~ $${i + 2} OR LOWER(title) ~ $${i + 2})`)
      .join(' OR ');

    const scoreExpr = wordPatterns
      .map((_, i) =>
        `(CASE WHEN LOWER(title) ~ $${i + 2} THEN 3 ELSE 0 END + ` +
        `CASE WHEN LOWER(content) ~ $${i + 2} THEN 1 ELSE 0 END)`
      )
      .join(' + ');

    const params = [course_id, ...wordPatterns];

    const materialsResult = await pool.query(
      `SELECT *, (${scoreExpr}) AS relevance_score
       FROM course_materials
       WHERE course_id = $1 AND (${conditions})
       ORDER BY relevance_score DESC
       LIMIT 1`,
      params
    );

    let response, source_reference, materials_found;

    if (materialsResult.rows.length === 0) {
      response = "I couldn't find any course materials that match your question. This topic may not be covered in the current course content — please ask your peer mentor for help instead.";
      source_reference = null;
      materials_found = false;
    } else {
      const material = materialsResult.rows[0];
      response = material.content;
      source_reference = material.source_reference;
      materials_found = true;
    }

    const ins = await pool.query(
      `INSERT INTO ai_queries (user_id, question, response, source_reference, timestamp)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING query_id`,
      [req.user.userId, question.trim(), response, source_reference]
    );

    res.json({ response, source_reference, materials_found, question: question.trim(), query_id: ins.rows[0].query_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit feedback on a response (1 = thumbs up, -1 = thumbs down)
router.post('/feedback/:queryId', auth, async (req, res) => {
  try {
    const { value } = req.body;
    if (value !== 1 && value !== -1) return res.status(400).json({ error: 'Invalid feedback value' });
    await pool.query(
      'UPDATE ai_queries SET feedback = $1 WHERE query_id = $2 AND user_id = $3',
      [value, req.params.queryId, req.user.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recent query history for the current user
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT query_id, question, response, source_reference, timestamp
       FROM ai_queries
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
