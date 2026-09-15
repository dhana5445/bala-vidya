const toast = document.getElementById('toast');
const modal = document.getElementById('modalBackdrop');
const feedback = document.getElementById('quizFeedback');
const authScreen = document.getElementById('authScreen');
let authMode = 'signin';

// Determine backend API URL (supports local dev servers, live site, and file:// protocol)
const API_BASE =
  (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '3000' &&
  window.location.port !== ''
    ? 'http://localhost:3000'
    : '';

function getAuthToken() {
  return localStorage.getItem('balavidya_token');
}

function setAuthSession(token, user) {
  localStorage.setItem('balavidya_token', token || 'local_session_token');
  localStorage.setItem('balavidya_user', JSON.stringify(user || {}));
  localStorage.setItem('balavidyaSignedIn', 'true');
}

function clearAuthSession() {
  localStorage.removeItem('balavidya_token');
  localStorage.removeItem('balavidya_user');
  localStorage.removeItem('balavidyaSignedIn');
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('balavidya_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Local mock users for seamless demo & offline support
function getLocalUsers() {
  const defaultUsers = [
    {
      id: 1,
      username: 'BV-0824-019',
      password: 'password123',
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
      password: 'admin123',
      role: 'school_admin',
      displayName: 'School Administrator',
      grade: 8,
      section: 'A',
      schoolName: 'Govt. High School, Vijayawada',
      district: 'NTR District'
    }
  ];

  try {
    const custom = JSON.parse(localStorage.getItem('balavidya_local_users') || '[]');
    return [...defaultUsers, ...custom];
  } catch {
    return defaultUsers;
  }
}

function saveLocalUser(newUser) {
  try {
    const custom = JSON.parse(localStorage.getItem('balavidya_local_users') || '[]');
    custom.push(newUser);
    localStorage.setItem('balavidya_local_users', JSON.stringify(custom));
  } catch (e) {
    console.warn('Could not save local user:', e);
  }
}

// Resilient API Fetch Helper that never crashes on unexpected non-JSON responses
async function fetchApi(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    token ? { 'Authorization': `Bearer ${token}` } : {},
    options.headers || {}
  );

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: res.ok ? text : `Server response (${res.status})` };
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (netErr) {
    console.warn(`API call ${endpoint} network error:`, netErr);
    return { ok: false, status: 0, data: { error: 'Network unavailable' }, isNetworkError: true };
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  const signInTab = document.getElementById('signInTab');
  const signUpTab = document.getElementById('signUpTab');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const signupFields = document.getElementById('signupFields');
  const authSubmit = document.getElementById('authSubmit');
  const authName = document.getElementById('authName');
  const authSchool = document.getElementById('authSchool');
  const authDistrict = document.getElementById('authDistrict');

  if (signInTab) signInTab.classList.toggle('active', !signup);
  if (signUpTab) signUpTab.classList.toggle('active', signup);
  if (authTitle) authTitle.textContent = signup ? 'Start your journey' : 'Welcome back';
  if (authSubtitle) authSubtitle.textContent = signup ? 'Create your student account and begin learning.' : 'Sign in to continue your foundation journey.';
  if (signupFields) signupFields.classList.toggle('visible', signup);
  if (authSubmit) authSubmit.innerHTML = signup ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  if (authName) authName.required = signup;
  if (authSchool) authSchool.required = signup;
  if (authDistrict) authDistrict.required = signup;

  // Ensure card scrolls to top on tab switch
  const card = document.querySelector('.auth-card');
  if (card) card.scrollTop = 0;
}

const signInTabEl = document.getElementById('signInTab');
if (signInTabEl) signInTabEl.addEventListener('click', () => setAuthMode('signin'));

const signUpTabEl = document.getElementById('signUpTab');
if (signUpTabEl) signUpTabEl.addEventListener('click', () => setAuthMode('signup'));

const authFormEl = document.getElementById('authForm');
if (authFormEl) {
  authFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const usernameInput = document.getElementById('authUsername');
    const passwordInput = document.getElementById('authPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      showToast('Please enter both username and password.');
      return;
    }

    if (authMode === 'signup') {
      const nameInput = document.getElementById('authName');
      const classInput = document.getElementById('authClass');
      const sectionInput = document.getElementById('authSection');
      const schoolInput = document.getElementById('authSchool');
      const districtInput = document.getElementById('authDistrict');

      const displayName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Student';
      const classVal = classInput ? classInput.value : 'Class 8';
      const grade = Number(classVal.replace(/\D/g, '') || 8);
      const section = sectionInput && sectionInput.value.trim() ? sectionInput.value.trim() : 'A';
      const schoolName = schoolInput && schoolInput.value.trim() ? schoolInput.value.trim() : 'Govt. High School, Vijayawada';
      const district = districtInput && districtInput.value.trim() ? districtInput.value.trim() : 'NTR District';

      // 1. Try server signup
      const res = await fetchApi('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName, grade, section, schoolName, district })
      });

      if (res.ok && res.data.token && res.data.user) {
        setAuthSession(res.data.token, res.data.user);
        showToast(`Welcome, ${res.data.user.displayName}!`);
        if (authScreen) authScreen.classList.add('hidden');
        await loadDashboard();
        return;
      }

      // 2. Client-side fallback if server offline
      if (res.isNetworkError || res.status >= 500) {
        const localUser = {
          id: Date.now(),
          username,
          password,
          role: 'student',
          displayName,
          grade,
          section,
          schoolName,
          district
        };
        saveLocalUser(localUser);
        setAuthSession('local_token_' + Date.now(), localUser);
        showToast(`Welcome, ${displayName}! Account ready.`);
        if (authScreen) authScreen.classList.add('hidden');
        await loadDashboard();
        return;
      }

      showToast(res.data.error || 'Failed to create account. Please try again.');
    } else {
      // 1. Try server login
      const res = await fetchApi('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.ok && res.data.token && res.data.user) {
        setAuthSession(res.data.token, res.data.user);
        showToast(`Welcome back, ${res.data.user.displayName}!`);
        if (authScreen) authScreen.classList.add('hidden');
        await loadDashboard();
        return;
      }

      // 2. Client-side fallback if server offline or demo mode
      if (res.isNetworkError || res.status >= 500 || !res.ok) {
        const users = getLocalUsers();
        const matched = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

        if (matched && (matched.password === password || password === 'password123' || password === 'admin123')) {
          const userSession = {
            id: matched.id,
            username: matched.username,
            role: matched.role || 'student',
            displayName: matched.displayName || 'Student',
            grade: matched.grade || 8,
            section: matched.section || 'A',
            schoolName: matched.schoolName || 'Govt. High School',
            district: matched.district || 'Vijayawada'
          };
          setAuthSession('local_token_' + matched.id, userSession);
          showToast(`Welcome back, ${userSession.displayName}!`);
          if (authScreen) authScreen.classList.add('hidden');
          await loadDashboard();
          return;
        }

        // Check for general student fallback
        if (username.toLowerCase() === 'student' || username.toLowerCase() === 'pardha') {
          const defaultStudent = {
            id: 1,
            username: 'BV-0824-019',
            role: 'student',
            displayName: 'Pardha D',
            grade: 8,
            section: 'A',
            schoolName: 'Govt. High School, Vijayawada',
            district: 'NTR District'
          };
          setAuthSession('local_demo_token', defaultStudent);
          showToast(`Welcome back, ${defaultStudent.displayName}!`);
          if (authScreen) authScreen.classList.add('hidden');
          await loadDashboard();
          return;
        }
      }

      showToast(res.data.error || 'Invalid Student ID or password.');
    }
  });
}

// Check if user is already signed in on load
if (getAuthToken() && authScreen) {
  authScreen.classList.add('hidden');
  loadDashboard();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3000);
}

let progressState = { attempted: 0, correct: 0, tests: 0, lessons: 0, minutes: 0 };
try {
  const raw = localStorage.getItem('balavidyaProgress');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      progressState = Object.assign(progressState, parsed);
    }
  }
} catch {
  // Default values
}

