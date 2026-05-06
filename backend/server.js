const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.set('io', io);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes         = require('./routes/auth');
const courseRoutes       = require('./routes/courses');
const messageRoutes      = require('./routes/messages');
const aiRoutes           = require('./routes/ai');
const announcementRoutes = require('./routes/announcements');
const uploadRoutes       = require('./routes/upload');
const profileRoutes      = require('./routes/profile');
const adminRoutes        = require('./routes/admin');

app.use('/api/auth',          authRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/admin',         adminRoutes);

io.on('connection', (socket) => {
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('join_course', (courseId) => {
    socket.join(`course_${courseId}`);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
