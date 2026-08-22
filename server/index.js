require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { Pool } = require('pg');
const { z } = require('zod');

const app = express();
const port = Number(process.env.PORT || 3000);
const dbUrl = process.env.DATABASE_URL || '';
const isRemote = dbUrl.includes('supabase') || dbUrl.includes('sslmode=require') || (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemote ? { rejectUnauthorized: false } : false
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Serve frontend static assets from workspace root
app.use(express.static(path.join(__dirname, '..')));

function sign(user) {
  const secret = process.env.JWT_SECRET || 'balavidya_default_secret_key';
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication token missing' });
    const secret = process.env.JWT_SECRET || 'balavidya_default_secret_key';
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required or token expired' });
  }
}

function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' });
}

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    const dbTest = await pool.query('SELECT NOW()');
    res.json({ ok: true, service: 'balavidya-api', database: 'connected', time: dbTest.rows[0].now });
  } catch (err) {
    res.json({ ok: true, service: 'balavidya-api', database: 'disconnected', message: err.message });
  }
});

// Login
app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const input = z.object({
      username: z.string().min(3).max(80),
      password: z.string().min(6).max(200)
    }).parse(req.body);

    const result = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.display_name, sp.grade, sp.section, s.name AS school_name, s.district
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN schools s ON s.id = sp.school_id
       WHERE u.username = $1 AND u.active = true`,
      [input.username]
    );

    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, input.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      token: sign(user),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
        grade: user.grade || 8,
        section: user.section || 'A',
        schoolName: user.school_name || 'Govt. High School',
        district: user.district || 'NTR District'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Signup (Student Registration)
app.post('/api/v1/auth/signup', async (req, res, next) => {
  try {
    const input = z.object({
      username: z.string().min(3).max(80),
      password: z.string().min(6).max(200),
      displayName: z.string().min(2).max(120),
      grade: z.coerce.number().int().min(6).max(12).default(8),
      section: z.string().max(10).default('A'),
      schoolName: z.string().max(160).default('Govt. High School, Vijayawada'),
      district: z.string().max(100).default('NTR District')
    }).parse(req.body);

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [input.username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Student ID or username already registered' });
    }

    // Find or create school
    const schoolCode = 'SCH-' + input.district.slice(0, 3).toUpperCase() + '-' + input.schoolName.slice(0, 3).toUpperCase();
    const schoolRes = await pool.query(
      `INSERT INTO schools (name, district, state, code)
       VALUES ($1, $2, 'Andhra Pradesh', $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [input.schoolName, input.district, schoolCode]
    );
    const schoolId = schoolRes.rows[0].id;

    // Hash password & create user
    const passwordHash = await argon2.hash(input.password);
    const userRes = await pool.query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, 'student', $3)
       RETURNING id, username, role, display_name`,
      [input.username, passwordHash, input.displayName]
    );
    const newUser = userRes.rows[0];

    // Create student profile
    await pool.query(
      `INSERT INTO student_profiles (user_id, school_id, grade, section, academic_year)
       VALUES ($1, $2, $3, $4, '2026–27')`,
      [newUser.id, schoolId, input.grade, input.section]
    );

    res.status(201).json({
      token: sign(newUser),
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        displayName: newUser.display_name,
        grade: input.grade,
        section: input.section,
        schoolName: input.schoolName,
        district: input.district
      }
    });
  } catch (error) {
    next(error);
  }
});

// Student Dashboard Info & Aggregate Stats
app.get('/api/v1/me/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userRes = await pool.query(
      `SELECT u.id, u.display_name, u.role, u.username, sp.grade, sp.section, s.name AS school, s.district,
              COALESCE(SUM(p.mastery_percent), 0)::int AS total_mastery,
              COUNT(p.topic_id)::int AS topics_count,
              COALESCE(SUM(p.lessons_completed), 0)::int AS lessons_completed
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN schools s ON s.id = sp.school_id
       LEFT JOIN progress p ON p.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.display_name, u.role, u.username, sp.grade, sp.section, s.name, s.district`,
      [req.user.sub]
    );

    const attemptsRes = await pool.query(
      `SELECT COUNT(id)::int AS total_tests,
              COALESCE(SUM(answered_count), 0)::int AS total_attempted,
              COALESCE(SUM(correct_count), 0)::int AS total_correct,
              COALESCE(SUM(time_seconds), 0)::int AS total_time_seconds
       FROM attempts
       WHERE user_id = $1`,
      [req.user.sub]
    );

    const user = userRes.rows[0] || {};
    const attempts = attemptsRes.rows[0] || {};

    res.json({
      user: {
        displayName: user.display_name || 'Student',
        username: user.username,
        role: user.role,
        grade: user.grade || 8,
        section: user.section || 'A',
        school: user.school || 'Govt. High School, Vijayawada',
        district: user.district || 'NTR District'
      },
      stats: {
        mastery: user.total_mastery || 0,
        lessonsCompleted: user.lessons_completed || 0,
        testsCompleted: attempts.total_tests || 0,
        questionsAttempted: attempts.total_attempted || 0,
        questionsCorrect: attempts.total_correct || 0,
        accuracy: attempts.total_attempted > 0 ? Math.round((attempts.total_correct / attempts.total_attempted) * 100) : 0,
        minutesSpent: Math.round((attempts.total_time_seconds || 0) / 60)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Student Progress
app.get('/api/v1/me/progress', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, t.name AS topic_name, t.chapter, s.name AS subject_name, s.slug AS subject_slug
       FROM progress p
       JOIN topics t ON t.id = p.topic_id
       JOIN subjects s ON s.id = t.subject_id
       WHERE p.user_id = $1
       ORDER BY p.last_activity_at DESC NULLS LAST`,
      [req.user.sub]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Submit Attempt