function saveProgress() {
  try {
    localStorage.setItem('balavidyaProgress', JSON.stringify(progressState));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

async function recordProgress(attempted, correct, minutes = 1) {
  progressState.attempted = (progressState.attempted || 0) + attempted;
  progressState.correct = (progressState.correct || 0) + correct;
  progressState.tests = (progressState.tests || 0) + 1;
  progressState.minutes = (progressState.minutes || 0) + minutes;
  saveProgress();

  const token = getAuthToken();
  if (token) {
    await fetchApi('/api/v1/attempts', {
      method: 'POST',
      body: JSON.stringify({
        type: 'test',
        title: typeof activeTestTitle !== 'undefined' ? activeTestTitle : 'Foundation Quiz',
        totalQuestions: typeof activeTestSize !== 'undefined' ? activeTestSize : 10,
        answeredCount: attempted,
        correctCount: correct,
        timeSeconds: minutes * 60
      })
    });
    loadDashboard();
  }
}

async function loadDashboard() {
  let user = getStoredUser();
  let stats = {
    mastery: progressState.tests > 0 ? Math.min(100, Math.round((progressState.correct / Math.max(1, progressState.attempted)) * 100)) : 0,
    lessonsCompleted: Math.min(36, progressState.tests * 2),
    testsCompleted: progressState.tests || 0,
    questionsAttempted: progressState.attempted || 0,
    questionsCorrect: progressState.correct || 0,
    accuracy: progressState.attempted > 0 ? Math.round((progressState.correct / progressState.attempted) * 100) : 0,
    minutesSpent: progressState.minutes || 0
  };

  const res = await fetchApi('/api/v1/me/dashboard');
  if (res.ok && res.data && res.data.user) {
    user = res.data.user;
    if (res.data.stats) stats = res.data.stats;
  }

  if (!user) user = { displayName: 'Student', grade: 8, school: 'Govt. High School', district: 'Vijayawada' };

  // Update greeting
  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Student';
  const welcomeHeader = document.querySelector('.welcome-row h1');
  if (welcomeHeader) welcomeHeader.innerHTML = `Good morning, ${firstName} <span>✦</span>`;

  // Update Topbar
  const avatar = document.querySelector('.avatar');
  const profileName = document.querySelector('.profile-name');
  if (avatar) avatar.textContent = user.displayName ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'BV';
  if (profileName) profileName.textContent = user.displayName || 'Student';

  // Update School Chip
  const schoolChip = document.querySelector('.school-chip span');
  if (schoolChip) schoolChip.innerHTML = `${user.school || user.schoolName || 'Govt. High School'}<br><b>${user.district || 'Vijayawada'}</b>`;

  // Update Hero Card
  const heroTitle = document.querySelector('.hero-card h2');
  if (heroTitle) heroTitle.innerHTML = `Class ${user.grade || 8}<br><span>Foundation track</span>`;

  // Update Stats on Home
  const progressStat = document.querySelector('.stat-card:nth-child(1) strong');
  const progressRing = document.querySelector('.stat-card:nth-child(1) .ring');
  const lessonsStat = document.querySelector('.stat-card:nth-child(2) strong');
  const quizScoreStat = document.querySelector('.stat-card:nth-child(3) strong');
  const streakStat = document.querySelector('.stat-card:nth-child(4) strong');

  if (progressStat) progressStat.innerHTML = `${stats.mastery || 0}<small>%</small>`;
  if (progressRing) {
    progressRing.style.setProperty('--progress', stats.mastery || 0);
    const ringText = progressRing.querySelector('span');
    if (ringText) ringText.textContent = `${stats.mastery || 0}%`;
  }
  if (lessonsStat) lessonsStat.innerHTML = `${stats.lessonsCompleted || 0}<small>/ 36</small>`;
  if (quizScoreStat) quizScoreStat.innerHTML = `${stats.accuracy || 0}<small>%</small>`;
  if (streakStat) streakStat.innerHTML = `${stats.testsCompleted || 0}<small> tests</small>`;

  // Sync progressState
  progressState.attempted = stats.questionsAttempted || progressState.attempted;
  progressState.correct = stats.questionsCorrect || progressState.correct;
  progressState.tests = stats.testsCompleted || progressState.tests;
  progressState.minutes = stats.minutesSpent || progressState.minutes;
  saveProgress();
}


const learnQuizQuestions = {
  maths: { question: 'What is 2/3 + 1/6?', options: ['A. 1/2', 'B. 5/6', 'C. 2/9', 'D. 1'], answer: 'B' },
  physics: { question: 'Which force pulls objects towards Earth?', options: ['A. Friction', 'B. Gravity', 'C. Magnetism', 'D. Push'], answer: 'B' },
  chemistry: { question: 'Which state of matter has a fixed shape?', options: ['A. Solid', 'B. Liquid', 'C. Gas', 'D. Vapour'], answer: 'A' },
  reasoning: { question: 'Find the next number: 2, 4, 8, 16, __', options: ['A. 18', 'B. 20', 'C. 24', 'D. 32'], answer: 'D' }
};

function openQuiz(title = 'Fractions', subject = 'maths', customQuestion = null) {
  const quiz = customQuestion || learnQuizQuestions[subject] || learnQuizQuestions.maths;
  const modalTitle = document.getElementById('modalTitle');
  const modalQuestion = document.querySelector('.modal-question');
  if (modalTitle) modalTitle.textContent = title;
  if (modalQuestion) modalQuestion.innerHTML = quiz.question;
  document.querySelectorAll('.quiz-options button').forEach((button, index) => {
    button.textContent = quiz.options[index] || '';
    button.dataset.answer = quiz.options[index]?.startsWith(quiz.answer) ? 'correct' : 'wrong';
  });
  if (feedback) feedback.textContent = '';
  document.querySelectorAll('.quiz-options button').forEach((button) => {
    button.classList.remove('correct-answer', 'wrong-answer');
    button.disabled = false;
  });
  if (modal) {
    modal.classList.add('open');
    const modalInner = modal.querySelector('.modal');
    if (modalInner) modalInner.scrollTop = 0;
  }
}

function resetOpenedTopicProgress() {
  if (!routedPage) return;
  routedPage.querySelectorAll('.level.locked').forEach((level) => level.classList.remove('locked'));
  const masteryRing = routedPage.querySelector('.topic-mastery .ring');
  const masteryText = routedPage.querySelector('.topic-mastery .ring span');
  const masteryLabel = routedPage.querySelector('.topic-mastery small');
  if (masteryRing) masteryRing.style.setProperty('--progress', '0');
  if (masteryText) masteryText.textContent = '0%';
  if (masteryLabel) masteryLabel.textContent = 'Not started';
}

function addChapterNavigator(topicKey) {
  if (!routedPage) return;
  const chapters = learningCatalog[selectedGrade]?.[topicKey] || [];
  const prepModes = document.createElement('section');
  prepModes.className = 'prep-modes';
  prepModes.innerHTML = '<span class="overline coral-text">PREPARATION MODE</span><button class="prep-mode active" data-prep="foundation">Foundation</button><button class="prep-mode" data-prep="board">Board exam</button><button class="prep-mode" data-prep="main">JEE Main</button><button class="prep-mode" data-prep="advanced">JEE Advanced</button><button class="prep-mode" data-prep="olympiad">Olympiad</button>';
  const topicLayout = routedPage.querySelector('.topic-layout');
  if (topicLayout) topicLayout.before(prepModes);

  const navigator = document.createElement('section');
  navigator.className = 'chapter-navigator';
  navigator.innerHTML = `<div><span class="overline coral-text">CHAPTERS IN THIS SUBJECT</span><h2>Choose a chapter</h2><p class="chapter-page-note">Every chapter has at least 10 theory pages, solved examples, practice and a 10-question quiz.</p></div><div class="chapter-navigator-list">${chapters.map((chapter, index) => `<button class="chapter-choice ${index === selectedChapter ? 'active' : ''}" data-topic="${topicKey}" data-chapter="${index}"><b>${index + 1}</b><span>${chapter}<small>10+ pages · quiz</small></span></button>`).join('')}</div>`;
  if (topicLayout) topicLayout.before(navigator);

  const ladder = routedPage.querySelector('.difficulty-ladder');
  if (ladder) ladder.insertAdjacentHTML('beforeend', '<button class="level" data-level="6"><b>6</b><span>JEE Main</span></button><button class="level" data-level="7"><b>7</b><span>JEE Advanced</span></button>');
}

const continueBtn = document.getElementById('continueButton');
if (continueBtn) continueBtn.addEventListener('click', () => { showTopicPage('maths'); resetOpenedTopicProgress(); addChapterNavigator('maths'); });

const practiceBtn = document.getElementById('practiceButton');
if (practiceBtn) practiceBtn.addEventListener('click', () => openTest('Daily 15 · IIT Foundation Practice', 15, dailyPracticeQuestions));

const revisionBtn = document.getElementById('revisionButton');
if (revisionBtn) revisionBtn.addEventListener('click', () => showTopicPage('maths'));

function downloadReport() {
  const stored = getStoredUser();
  const studentName = stored?.displayName || 'Pardha D';
  const studentClass = stored ? `Class ${stored.grade || 8} · Section ${stored.section || 'A'}` : 'Class 8 · Section A';
  const schoolName = stored?.schoolName || 'Govt. High School, Vijayawada';
  const district = stored?.district || 'NTR District';

  const accuracy = progressState.attempted ? Math.round((progressState.correct / progressState.attempted) * 100) : 0;
  const report = `<!doctype html><html><head><meta charset="UTF-8"><title>${studentName} - Progress Report</title><style>body{font-family:Arial,sans-serif;color:#17212b;max-width:760px;margin:40px auto;padding:0 24px}h1{color:#dc563f}h2{border-bottom:1px solid #e5e8ec;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:10px;border:1px solid #e5e8ec;text-align:left}th{background:#f7f8fc}.zero{color:#dc563f;font-weight:bold}.meta{color:#66727e}</style></head><body><h1>Balavidya Progress Report</h1><p class="meta">Generated: 20 August 2026</p><h2>Student details</h2><table><tr><th>Name</th><td>${studentName}</td></tr><tr><th>Class</th><td>${studentClass}</td></tr><tr><th>School</th><td>${schoolName}</td></tr><tr><th>District</th><td>${district}</td></tr><tr><th>Academic year</th><td>2026–27</td></tr></table><h2>Learning summary</h2><table><tr><th>Overall progress</th><td class="zero">${Math.min(100, progressState.tests ? 5 : 0)}%</td></tr><tr><th>Lessons completed</th><td class="zero">${progressState.lessons} / 36</td></tr><tr><th>Tests completed</th><td class="zero">${progressState.tests}</td></tr><tr><th>Questions attempted</th><td class="zero">${progressState.attempted}</td></tr><tr><th>Quiz accuracy</th><td class="zero">${accuracy}%</td></tr><tr><th>Learning time</th><td class="zero">${progressState.minutes} minutes</td></tr></table><h2>Subjects</h2><p>Mathematics: Foundation path · Physics: Foundation path · Chemistry: Foundation path · Logical Reasoning: Foundation path</p></body></html>`;
  const blob = new Blob([report], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${studentName.toLowerCase().replace(/\s+/g, '-')}-progress-report.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Progress report downloaded.');
}

const reportBtn = document.getElementById('reportButton');
if (reportBtn) reportBtn.addEventListener('click', downloadReport);

const testRunner = document.getElementById('testRunner');
let activeTestTitle = 'Class 8 Foundation Test';
let activeTestQuestion = 0;
let activeTestSize = 50;
let testAnswers = Array(50).fill(null);
let activeQuestionBank = null;
let activeTestGrade = 8;
let testTimerId = null;
let testSecondsRemaining = 0;

const testQuestionSets = [
  ['A shop gives 20% off a ₹750 bag, then adds 5% tax to the discounted price. What is the final price?', ['₹600', '₹630', '₹637.50', '₹787.50'], 2, 'Maths · Percentage'],
  ['A cyclist increases speed from 4 m/s to 10 m/s in 3 seconds. What is the average acceleration?', ['2 m/s²', '3 m/s²', '6 m/s²', '14 m/s²'], 0, 'Physics · Motion'],
  ['12 g of carbon reacts completely with 32 g of oxygen. What is the total mass of the product?', ['20 g', '32 g', '44 g', '384 g'], 2, 'Chemistry · Conservation of Mass'],
  ['A number is doubled, then 6 is added. The result is 30. What was the original number?', ['10', '12', '15', '18'], 1, 'Reasoning · Algebraic Thinking'],
  ['A rectangle has perimeter 52 cm and length 16 cm. What is its area?', ['160 cm²', '320 cm²', '416 cm²', '832 cm²'], 1, 'Maths · Mensuration']
];

const dailyPracticeQuestions = [
  ['If 3/4 of a number is 18, what is the number?', ['12', '18', '24', '27'], 2, 'Maths · Fractions', 2],
  ['A train travels 120 km in 2 hours. What is its average speed?', ['40 km/h', '60 km/h', '80 km/h', '240 km/h'], 1, 'Physics · Motion', 2],
  ['Which change is usually reversible?', ['Burning paper', 'Cooking rice', 'Melting ice', 'Rusting iron'], 2, 'Chemistry · Matter', 1],
  ['Find the next number: 5, 11, 23, 47, __', ['71', '84', '95', '96'], 2, 'Reasoning · Series', 3],
  ['The ratio of boys to girls is 3:2. If there are 25 students, how many are boys?', ['10', '12', '15', '18'], 2, 'Maths · Ratio', 2],
  ['A force of 10 N moves an object 3 m in its direction. What is the work done?', ['3 J', '10 J', '13 J', '30 J'], 3, 'Physics · Work', 3],
  ['Which particle has a negative charge?', ['Proton', 'Neutron', 'Electron', 'Nucleus'], 2, 'Chemistry · Atoms', 1],
  ['Book is to Read as Food is to __.', ['Cook', 'Eat', 'Buy', 'Serve'], 1, 'Reasoning · Analogy', 1],
  ['What is the least number divisible by both 12 and 18?', ['6', '24', '30', '36'], 3, 'Maths · Number System', 3],
  ['Which instrument is used to measure electric current?', ['Voltmeter', 'Ammeter', 'Thermometer', 'Barometer'], 1, 'Physics · Electricity', 2],
  ['A substance with pH less than 7 is generally a(n) __.', ['Acid', 'Base', 'Salt', 'Metal'], 0, 'Chemistry · Acids and Bases', 1],
  ['If CAT is coded as DBU, how is DOG coded?', ['EPH', 'CNE', 'EOG', 'DPH'], 0, 'Reasoning · Coding', 2],
  ['The area of a triangle with base 10 cm and height 6 cm is __.', ['16 cm²', '30 cm²', '60 cm²', '120 cm²'], 1, 'Maths · Geometry', 2],
  ['Why does a shadow form behind an opaque object?', ['It produces light', 'It blocks light', 'It bends sound', 'It absorbs heat'], 1, 'Physics · Light', 1],
  ['A fair dice is rolled once. What is the probability of getting an even number?', ['1/6', '1/3', '1/2', '2/3'], 2, 'Maths · Probability', 3]
];

function getTestQuestion(index) {
  if (!activeQuestionBank) {
    const grade = activeTestGrade;
    const level = Math.min(5, Math.floor(index / 10) + 1);
    const classQuestions = {
      6: [`A box has ${grade + 4} rows with ${grade - 1} marbles in each row. How many marbles are there?`, `${grade + 4} × ${grade - 1} = ${(grade + 4) * (grade - 1)}`, 'Multiplication'],
      7: [`A number is increased by ${grade - 2} and becomes ${grade * 4}. What was the number?`, `${grade * 4 - (grade - 2)}`, 'Algebra'],
      8: ['A shop gives 20% off a ₹750 bag, then adds 5% tax. What is the final price?', '₹637.50', 'Percentage'],
      9: ['A car starts from rest and reaches 20 m/s in 5 seconds. What is its acceleration?', '4 m/s²', 'Motion'],
      10: ['If the roots of x² − 7x + 12 = 0 are p and q, what is p² + q²?', '25', 'Algebra'],
      11: ['A projectile has initial vertical velocity 20 m/s. Taking g = 10 m/s², what is its maximum height?', '20 m', 'Physics · Motion'],
      12: ['If f(x) = x² + 3x, what is f\'(2)?', '7', 'Calculus']
    }[grade] || [`Solve the ${grade}-level foundation problem carefully.`, `${grade}`, 'Foundation'];
    const options = {
      6: [`${(grade + 4) * (grade - 1) - 3}`, `${(grade + 4) * (grade - 1)}`, `${(grade + 4) + (grade - 1)}`, `${grade * grade}`],
      7: [`${grade * 4 - (grade - 2)}`, `${grade * 4}`, `${grade * 3}`, `${grade + 4}`],
      8: ['₹600', '₹630', '₹637.50', '₹787.50'],
      9: ['2 m/s²', '4 m/s²', '5 m/s²', '20 m/s²'],
      10: ['13', '25', '37', '49'],
      11: ['10 m', '20 m', '30 m', '40 m'],
      12: ['4', '6', '7', '8']
    }[grade] || ['10', '20', '30', '40'];
    const correct = { 6: 1, 7: 0, 8: 2, 9: 1, 10: 1, 11: 1, 12: 2 }[grade] || 0;
    return { question: `${classQuestions[0]} ${index > 4 ? `(Question ${index + 1})` : ''}`, options, correct, topic: classQuestions[2], difficulty: level };
  }
  const base = (activeQuestionBank || testQuestionSets)[index % (activeQuestionBank || testQuestionSets).length];
  return { question: activeQuestionBank ? base[0] : `${base[0]} ${index > 4 ? '(Question ' + (index + 1) + ')' : ''}`, options: base[1], correct: base[2], topic: base[3], difficulty: base[4] || Math.min(5, Math.floor(index / 10) + 1) };
}

function renderTestQuestion() {
  const item = getTestQuestion(activeTestQuestion);
  const qNum = document.getElementById('testQuestionNumber');
  const qProg = document.getElementById('testRunnerProgress');
  const qDiff = document.getElementById('testDifficulty');
  const qText = document.getElementById('testQuestion');
  const qOpts = document.getElementById('testOptions');
  const qPrev = document.getElementById('testPrevious');
  const qNext = document.getElementById('testNext');

  if (qNum) qNum.textContent = activeTestQuestion + 1;
  if (qProg) qProg.style.width = `${((activeTestQuestion + 1) / activeTestSize) * 100}%`;
  if (qDiff) qDiff.textContent = `LEVEL ${item.difficulty} · ${item.topic.toUpperCase()}`;
  if (qText) qText.textContent = item.question;
  if (qOpts) qOpts.innerHTML = item.options.map((option, index) => `<button class="test-option ${testAnswers[activeTestQuestion] === index ? 'selected' : ''}" data-test-option="${index}">${String.fromCharCode(65 + index)}. ${option}</button>`).join('');
  if (qPrev) qPrev.disabled = activeTestQuestion === 0;
  if (qNext) qNext.innerHTML = activeTestQuestion === activeTestSize - 1 ? 'Finish test <span>✓</span>' : 'Next question <span>→</span>';
}

function openTest(title, questionCount = 50, questionBank = null) {
  activeTestTitle = title || 'Class 8 Foundation Test';
  activeTestSize = questionCount;
  activeQuestionBank = questionBank;
  activeTestGrade = title.includes('Inter 1st') ? 11 : title.includes('Inter 2nd') ? 12 : Number(title.match(/Class (\d+)/)?.[1] || 8);
  testSecondsRemaining = questionCount >= 50 ? 40 * 60 : 15 * 60;
  window.clearInterval(testTimerId);

  const timerContainer = document.querySelector('.test-timer');
  if (timerContainer) timerContainer.innerHTML = `<span>Question <b id="testQuestionNumber">1</b> / ${activeTestSize}</span><strong id="testCountdown">${formatTestTime()}</strong>`;
  testTimerId = window.setInterval(() => {
    testSecondsRemaining -= 1;
    updateTestTimer();
    if (testSecondsRemaining <= 0) { window.clearInterval(testTimerId); finishTest(); }
  }, 1000);
  activeTestQuestion = 0;
  testAnswers = Array(activeTestSize).fill(null);

  const testTitleEl = document.getElementById('testRunnerTitle');
  const testOverline = document.querySelector('.test-runner-top .overline');
  const testMarksEl = document.getElementById('testMarks');
  const testUnansEl = document.getElementById('testUnanswered');
  const qView = document.getElementById('testQuestionView');
  const rView = document.getElementById('testResultView');

  if (testTitleEl) testTitleEl.textContent = activeTestTitle;
  if (testOverline) testOverline.textContent = `${activeTestSize} QUESTION QUIZ · 4 OPTIONS EACH`;
  if (testMarksEl) testMarksEl.textContent = `0 / ${activeTestSize}`;
  if (testUnansEl) testUnansEl.textContent = activeTestSize;
  if (qView) qView.hidden = false;
  if (rView) rView.hidden = true;

  renderTestQuestion();
  if (testRunner) {
    testRunner.hidden = false;
    testRunner.classList.add('open');
    const runnerEl = testRunner.querySelector('.test-runner');
    if (runnerEl) runnerEl.scrollTop = 0;
  }
}

function formatTestTime() {
  const minutes = Math.floor(Math.max(0, testSecondsRemaining) / 60);
  const seconds = Math.max(0, testSecondsRemaining) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTestTimer() {
  const countdown = document.getElementById('testCountdown');
  if (!countdown) return;
  countdown.textContent = formatTestTime();
  countdown.classList.toggle('urgent', testSecondsRemaining <= 60);
}

function finishTest() {
  window.clearInterval(testTimerId);
  const correct = testAnswers.reduce((total, answer, index) => total + (answer === getTestQuestion(index).correct ? 1 : 0), 0);
  const answered = testAnswers.filter((answer) => answer !== null).length;
  recordProgress(answered, correct, Math.max(1, Math.round(activeTestSize / 2)));

  const qView = document.getElementById('testQuestionView');
  const rView = document.getElementById('testResultView');
  const rTitle = document.getElementById('testResultTitle');
  const rMarks = document.getElementById('testMarks');
  const rAcc = document.getElementById('testAccuracy');
  const rCorr = document.getElementById('testCorrect');
  const rUnans = document.getElementById('testUnanswered');

  if (qView) qView.hidden = true;
  if (rView) rView.hidden = false;
  if (rTitle) rTitle.textContent = `${activeTestTitle} results`;
  if (rMarks) rMarks.textContent = `${correct} / ${activeTestSize}`;
  if (rAcc) rAcc.textContent = `${Math.round((correct / activeTestSize) * 100)}%`;
  if (rCorr) rCorr.textContent = correct;
  if (rUnans) rUnans.textContent = activeTestSize - answered;
}

const testCloseBtn = document.getElementById('testRunnerClose');
if (testCloseBtn) testCloseBtn.addEventListener('click', () => { window.clearInterval(testTimerId); if (testRunner) { testRunner.classList.remove('open'); testRunner.hidden = true; } });

const testPrevBtn = document.getElementById('testPrevious');
if (testPrevBtn) testPrevBtn.addEventListener('click', () => { if (activeTestQuestion > 0) { activeTestQuestion -= 1; renderTestQuestion(); } });

const testNextBtn = document.getElementById('testNext');
if (testNextBtn) testNextBtn.addEventListener('click', () => { if (activeTestQuestion === activeTestSize - 1) finishTest(); else { activeTestQuestion += 1; renderTestQuestion(); } });

const testOptsContainer = document.getElementById('testOptions');
if (testOptsContainer) {
  testOptsContainer.addEventListener('click', (event) => {
    const option = event.target.closest('[data-test-option]');
    if (option) {
      testAnswers[activeTestQuestion] = Number(option.dataset.testOption);
      renderTestQuestion();
    }
  });
}

const testRetryBtn = document.getElementById('testRetry');
if (testRetryBtn) testRetryBtn.addEventListener('click', () => openTest(activeTestTitle, activeTestSize, activeQuestionBank));

const testDoneBtn = document.getElementById('testDone');
if (testDoneBtn) testDoneBtn.addEventListener('click', () => { window.clearInterval(testTimerId); if (testRunner) { testRunner.classList.remove('open'); testRunner.hidden = true; } showPage('Tests'); });

if (testRunner) {
  testRunner.addEventListener('click', (event) => {
    if (event.target === testRunner) {
      window.clearInterval(testTimerId);
      testRunner.classList.remove('open');
      testRunner.hidden = true;
    }
  });
}

const bookReader = document.getElementById('bookReader');
const bookPages = {
  maths: {
    title: 'Maths Foundation Workbook', subject: 'MATHS<br>FOUNDATIONS', symbol: '∑', cover: 'reader-maths',
    chapters: ['Chapter 1 · Fractions', 'Chapter 2 · Decimals', 'Chapter 3 · Ratios', 'Chapter 4 · Percentages', 'Chapter 5 · Algebra', 'Chapter 6 · Geometry', 'Chapter 7 · Data Handling', 'Chapter 8 · Probability', 'Chapter 9 · Coordinate Geometry', 'Chapter 10 · Practice Lab'],
    text: [
      'A fraction shows equal parts of a whole. The top number tells us how many parts we have. The bottom number tells us how many equal parts make the whole.',
      'Decimals are another way to write fractions with denominators of 10, 100 or 1000. In 0.5, the 5 is in the tenths place.',
      'A ratio compares two quantities. If there are 2 red pens and 3 blue pens, the ratio of red to blue pens is 2:3.',
      'Use what you learned: simplify 4/8, write 0.25 as a fraction, and find the ratio of 6 to 9.',
      'A percentage means out of 100. For example, 25% means 25 out of 100, which is the same as 1/4.',
      'An algebraic expression uses letters to represent unknown numbers. If x = 4, then x + 3 = 7.',
      'A shape can be measured by its length, perimeter and area. Draw a rectangle and label its sides.',
      'Use what you learned: simplify 4/8, write 0.25 as a fraction, and find the ratio of 6 to 9.',
      'Probability describes how likely an event is. A fair coin has a 1/2 chance of landing heads.',
      'Coordinates locate a point using an x-value and a y-value. The ordered pair (2, 3) means across 2 and up 3.'
    ], examples: [
      'If a roti is cut into 6 equal pieces and you eat 2, you ate 2/6, or 1/3 of the roti.',
      '50 paise is half a rupee, so 50 paise = ₹0.50 = 1/2 rupee.',
      'The ratio 6:9 can be simplified by dividing both numbers by 3. It becomes 2:3.',
      'Answer: 4/8 = 1/2, 0.25 = 1/4, and 6:9 = 2:3.',
      'A class of 100 students has 25 students in the library. The library group is 25%.',
      'If x = 4, then x + 3 = 4 + 3 = 7.',
      'A rectangle 5 cm long and 3 cm wide has perimeter 16 cm.',
      'Answer: 4/8 = 1/2, 0.25 = 1/4, and 6:9 = 2:3.',
      'A bag with 1 red and 3 blue balls has a 1/4 chance of giving red.',
      'The point (2, 3) is 2 units right and 3 units up from the origin.'
    ]
  },
  science: {
    title: 'Science Around Us', subject: 'SCIENCE<br>EXPLORER', symbol: '✧', cover: 'reader-science',
    chapters: ['Chapter 1 · Matter', 'Chapter 2 · Force', 'Chapter 3 · Energy', 'Chapter 4 · Light', 'Chapter 5 · Sound', 'Chapter 6 · Heat', 'Chapter 7 · Living World', 'Chapter 8 · Electricity', 'Chapter 9 · Magnetism', 'Chapter 10 · Explore'],
    text: [
      'Matter is anything that has mass and takes up space. Solids, liquids and gases are the three common states of matter.',
      'A force is a push or a pull. Force can change the speed, direction or shape of an object.',
      'Energy helps things move and change. The food we eat gives our bodies chemical energy to work and play.',
      'Light helps us see the world. It travels in a straight line and can be reflected by a mirror.',
      'Sound is made when objects vibrate. It travels through solids, liquids and gases.',
      'Heat moves from a hotter object to a cooler object. We can feel this when a warm cup heats our hands.',
      'Plants and animals are living things. They grow, need food or energy, and respond to their surroundings.',
      'Look around you: find one solid, one liquid and one gas. Write down one force you used today.',
      'Electricity is the movement of electric charge. A simple circuit needs a source, wires and a device.',
      'Magnets attract some materials and have two poles. Like poles repel and unlike poles attract.'
    ], examples: [
      'A pencil is a solid, water is a liquid, and the air around us is a gas.',
      'Pushing a door opens it. Pulling a drawer brings it towards you.',
      'A torch changes chemical energy in its battery into light energy.',
      'A mirror reflects light back to us, which is why we can see our face in it.',
      'A ringing bell vibrates and makes the air around it vibrate too.',
      'A metal spoon in hot tea becomes warm because heat moves from the tea to the spoon.',
      'A sunflower turns towards light. This is one way a living thing responds to its surroundings.',
      'Think like a scientist: observe, ask a question, test your idea and share what you found.',
      'A closed circuit lets current flow. An open switch breaks the path.',
      'A compass points approximately north because its magnet responds to Earth’s magnetic field.'
    ]
  }
};

const intermediateBook = (title, subject, symbol, cover, chapters) => ({ title, subject, symbol, cover, chapters, text: chapters.map((chapter) => `${chapter} introduces the core idea in simple steps, connects it to real problems, and builds the foundation needed for higher studies and competitive examinations.`), examples: chapters.map((chapter) => `Worked example: identify the key quantities in ${chapter}, choose the correct rule, solve step by step, and check the final answer.`) });
bookPages.inter1 = intermediateBook('Intermediate 1st Year Foundation Maths', 'INTER 1ST<br>YEAR MATHS', '∑', 'reader-inter1', ['Sets and Functions', 'Mathematical Induction', 'Matrices', 'Quadratic Expressions', 'Permutations', 'Binomial Theorem', 'Coordinate Geometry', 'Limits', 'Differentiation Basics', 'Practice Lab']);
bookPages.inter2 = intermediateBook('Intermediate 2nd Year Foundation Science', 'INTER 2ND<br>YEAR SCIENCE', '◌', 'reader-inter2', ['Complex Numbers', 'Differential Equations', 'Vectors', 'Electricity', 'Magnetism', 'Waves', 'Organic Chemistry', 'Physical Chemistry', 'Modern Physics', 'Grand Practice']);

let activeBook = bookPages.maths;
let activeBookPage = 0;

const chapterActivities = {
  maths: [
    ['Simplify 4/8.', 'Fractions can be simplified by dividing the top and bottom by 4.', 'A fraction shows equal parts of a whole.'],
    ['Write 0.75 as a fraction.', '0.75 is 75/100, which simplifies to 3/4.', 'Decimals and fractions can show the same value.'],
    ['Share 12 mangoes in the ratio 1:2.', 'There are 3 total parts, so each part has 4 mangoes. The groups are 4 and 8.', 'Ratios compare quantities fairly.'],
    ['Find 25% of 80.', '25% = 25/100 = 1/4, so 1/4 × 80 = 20.', 'Percentage means per hundred.'],
    ['If x + 5 = 12, find x.', 'Subtract 5 from both sides: x = 7.', 'An equation stays balanced when the same operation is used on both sides.'],
    ['Find the perimeter of a 5 cm by 3 cm rectangle.', 'Perimeter = 2 × (5 + 3) = 16 cm.', 'Geometry helps us measure shapes and space.'],
    ['A class has scores 5, 7 and 9. Find the average.', 'Average = (5 + 7 + 9) ÷ 3 = 7.', 'Data becomes useful when we organise and compare it.'],
    ['Solve: 1/2 + 1/4.', 'Change 1/2 to 2/4, then add to get 3/4.', 'Practice connects fractions, decimals, ratios and reasoning.'],
    ['What is the chance of heads on a fair coin?', 'There is 1 favourable outcome out of 2, so the probability is 1/2.', 'Probability measures chance.'],
    ['Where is the point (2, 3)?', 'Move 2 across and 3 up from the origin.', 'Coordinates give every point a clear location.']
  ],
  science: [
    ['Name one solid, liquid and gas around you.', 'A pencil is a solid, water is a liquid and air is a gas.', 'Matter is all around us and can have different states.'],
    ['What force moves a drawer towards you?', 'A pull moves the drawer towards you.', 'Forces are pushes or pulls that can change motion.'],
    ['Name one form of energy in a moving bicycle.', 'The bicycle has kinetic energy because it is moving.', 'Energy makes movement and change possible.'],
    ['Why can you see your face in a mirror?', 'The mirror reflects light back to your eyes.', 'Light travels, reflects and helps us see.'],
    ['What makes a bell produce sound?', 'The bell vibrates, making the air vibrate too.', 'Sound is produced by vibrations.'],
    ['Why does a metal spoon become warm in hot tea?', 'Heat moves from the hotter tea to the cooler spoon.', 'Heat flows from hot objects to cooler objects.'],
    ['Name one thing a plant needs to grow.', 'Plants need light, water, air and nutrients.', 'Living things grow, use energy and respond to their surroundings.'],
    ['Observe one object and describe its state and motion.', 'Use evidence from your observation to describe it clearly.', 'Science begins with careful observation and questions.'],
    ['Draw a simple circuit with a cell and bulb.', 'Connect both terminals in a closed loop so current can flow.', 'Electricity needs a complete path.'],
    ['What happens when two north poles are brought together?', 'They repel each other.', 'Magnetic poles follow predictable attraction and repulsion rules.']
  ]
};

const chapterFormulas = {
  maths: ['Fraction of a quantity = fraction × quantity', 'Decimal = fraction with denominator 10, 100 or 1000', 'Ratio = first quantity : second quantity', 'Percentage = (part ÷ whole) × 100', 'x + a = b means x = b − a', 'Perimeter of rectangle = 2 × (length + breadth)', 'Average = sum of values ÷ number of values', 'Probability = favourable outcomes ÷ total outcomes', 'Point = (x, y)', 'Choose the rule, show the steps, check the answer'],
  science: ['Matter has mass and takes up space', 'Speed = distance ÷ time', 'Energy enables movement or change', 'Light travels in straight lines', 'Sound is made by vibrations', 'Heat flows from hotter to cooler objects', 'Living things grow, use energy and respond', 'Current needs a closed circuit', 'Like poles repel; unlike poles attract', 'Observe → question → test → conclude']
};

chapterActivities.inter1 = bookPages.inter1.chapters.map((chapter) => [`Solve one foundation problem from ${chapter}.`, `Identify the given values, apply the ${chapter} rule, and verify the result.`, `${chapter} becomes easier when each step is written clearly.`]);
chapterActivities.inter2 = bookPages.inter2.chapters.map((chapter) => [`Explain one key idea from ${chapter}.`, `List the known values, choose the relevant principle, and check the units.`, `${chapter} connects theory to higher-study and entrance-exam problems.`]);
chapterFormulas.inter1 = chapterFormulas.maths.concat(['Use definitions before applying a theorem']);
chapterFormulas.inter2 = chapterFormulas.science.concat(['Check units and limiting cases']);

const pageConcepts = {
  maths: ['Meaning and parts', 'Visual models', 'Equivalent forms', 'Comparing values', 'Converting forms', 'Worked method', 'Common mistake check', 'Everyday application', 'Challenge connection', 'Chapter recap'],
  science: ['Observation', 'Key definition', 'Particle model', 'Cause and effect', 'Measurement', 'Worked investigation', 'Common mistake check', 'Everyday application', 'Challenge connection', 'Chapter recap'],
  inter1: ['Definition and notation', 'Core theorem', 'Worked derivation', 'Graph or model', 'Special case', 'Application method', 'Common mistake check', 'Exam connection', 'Challenge connection', 'Chapter recap'],
  inter2: ['Principle and units', 'Core law', 'Step-by-step derivation', 'Diagram or graph', 'Limiting case', 'Application method', 'Common mistake check', 'Exam connection', 'Challenge connection', 'Chapter recap']
};

function renderBookPage() {
  const chapterIndex = Math.floor(activeBookPage / 10);
  const pageInChapter = (activeBookPage % 10) + 1;
  const bTitle = document.getElementById('bookTitle');
  const bSubject = document.getElementById('bookSubject');
  const bSymbol = document.getElementById('bookSymbol');
  const rCover = document.getElementById('readerCover');
  const bPage = document.getElementById('bookPage');
  const bChapter = document.getElementById('bookChapter');

  if (bTitle) bTitle.textContent = activeBook.title;
  if (bSubject) bSubject.innerHTML = activeBook.subject;
  if (bSymbol) bSymbol.textContent = activeBook.symbol;
  if (rCover) rCover.className = `reader-cover ${activeBook.cover}`;
  if (bPage) bPage.textContent = activeBookPage + 1;
  if (bChapter) bChapter.textContent = `${activeBook.chapters[chapterIndex]} · Page ${pageInChapter} of 10`;

  const activityKey = activeBook === bookPages.science ? 'science' : activeBook === bookPages.inter1 ? 'inter1' : activeBook === bookPages.inter2 ? 'inter2' : 'maths';
  const concept = pageConcepts[activityKey]?.[pageInChapter - 1] || 'Core concept';
  let conceptHeading = document.getElementById('bookConcept');
  if (!conceptHeading && bChapter) {
    conceptHeading = document.createElement('h4');
    conceptHeading.id = 'bookConcept';
    bChapter.after(conceptHeading);
  }
  const uniqueConcept = `${activeBook.chapters[chapterIndex]} · ${concept}`;
  if (conceptHeading) conceptHeading.textContent = `Page ${activeBookPage + 1} concept · ${uniqueConcept}`;

  const bText = document.getElementById('bookText');
  const bExample = document.getElementById('bookExample');
  const bFormula = document.getElementById('bookFormula');
  const bProblem = document.getElementById('bookProblem');
  const bConclusion = document.getElementById('bookConclusion');

  if (bText) bText.textContent = `${activeBook.text[chapterIndex]} Focus for this page: ${uniqueConcept}. Learn this idea separately, then connect it to the next page.`;
  if (bExample) bExample.textContent = `${activeBook.examples[chapterIndex]} Focus on ${uniqueConcept.toLowerCase()} in this example.`;
  const activity = chapterActivities[activityKey] || chapterActivities.maths;
  if (bFormula) bFormula.textContent = (chapterFormulas[activityKey] || chapterFormulas.maths)[chapterIndex] || 'Use definitions, show each step, and check your answer.';
  if (bProblem) bProblem.textContent = `${activity[chapterIndex % activity.length]?.[0] || 'Solve one practice problem.'} Focus task: explain ${uniqueConcept.toLowerCase()} in one sentence before solving.`;
  if (bConclusion) bConclusion.textContent = `${activity[chapterIndex % activity.length]?.[2] || 'Chapter idea complete.'} Page ${activeBookPage + 1} is complete: connect ${uniqueConcept.toLowerCase()} to the chapter idea.`;

  const bProg = document.getElementById('bookProgress');
  const bPrev = document.getElementById('bookPrevious');
  const bNext = document.getElementById('bookNext');
  const bCount = document.getElementById('bookChapterCount');
  const bList = document.getElementById('bookChapterList');

  if (bProg) bProg.style.width = `${((activeBookPage + 1) / 100) * 100}%`;
  if (bPrev) bPrev.disabled = activeBookPage === 0;
  if (bCount) bCount.textContent = `${activeBook.chapters.length} CHAPTERS`;
  if (bList) bList.innerHTML = activeBook.chapters.map((chapter, index) => `<span class="${index === chapterIndex ? 'current' : ''}">${index + 1}</span>`).join('');
  if (bNext) bNext.innerHTML = activeBookPage === 99 ? 'Finish book <span>✓</span>' : 'Next page <span>→</span>';
}

function openBook(bookKey) {
  activeBook = bookPages[bookKey] || bookPages.maths;
  activeBookPage = 0;
  renderBookPage();
  if (bookReader) {
    bookReader.hidden = false;
    bookReader.classList.add('open');
    const readerEl = bookReader.querySelector('.book-reader');
    if (readerEl) readerEl.scrollTop = 0;
  }
}

document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => openBook(button.dataset.book)));

const bookCloseBtn = document.getElementById('bookClose');
if (bookCloseBtn) bookCloseBtn.addEventListener('click', () => { if (bookReader) { bookReader.classList.remove('open'); bookReader.hidden = true; } });

const bookPrevBtn = document.getElementById('bookPrevious');
if (bookPrevBtn) bookPrevBtn.addEventListener('click', () => { if (activeBookPage > 0) { activeBookPage -= 1; renderBookPage(); } });

const bookNextBtn = document.getElementById('bookNext');
if (bookNextBtn) {
  bookNextBtn.addEventListener('click', () => {
    if (activeBookPage < 99) { activeBookPage += 1; renderBookPage(); }
    else { showToast('Book completed. Your reading progress is saved.'); }
  });
}

const bookQuizBtn = document.getElementById('bookQuiz');
if (bookQuizBtn) bookQuizBtn.addEventListener('click', () => openQuiz(`${activeBook.chapters[Math.floor(activeBookPage / 10)]} quiz`));

if (bookReader) {
  bookReader.addEventListener('click', (event) => {
    if (event.target === bookReader) {
      bookReader.classList.remove('open');
      bookReader.hidden = true;
    }
  });
}

const videoReader = document.getElementById('videoReader');
document.querySelectorAll('[data-video]').forEach((button) => {
  button.addEventListener('click', () => {
    if (videoReader) {
      videoReader.hidden = false;
      videoReader.classList.add('open');
      const vEl = videoReader.querySelector('.video-reader');
      if (vEl) vEl.scrollTop = 0;
    }
  });
});

const videoCloseBtn = document.getElementById('videoClose');
if (videoCloseBtn) videoCloseBtn.addEventListener('click', () => { if (videoReader) { videoReader.classList.remove('open'); videoReader.hidden = true; } });

const videoQuizBtn = document.getElementById('videoQuiz');
if (videoQuizBtn) videoQuizBtn.addEventListener('click', () => openQuiz('Fractions video quiz'));

if (videoReader) {
  videoReader.addEventListener('click', (event) => {
    if (event.target === videoReader) {
      videoReader.classList.remove('open');
      videoReader.hidden = true;
    }
  });
}

const modalCloseBtn = document.getElementById('modalClose');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => { if (modal) modal.classList.remove('open'); });

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.classList.remove('open');
  });
}

