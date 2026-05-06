const express = require('express');
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Unread message counts per sender (for mentor dashboard badges)
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sender_id, COUNT(*) AS count
       FROM messages
       WHERE receiver_id = $1 AND is_read = FALSE
       GROUP BY sender_id`,
      [req.user.userId]
    );
    // Return as { senderId: count } map
    const counts = {};
    result.rows.forEach(row => {
      counts[row.sender_id] = parseInt(row.count);
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all messages in a conversation as read (for the current user as receiver)
router.post('/mark-read/:conversationId', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [req.params.conversationId, req.user.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.conversation_id = $1
       ORDER BY m.timestamp ASC`,
      [req.params.conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { receiver_id, content, conversation_id, attachment_url, attachment_name, attachment_type } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const insertResult = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, conversation_id, timestamp, is_read, attachment_url, attachment_name, attachment_type)
       VALUES ($1, $2, $3, $4, NOW(), FALSE, $5, $6, $7)
       RETURNING message_id`,
      [req.user.userId, receiver_id, content.trim(), conversation_id,
       attachment_url || null, attachment_name || null, attachment_type || null]
    );

    const { message_id } = insertResult.rows[0];

    const result = await pool.query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.message_id = $1`,
      [message_id]
    );

    const message = result.rows[0];

    const io = req.app.get('io');
    io.to(conversation_id).emit('receive_message', message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
