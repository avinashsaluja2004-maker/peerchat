-- PeerChat Database Schema
-- Run this file in psql or pgAdmin to set up the full database from scratch.
-- Prerequisite: create a database named "peerchat" first.
--   psql -U postgres -c "CREATE DATABASE peerchat;"
-- Then run:
--   psql -U postgres -d peerchat -f schema.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
    course_id   SERIAL PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL,  -- 'student' | 'mentor' | 'admin'
    course_id     INTEGER REFERENCES courses(course_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentorships (
    mentorship_id SERIAL PRIMARY KEY,
    mentor_id     INTEGER REFERENCES users(user_id),
    mentee_id     INTEGER REFERENCES users(user_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    message_id      SERIAL PRIMARY KEY,
    sender_id       INTEGER REFERENCES users(user_id),
    receiver_id     INTEGER REFERENCES users(user_id),
    content         TEXT     NOT NULL,
    conversation_id VARCHAR(255),
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read         BOOLEAN   NOT NULL DEFAULT FALSE,
    attachment_url  VARCHAR(500),
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id SERIAL PRIMARY KEY,
    course_id       INTEGER REFERENCES courses(course_id),
    mentor_id       INTEGER REFERENCES users(user_id),
    content         TEXT      NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_materials (
    material_id      SERIAL PRIMARY KEY,
    course_id        INTEGER REFERENCES courses(course_id),
    title            VARCHAR(255) NOT NULL,
    content          TEXT         NOT NULL,
    source_reference VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ai_queries (
    query_id         SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(user_id),
    question         TEXT      NOT NULL,
    response         TEXT,
    source_reference TEXT,
    timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feedback         SMALLINT  -- 1 = helpful, -1 = not helpful, NULL = no feedback
);

CREATE TABLE IF NOT EXISTS mentor_profiles (
    profile_id   SERIAL PRIMARY KEY,
    user_id      INTEGER UNIQUE NOT NULL REFERENCES users(user_id),
    bio          TEXT         DEFAULT '',
    office_hours VARCHAR(500) DEFAULT '',
    specialisms  VARCHAR(500) DEFAULT '',
    year_of_study VARCHAR(100) DEFAULT '',
    updated_at   TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- All passwords are "password123"
-- ─────────────────────────────────────────────────────────────────────────────

-- Course
INSERT INTO courses (course_id, course_name, course_code) VALUES
    (1, 'Introduction to Computing', 'CS101')
ON CONFLICT DO NOTHING;

-- Reset the sequence so new courses get correct IDs
SELECT setval('courses_course_id_seq', (SELECT MAX(course_id) FROM courses));

-- Users
-- password hash below is bcrypt for "password123" with cost 10
INSERT INTO users (user_id, email, password_hash, name, role, course_id) VALUES
    (3,  'aisha@university.ac.uk',  '$2b$10$TPqKoD9WIl96YAbYog75cugoFYJ6uflI0pGKXEYmzJI8yPYSiCA6K', 'Aisha Khan',      'student', 1),
    (4,  'james@university.ac.uk',  '$2b$10$TPqKoD9WIl96YAbYog75cugoFYJ6uflI0pGKXEYmzJI8yPYSiCA6K', 'James Wilson',    'mentor',  1),
    (5,  'marcus@university.ac.uk', '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Marcus Thompson', 'student', 1),
    (6,  'priya@university.ac.uk',  '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Priya Patel',     'student', 1),
    (7,  'oliver@university.ac.uk', '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Oliver Davies',   'student', 1),
    (8,  'sophie@university.ac.uk', '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Sophie Clarke',   'student', 1),
    (9,  'kai@university.ac.uk',    '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Kai Osei',        'student', 1),
    (10, 'lena@university.ac.uk',   '$2b$10$s0YM9VvcGWGD5xuq9MoDNu1W98R.EvuGNG2QzsIkiLJMXf3X9xdXO', 'Lena Brandt',     'student', 1),
    (11, 'admin@university.ac.uk',  '$2b$12$cNZBBsVhf.odMaz2OWJv7O51/Wb2nUEunHGMnMhst9VaSTSrsij1a', 'System Admin',    'admin',   1)
ON CONFLICT DO NOTHING;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- Mentorships (James mentors Aisha, Marcus, Priya, Oliver)
INSERT INTO mentorships (mentor_id, mentee_id) VALUES
    (4, 3),
    (4, 5),
    (4, 6),
    (4, 7)
ON CONFLICT DO NOTHING;

-- Course materials (used by the AI assistant)
INSERT INTO course_materials (course_id, title, content, source_reference) VALUES
    (1,
     'Data Structures - Stack vs Queue',
     'A stack follows LIFO (last in, first out) — the last item added is the first removed. A queue follows FIFO (first in, first out) — items are removed in the order they were added.',
     'CS101 Lecture Notes, Week 4 (p. 12)'),

    (1,
     'Introduction to Algorithms',
     'An algorithm is a step-by-step procedure for solving a problem or accomplishing a task. Algorithms are fundamental to computer science and are used in everything from sorting data to searching the web. Key properties of a good algorithm include correctness, efficiency, and clarity. Common types include sorting algorithms (bubble sort, merge sort, quicksort), searching algorithms (linear search, binary search), and graph algorithms (BFS, DFS).',
     'CS101 Lecture Notes - Week 2'),

    (1,
     'Binary Search Trees',
     'A binary search tree (BST) is a node-based data structure where each node has at most two children. The left subtree contains only nodes with keys less than the parent, and the right subtree contains only nodes greater than the parent. BSTs allow efficient searching, insertion, and deletion in O(log n) average time. Traversal methods include in-order (left, root, right), pre-order (root, left, right), and post-order (left, right, root).',
     'CS101 Lecture Notes - Week 5'),

    (1,
     'Memory Management',
     'Memory management refers to how a computer allocates, uses, and frees memory (RAM). In C, programmers manually allocate memory using malloc() and free it with free(). In higher-level languages, garbage collection handles this automatically. The stack stores local variables and function call data (fast, limited size). The heap stores dynamically allocated memory (slower, larger). Memory leaks occur when allocated memory is never freed, causing programs to consume increasing amounts of RAM over time.',
     'CS101 Lecture Notes - Week 7'),

    (1,
     'Object-Oriented Programming',
     'Object-Oriented Programming (OOP) is a paradigm based on objects that combine data (attributes) and behaviour (methods). The four core principles are: Encapsulation - bundling data and methods and hiding internal details; Inheritance - allowing a class to derive properties from a parent class; Polymorphism - allowing objects of different types to share a common interface; Abstraction - exposing only necessary details and hiding complexity. Common OOP languages include Java, Python, and C++.',
     'CS101 Lecture Notes - Week 9'),

    (1,
     'Data Structures Overview',
     'Data structures are ways of organising and storing data so it can be accessed efficiently. Common types include: Arrays - fixed-size sequential collections; Linked Lists - chains of nodes each storing a value and pointer to the next; Stacks - LIFO (Last In First Out) structure; Queues - FIFO (First In First Out) structure; Hash Tables - key-value pairs with O(1) average lookup; Trees - hierarchical structures with a root and child nodes; Graphs - nodes connected by edges, used for networks and maps.',
     'CS101 Lecture Notes - Week 4')
ON CONFLICT DO NOTHING;

-- Announcements
INSERT INTO announcements (course_id, mentor_id, content, created_at) VALUES
    (1, 4, 'Welcome everyone to CS101! I am your peer mentor James. Feel free to message me directly with any questions about the course. I hold drop-in sessions every Tuesday 3-4pm in the library study room 2B.',
     '2026-04-30 20:09:33+00'),
    (1, 4, 'Study session this Thursday 2pm - we will be going over data structures (arrays, linked lists, stacks and queues). Bring your notes from Week 4. Room LT3.',
     '2026-05-03 20:09:33+00'),
    (1, 4, 'Reminder: the Week 5 BST worksheet is due Friday. If you are stuck on the traversal questions, check the lecture notes or drop me a message. Good luck!',
     '2026-05-04 20:09:33+00'),
    (1, 4, 'Quick tip for the upcoming test: make sure you can explain the difference between a stack and a queue with a real-world example. That comes up every year!',
     '2026-05-05 17:09:33+00')
ON CONFLICT DO NOTHING;

-- Mentor profile for James
INSERT INTO mentor_profiles (user_id, bio, office_hours, specialisms, year_of_study) VALUES
    (4,
     'Hi, I am James. I am a third-year Computer Science student passionate about algorithms and data structures. I am here to help you get to grips with CS101 and make your first year as smooth as possible.',
     'Tuesday 3-4pm (Library Study Room 2B), Thursday 2-3pm (online via Teams)',
     'Algorithms, Data Structures, Python, Java, Object-Oriented Programming',
     'Year 3, BSc Computer Science')
ON CONFLICT (user_id) DO NOTHING;