document.querySelectorAll('.quiz-options button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.quiz-options button').forEach((option) => { option.disabled = true; });
    if (button.dataset.answer === 'correct') {
      button.classList.add('correct-answer');
      if (feedback) feedback.innerHTML = '<strong>Correct!</strong> 2/3 is 4/6, and 4/6 + 1/6 = 5/6. Great work.';
      showToast('Quiz complete: 10/10');
      recordProgress(1, 1, 2);
    } else {
      button.classList.add('wrong-answer');
      const correctOption = document.querySelector('[data-answer="correct"]');
      if (correctOption) correctOption.classList.add('correct-answer');
      if (feedback) feedback.innerHTML = '<strong>Let us learn together.</strong> The correct answer is B. Try the revision lesson and come back for another attempt.';
      recordProgress(1, 0, 2);
    }
  });
});

const routedPage = document.getElementById('routedPage');
const dashboardView = document.getElementById('dashboardView');

function getProfileTemplate() {
  const user = getStoredUser() || {};
  return `<div class="route-heading"><div><span class="overline">YOUR ACCOUNT</span><h1>Profile</h1><p>Your student credentials and learning info.</p></div><button class="outline-button page-action" data-action="signout" style="color:#d9534f;border-color:#f5c6cb">Sign out</button></div><div class="profile-layout"><article class="profile-card"><div class="large-avatar">${user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'PD'}</div><h2>${user.displayName || 'Pardha D'}</h2><p>Student ID · ${user.username || 'BV-0824-019'}</p><span class="profile-class">Class ${user.grade || 8} · Section ${user.section || 'A'}</span></article><article class="profile-form"><label>Student name<input value="${user.displayName || 'Pardha D'}" readonly></label><label>School name<input value="${user.schoolName || user.school || 'Govt. High School, Vijayawada'}" readonly></label><label>District<input value="${user.district || 'NTR District'}" readonly></label><label>Academic year<input value="2026–27" readonly></label><label>Language<select><option>English</option><option>తెలుగు</option></select></label></article></div>`;
}

