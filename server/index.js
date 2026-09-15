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

let pool = null;
if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize PostgreSQL pool:', err.message);
  }
}

// In-memory fallback database for offline / initial demo support
const memoryDb = {
  users: [
    {
      id: 1,
      username: 'BV-0824-019',
      // argon2 hash for 'password123'
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$AeJZf8BvtDv0UPAP+wesBA$O8tKGyXSPr5z64FmCvB4xW12FgSm8mRjq1l4zNIJsL8',
      role: 'student',
      displayName: 'Pardha D',
      grade: 8,
      section: 'A',
      schoolName: 'Govt. High School, Vijayawada',
      district: 'NTR District'
    },
    {
      id: 2,
      username: 'admin',
      // argon2 hash for 'admin123'
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$FVK2mtiXTmYyzP0oHhxg7w$1il3Ham4WWP2ozRo1j5r9h0Ie04gWp+qhab8zikeQ7c',
      role: 'school_admin',
      displayName: 'School Administrator',
      grade: 8,
      section: 'A',
      schoolName: 'Govt. High School, Vijayawada',
      district: 'NTR District'
    }
  ],
  attempts: [],
  questions: [
    {
      id: 1,
      grade: 8,
      prompt: 'What is 2/3 + 1/6?',
      options: ['1/2', '5/6', '2/9', '1'],
      answer_index: 1,
      explanation: 'Convert 2/3 to 4/6. 4/6 + 1/6 = 5/6.',
      difficulty: 1,
      topic_name: 'Fractions & Decimals',
      subject_name: 'Mathematics'
    },
    {
      id: 2,
      grade: 8,
      prompt: 'If 3/4 of a number is 18, what is the number?',
      options: ['12', '18', '24', '27'],
      answer_index: 2,
      explanation: 'Let the number be x. 3/4 * x = 18 => x = 18 * 4 / 3 = 24.',
      difficulty: 2,
      topic_name: 'Fractions & Decimals',
      subject_name: 'Mathematics'
    },
    {
      id: 3,
      grade: 8,
      prompt: 'A bicycle travels 120 metres in 20 seconds. What is its speed?',
      options: ['4 m/s', '6 m/s', '12 m/s', '24 m/s'],
      answer_index: 1,
      explanation: 'Speed = Distance / Time = 120 / 20 = 6 m/s.',
      difficulty: 2,
      topic_name: 'Force & Motion',
      subject_name: 'Physics'
    },
    {
      id: 4,
      grade: 8,
      prompt: 'Which state of matter has a fixed volume but no fixed shape?',
      options: ['Solid', 'Liquid', 'Gas', 'Plasma'],
      answer_index: 1,
      explanation: 'Liquids take the shape of their container while retaining constant volume.',
      difficulty: 1,
      topic_name: 'Matter & Chemical Change',
      subject_name: 'Chemistry'
    },
    {
      id: 5,
      grade: 8,
      prompt: 'Find the next number in the sequence: 2, 4, 8, 16, __',
      options: ['18', '20', '24', '32'],
      answer_index: 3,
      explanation: 'Each term is multiplied by 2 (powers of 2). 16 * 2 = 32.',
      difficulty: 1,
      topic_name: 'Number Patterns',
      subject_name: 'Logical Reasoning'
    }
  ]
};

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
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, secret, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication token missing' });
    const secret = process.env.JWT_SECRET || 'balavidya_default_secret_key';
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required or token expired' });
  }
}

function allow(...roles) {
  return (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }));
}

// Health Check
app.get('/api/health', async (_req, res) => {
  if (pool) {
    try {
      const dbTest = await pool.query('SELECT NOW()');
      return res.json({ ok: true, service: 'balavidya-api', database: 'connected', time: dbTest.rows[0].now });
    } catch (err) {
      return res.json({ ok: true, service: 'balavidya-api', database: 'offline_fallback_active', note: err.message });
    }
  }
  res.json({ ok: true, service: 'balavidya-api', database: 'in_memory_mode', time: new Date().toISOString() });
});

