require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const argon2 = require('argon2');

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env. Please configure .env first.');
    process.exit(1);
  }

  const isRemote = connectionString.includes('supabase') || connectionString.includes('sslmode=require') || !connectionString.includes('localhost');
  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');

    // 1. Run Schema
    console.log('🔄 Initializing database schema...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✅ Schema tables and types created/verified.');

    // 2. Seed Default School
    console.log('🔄 Seeding default school...');
    const schoolRes = await client.query(`
      INSERT INTO schools (name, district, state, code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, ['Govt. High School, Vijayawada', 'NTR District', 'Andhra Pradesh', 'GHS-VJA-001']);
    const schoolId = schoolRes.rows[0].id;

    // 3. Seed Default Users
    console.log('🔄 Seeding initial users...');
    const studentPasswordHash = await argon2.hash('password123');
    const adminPasswordHash = await argon2.hash('admin123');

    // Student: Pardha D (BV-0824-019)
    const studentRes = await client.query(`
      INSERT INTO users (username, password_hash, role, display_name, locale)
      VALUES ($1, $2, 'student', $3, 'en')
      ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash
      RETURNING id;
    `, ['BV-0824-019', studentPasswordHash, 'Pardha D']);
    const studentId = studentRes.rows[0].id;

    await client.query(`
      INSERT INTO student_profiles (user_id, school_id, grade, section, academic_year)
      VALUES ($1, $2, 8, 'A', '2026–27')
      ON CONFLICT (user_id) DO UPDATE SET school_id = EXCLUDED.school_id, grade = EXCLUDED.grade, section = EXCLUDED.section;
    `, [studentId, schoolId]);

    // Admin: admin
    await client.query(`
      INSERT INTO users (username, password_hash, role, display_name, locale)
      VALUES ($1, $2, 'school_admin', $3, 'en')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, ['admin', adminPasswordHash, 'School Administrator']);

    // 4. Seed Subjects
    console.log('🔄 Seeding subjects...');
    const subjects = [
      { slug: 'mathematics', name: 'Mathematics' },
      { slug: 'physics', name: 'Physics' },
      { slug: 'chemistry', name: 'Chemistry' },
      { slug: 'reasoning', name: 'Logical Reasoning' }
    ];

    const subjectMap = {};
    for (const sub of subjects) {
      const subRes = await client.query(`
        INSERT INTO subjects (slug, name)
        VALUES ($1, $2)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [sub.slug, sub.name]);
      subjectMap[sub.slug] = subRes.rows[0].id;
    }

    // 5. Seed Class 8 Topics
    console.log('🔄 Seeding Class 8 topics...');
    const topics = [
      { slug: 'mathematics', grade: 8, chapter: 'Number System', name: 'Fractions & Decimals' },
      { slug: 'mathematics', grade: 8, chapter: 'Arithmetic', name: 'Ratio & Proportion' },
      { slug: 'physics', grade: 8, chapter: 'Mechanics', name: 'Force & Motion' },
      { slug: 'chemistry', grade: 8, chapter: 'Matter', name: 'Matter & Chemical Change' },
      { slug: 'reasoning', grade: 8, chapter: 'Sequences', name: 'Number Patterns' }
    ];

    const topicMap = {};
    for (const top of topics) {
      const topRes = await client.query(`
        INSERT INTO topics (subject_id, grade, chapter, name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (subject_id, grade, chapter, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [subjectMap[top.slug], top.grade, top.chapter, top.name]);
      topicMap[top.name] = topRes.rows[0].id;
    }

    // 6. Seed Sample Questions
    console.log('🔄 Seeding sample questions...');
    const questions = [
      {
        topicName: 'Fractions & Decimals',
        grade: 8,
        prompt: 'What is 2/3 + 1/6?',
        options: JSON.stringify(['1/2', '5/6', '2/9', '1']),
        answerIndex: 1,
        explanation: 'Change 2/3 to 4/6. Then 4/6 + 1/6 = 5/6.',
        hint1: 'Convert 2/3 to an equivalent fraction with denominator 6.',
        hint2: '2/3 = 4/6.',
        hint3: 'Add numerators: 4 + 1 = 5.',
        difficulty: 1
      },
      {
        topicName: 'Fractions & Decimals',
        grade: 8,
        prompt: 'If 3/4 of a number is 18, what is the number?',
        options: JSON.stringify(['12', '18', '24', '27']),
        answerIndex: 2,
        explanation: 'Let number be x. (3/4)x = 18 => x = 18 * 4 / 3 = 24.',
        hint1: 'Multiply 18 by the reciprocal of 3/4.',
        hint2: '18 × 4/3 = 6 × 4.',
        hint3: '6 × 4 = 24.',
        difficulty: 2
      },
      {
        topicName: 'Force & Motion',
        grade: 8,
        prompt: 'A bicycle travels 120 metres in 20 seconds. What is its speed?',
        options: JSON.stringify(['4 m/s', '6 m/s', '12 m/s', '24 m/s']),
        answerIndex: 1,
        explanation: 'Speed = Distance / Time = 120 / 20 = 6 m/s.',
        hint1: 'Recall the formula: Speed = Distance / Time.',
        hint2: 'Divide 120 by 20.',
        hint3: '120 ÷ 20 = 6.',
        difficulty: 2
      }
    ];

    for (const q of questions) {
      if (topicMap[q.topicName]) {
        await client.query(`
          INSERT INTO questions (topic_id, grade, prompt, options, answer_index, explanation, hint_1, hint_2, hint_3, difficulty)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (topic_id, prompt) DO NOTHING;
        `, [topicMap[q.topicName], q.grade, q.prompt, q.options, q.answerIndex, q.explanation, q.hint1, q.hint2, q.hint3, q.difficulty]);
      }
    }

    // 7. Initialize Progress
    if (topicMap['Fractions & Decimals']) {
      await client.query(`
        INSERT INTO progress (user_id, topic_id, theory_percent, practice_percent, mastery_percent, lessons_completed, last_activity_at)
        VALUES ($1, $2, 50, 40, 45, 1, now())
        ON CONFLICT (user_id, topic_id) DO NOTHING;
      `, [studentId, topicMap['Fractions & Decimals']]);
    }

    client.release();
    await pool.end();

    console.log('\n=========================================');
    console.log('🎉 Database initialized & seeded successfully!');
    console.log('=========================================');
    console.log('📌 Test Credentials:');
    console.log('  👨‍🎓 Student:  Username: BV-0824-019  |  Password: password123');
    console.log('  👨‍💼 Admin:    Username: admin        |  Password: admin123');
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    await pool.end();
    process.exit(1);
  }
}

seed();