const pageTemplates = {
  Learn: '<div class="route-heading"><div><span class="overline">CLASS 8 FOUNDATION TRACK</span><h1>Learn at your pace</h1><p>Short lessons, clear examples and practice that builds confidence.</p></div><button class="primary-button page-action" data-action="continue">Continue learning <span>→</span></button></div><div class="route-tabs"><button class="route-tab active">All subjects</button><button class="route-tab">Maths</button><button class="route-tab">Science</button><button class="route-tab">Reasoning</button></div><div class="route-grid"><article class="route-card"><div class="route-subject math">∑</div><span class="difficulty foundation">IN PROGRESS</span><h2>Fractions & Decimals</h2><p>Learn parts of a whole, compare fractions and solve everyday problems.</p><div class="progress-line"><span style="width:72%"></span></div><small>72% complete · 3 lessons</small><button class="outline-button page-action" data-action="topic">Open lesson</button></article><article class="route-card"><div class="route-subject science">✧</div><span class="difficulty basic">START HERE</span><h2>Force & Motion</h2><p>Explore pushes, pulls, speed and the science behind moving objects.</p><div class="progress-line"><span style="width:44%"></span></div><small>44% complete · 4 lessons</small><button class="outline-button page-action" data-action="lesson">Open lesson</button></article><article class="route-card"><div class="route-subject reasoning">⌁</div><span class="difficulty application">UP NEXT</span><h2>Number Patterns</h2><p>Spot patterns, predict the next number and explain your thinking.</p><div class="progress-line"><span style="width:28%"></span></div><small>28% complete · 2 lessons</small><button class="outline-button page-action" data-action="lesson">Open lesson</button></article></div>',
  Practice: '<div class="route-heading"><div><span class="overline">BUILD YOUR MOMENTUM</span><h1>Practice zone</h1><p>Choose a set that matches your time and your next learning goal.</p></div><div class="streak-callout">✦ <b>0 days</b><small>start your streak</small></div></div><div class="practice-feature"><div><span class="label-pill">READY WHEN YOU ARE</span><h2>Daily 15 questions</h2><p>5 Maths, 5 Science and 5 Reasoning questions selected for Class 8 and your current level.</p><button class="primary-button page-action" data-action="practice">Start today practice <span>→</span></button></div><div class="practice-number">15<small>questions</small></div></div><div class="route-grid three"><article class="route-card compact"><span class="overline">MATHS</span><h2>Fractions practice</h2><p>10 questions · Foundation · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article><article class="route-card compact"><span class="overline">SCIENCE</span><h2>Force & Motion</h2><p>8 questions · Level 1 · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article><article class="route-card compact"><span class="overline">REASONING</span><h2>Number patterns</h2><p>10 questions · Application · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article></div>',
  Quizzes: '<div class="route-heading"><div><span class="overline">CHECK YOUR UNDERSTANDING</span><h1>Quizzes</h1><p>Quick feedback helps you know what to revise next.</p></div><div class="score-summary"><b>0%</b><small>no attempts yet</small></div></div><div class="quiz-list"><article class="quiz-list-row"><div class="route-subject math">∑</div><div><h2>Fractions · Quick quiz</h2><p>10 questions · Not attempted · Foundation</p></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz">Start quiz</button></article><article class="quiz-list-row"><div class="route-subject science">✧</div><div><h2>States of Matter</h2><p>8 questions · Not attempted · Level 1</p></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz">Start quiz</button></article><article class="quiz-list-row"><div class="route-subject reasoning">⌁</div><div><h2>Logical Sequences</h2><p>12 questions · Unlocks after Number Patterns</p></div><span class="quiz-status locked">Locked</span><button class="outline-button" disabled>Complete lesson</button></article></div>',
  Tests: '<div class="route-heading"><div><span class="overline">TEST CENTRE</span><h1>Tests and mock exams</h1><p>Take your time, think clearly and use every test as practice.</p></div></div><div class="test-grid"><article class="test-card featured"><span class="label-pill">THIS WEEK</span><h2>Weekly foundation test</h2><p>20 mixed questions from Maths, Science and Reasoning.</p><div><b>20</b> questions <b>30 min</b> time</div><button class="primary-button page-action" data-action="test">Start test <span>→</span></button></article><article class="test-card"><span class="overline">SUBJECT TEST</span><h2>Maths fundamentals</h2><p>Fractions, decimals and ratio.</p><div>15 questions · 20 min</div><button class="outline-button page-action" data-action="test">View test</button></article><article class="test-card"><span class="overline">MONTHLY</span><h2>August challenge</h2><p>Try your strongest thinking yet.</p><div>40 questions · 60 min</div><button class="outline-button page-action" data-action="test">View test</button></article></div>',
  Progress: '<div class="route-heading"><div><span class="overline">YOUR GROWTH</span><h1>Progress report</h1><p>Ready to begin your learning journey.</p></div><button class="outline-button page-action" data-action="report">↓ Download report</button></div><div class="progress-overview"><div class="big-progress"><div class="ring" style="--progress:0"><span>0%</span></div><div><h2>Overall progress</h2><p>No activity recorded yet</p></div></div><div><span class="overline">QUESTIONS ATTEMPTED</span><strong class="metric-number">0</strong></div><div><span class="overline">ACCURACY</span><strong class="metric-number">0%</strong></div><div><span class="overline">LEARNING TIME</span><strong class="metric-number">0m</strong></div></div><div class="route-grid three"><article class="route-card compact"><span class="overline">SCIENCE</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article><article class="route-card compact"><span class="overline">MATHS</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article><article class="route-card compact"><span class="overline">REASONING</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article></div>',
  Achievements: '<div class="route-heading"><div><span class="overline">CELEBRATE YOUR EFFORT</span><h1>Achievements</h1><p>Achievements unlock as you complete lessons and quizzes.</p></div><div class="score-summary"><b>0</b><small>achievement points</small></div></div><div class="badge-grid"><article class="badge-card"><div>✦</div><h2>First lesson</h2><p>Complete your first lesson to unlock.</p><span>0 / 1 lesson</span></article><article class="badge-card"><div>✓</div><h2>First quiz</h2><p>Complete your first topic quiz.</p><span>Not started</span></article><article class="badge-card"><div>◈</div><h2>Curious learner</h2><p>Complete 10 lessons to unlock.</p><span>0 / 10 lessons</span></article><article class="badge-card"><div>★</div><h2>Challenge thinker</h2><p>Score 80% in a Level 3 quiz.</p><span>Not started</span></article></div>',
  Profile: getProfileTemplate()
};

