# Balavidya LMS Architecture

## Product Surfaces

- **Student app:** Home, Learn, Practice, Quizzes, Tests, Progress, Achievements, Profile.
- **Teacher console:** Dashboard, Students, Classes, Performance, Tests, Reports.
- **School admin:** Dashboard, Schools, Students, Teachers, Content, Questions, Reports, Analytics, Settings.
- **District/state admin:** privacy-safe aggregates, school comparison, class/subject trends, activity and completion rates.

The prototype in `index.html` is the first student dashboard slice. It is intentionally static and low-bandwidth friendly; the interaction points are ready to connect to the APIs below.

## Roles and Access

| Role | Scope | Core permissions |
| --- | --- | --- |
| Student | Own account | Read assigned content, submit practice/quizzes/tests, read own progress |
| Teacher | Assigned school/classes | View assigned student aggregates, record attendance, assign content, support students |
| School Admin | One school | Manage school users, sections, content, questions, reports |
| District Admin | District | Read anonymized school/class aggregates, manage district programs |
| State Admin | State | Read anonymized district aggregates, configure curriculum and programs |
| Super Admin | Platform | Tenant configuration, role management, audit and content governance |

Children's data is minimized: use an internal student ID, avoid public student names in rankings, encrypt sensitive fields, enforce tenant scope on every query, and keep a complete audit log for privileged actions.

## Core Data Model

- `users(id, role, username, password_hash, display_name, locale, status, created_at)`
- `student_profiles(user_id, school_id, class_id, section_id, academic_year, photo_url)`
- `schools(id, name, district_id, code, status)`
- `districts(id, name, state_id)`
- `classes(id, grade, curriculum_version)` and `sections(id, class_id, name, teacher_id)`
- `subjects(id, slug, name, localized_names)`
- `topics(id, subject_id, grade, chapter, name, prerequisite_topic_id)`
- `lessons(id, topic_id, title, body, examples, media, difficulty_band, sort_order, published_at)`
- `questions(id, topic_id, grade, type, prompt, options, answer_key, explanation, difficulty_level, language)`
- `assignments(id, lesson_id, section_id, assigned_by, due_at)`
- `attempts(id, user_id, activity_type, activity_id, started_at, completed_at, score, accuracy, time_seconds)`
- `answers(id, attempt_id, question_id, selected_answer, is_correct, time_seconds)`
- `progress(user_id, topic_id, completion_percent, mastery_score, last_activity_at)`
- `attendance(id, student_id, date, status, recorded_by)`
- `achievements(id, slug, title, criteria)` and `user_achievements(user_id, achievement_id, earned_at)`
- `notifications(id, user_id, type, payload, read_at)`

Store localized copy by key (`content_translations`) so Telugu and future Indian languages can be added without changing lesson/question records.

## API Surface

All endpoints require an authenticated session except login. Use cursor pagination on lists and return only fields allowed by the caller's role.

- `POST /api/v1/auth/login` and `POST /api/v1/auth/logout`
- `GET /api/v1/me`, `GET /api/v1/me/dashboard`, `GET /api/v1/me/notifications`
- `GET /api/v1/learning-paths/:grade`, `GET /api/v1/topics/:topicId`, `POST /api/v1/lessons/:lessonId/complete`
- `GET /api/v1/practice/daily`, `POST /api/v1/attempts`, `POST /api/v1/attempts/:id/answers`, `POST /api/v1/attempts/:id/complete`
- `GET /api/v1/tests`, `POST /api/v1/tests/:testId/start`, `GET /api/v1/progress`, `GET /api/v1/reports/progress.pdf`
- `GET /api/v1/teacher/classes`, `GET /api/v1/teacher/students`, `GET /api/v1/teacher/analytics`
- `GET /api/v1/admin/users`, `POST /api/v1/admin/content/lessons`, `POST /api/v1/admin/content/questions`
- `GET /api/v1/analytics/district`, `GET /api/v1/analytics/schools`

Recommended server controls: Argon2id password hashing, short-lived access tokens with rotation, MFA for staff roles, rate limits, server-side authorization, encrypted backups, consent/retention policies, and an immutable audit stream.

## Personalization Logic

1. Calculate topic mastery from recent attempts with recency weighting and difficulty adjustment.
2. If mastery is below 55% across two attempts, create a revision recommendation and serve Level 1/2 practice.
3. If mastery is above 85% across two attempts, unlock Level 3/4 practice and optional challenge content.
4. The daily 15-question set balances Maths, Science and Reasoning, while filling the student's weakest topic first.
5. Rankings are opt-in and cohort-scoped; personal improvement, streaks and mastery are shown first.

## Curriculum Content Contract

Every published topic is keyed by `grade`, `subject`, `chapter` and `topic`, and follows this sequence:

`Concepts -> Theory -> Important points -> Formula/rule box -> Visual explanation -> Solved examples -> Level 1-5 practice -> Topic quiz -> Chapter test -> Performance analysis -> Revision summary`

The student content API should return the same shape for every class and subject so the UI can render a consistent learning cycle:

```json
{
	"grade": 8,
	"subject": "mathematics",
	"chapter": "Number System",
	"topic": "Fractions and Decimals",
	"mastery": 72,
	"theory": { "whatIsThis": "...", "whyNeedIt": "...", "howItWorks": "..." },
	"importantPoints": [],
	"formulas": [],
	"commonMistakes": [],
	"solvedExamples": [],
	"practice": { "level1": [], "level2": [], "level3": [], "level4": [], "level5": [] },
	"quiz": { "questions": [], "passMastery": 70 },
	"revisionSummary": "..."
}
```

The first-party catalog supports Classes 6-10 across Mathematics, Physics, Chemistry and Logical Reasoning. Grade gates should be enforced server-side; the client selector is only a learning-path view. A question cannot be published until its answer, explanation, hint stages, difficulty tag and uniqueness checks pass. Incorrect answers should trigger theory, one easier example, one similar practice item, and only then a retry at the original level.

## Delivery Plan

1. Add a REST API and PostgreSQL schema with row-level tenant checks.
2. Add a service worker for cached shell, lesson text and queued answer submissions.
3. Add a teacher/admin route group with server-side role guards.
4. Add an object store/CDN pipeline for compressed images and optional video downloads.
5. Add Playwright coverage for login, quiz feedback, language toggle, role access and offline queue behavior.
