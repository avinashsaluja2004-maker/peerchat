# PeerChat

A peer mentoring and academic support platform for university students. Students can chat with their assigned peer mentor, ask an AI assistant questions about course materials, and view course announcements. Mentors manage conversations and post announcements. Administrators monitor AI query feedback.

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18 or later | https://nodejs.org |
| PostgreSQL | 14 or later | https://www.postgresql.org/download |
| Git | any | https://git-scm.com |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/peerchat.git
cd peerchat
```

### 2. Create the PostgreSQL database

Open **pgAdmin 4** or **psql** and run:

```sql
CREATE DATABASE peerchat;
```

Then load the schema and seed data. In psql:

```bash
psql -U postgres -d peerchat -f schema.sql
```

Or in pgAdmin: open the Query Tool, paste the contents of `schema.sql`, and run it.

### 3. Configure the backend environment

Copy the example file and fill in your details:

```bash
cd backend
copy ..\\.env.example .env
```

Edit `backend/.env`:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=peerchat
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=any_long_random_string_here
PORT=5000
```

> **JWT_SECRET** can be any random string, e.g. `mysecretkey123`. It signs the login tokens.

### 4. Install dependencies

```bash
# From the project root
cd backend
npm install

cd ../frontend
npm install
```

### 5. Start the application

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
```
You should see: `Server running on port 5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
The app opens automatically at http://localhost:3000

---

## Test accounts

All passwords are `password123`.

| Email | Role | Notes |
|---|---|---|
| aisha@university.ac.uk | Student | Assigned to James as mentor |
| marcus@university.ac.uk | Student | Assigned to James as mentor |
| priya@university.ac.uk | Student | Assigned to James as mentor |
| oliver@university.ac.uk | Student | Assigned to James as mentor |
| james@university.ac.uk | Mentor | Has 4 assigned mentees |
| admin@university.ac.uk | Admin | AI query monitor |

---

## Project structure

```
peerchat/
├── schema.sql              # Full database setup — run this first
├── .env.example            # Environment variable template
│
├── backend/
│   ├── server.js           # Express + Socket.io entry point
│   ├── db.js               # PostgreSQL connection pool
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── routes/
│       ├── auth.js         # Login, /me identity check
│       ├── courses.js      # Course info, mentor lookup, mentee list
│       ├── messages.js     # Chat messages + unread counts
│       ├── announcements.js
│       ├── ai.js           # AI assistant + feedback
│       ├── upload.js       # File attachment uploads (Multer)
│       ├── profile.js      # Mentor profile view/edit
│       └── admin.js        # Admin AI query monitor
│
└── frontend/
    └── src/
        ├── App.js
        └── components/
            ├── Login.js
            ├── StudentDashboard.js
            ├── Chat.js
            ├── AIAssistant.js
            ├── MentorDashboard.js
            ├── MentorProfile.js
            └── AdminDashboard.js
```

---

## Features

**Students**
- Real-time chat with assigned peer mentor (with unread message badge)
- File/image sharing in chat
- AI assistant — answers questions using approved course materials only
- 👍/👎 feedback on AI responses
- Search through chat history
- View mentor's profile (bio, office hours, specialisms)
- Live course announcements feed

**Mentors**
- Dashboard with mentee overview and unread message badges
- Real-time chat with each mentee
- File/image sharing in chat
- Search through chat history
- Post course-wide announcements (live via Socket.io)
- Edit own profile (bio, office hours, specialisms, year of study)

**Admin**
- View all AI queries with helpfulness ratings (👍/👎)
- Filter by: all, helpful, not helpful, no feedback

---

## Notes

- The `backend/uploads/` folder is created automatically when the first file is shared. It is excluded from git.
- The `.env` file is excluded from git — never commit it. Use `.env.example` as a template.
- The app runs locally only (localhost). No deployment configuration is included.
