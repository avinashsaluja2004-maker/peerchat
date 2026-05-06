const express = require('express');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Get announcements for a course
router.get('/:courseId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.announcement_id, a.content, a.created_at,
              u.name AS mentor_name, u.user_id AS mentor_id
       FROM announcements a
       JOIN users u ON a.mentor_id = u.user_id
       WHERE a.course_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [req.params.courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Post an announcement (mentors only)
router.post('/', auth, async (req, res) => {
  try {
    const { content, course_id } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Announcement content is required' });
    }

    // Fetch mentor details and verify role in one query
    const userResult = await pool.query(
      'SELECT name, role FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    if (!userResult.rows.length || userResult.rows[0].role !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can post announcements' });
    }
    const mentor_name = userResult.rows[0].name;

    const result = await pool.query(
      `INSERT INTO announcements (course_id, mentor_id, content)
       VALUES ($1, $2, $3)
       RETURNING announcement_id, content, created_at`,
      [course_id, req.user.userId, content.trim()]
    );

    const announcement = {
      ...result.rows[0],
      mentor_name,
      mentor_id: req.user.userId,
    };

    const io = req.app.get('io');
    io.to(`course_${course_id}`).emit('new_announcement', announcement);

    res.json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