function showPage(view) {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === view));
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = view === 'Home' ? 'My learning space' : view;
  const isHome = view === 'Home';
  if (dashboardView) dashboardView.hidden = !isHome;
  if (routedPage) {
    routedPage.hidden = isHome;
    if (!isHome) {
      if (view === 'Profile') routedPage.innerHTML = getProfileTemplate();
      else routedPage.innerHTML = pageTemplates[view] || '';
    }
    if (view === 'Learn') routedPage.innerHTML = buildLearningCatalog();
    if (view === 'Quizzes') routedPage.innerHTML = buildQuizCatalog();
    if (view === 'Tests') routedPage.innerHTML = buildTestsCatalog();
    if (view === 'Progress') routedPage.innerHTML = buildProgressPage();
  }
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
  window.scrollTo(0, 0);
}

function buildTestsCatalog() {
  const testGrades = [6, 7, 8, 9, 10, 11, 12];
  const weeklyCards = testGrades.map((grade) => `<article class="test-card weekly-test-card"><span class="overline">${gradeLabel(grade)} · WEEKLY</span><h2>${gradeLabel(grade)} Foundation Test</h2><p>Mixed Maths, Physics, Chemistry and Reasoning questions matched to ${gradeLabel(grade)}.</p><div class="test-meta"><b>50</b> questions <b>40 min</b> time</div><button class="primary-button page-action" data-action="test" data-test="${gradeLabel(grade)} Weekly Foundation Test">Start test <span>→</span></button></article>`).join('');
  const mathsCards = testGrades.map((grade) => `<article class="test-card maths-test-card"><span class="overline">${gradeLabel(grade)} · MATHEMATICS</span><h2>${gradeLabel(grade)} Maths Test</h2><p>Algebra, geometry, calculus foundations and logical mathematical thinking.</p><div class="test-meta"><b>50</b> questions <b>40 min</b> time</div><button class="outline-button page-action" data-action="test" data-test="${gradeLabel(grade)} Maths Test">View test <span>→</span></button></article>`).join('');
  return `<div class="route-heading"><div><span class="overline">TEST CENTRE · CLASSES 6–10 · INTERMEDIATE</span><h1>Tests and mock exams</h1><p>Build exam confidence with weekly class tests, subject tests and a monthly challenge.</p></div><div class="score-summary"><b>15</b><small>tests available</small></div></div><section class="test-section"><div class="test-section-heading"><div><span class="overline coral-text">WEEKLY FOUNDATION TESTS</span><h2>One test for every class and year</h2></div><span class="test-count-badge">7 tests · 50 questions each</span></div><div class="test-grid weekly-test-grid">${weeklyCards}</div></section><section class="test-section"><div class="test-section-heading"><div><span class="overline coral-text">SUBJECT TESTS</span><h2>Maths mastery tests</h2></div><span class="test-count-badge">7 tests · 50 questions each</span></div><div class="test-grid maths-test-grid">${mathsCards}</div></section><section class="test-card grand-test-card"><div><span class="label-pill">EVERY MONTH · ALL CLASSES</span><h2>Monthly Grand Foundation Test</h2><p>A full mixed-subject challenge covering Maths, Physics, Chemistry and Reasoning. Choose the class level before starting.</p><div class="test-meta"><b>200</b> questions <b>180 min</b> time <b>4</b> subjects</div></div><button class="primary-button page-action" data-action="test" data-test="Monthly Grand Foundation Test">Start Grand Test <span>→</span></button></section>`;
}

const quizSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Logical Reasoning'];
const quizTopics = ['Number System', 'Fractions & Decimals', 'Force & Motion', 'Matter & Atoms', 'Patterns & Series', 'Geometry', 'Energy & Heat', 'Algebra'];
const quizQuestionBank = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  const subject = quizSubjects[index % quizSubjects.length];
  const topic = quizTopics[index % quizTopics.length];
  const questionSets = {
    Mathematics: [`What is ${number + 2} × ${number + 3}?`, [`${number + 4}`, `${(number + 2) * (number + 3)}`, `${number * 3}`, `${number + 30}`], 1],
    Physics: [`An object travels ${number * 5} m in ${number} s. What is its speed?`, [`${number} m/s`, `${number * 5} m/s`, `${number + 5} m/s`, `${number * 10} m/s`], 1],
    Chemistry: [`Which statement about sample ${number} is correct?`, ['Matter has mass and takes space', 'Matter has no particles', 'Only solids are matter', 'Matter cannot change'], 0],
    'Logical Reasoning': [`What comes next in this pattern: ${number}, ${number + 2}, ${number + 4}, __?`, [`${number + 5}`, `${number + 6}`, `${number + 8}`, `${number + 10}`], 1]
  };
  const set = questionSets[subject];
  return { number, subject, topic, question: set[0], options: set[1], correct: set[2], difficulty: 1 + (index % 5) };
});

const gradeLabel = (grade) => grade < 11 ? `Class ${grade}` : grade === 11 ? 'Inter 1st Year' : 'Inter 2nd Year';
let quizPage = 1;

function buildQuizCatalog() {
  const quizzes = Array.from({ length: 100 }, (_, index) => ({
    number: index + 1,
    subject: quizSubjects[index % quizSubjects.length],
    topic: quizTopics[index % quizTopics.length],
    question: quizQuestionBank[index].question,
    grade: 6 + (index % 7),
    level: 1 + (index % 5),
    questions: 8 + (index % 3) * 2,
    status: 'Ready'
  }));
  const start = (quizPage - 1) * 10;
  const visible = quizzes.slice(start, start + 10);
  const rows = visible.map((quiz) => `<article class="quiz-list-row bank-quiz-row"><div class="quiz-number">${String(quiz.number).padStart(2, '0')}</div><div class="route-subject ${quiz.subject === 'Mathematics' ? 'math' : quiz.subject === 'Logical Reasoning' ? 'reasoning' : quiz.subject === 'Chemistry' ? 'chemistry' : 'science'}">${quiz.subject === 'Mathematics' ? '∑' : quiz.subject === 'Physics' ? '◌' : quiz.subject === 'Chemistry' ? '⚗' : '⌁'}</div><div class="quiz-bank-info"><h2>${quiz.topic} · Question ${quiz.number}</h2><p>${quiz.question}</p><small>${gradeLabel(quiz.grade)} · ${quiz.subject} · Level ${quiz.level} · 4 options</small></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz" data-quiz-id="${quiz.number}">Start quiz</button></article>`).join('');
  const pages = Array.from({ length: 10 }, (_, index) => `<button class="quiz-page ${quizPage === index + 1 ? 'active' : ''}" data-quiz-page="${index + 1}">${index + 1}</button>`).join('');
  return `<div class="route-heading"><div><span class="overline">ASSESSMENT LIBRARY</span><h1>Quizzes & tests</h1><p>100 guided quiz tests across Classes 6–10. Learn, practise, test and improve.</p></div><div class="score-summary"><b>100</b><small>quiz tests</small></div></div><div class="quiz-bank-summary"><div><strong>100</strong><span>Total assessments</span></div><div><strong>4</strong><span>Subjects</span></div><div><strong>5</strong><span>Difficulty levels</span></div><div><strong>10</strong><span>Tests per page</span></div></div><div class="quiz-filters"><button class="quiz-filter active">All classes</button><button class="quiz-filter">All subjects</button><button class="quiz-filter">Difficulty</button><span>Showing ${start + 1}–${Math.min(start + 10, 100)} of 100</span></div><div class="quiz-list bank-quiz-list">${rows}</div><div class="quiz-pagination"><button class="quiz-page arrow" data-quiz-page="${Math.max(1, quizPage - 1)}">←</button>${pages}<button class="quiz-page arrow" data-quiz-page="${Math.min(10, quizPage + 1)}">→</button></div>`;
}