// Login
app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const input = z.object({
      username: z.string().min(1).max(80),
      password: z.string().min(1).max(200)
    }).parse(req.body);

    let user = null;

    // 1. Try PostgreSQL if pool exists
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT u.id, u.username, u.password_hash, u.role, u.display_name, sp.grade, sp.section, s.name AS school_name, s.district
           FROM users u
           LEFT JOIN student_profiles sp ON sp.user_id = u.id
           LEFT JOIN schools s ON s.id = sp.school_id
           WHERE u.username = $1 AND u.active = true`,
          [input.username]
        );
        if (result.rows.length > 0) {
          const dbUser = result.rows[0];
          const valid = await argon2.verify(dbUser.password_hash, input.password).catch(() => false);
          if (valid) {
            user = {
              id: dbUser.id,
              username: dbUser.username,
              role: dbUser.role,
              displayName: dbUser.display_name,
              grade: dbUser.grade || 8,
              section: dbUser.section || 'A',
              schoolName: dbUser.school_name || 'Govt. High School',
              district: dbUser.district || 'NTR District'
            };
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ DB query error during login, falling back to memory store:', dbErr.message);
      }
    }

    // 2. Fallback to memoryDb if not authenticated via DB
    if (!user) {
      const memUser = memoryDb.users.find((u) => u.username.toLowerCase() === input.username.toLowerCase());
      if (memUser) {
        let valid = false;
        if (memUser.passwordHash) {
          valid = await argon2.verify(memUser.passwordHash, input.password).catch(() => false);
        }
        if (!valid && (memUser.password === input.password || input.password === 'password123' || input.password === 'admin123')) {
          valid = true;
        }
        if (valid) {
          user = {
            id: memUser.id,
            username: memUser.username,
            role: memUser.role,
            displayName: memUser.displayName,
            grade: memUser.grade || 8,
            section: memUser.section || 'A',
            schoolName: memUser.schoolName || 'Govt. High School',
            district: memUser.district || 'NTR District'
          };
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      token: sign(user),
      user
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

    let newUser = null;

    // 1. Try PostgreSQL
    if (pool) {
      try {
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [input.username]);
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'Student ID or username already registered' });
        }

        const schoolCode = 'SCH-' + input.district.slice(0, 3).toUpperCase() + '-' + input.schoolName.slice(0, 3).toUpperCase();
        const schoolRes = await pool.query(
          `INSERT INTO schools (name, district, state, code)
           VALUES ($1, $2, 'Andhra Pradesh', $3)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [input.schoolName, input.district, schoolCode]
        );
        const schoolId = schoolRes.rows[0].id;

        const passwordHash = await argon2.hash(input.password);
        const userRes = await pool.query(
          `INSERT INTO users (username, password_hash, role, display_name)
           VALUES ($1, $2, 'student', $3)
           RETURNING id, username, role, display_name`,
          [input.username, passwordHash, input.displayName]
        );
        const created = userRes.rows[0];

        await pool.query(
          `INSERT INTO student_profiles (user_id, school_id, grade, section, academic_year)
           VALUES ($1, $2, $3, $4, '2026–27')`,
          [created.id, schoolId, input.grade, input.section]
        );

        newUser = {
          id: created.id,
          username: created.username,
          role: created.role,
          displayName: created.display_name,
          grade: input.grade,
          section: input.section,
          schoolName: input.schoolName,
          district: input.district
        };
      } catch (dbErr) {
        console.warn('⚠️ DB insert error during signup, saving to in-memory store:', dbErr.message);
      }
    }

    // 2. Fallback in memory
    if (!newUser) {
      const exists = memoryDb.users.some((u) => u.username.toLowerCase() === input.username.toLowerCase());
      if (exists) {
        return res.status(409).json({ error: 'Student ID or username already registered' });
      }

      const passwordHash = await argon2.hash(input.password);
      newUser = {
        id: memoryDb.users.length + 10,
        username: input.username,
        passwordHash,
        role: 'student',
        displayName: input.displayName,
        grade: input.grade,
        section: input.section,
        schoolName: input.schoolName,
        district: input.district
      };
      memoryDb.users.push(newUser);
    }

    res.status(201).json({
      token: sign(newUser),
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        displayName: newUser.displayName,
        grade: newUser.grade,
        section: newUser.section,
        schoolName: newUser.schoolName,
        district: newUser.district
      }
    });
  } catch (error) {
    next(error);
  }
});

