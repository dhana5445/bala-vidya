require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { Pool } = require('pg');
const { z } = require('zod');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '100kb' }));

function sign(user) { return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' }); }
function requireAuth(req, res, next) {
  try { const token = req.headers.authorization?.replace('Bearer ', ''); req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Authentication required' }); }
}
function allow(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }); }

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'balavidya-api' }));
app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const input = z.object({ username: z.string().min(3).max(80), password: z.string().min(8).max(200) }).parse(req.body);
    const result = await pool.query('SELECT id, username, password_hash, role, display_name FROM users WHERE username = $1 AND active = true', [input.username]);
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, input.password))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user), user: { id: user.id, username: user.username, role: user.role, displayName: user.display_name } });
  } catch (error) { next(error); }
});
app.get('/api/v1/me/dashboard', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT u.display_name, u.role, sp.grade, sp.section, s.name AS school, COALESCE(SUM(p.mastery_percent), 0)::int AS mastery FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.id LEFT JOIN schools s ON s.id = sp.school_id LEFT JOIN progress p ON p.user_id = u.id WHERE u.id = $1 GROUP BY u.id, sp.grade, sp.section, s.name`, [req.user.sub]);
    res.json(result.rows[0] || null);
  } catch (error) { next(error); }
});
app.get('/api/v1/me/progress', requireAuth, async (req, res, next) => {
  try { const result = await pool.query('SELECT * FROM progress WHERE user_id = $1 ORDER BY last_activity_at DESC NULLS LAST', [req.user.sub]); res.json(result.rows); }
  catch (error) { next(error); }
});
app.post('/api/v1/attempts', requireAuth, async (req, res, next) => {
  try { const input = z.object({ type: z.enum(['practice', 'quiz', 'test']), title: z.string().min(1).max(160), totalQuestions: z.number().int().positive().max(200) }).parse(req.body); const result = await pool.query('INSERT INTO attempts(user_id, type, title, total_questions) VALUES($1,$2,$3,$4) RETURNING id, started_at', [req.user.sub, input.type, input.title, input.totalQuestions]); res.status(201).json(result.rows[0]); }
  catch (error) { next(error); }
});
app.get('/api/v1/admin/analytics', requireAuth, allow('school_admin', 'district_admin', 'state_admin', 'super_admin'), async (_req, res) => res.json({ note: 'Add aggregate queries here; never return student-level data to district or state roles.' }));
app.use((error, _req, res, _next) => { console.error(error); res.status(error.name === 'ZodError' ? 400 : 500).json({ error: error.name === 'ZodError' ? 'Invalid request' : 'Server error' }); });
app.listen(port, () => console.log(`Balavidya API listening on http://localhost:${port}`));