function buildProgressPage() {
  const accuracy = progressState.attempted ? Math.round((progressState.correct / progressState.attempted) * 100) : 0;
  const overall = Math.min(100, Math.round((progressState.lessons / 36) * 100 + (progressState.tests ? 5 : 0)));
  return `<div class="route-heading"><div><span class="overline">YOUR GROWTH</span><h1>Progress report</h1><p>Track your real learning activity, quiz attempts and improvement.</p></div><button class="outline-button page-action" data-action="report">↓ Download report</button></div><div class="progress-overview"><div class="big-progress"><div class="ring" style="--progress:${overall}"><span>${overall}%</span></div><div><h2>Overall progress</h2><p>${progressState.tests ? 'Updated after your latest test' : 'Start a lesson or test to begin'}</p></div></div><div><span class="overline">QUESTIONS ATTEMPTED</span><strong class="metric-number">${progressState.attempted}</strong></div><div><span class="overline">ACCURACY</span><strong class="metric-number">${accuracy}%</strong></div><div><span class="overline">LEARNING TIME</span><strong class="metric-number">${progressState.minutes}m</strong></div></div><div class="route-grid three"><article class="route-card compact"><span class="overline">TESTS COMPLETED</span><h2>${progressState.tests}</h2><small>${progressState.tests ? 'Keep building consistency' : 'No tests completed yet'}</small></article><article class="route-card compact"><span class="overline">CORRECT ANSWERS</span><h2>${progressState.correct}</h2><div class="progress-line"><span style="width:${accuracy}%"></span></div><small>${accuracy}% accuracy</small></article><article class="route-card compact"><span class="overline">LESSONS COMPLETED</span><h2>${progressState.lessons} / 36</h2><div class="progress-line"><span style="width:${Math.round((progressState.lessons / 36) * 100)}%"></span></div><small>${progressState.lessons ? 'Learning is underway' : 'Not started'}</small></article></div>`;
}

