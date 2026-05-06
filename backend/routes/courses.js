const express = require('express');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Current user's profile + course info
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role,
              c.course_id, c.course_name, c.course_code
       FROM users u
       JOIN courses c ON u.course_id = c.course_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assigned mentor for the logged-in student
router.get('/mentor', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.email
       FROM mentorships m
       JOIN users u ON m.mentor_id = u.user_id
       WHERE m.mentee_id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No mentor assigned' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all mentees for the logged-in mentor
router.get('/mentees', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.email
       FROM mentorships m
       JOIN users u ON m.mentee_id = u.user_id
       WHERE m.mentor_id = $1`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Count of students enrolled in the same course as the logged-in user
router.get('/classmates/count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN users me ON me.user_id = $1 AND u.course_id = me.course_id
       WHERE u.role = 'student'`,
      [req.user.userId]
    );
    res.json({ count: parseInt(result.rows[0].total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