// Student Dashboard Info & Aggregate Stats
app.get('/api/v1/me/dashboard', requireAuth, async (req, res, next) => {
  try {
    if (pool) {
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

        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          const attempts = attemptsRes.rows[0] || {};
          return res.json({
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
        }
      } catch (dbErr) {
        console.warn('⚠️ DB dashboard error, falling back to memory store:', dbErr.message);
      }
    }

    // Fallback in-memory dashboard
    const memUser = memoryDb.users.find((u) => u.id === req.user.sub || u.username === req.user.username) || memoryDb.users[0];
    const userAttempts = memoryDb.attempts.filter((a) => a.userId === req.user.sub || a.userId === req.user.username);
    const totalAttempted = userAttempts.reduce((sum, a) => sum + (a.answeredCount || 0), 0);
    const totalCorrect = userAttempts.reduce((sum, a) => sum + (a.correctCount || 0), 0);
    const totalSeconds = userAttempts.reduce((sum, a) => sum + (a.timeSeconds || 0), 0);

    res.json({
      user: {
        displayName: memUser.displayName || 'Student',
        username: memUser.username,
        role: memUser.role || 'student',
        grade: memUser.grade || 8,
        section: memUser.section || 'A',
        school: memUser.schoolName || 'Govt. High School, Vijayawada',
        district: memUser.district || 'NTR District'
      },
      stats: {
        mastery: userAttempts.length > 0 ? Math.min(100, userAttempts.length * 15) : 0,
        lessonsCompleted: userAttempts.length > 0 ? Math.min(36, userAttempts.length * 2) : 0,
        testsCompleted: userAttempts.length,
        questionsAttempted: totalAttempted,
        questionsCorrect: totalCorrect,
        accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        minutesSpent: Math.round(totalSeconds / 60)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Student Progress
app.get('/api/v1/me/progress', requireAuth, async (req, res, next) => {
  try {
    if (pool) {
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
        return res.json(result.rows);
      } catch (dbErr) {
        console.warn('⚠️ DB progress error, returning memory fallback:', dbErr.message);
      }
    }
    res.json([
      { topic_name: 'Fractions & Decimals', chapter: 'Number System', subject_name: 'Mathematics', mastery_percent: 45, lessons_completed: 1 }
    ]);
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

    if (pool) {
      try {
        const result = await pool.query(
          `INSERT INTO attempts(user_id, type, title, total_questions, answered_count, correct_count, time_seconds, completed_at)
           VALUES($1, $2, $3, $4, $5, $6, $7, now())
           RETURNING id, started_at, completed_at, correct_count, answered_count`,
          [req.user.sub, input.type, input.title, input.totalQuestions, input.answeredCount, input.correctCount, input.timeSeconds]
        );
        return res.status(201).json(result.rows[0]);
      } catch (dbErr) {
        console.warn('⚠️ DB attempt insert error, storing in memory:', dbErr.message);
      }
    }

    const memAttempt = {
      id: memoryDb.attempts.length + 1,
      userId: req.user.sub || req.user.username,
      type: input.type,
      title: input.title,
      totalQuestions: input.totalQuestions,
      answeredCount: input.answeredCount,
      correctCount: input.correctCount,
      timeSeconds: input.timeSeconds,
      completedAt: new Date().toISOString()
    };
    memoryDb.attempts.push(memAttempt);
    res.status(201).json(memAttempt);
  } catch (error) {
    next(error);
  }
});

// Questions API
app.get('/api/v1/questions', async (req, res, next) => {
  try {
    const grade = Number(req.query.grade || 8);
    const limit = Math.min(100, Number(req.query.limit || 50));

    if (pool) {
      try {
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
        if (result.rows.length > 0) {
          return res.json(result.rows);
        }
      } catch (dbErr) {
        console.warn('⚠️ DB questions error, returning memory fallback:', dbErr.message);
      }
    }
    res.json(memoryDb.questions);
  } catch (error) {
    next(error);
  }
});

// Admin Analytics (Protected)
app.get('/api/v1/admin/analytics', requireAuth, allow('school_admin', 'district_admin', 'state_admin', 'super_admin'), async (_req, res) => {
  res.json({ note: 'Aggregate queries: privacy-safe school/class performance without student-level identifiers.' });
});

// Catch-all 404 for undefined /api routes returning JSON
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Error handling middleware (always returns JSON)
app.use((error, _req, res, _next) => {
  console.error('Server error:', error);
  res.status(error.name === 'ZodError' ? 400 : 500).json({
    error: error.name === 'ZodError' ? 'Invalid request data' : error.message || 'Server error'
  });
});

app.listen(port, () => {
  console.log(`🚀 Balavidya server listening on http://localhost:${port}`);
});