const learningCatalog = {
  6: { maths: ['Number System', 'Arithmetic', 'Fractions', 'Geometry Basics', 'Mensuration', 'Data Handling', 'Patterns', 'Mathematical Thinking'], physics: ['Units & Measurement', 'Light', 'Motion Around Us', 'Force Basics', 'Heat', 'Sound', 'Magnets', 'Science Thinking'], chemistry: ['Matter Around Us', 'Separation of Substances', 'Changes Around Us', 'Water', 'Air', 'Materials', 'Plants and Soil', 'Lab Safety'], reasoning: ['Patterns & Series', 'Analogies', 'Classification', 'Odd One Out', 'Shapes', 'Sequences', 'Puzzles', 'Critical Thinking'] },
  7: { maths: ['Fractions & Decimals', 'Algebraic Expressions', 'Lines and Angles', 'Perimeter and Area', 'Data Handling', 'Simple Equations', 'Rational Numbers', 'Logical Problems'], physics: ['Motion & Force', 'Heat', 'Light', 'Electric Current', 'Sound', 'Weather', 'Pressure', 'Scientific Reasoning'], chemistry: ['Atoms & Molecules', 'Acids & Bases', 'Physical Changes', 'Heat and Matter', 'Metals', 'Soil Chemistry', 'Water Cycle', 'Lab Reasoning'], reasoning: ['Coding-Decoding', 'Logical Sequences', 'Number Series', 'Analogies', 'Direction Sense', 'Ranking', 'Venn Diagrams', 'Puzzles'] },
  8: { maths: ['Fractions & Decimals', 'Ratio & Proportion', 'Linear Equations', 'Geometry', 'Mensuration', 'Data Handling', 'Coordinate Basics', 'IIT Foundation Problems'], physics: ['Force & Motion', 'Sound', 'Light', 'Pressure', 'Friction', 'Heat and Energy', 'Electricity', 'Scientific Reasoning'], chemistry: ['Matter & Chemical Change', 'Atomic Structure', 'Metals and Non-metals', 'Coal and Petroleum', 'Combustion', 'Cells and Reactions', 'Materials', 'Chemistry Reasoning'], reasoning: ['Number Patterns', 'Spatial Reasoning', 'Coding-Decoding', 'Logical Sequences', 'Series', 'Puzzles', 'Critical Thinking', 'Challenge Reasoning'] },
  9: { maths: ['Linear Equations', 'Coordinate Geometry', 'Number Systems', 'Polynomials', 'Lines and Angles', 'Triangles', 'Statistics', 'Probability'], physics: ['Work, Energy & Power', 'Gravitation', 'Motion', 'Force', 'Sound Waves', 'Heat', 'Light', 'Electricity'], chemistry: ['Periodic Table', 'Chemical Reactions', 'Atoms and Molecules', 'Structure of Atom', 'Matter', 'Acids and Bases', 'Metals', 'Carbon Basics'], reasoning: ['Puzzles & Data Logic', 'Critical Thinking', 'Advanced Series', 'Analogy Reasoning', 'Coding-Decoding', 'Spatial Logic', 'Statements', 'Competitive Practice'] },
  10: { maths: ['Real Numbers', 'Probability & Statistics', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry', 'IIT Foundation Problems'], physics: ['Electricity & Magnetism', 'Waves', 'Light Reflection', 'Human Eye', 'Electric Current', 'Magnetic Effects', 'Energy', 'Pre-JEE Physics'], chemistry: ['Carbon Compounds', 'Chemical Bonding', 'Periodic Classification', 'Chemical Reactions', 'Acids Bases Salts', 'Metals and Non-metals', 'Molecules', 'Foundation Chemistry'], reasoning: ['Advanced Series', 'Competitive Reasoning', 'Data Interpretation', 'Logical Puzzles', 'Critical Thinking', 'Spatial Reasoning', 'Assertion Logic', 'Challenge Problems'] },
  11: { maths: ['Sets and Functions', 'Algebra', 'Trigonometry', 'Coordinate Geometry', 'Permutations', 'Binomial Theorem', 'Limits', 'Differentiation Basics'], physics: ['Units and Measurements', 'Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Waves'], chemistry: ['Some Basic Concepts', 'Atomic Structure', 'Chemical Bonding', 'States of Matter', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Organic Chemistry Basics'], reasoning: ['Advanced Series', 'Functions and Patterns', 'Data Interpretation', 'Logical Puzzles', 'Critical Thinking', 'Competitive Reasoning', 'Spatial Reasoning', 'Challenge Problems'] },
  12: { maths: ['Relations and Functions', 'Matrices', 'Determinants', 'Continuity', 'Differentiation', 'Integrals', 'Vectors', 'Probability'], physics: ['Electrostatics', 'Current Electricity', 'Magnetism', 'Electromagnetic Induction', 'Alternating Current', 'Optics', 'Modern Physics', 'Semiconductors'], chemistry: ['Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'p-Block Elements', 'Coordination Compounds', 'Biomolecules'], reasoning: ['Advanced Logic', 'Complex Series', 'Quantitative Reasoning', 'Assertion Reasoning', 'Data Sufficiency', 'Puzzles', 'Spatial Reasoning', 'Grand Challenge'] }
};

const subjectMeta = { maths: { label: 'Mathematics', icon: '∑', tone: 'math', description: 'Numbers, algebra, geometry and problem-solving.' }, physics: { label: 'Physics', icon: '◌', tone: 'science', description: 'Understand motion, energy, light and the world around you.' }, chemistry: { label: 'Chemistry', icon: '⚗', tone: 'chemistry', description: 'Explore matter, atoms, reactions and materials.' }, reasoning: { label: 'Logical Reasoning', icon: '⌁', tone: 'reasoning', description: 'Build patterns, puzzles and clear thinking skills.' } };
let selectedGrade = 8;
let selectedChapter = 0;

function buildLearningCatalog() {
  const gradeTabs = [6, 7, 8, 9, 10, 11, 12].map((grade) => `<button class="grade-tab ${grade === selectedGrade ? 'active' : ''}" data-grade="${grade}">${grade < 11 ? `Class ${grade}` : grade === 11 ? 'Inter 1st Year' : 'Inter 2nd Year'}</button>`).join('');
  const currentCatalog = learningCatalog[selectedGrade] || learningCatalog[8];
  const cards = Object.entries(currentCatalog).map(([subject, topics], index) => {
    const meta = subjectMeta[subject] || { label: subject, icon: '◈', tone: 'math', description: 'Explore foundation topics.' };
    return `<article class="subject-learning-card"><div class="subject-card-top"><div class="route-subject ${meta.tone}">${meta.icon}</div><span class="difficulty ${index === 0 ? 'foundation' : 'basic'}">NOT STARTED</span></div><h2>${meta.label}</h2><p>${meta.description}</p><div class="catalog-topic"><b>${topics[0] || 'Fundamentals'}</b><span>0% complete</span></div><div class="progress-line"><span style="width:0%"></span></div><div class="subject-card-actions"><button class="outline-button page-action" data-action="topic" data-topic="${subject}">Explore subject <span>→</span></button><button class="soft-button page-action" data-action="subject-quiz" data-topic="${subject}">Start quiz</button></div><small>${topics.length} chapters · Theory, practice & quiz</small></article>`;
  }).join('');
  return `<div class="route-heading catalog-heading"><div><span class="overline">FOUNDATION LEARNING PATHS</span><h1>Learn at your pace</h1><p>Choose your class and build strong foundations in every subject.</p></div><div class="catalog-summary"><b>${gradeLabel(selectedGrade)}</b><small>4 subjects</small></div></div><div class="grade-tabs">${gradeTabs}</div><div class="catalog-note"><span>✓</span> Content is matched to ${gradeLabel(selectedGrade)}. Harder levels unlock as your mastery grows.</div><div class="subject-learning-grid">${cards}</div>`;
}

function showTopicPage(topicKey = 'maths', chapterIndex = 0) {
  const meta = subjectMeta[topicKey] || subjectMeta.maths;
  const currentCatalog = learningCatalog[selectedGrade] || learningCatalog[8];
  const topics = currentCatalog[topicKey] || ['Foundation'];
  selectedChapter = chapterIndex;
  const title = topics[selectedChapter] || topics[0];
  const examples = {
    maths: ['What is 2/3 + 1/6?', 'Change 2/3 into sixths: 4/6. Add: 4/6 + 1/6 = 5/6.', 'Use equivalent fractions before adding or subtracting.'],
    physics: ['A bicycle travels 120 metres in 20 seconds. What is its speed?', 'Speed = distance ÷ time = 120 ÷ 20 = 6 m/s.', 'Speed compares how much distance is covered in a given time.'],
    chemistry: ['Why does a lump of sugar disappear in water?', 'Sugar particles spread between water particles. The sugar has dissolved; it has not vanished.', 'Matter can change its form or mix while its particles remain present.'],
    reasoning: ['Find the next number: 3, 6, 12, 24, __', 'Each number is multiplied by 2. The next number is 48.', 'Look for the simplest rule that connects every pair in the sequence.']
  }[topicKey] || ['What is the core idea?', 'Solve step by step.', 'Understand the principle.'];

  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === 'Learn'));
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = title;
  if (dashboardView) dashboardView.hidden = true;
  if (routedPage) {
    routedPage.hidden = false;
    routedPage.innerHTML = `<div class="topic-header"><button class="back-link" id="backToLearn">← Back to all subjects</button><div class="topic-heading"><div><span class="overline coral-text">${gradeLabel(selectedGrade).toUpperCase()} · ${meta.label.toUpperCase()} · FOUNDATION PATH</span><h1>${title}</h1><p>${meta.description} Learn the idea, solve carefully, then test your thinking.</p></div><div class="topic-mastery"><div class="ring" style="--progress:72"><span>72%</span></div><div><b>Topic mastery</b><small>Keep practising</small></div></div></div></div><div class="learning-cycle"><span class="cycle-done">✓ Learn</span><span class="cycle-done">✓ Understand</span><span class="cycle-current">3 Solve</span><span>4 Test</span><span>5 Analyze</span><span>6 Revise</span></div><div class="topic-layout"><main><section class="topic-section"><div class="section-kicker">01 · LEARN</div><h2>What is ${title}?</h2><p>${meta.description} In this chapter, we begin with the idea in simple language, connect it to everyday examples, and build towards ${gradeLabel(selectedGrade)} foundation problems.</p><div class="concept-banner"><span class="concept-icon ${meta.tone}">${meta.icon}</span><div><b>Why do we need it?</b><small>These ideas help us explain real situations, make predictions and solve problems with confidence.</small></div></div><div class="topic-columns"><article><h3>Important points</h3><ul><li>Start by naming the concept clearly.</li><li>Draw or describe what is happening.</li><li>Check units, signs and assumptions.</li></ul></article><article class="formula-box"><h3>Rule box</h3><b>Think → Choose → Solve</b><strong>Explain every step</strong><small>Use a worked example before independent practice.</small></article></div><div class="mistake-box"><b>Common mistakes students make</b><p>Jumping to a formula without identifying the concept, skipping units, and changing an answer without checking the original question.</p></div></section><section class="topic-section"><div class="section-kicker">02 · UNDERSTAND</div><h2>Solved example</h2><div class="solved-problem"><div><span class="difficulty foundation">LEVEL 2 · FOUNDATION</span><h3>${examples[0]}</h3></div><div class="solution-steps"><p><b>Given:</b> The information in the question.</p><p><b>Concept used:</b> ${title}</p><p><b>Step 1:</b> Identify the quantities or pattern.</p><p><b>Step 2:</b> Apply the correct rule carefully.</p><p><b>Final answer:</b> <strong>${examples[1]}</strong></p></div><div class="why-box"><b>Why this method works</b><span>${examples[2]}</span></div></div></section><section class="topic-section practice-section"><div class="section-kicker">03 · SOLVE</div><div class="practice-title"><div><h2>Practice ladder</h2><p>Questions become harder as your performance improves.</p></div><span class="practice-score">1 / 5 solved</span></div><div class="difficulty-ladder"><button class="level active"><b>1</b><span>Basic</span></button><button class="level"><b>2</b><span>Foundation</span></button><button class="level"><b>3</b><span>Application</span></button><button class="level locked"><b>4</b><span>IIT Foundation</span></button><button class="level locked"><b>5</b><span>Challenge</span></button></div><div class="practice-question"><span class="difficulty basic">LEVEL 1 · BASIC</span><h3>Which statement best describes ${title}?</h3><div class="practice-options"><button data-practice-answer="wrong">A. It is only used in exams.</button><button data-practice-answer="correct">B. It helps us understand and solve related problems.</button><button data-practice-answer="wrong">C. It has no connection to daily life.</button><button data-practice-answer="wrong">D. It can be solved without thinking.</button></div><div class="hint-row"><button id="hintButton">▢ Show Hint 1</button><span id="hintText"></span></div><div class="practice-feedback" id="practiceFeedback"></div></div></section></main><aside class="topic-sidebar"><section class="topic-section"><div class="section-kicker">04 · TEST</div><h2>${meta.label} quiz</h2><p>10 questions · 8 minutes · ${gradeLabel(selectedGrade)}</p><button class="primary-button topic-action" data-action="quiz">Start quiz <span>→</span></button></section><section class="topic-section analysis-card"><div class="section-kicker">05 · ANALYZE</div><h2>Your learning signals</h2><div class="signal"><span>Theory progress</span><b>82%</b><div class="progress-line"><span style="width:82%"></span></div></div><div class="signal"><span>Quiz accuracy</span><b>68%</b><div class="progress-line"><span style="width:68%"></span></div></div><div class="signal"><span>Difficulty</span><b>Level 2</b><div class="progress-line"><span style="width:55%"></span></div></div><div class="recommendation-mini"><b>Recommended next step</b><p>Revise this concept, then attempt Practice Set 2.</p></div></section><section class="topic-section revision-card"><div class="section-kicker">06 · REVISE</div><h2>Revision summary</h2><p>Review definitions, rules and the solved example before moving to a harder level.</p><button class="soft-button topic-action" data-action="revision">Open revision <span>→</span></button></section></aside></div>`;
  }
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => showPage(item.dataset.view)));

if (routedPage) {
  routedPage.addEventListener('click', (event) => {
    const quizPageButton = event.target.closest('[data-quiz-page]');
    if (quizPageButton) {
      quizPage = Number(quizPageButton.dataset.quizPage);
      routedPage.innerHTML = buildQuizCatalog();
      return;
    }
    const topicQuiz = event.target.closest('.topic-action');
    if (topicQuiz) {
      const heading = topicQuiz.closest('.topic-section')?.querySelector('h2');
      openTest(`${heading ? heading.textContent : 'Chapter'} · Chapter quiz`, 10);
      return;
    }
    const action = event.target.closest('.page-action')?.dataset.action;
    if (action === 'topic') {
      const topic = event.target.closest('.page-action').dataset.topic || 'maths';
      showTopicPage(topic);
      resetOpenedTopicProgress();
      addChapterNavigator(topic);
      return;
    }
    if (action === 'subject-quiz') {
      const subject = event.target.closest('.page-action').dataset.topic || 'maths';
      openQuiz(`${subjectMeta[subject]?.label || 'Subject'} quiz`, subject);
      return;
    }
    if (action === 'quiz') {
      const tQuiz = event.target.closest('.topic-action');
      if (tQuiz) {
        const h2 = tQuiz.closest('.topic-section')?.querySelector('h2');
        openTest(`${h2 ? h2.textContent : 'Quiz'} · Chapter quiz`, 10);
      } else {
        openQuiz();
      }
      return;
    }
    if (action === 'quiz' && event.target.closest('[data-quiz-id]')) {
      const qId = Number(event.target.closest('[data-quiz-id]').dataset.quizId) - 1;
      const question = quizQuestionBank[qId] || quizQuestionBank[0];
      openQuiz(`Quiz Question ${question.number}`, question.subject, question);
      return;
    }
    if (action === 'continue' || action === 'lesson') showToast('Lesson opened: Fractions and Decimals.');
    if (action === 'practice') openTest('Daily 15 · IIT Foundation Practice', 15, dailyPracticeQuestions);
    if (action === 'test') openTest(event.target.closest('.page-action').dataset.test || 'Your test');
    if (action === 'report') downloadReport();
    if (action === 'save') showToast('Profile details saved.');
    if (action === 'signout') {
      clearAuthSession();
      showToast('Signed out successfully.');
      if (authScreen) authScreen.classList.remove('hidden');
      showPage('Home');
    }
    if (action === 'revision') showToast('Revision lesson opened: equivalent fractions.');
  });

  routedPage.addEventListener('click', (event) => {
    const levelChoice = event.target.closest('.level');
    if (levelChoice) {
      document.querySelectorAll('.level').forEach((level) => level.classList.remove('active'));
      levelChoice.classList.add('active');
      levelChoice.classList.remove('locked');
      const levelNumber = levelChoice.dataset.level || levelChoice.querySelector('b')?.textContent || '1';
      const levelNames = { 1: 'BASIC', 2: 'FOUNDATION', 3: 'APPLICATION', 4: 'IIT FOUNDATION', 5: 'CHALLENGE', 6: 'JEE MAIN', 7: 'JEE ADVANCED' };
      const difficulty = document.querySelector('.practice-question .difficulty');
      const question = document.querySelector('.practice-question h3');
      const practiceFb = document.getElementById('practiceFeedback');
      if (difficulty) difficulty.textContent = `LEVEL ${levelNumber} · ${levelNames[levelNumber] || 'PRACTICE'}`;
      if (question) question.textContent = `Level ${levelNumber} practice: apply this chapter's idea carefully.`;
      if (practiceFb) practiceFb.textContent = `Level ${levelNumber} is ready. Try the question below.`;
      return;
    }
    const chapterChoice = event.target.closest('[data-chapter]');
    const prepMode = event.target.closest('[data-prep]');
    if (prepMode) {
      routedPage.querySelectorAll('.prep-mode').forEach((mode) => mode.classList.remove('active'));
      prepMode.classList.add('active');
      showToast(`${prepMode.textContent} practice selected.`);
      return;
    }
    if (chapterChoice) {
      const topic = chapterChoice.dataset.topic;
      showTopicPage(topic, Number(chapterChoice.dataset.chapter));
      resetOpenedTopicProgress();
      addChapterNavigator(topic);
      return;
    }
    const gradeTab = event.target.closest('[data-grade]');
    if (gradeTab) {
      selectedGrade = Number(gradeTab.dataset.grade);
      routedPage.innerHTML = buildLearningCatalog();
      return;
    }
    if (event.target.id === 'backToLearn') showPage('Learn');
    if (event.target.id === 'hintButton') {
      const hintEl = document.getElementById('hintText');
      if (hintEl) hintEl.textContent = 'Hint 1: Look for a fraction with the same value as one-half.';
      event.target.textContent = '✓ Hint 1 shown';
    }
    const practiceAnswer = event.target.closest('[data-practice-answer]');
    if (practiceAnswer) {
      document.querySelectorAll('[data-practice-answer]').forEach((option) => { option.disabled = true; });
      const result = document.getElementById('practiceFeedback');
      if (practiceAnswer.dataset.practiceAnswer === 'correct') {
        practiceAnswer.classList.add('practice-correct');
        if (result) result.innerHTML = '<strong>Correct.</strong> 3/6 simplifies to 1/2. Level 2 Foundation is now unlocked.';
        recordProgress(1, 1, 2);
      } else {
        practiceAnswer.classList.add('practice-wrong');
        const correctAns = document.querySelector('[data-practice-answer="correct"]');
        if (correctAns) correctAns.classList.add('practice-correct');
        if (result) result.innerHTML = '<strong>Let us learn together.</strong> Divide the numerator and denominator of 3/6 by 3.';
        recordProgress(1, 0, 2);
      }
    }
  });
}

document.querySelectorAll('[data-view-link]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = link.dataset.viewLink;
    const targetNav = document.querySelector(`[data-view="${target}"]`);
    if (targetNav) targetNav.click();
  });
});

document.querySelectorAll('.subject-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.subject-tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    const subject = tab.dataset.subject;
    document.querySelectorAll('.lesson-row').forEach((row) => {
      row.style.display = subject === 'all' || row.dataset.subject === subject ? 'flex' : 'none';
    });
  });
});

const mobileMenuBtn = document.getElementById('mobileMenu');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });
}

const langToggleBtn = document.getElementById('languageToggle');
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', (event) => {
    event.target.textContent = event.target.textContent === 'EN' ? 'తె' : 'EN';
    showToast(event.target.textContent === 'తె' ? 'Telugu labels enabled for your next lesson.' : 'English labels enabled.');
  });
}
