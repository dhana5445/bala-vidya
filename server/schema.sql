CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('student','teacher','school_admin','district_admin','state_admin','super_admin');
CREATE TYPE attempt_type AS ENUM ('practice','quiz','test');

CREATE TABLE schools (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, district TEXT NOT NULL, state TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role user_role NOT NULL, display_name TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en', active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE student_profiles (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, school_id UUID NOT NULL REFERENCES schools(id), grade SMALLINT NOT NULL CHECK (grade BETWEEN 6 AND 12), section TEXT NOT NULL, academic_year TEXT NOT NULL, photo_url TEXT);
CREATE TABLE subjects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, translations JSONB NOT NULL DEFAULT '{}');
CREATE TABLE topics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), subject_id UUID NOT NULL REFERENCES subjects(id), grade SMALLINT NOT NULL CHECK (grade BETWEEN 6 AND 12), chapter TEXT NOT NULL, name TEXT NOT NULL, UNIQUE(subject_id, grade, chapter, name));
CREATE TABLE lessons (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic_id UUID NOT NULL REFERENCES topics(id), title TEXT NOT NULL, theory TEXT NOT NULL, formulas JSONB NOT NULL DEFAULT '[]', examples JSONB NOT NULL DEFAULT '[]', revision_summary TEXT NOT NULL, page_count SMALLINT NOT NULL DEFAULT 10, published BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic_id UUID NOT NULL REFERENCES topics(id), grade SMALLINT NOT NULL CHECK (grade BETWEEN 6 AND 12), prompt TEXT NOT NULL, options JSONB NOT NULL, answer_index SMALLINT NOT NULL CHECK (answer_index BETWEEN 0 AND 3), explanation TEXT NOT NULL, hint_1 TEXT NOT NULL, hint_2 TEXT NOT NULL, hint_3 TEXT NOT NULL, difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5), UNIQUE(topic_id, prompt));
CREATE TABLE attempts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), type attempt_type NOT NULL, title TEXT NOT NULL, total_questions SMALLINT NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, correct_count SMALLINT NOT NULL DEFAULT 0, answered_count SMALLINT NOT NULL DEFAULT 0, time_seconds INTEGER NOT NULL DEFAULT 0);
CREATE TABLE answers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE, question_id UUID NOT NULL REFERENCES questions(id), selected_index SMALLINT CHECK (selected_index BETWEEN 0 AND 3), is_correct BOOLEAN NOT NULL, time_seconds INTEGER NOT NULL DEFAULT 0, hint_count SMALLINT NOT NULL DEFAULT 0, UNIQUE(attempt_id, question_id));
CREATE TABLE progress (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, topic_id UUID NOT NULL REFERENCES topics(id), theory_percent SMALLINT NOT NULL DEFAULT 0, practice_percent SMALLINT NOT NULL DEFAULT 0, mastery_percent SMALLINT NOT NULL DEFAULT 0, lessons_completed INTEGER NOT NULL DEFAULT 0, last_activity_at TIMESTAMPTZ, PRIMARY KEY(user_id, topic_id));
CREATE TABLE audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id), action TEXT NOT NULL, target_type TEXT NOT NULL, target_id UUID, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX attempts_user_completed_idx ON attempts(user_id, completed_at DESC);
CREATE INDEX questions_topic_difficulty_idx ON questions(topic_id, difficulty);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
