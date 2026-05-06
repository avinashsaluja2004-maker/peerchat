const express = require('express');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Get mentor profile — accessible by any authenticated user
router.get('/:mentorId', auth, async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);

    const userResult = await pool.query(
      'SELECT user_id, name, email FROM users WHERE user_id = $1 AND role = $2',
      [mentorId, 'mentor']
    );
    if (!userResult.rows.length) return res.status(404).json({ error: 'Mentor not found' });

    const profileResult = await pool.query(
      'SELECT * FROM mentor_profiles WHERE user_id = $1',
      [mentorId]
    );

    const user = userResult.rows[0];
    const profile = profileResult.rows[0] || {};

    res.json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      bio: profile.bio || '',
      office_hours: profile.office_hours || '',
      specialisms: profile.specialisms || '',
      year_of_study: profile.year_of_study || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mentor profile — mentors only
router.put('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mentor') return res.status(403).json({ error: 'Forbidden' });

    const { bio, office_hours, specialisms, year_of_study } = req.body;

    await pool.query(
      `INSERT INTO mentor_profiles (user_id, bio, office_hours, specialisms, year_of_study)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET bio = EXCLUDED.bio,
             office_hours = EXCLUDED.office_hours,
             specialisms = EXCLUDED.specialisms,
             year_of_study = EXCLUDED.year_of_study`,
      [req.user.userId, bio || '', office_hours || '', specialisms || '', year_of_study || '']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