app.post('/api/v1/attempts', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({
      type: z.enum(['practice', 'quiz', 'test']).default('test'),
      title: z.string().min(1).max(160),
      totalQuestions: z.number().int().positive().max(200),
      answeredCount: z.number().int().min(0).max(200).default(0),
      correctCount: z.number().int().min(0).max(200).default(0),
      timeSeconds: z.number().int().min(0).default(0)
    }).parse(req.body);

    const result = await pool.query(
      `INSERT INTO attempts(user_id, type, title, total_questions, answered_count, correct_count, time_seconds, completed_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING id, started_at, completed_at, correct_count, answered_count`,
      [req.user.sub, input.type, input.title, input.totalQuestions, input.answeredCount, input.correctCount, input.timeSeconds]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Questions API
app.get('/api/v1/questions', async (req, res, next) => {
  try {
    const grade = Number(req.query.grade || 8);
    const limit = Math.min(100, Number(req.query.limit || 50));
    const result = await pool.query(
      `SELECT q.id, q.prompt, q.options, q.answer_index, q.explanation, q.hint_1, q.hint_2, q.hint_3, q.difficulty,
              t.name AS topic_name, s.name AS subject_name
       FROM questions q
       JOIN topics t ON t.id = q.topic_id
       JOIN subjects s ON s.id = t.subject_id
       WHERE q.grade = $1
       LIMIT $2`,
      [grade, limit]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Admin Analytics (Protected)
app.get('/api/v1/admin/analytics', requireAuth, allow('school_admin', 'district_admin', 'state_admin', 'super_admin'), async (_req, res) => {
  res.json({ note: 'Aggregate queries: privacy-safe school/class performance without student-level identifiers.' });
});

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.name === 'ZodError' ? 400 : 500).json({
    error: error.name === 'ZodError' ? 'Invalid request data' : error.message || 'Server error'
  });
});

app.listen(port, () => {
  console.log(`🚀 Balavidya server listening on http://localhost:${port}`);
});
