const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Guard — all admin routes require role=admin
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
});

// Platform stats
router.get('/stats', async (req, res) => {
  try {
    const [users, messages, queries, courses] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM messages'),
      pool.query('SELECT COUNT(*) FROM ai_queries'),
      pool.query('SELECT COUNT(*) FROM courses'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalMessages: parseInt(messages.rows[0].count),
      totalQueries: parseInt(queries.rows[0].count),
      totalCourses: parseInt(courses.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All users with course name
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.course_id, c.course_name
       FROM users u
       LEFT JOIN courses c ON u.course_id = c.course_id
       ORDER BY u.role, u.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All courses (for dropdowns)
router.get('/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT course_id, course_name FROM courses ORDER BY course_name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change a user's course
router.put('/users/:userId/course', async (req, res) => {
  try {
    const { courseId } = req.body;
    await pool.query('UPDATE users SET course_id = $1 WHERE user_id = $2', [courseId, req.params.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset a user's password
router.put('/users/:userId/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, req.params.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI query feed with optional feedback filter
router.get('/ai-queries', async (req, res) => {
  try {
    const { feedback } = req.query;
    let query = `
      SELECT q.query_id, q.question, q.response, q.source_reference, q.timestamp, q.feedback,
             u.name AS user_name, u.email AS user_email
      FROM ai_queries q
      JOIN users u ON q.user_id = u.user_id
    `;
    const params = [];
    if (feedback === 'positive') {
      query += ' WHERE q.feedback = 1';
    } else if (feedback === 'negative') {
      query += ' WHERE q.feedback = -1';
    } else if (feedback === 'none') {
      query += ' WHERE q.feedback IS NULL';
    }
    query += ' ORDER BY q.timestamp DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
