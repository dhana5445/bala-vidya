const toast = document.getElementById('toast');
const modal = document.getElementById('modalBackdrop');
const feedback = document.getElementById('quizFeedback');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

const learnQuizQuestions = {
  maths: { question: 'What is 2/3 + 1/6?', options: ['A. 1/2', 'B. 5/6', 'C. 2/9', 'D. 1'], answer: 'B' },
  physics: { question: 'Which force pulls objects towards Earth?', options: ['A. Friction', 'B. Gravity', 'C. Magnetism', 'D. Push'], answer: 'B' },
  chemistry: { question: 'Which state of matter has a fixed shape?', options: ['A. Solid', 'B. Liquid', 'C. Gas', 'D. Vapour'], answer: 'A' },
  reasoning: { question: 'Find the next number: 2, 4, 8, 16, __', options: ['A. 18', 'B. 20', 'C. 24', 'D. 32'], answer: 'D' }
};

function openQuiz(title = 'Fractions', subject = 'maths', customQuestion = null) {
  const quiz = customQuestion || learnQuizQuestions[subject] || learnQuizQuestions.maths;
  document.getElementById('modalTitle').textContent = title;
  document.querySelector('.modal-question').innerHTML = quiz.question;
  document.querySelectorAll('.quiz-options button').forEach((button, index) => { button.textContent = quiz.options[index]; button.dataset.answer = quiz.options[index].startsWith(quiz.answer) ? 'correct' : 'wrong'; });
  feedback.textContent = '';
  document.querySelectorAll('.quiz-options button').forEach((button) => {
    button.classList.remove('correct-answer', 'wrong-answer');
    button.disabled = false;
  });
  modal.classList.add('open');
}

function resetOpenedTopicProgress() {
  routedPage.querySelectorAll('.level.locked').forEach((level) => level.classList.remove('locked'));
  const masteryRing = routedPage.querySelector('.topic-mastery .ring');
  const masteryText = routedPage.querySelector('.topic-mastery .ring span');
  const masteryLabel = routedPage.querySelector('.topic-mastery small');
  if (masteryRing) masteryRing.style.setProperty('--progress', '0');
  if (masteryText) masteryText.textContent = '0%';
  if (masteryLabel) masteryLabel.textContent = 'Not started';
}

function addChapterNavigator(topicKey) {
  const chapters = learningCatalog[selectedGrade][topicKey];
  const navigator = document.createElement('section');
  navigator.className = 'chapter-navigator';
  navigator.innerHTML = `<div><span class="overline coral-text">CHAPTERS IN THIS SUBJECT</span><h2>Choose a chapter</h2><p class="chapter-page-note">Every chapter has at least 10 theory pages, solved examples, practice and a 10-question quiz.</p></div><div class="chapter-navigator-list">${chapters.map((chapter, index) => `<button class="chapter-choice ${index === selectedChapter ? 'active' : ''}" data-topic="${topicKey}" data-chapter="${index}"><b>${index + 1}</b><span>${chapter}<small>10+ pages · quiz</small></span></button>`).join('')}</div>`;
  routedPage.querySelector('.topic-layout').before(navigator);
}

document.getElementById('continueButton').addEventListener('click', () => { showTopicPage('maths'); resetOpenedTopicProgress(); addChapterNavigator('maths'); });
document.getElementById('practiceButton').addEventListener('click', () => openTest('Daily 15 · IIT Foundation Practice', 15, dailyPracticeQuestions));
document.getElementById('revisionButton').addEventListener('click', () => showTopicPage('maths'));
function downloadReport() {
  const report = `<!doctype html><html><head><meta charset="UTF-8"><title>Pardha D - Progress Report</title><style>body{font-family:Arial,sans-serif;color:#17212b;max-width:760px;margin:40px auto;padding:0 24px}h1{color:#dc563f}h2{border-bottom:1px solid #e5e8ec;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:10px;border:1px solid #e5e8ec;text-align:left}th{background:#f7f8fc}.zero{color:#dc563f;font-weight:bold}.meta{color:#66727e}</style></head><body><h1>Balavidya Progress Report</h1><p class="meta">Generated: 20 August 2026</p><h2>Student details</h2><table><tr><th>Name</th><td>Pardha D</td></tr><tr><th>Class</th><td>Class 8 · Section A</td></tr><tr><th>School</th><td>Govt. High School, Vijayawada</td></tr><tr><th>District</th><td>NTR District</td></tr><tr><th>Academic year</th><td>2026–27</td></tr></table><h2>Learning summary</h2><table><tr><th>Overall progress</th><td class="zero">0%</td></tr><tr><th>Lessons completed</th><td class="zero">0 / 36</td></tr><tr><th>Questions attempted</th><td class="zero">0</td></tr><tr><th>Quiz accuracy</th><td class="zero">0%</td></tr><tr><th>Learning time</th><td class="zero">0 minutes</td></tr><tr><th>Learning streak</th><td class="zero">0 days</td></tr></table><h2>Subjects</h2><p>Mathematics: Not started · Physics: Not started · Chemistry: Not started · Logical Reasoning: Not started</p><p class="meta">Start a lesson to begin building your foundation.</p></body></html>`;
  const blob = new Blob([report], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pardha-d-progress-report.html';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Progress report downloaded.');
}

document.getElementById('reportButton').addEventListener('click', downloadReport);
const testRunner = document.getElementById('testRunner');
let activeTestTitle = 'Class 8 Foundation Test';
let activeTestQuestion = 0;
let activeTestSize = 50;
let testAnswers = Array(50).fill(null);
let activeQuestionBank = null;
const testQuestionSets = [
  ['Which fraction is equal to 1/2?', ['1/3', '2/4', '3/4', '4/5'], 1, 'Fractions'],
  ['What is 6 × 7?', ['36', '40', '42', '48'], 2, 'Arithmetic'],
  ['Which force pulls objects towards Earth?', ['Friction', 'Gravity', 'Magnetism', 'Push'], 1, 'Force'],
  ['Water changes into vapour by which process?', ['Freezing', 'Melting', 'Evaporation', 'Condensation'], 2, 'Matter'],
  ['Find the next number: 2, 4, 8, 16, __', ['18', '20', '24', '32'], 3, 'Patterns']
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
  const base = (activeQuestionBank || testQuestionSets)[index % (activeQuestionBank || testQuestionSets).length];
  return { question: activeQuestionBank ? base[0] : `${base[0]} ${index > 4 ? '(Question ' + (index + 1) + ')' : ''}`, options: base[1], correct: base[2], topic: base[3], difficulty: base[4] || Math.min(5, Math.floor(index / 10) + 1) };
}

function renderTestQuestion() {
  const item = getTestQuestion(activeTestQuestion);
  document.getElementById('testQuestionNumber').textContent = activeTestQuestion + 1;
  document.getElementById('testRunnerProgress').style.width = `${((activeTestQuestion + 1) / activeTestSize) * 100}%`;
  document.getElementById('testDifficulty').textContent = `LEVEL ${item.difficulty} · ${item.topic.toUpperCase()}`;
  document.getElementById('testQuestion').textContent = item.question;
  document.getElementById('testOptions').innerHTML = item.options.map((option, index) => `<button class="test-option ${testAnswers[activeTestQuestion] === index ? 'selected' : ''}" data-test-option="${index}">${String.fromCharCode(65 + index)}. ${option}</button>`).join('');
  document.getElementById('testPrevious').disabled = activeTestQuestion === 0;
  document.getElementById('testNext').innerHTML = activeTestQuestion === activeTestSize - 1 ? 'Finish test <span>✓</span>' : 'Next question <span>→</span>';
}

function openTest(title, questionCount = 50, questionBank = null) {
  activeTestTitle = title || 'Class 8 Foundation Test';
  activeTestSize = questionCount;
  activeQuestionBank = questionBank;
  activeTestQuestion = 0;
  testAnswers = Array(activeTestSize).fill(null);
  document.getElementById('testRunnerTitle').textContent = activeTestTitle;
  document.querySelector('.test-runner-top .overline').textContent = `${activeTestSize} QUESTION QUIZ · 4 OPTIONS EACH`;
  document.querySelector('.test-timer').innerHTML = `Question <b id="testQuestionNumber">1</b> / ${activeTestSize}`;
  document.getElementById('testMarks').textContent = `0 / ${activeTestSize}`;
  document.getElementById('testUnanswered').textContent = activeTestSize;
  document.getElementById('testQuestionView').hidden = false;
  document.getElementById('testResultView').hidden = true;
  renderTestQuestion();
  testRunner.hidden = false;
}

function finishTest() {
  const correct = testAnswers.reduce((total, answer, index) => total + (answer === getTestQuestion(index).correct ? 1 : 0), 0);
  const answered = testAnswers.filter((answer) => answer !== null).length;
  document.getElementById('testQuestionView').hidden = true;
  document.getElementById('testResultView').hidden = false;
  document.getElementById('testResultTitle').textContent = `${activeTestTitle} results`;
  document.getElementById('testMarks').textContent = `${correct} / ${activeTestSize}`;
  document.getElementById('testAccuracy').textContent = `${Math.round((correct / activeTestSize) * 100)}%`;
  document.getElementById('testCorrect').textContent = correct;
  document.getElementById('testUnanswered').textContent = 50 - answered;
}

document.getElementById('testRunnerClose').addEventListener('click', () => { testRunner.hidden = true; });
document.getElementById('testPrevious').addEventListener('click', () => { if (activeTestQuestion > 0) { activeTestQuestion -= 1; renderTestQuestion(); } });
document.getElementById('testNext').addEventListener('click', () => { if (activeTestQuestion === activeTestSize - 1) finishTest(); else { activeTestQuestion += 1; renderTestQuestion(); } });
document.getElementById('testOptions').addEventListener('click', (event) => { const option = event.target.closest('[data-test-option]'); if (option) { testAnswers[activeTestQuestion] = Number(option.dataset.testOption); renderTestQuestion(); } });
document.getElementById('testRetry').addEventListener('click', () => openTest(activeTestTitle, activeTestSize, activeQuestionBank));
document.getElementById('testDone').addEventListener('click', () => { testRunner.hidden = true; showPage('Tests'); });
testRunner.addEventListener('click', (event) => { if (event.target === testRunner) testRunner.hidden = true; });
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

function renderBookPage() {
  document.getElementById('bookTitle').textContent = activeBook.title;
  document.getElementById('bookSubject').innerHTML = activeBook.subject;
  document.getElementById('bookSymbol').textContent = activeBook.symbol;
  document.getElementById('readerCover').className = `reader-cover ${activeBook.cover}`;
  const chapterPage = Math.round((activeBookPage / (activeBook.chapters.length - 1)) * 90) + 1;
  document.getElementById('bookPage').textContent = chapterPage;
  document.getElementById('bookChapter').textContent = activeBook.chapters[activeBookPage];
  document.getElementById('bookText').textContent = activeBook.text[activeBookPage];
  document.getElementById('bookExample').textContent = activeBook.examples[activeBookPage];
  const activity = chapterActivities[activeBook === bookPages.science ? 'science' : 'maths'][activeBookPage];
  document.getElementById('bookFormula').textContent = chapterFormulas[activeBook === bookPages.science ? 'science' : 'maths'][activeBookPage];
  document.getElementById('bookProblem').textContent = activity[0];
  document.getElementById('bookConclusion').textContent = activity[2];
  document.getElementById('bookProgress').style.width = `${((activeBookPage + 1) / activeBook.chapters.length) * 100}%`;
  document.getElementById('bookPrevious').disabled = activeBookPage === 0;
  document.getElementById('bookChapterCount').textContent = `${activeBook.chapters.length} CHAPTERS`;
  document.getElementById('bookChapterList').innerHTML = activeBook.chapters.map((chapter, index) => `<span class="${index === activeBookPage ? 'current' : ''}">${index + 1}</span>`).join('');
  document.getElementById('bookNext').innerHTML = activeBookPage === activeBook.chapters.length - 1 ? 'Finish book <span>✓</span>' : 'Next chapter <span>→</span>';
}

function openBook(bookKey) {
  activeBook = bookPages[bookKey];
  activeBookPage = 0;
  renderBookPage();
  bookReader.hidden = false;
  bookReader.classList.add('open');
}

document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => openBook(button.dataset.book)));
document.getElementById('bookClose').addEventListener('click', () => { bookReader.classList.remove('open'); bookReader.hidden = true; });
document.getElementById('bookPrevious').addEventListener('click', () => { if (activeBookPage > 0) { activeBookPage -= 1; renderBookPage(); } });
document.getElementById('bookNext').addEventListener('click', () => {
  if (activeBookPage < activeBook.chapters.length - 1) { activeBookPage += 1; renderBookPage(); }
  else { showToast('Book completed. Your reading progress is saved.'); }
});
document.getElementById('bookQuiz').addEventListener('click', () => openQuiz(`${activeBook.chapters[activeBookPage]} quiz`));
bookReader.addEventListener('click', (event) => { if (event.target === bookReader) { bookReader.classList.remove('open'); bookReader.hidden = true; } });
const videoReader = document.getElementById('videoReader');
document.querySelectorAll('[data-video]').forEach((button) => button.addEventListener('click', () => { videoReader.hidden = false; videoReader.classList.add('open'); }));
document.getElementById('videoClose').addEventListener('click', () => { videoReader.classList.remove('open'); videoReader.hidden = true; });
document.getElementById('videoQuiz').addEventListener('click', () => openQuiz('Fractions video quiz'));
videoReader.addEventListener('click', (event) => { if (event.target === videoReader) { videoReader.classList.remove('open'); videoReader.hidden = true; } });
document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.classList.remove('open');
});

document.querySelectorAll('.quiz-options button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.quiz-options button').forEach((option) => { option.disabled = true; });
    if (button.dataset.answer === 'correct') {
      button.classList.add('correct-answer');
      feedback.innerHTML = '<strong>Correct!</strong> 2/3 is 4/6, and 4/6 + 1/6 = 5/6. Great work.';
      showToast('Quiz complete: 10/10');
    } else {
      button.classList.add('wrong-answer');
      document.querySelector('[data-answer="correct"]').classList.add('correct-answer');
      feedback.innerHTML = '<strong>Let us learn together.</strong> The correct answer is B. Try the revision lesson and come back for another attempt.';
    }
  });
});

const routedPage = document.getElementById('routedPage');
const dashboardView = document.getElementById('dashboardView');

const pageTemplates = {
  Learn: '<div class="route-heading"><div><span class="overline">CLASS 8 FOUNDATION TRACK</span><h1>Learn at your pace</h1><p>Short lessons, clear examples and practice that builds confidence.</p></div><button class="primary-button page-action" data-action="continue">Continue learning <span>→</span></button></div><div class="route-tabs"><button class="route-tab active">All subjects</button><button class="route-tab">Maths</button><button class="route-tab">Science</button><button class="route-tab">Reasoning</button></div><div class="route-grid"><article class="route-card"><div class="route-subject math">∑</div><span class="difficulty foundation">IN PROGRESS</span><h2>Fractions & Decimals</h2><p>Learn parts of a whole, compare fractions and solve everyday problems.</p><div class="progress-line"><span style="width:72%"></span></div><small>72% complete · 3 lessons</small><button class="outline-button page-action" data-action="topic">Open lesson</button></article><article class="route-card"><div class="route-subject science">✧</div><span class="difficulty basic">START HERE</span><h2>Force & Motion</h2><p>Explore pushes, pulls, speed and the science behind moving objects.</p><div class="progress-line"><span style="width:44%"></span></div><small>44% complete · 4 lessons</small><button class="outline-button page-action" data-action="lesson">Open lesson</button></article><article class="route-card"><div class="route-subject reasoning">⌁</div><span class="difficulty application">UP NEXT</span><h2>Number Patterns</h2><p>Spot patterns, predict the next number and explain your thinking.</p><div class="progress-line"><span style="width:28%"></span></div><small>28% complete · 2 lessons</small><button class="outline-button page-action" data-action="lesson">Open lesson</button></article></div>',
  Practice: '<div class="route-heading"><div><span class="overline">BUILD YOUR MOMENTUM</span><h1>Practice zone</h1><p>Choose a set that matches your time and your next learning goal.</p></div><div class="streak-callout">✦ <b>0 days</b><small>start your streak</small></div></div><div class="practice-feature"><div><span class="label-pill">READY WHEN YOU ARE</span><h2>Daily 15 questions</h2><p>5 Maths, 5 Science and 5 Reasoning questions selected for Class 8 and your current level.</p><button class="primary-button page-action" data-action="practice">Start today practice <span>→</span></button></div><div class="practice-number">15<small>questions</small></div></div><div class="route-grid three"><article class="route-card compact"><span class="overline">MATHS</span><h2>Fractions practice</h2><p>10 questions · Foundation · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article><article class="route-card compact"><span class="overline">SCIENCE</span><h2>Force & Motion</h2><p>8 questions · Level 1 · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article><article class="route-card compact"><span class="overline">REASONING</span><h2>Number patterns</h2><p>10 questions · Application · 0% complete</p><button class="soft-button page-action" data-action="quiz">Start set <span>→</span></button></article></div>',
  Quizzes: '<div class="route-heading"><div><span class="overline">CHECK YOUR UNDERSTANDING</span><h1>Quizzes</h1><p>Quick feedback helps you know what to revise next.</p></div><div class="score-summary"><b>0%</b><small>no attempts yet</small></div></div><div class="quiz-list"><article class="quiz-list-row"><div class="route-subject math">∑</div><div><h2>Fractions · Quick quiz</h2><p>10 questions · Not attempted · Foundation</p></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz">Start quiz</button></article><article class="quiz-list-row"><div class="route-subject science">✧</div><div><h2>States of Matter</h2><p>8 questions · Not attempted · Level 1</p></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz">Start quiz</button></article><article class="quiz-list-row"><div class="route-subject reasoning">⌁</div><div><h2>Logical Sequences</h2><p>12 questions · Unlocks after Number Patterns</p></div><span class="quiz-status locked">Locked</span><button class="outline-button" disabled>Complete lesson</button></article></div>',
  Tests: '<div class="route-heading"><div><span class="overline">TEST CENTRE</span><h1>Tests and mock exams</h1><p>Take your time, think clearly and use every test as practice.</p></div></div><div class="test-grid"><article class="test-card featured"><span class="label-pill">THIS WEEK</span><h2>Weekly foundation test</h2><p>20 mixed questions from Maths, Science and Reasoning.</p><div><b>20</b> questions <b>30 min</b> time</div><button class="primary-button page-action" data-action="test">Start test <span>→</span></button></article><article class="test-card"><span class="overline">SUBJECT TEST</span><h2>Maths fundamentals</h2><p>Fractions, decimals and ratio.</p><div>15 questions · 20 min</div><button class="outline-button page-action" data-action="test">View test</button></article><article class="test-card"><span class="overline">MONTHLY</span><h2>August challenge</h2><p>Try your strongest thinking yet.</p><div>40 questions · 60 min</div><button class="outline-button page-action" data-action="test">View test</button></article></div>',
  Progress: '<div class="route-heading"><div><span class="overline">YOUR GROWTH</span><h1>Progress report</h1><p>Pardha is ready to begin his learning journey.</p></div><button class="outline-button page-action" data-action="report">↓ Download report</button></div><div class="progress-overview"><div class="big-progress"><div class="ring" style="--progress:0"><span>0%</span></div><div><h2>Overall progress</h2><p>No activity recorded yet</p></div></div><div><span class="overline">QUESTIONS ATTEMPTED</span><strong class="metric-number">0</strong></div><div><span class="overline">ACCURACY</span><strong class="metric-number">0%</strong></div><div><span class="overline">LEARNING TIME</span><strong class="metric-number">0m</strong></div></div><div class="route-grid three"><article class="route-card compact"><span class="overline">SCIENCE</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article><article class="route-card compact"><span class="overline">MATHS</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article><article class="route-card compact"><span class="overline">REASONING</span><h2>Not started</h2><div class="progress-line"><span style="width:0%"></span></div><small>0% complete</small></article></div>',
  Achievements: '<div class="route-heading"><div><span class="overline">CELEBRATE YOUR EFFORT</span><h1>Achievements</h1><p>Achievements will unlock as Pardha completes lessons and quizzes.</p></div><div class="score-summary"><b>0</b><small>achievement points</small></div></div><div class="badge-grid"><article class="badge-card"><div>✦</div><h2>First lesson</h2><p>Complete your first lesson to unlock.</p><span>0 / 1 lesson</span></article><article class="badge-card"><div>✓</div><h2>First quiz</h2><p>Complete your first topic quiz.</p><span>Not started</span></article><article class="badge-card"><div>◈</div><h2>Curious learner</h2><p>Complete 10 lessons to unlock.</p><span>0 / 10 lessons</span></article><article class="badge-card"><div>★</div><h2>Challenge thinker</h2><p>Score 80% in a Level 3 quiz.</p><span>Not started</span></article></div>',
  Profile: '<div class="route-heading"><div><span class="overline">YOUR ACCOUNT</span><h1>Profile</h1><p>Keep your learning details up to date.</p></div><button class="primary-button page-action" data-action="save">Save changes</button></div><div class="profile-layout"><article class="profile-card"><div class="large-avatar">PD</div><h2>Pardha D</h2><p>Student ID · BV-0824-019</p><span class="profile-class">Class 8 · Section A</span></article><article class="profile-form"><label>Student name<input value="Pardha D"></label><label>School name<input value="Govt. High School, Vijayawada"></label><label>District<input value="NTR District"></label><label>Academic year<input value="2026–27"></label><label>Language<select><option>English</option><option>తెలుగు</option></select></label></article></div>'
};

function showPage(view) {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === view));
  document.getElementById('pageTitle').textContent = view === 'Home' ? 'My learning space' : view;
  const isHome = view === 'Home';
  dashboardView.hidden = !isHome;
  routedPage.hidden = isHome;
  if (!isHome) routedPage.innerHTML = pageTemplates[view];
  if (view === 'Learn') routedPage.innerHTML = buildLearningCatalog();
  if (view === 'Quizzes') routedPage.innerHTML = buildQuizCatalog();
  if (view === 'Tests') routedPage.innerHTML = buildTestsCatalog();
  document.getElementById('sidebar').classList.remove('open');
}

function buildTestsCatalog() {
  const weeklyCards = [6, 7, 8, 9, 10].map((grade) => `<article class="test-card weekly-test-card"><span class="overline">CLASS ${grade} · WEEKLY</span><h2>Class ${grade} Foundation Test</h2><p>Mixed Maths, Physics, Chemistry and Reasoning questions matched to Class ${grade}.</p><div class="test-meta"><b>50</b> questions <b>60 min</b> time</div><button class="primary-button page-action" data-action="test" data-test="Class ${grade} Weekly Foundation Test">Start test <span>→</span></button></article>`).join('');
  const mathsCards = [6, 7, 8, 9, 10].map((grade) => `<article class="test-card maths-test-card"><span class="overline">CLASS ${grade} · MATHEMATICS</span><h2>Class ${grade} Maths Test</h2><p>Number system, arithmetic, algebra, geometry and logical mathematical thinking.</p><div class="test-meta"><b>50</b> questions <b>60 min</b> time</div><button class="outline-button page-action" data-action="test" data-test="Class ${grade} Maths Test">View test <span>→</span></button></article>`).join('');
  return `<div class="route-heading"><div><span class="overline">TEST CENTRE · CLASSES 6–10</span><h1>Tests and mock exams</h1><p>Build exam confidence with weekly class tests, subject tests and a monthly challenge.</p></div><div class="score-summary"><b>12</b><small>tests available</small></div></div><section class="test-section"><div class="test-section-heading"><div><span class="overline coral-text">WEEKLY FOUNDATION TESTS</span><h2>One test for every class</h2></div><span class="test-count-badge">5 tests · 50 questions each</span></div><div class="test-grid weekly-test-grid">${weeklyCards}</div></section><section class="test-section"><div class="test-section-heading"><div><span class="overline coral-text">SUBJECT TESTS</span><h2>Maths mastery tests</h2></div><span class="test-count-badge">5 tests · 50 questions each</span></div><div class="test-grid maths-test-grid">${mathsCards}</div></section><section class="test-card grand-test-card"><div><span class="label-pill">EVERY MONTH · ALL CLASSES</span><h2>Monthly Grand Foundation Test</h2><p>A full mixed-subject challenge covering Maths, Physics, Chemistry and Reasoning. Choose the class level before starting.</p><div class="test-meta"><b>200</b> questions <b>180 min</b> time <b>4</b> subjects</div></div><button class="primary-button page-action" data-action="test" data-test="Monthly Grand Foundation Test">Start Grand Test <span>→</span></button></section>`;
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
let quizPage = 1;
function buildQuizCatalog() {
  const quizzes = Array.from({ length: 100 }, (_, index) => ({
    number: index + 1,
    subject: quizSubjects[index % quizSubjects.length],
    topic: quizTopics[index % quizTopics.length],
    question: quizQuestionBank[index].question,
    grade: 6 + (index % 5),
    level: 1 + (index % 5),
    questions: 8 + (index % 3) * 2,
    status: 'Ready'
  }));
  const start = (quizPage - 1) * 10;
  const visible = quizzes.slice(start, start + 10);
  const rows = visible.map((quiz) => `<article class="quiz-list-row bank-quiz-row"><div class="quiz-number">${String(quiz.number).padStart(2, '0')}</div><div class="route-subject ${quiz.subject === 'Mathematics' ? 'math' : quiz.subject === 'Logical Reasoning' ? 'reasoning' : quiz.subject === 'Chemistry' ? 'chemistry' : 'science'}">${quiz.subject === 'Mathematics' ? '∑' : quiz.subject === 'Physics' ? '◌' : quiz.subject === 'Chemistry' ? '⚗' : '⌁'}</div><div class="quiz-bank-info"><h2>${quiz.topic} · Question ${quiz.number}</h2><p>${quiz.question}</p><small>Class ${quiz.grade} · ${quiz.subject} · Level ${quiz.level} · 4 options</small></div><span class="quiz-status">Ready</span><button class="primary-button page-action" data-action="quiz" data-quiz-id="${quiz.number}">Start quiz</button></article>`).join('');
  const pages = Array.from({ length: 10 }, (_, index) => `<button class="quiz-page ${quizPage === index + 1 ? 'active' : ''}" data-quiz-page="${index + 1}">${index + 1}</button>`).join('');
  return `<div class="route-heading"><div><span class="overline">ASSESSMENT LIBRARY</span><h1>Quizzes & tests</h1><p>100 guided quiz tests across Classes 6–10. Learn, practise, test and improve.</p></div><div class="score-summary"><b>100</b><small>quiz tests</small></div></div><div class="quiz-bank-summary"><div><strong>100</strong><span>Total assessments</span></div><div><strong>4</strong><span>Subjects</span></div><div><strong>5</strong><span>Difficulty levels</span></div><div><strong>10</strong><span>Tests per page</span></div></div><div class="quiz-filters"><button class="quiz-filter active">All classes</button><button class="quiz-filter">All subjects</button><button class="quiz-filter">Difficulty</button><span>Showing ${start + 1}–${Math.min(start + 10, 100)} of 100</span></div><div class="quiz-list bank-quiz-list">${rows}</div><div class="quiz-pagination"><button class="quiz-page arrow" data-quiz-page="${Math.max(1, quizPage - 1)}">←</button>${pages}<button class="quiz-page arrow" data-quiz-page="${Math.min(10, quizPage + 1)}">→</button></div>`;
}

const learningCatalog = {
  6: { maths: ['Number System', 'Arithmetic', 'Fractions', 'Geometry Basics', 'Mensuration', 'Data Handling', 'Patterns', 'Mathematical Thinking'], physics: ['Units & Measurement', 'Light', 'Motion Around Us', 'Force Basics', 'Heat', 'Sound', 'Magnets', 'Science Thinking'], chemistry: ['Matter Around Us', 'Separation of Substances', 'Changes Around Us', 'Water', 'Air', 'Materials', 'Plants and Soil', 'Lab Safety'], reasoning: ['Patterns & Series', 'Analogies', 'Classification', 'Odd One Out', 'Shapes', 'Sequences', 'Puzzles', 'Critical Thinking'] },
  7: { maths: ['Fractions & Decimals', 'Algebraic Expressions', 'Lines and Angles', 'Perimeter and Area', 'Data Handling', 'Simple Equations', 'Rational Numbers', 'Logical Problems'], physics: ['Motion & Force', 'Heat', 'Light', 'Electric Current', 'Sound', 'Weather', 'Pressure', 'Scientific Reasoning'], chemistry: ['Atoms & Molecules', 'Acids & Bases', 'Physical Changes', 'Heat and Matter', 'Metals', 'Soil Chemistry', 'Water Cycle', 'Lab Reasoning'], reasoning: ['Coding-Decoding', 'Logical Sequences', 'Number Series', 'Analogies', 'Direction Sense', 'Ranking', 'Venn Diagrams', 'Puzzles'] },
  8: { maths: ['Fractions & Decimals', 'Ratio & Proportion', 'Linear Equations', 'Geometry', 'Mensuration', 'Data Handling', 'Coordinate Basics', 'IIT Foundation Problems'], physics: ['Force & Motion', 'Sound', 'Light', 'Pressure', 'Friction', 'Heat and Energy', 'Electricity', 'Scientific Reasoning'], chemistry: ['Matter & Chemical Change', 'Atomic Structure', 'Metals and Non-metals', 'Coal and Petroleum', 'Combustion', 'Cells and Reactions', 'Materials', 'Chemistry Reasoning'], reasoning: ['Number Patterns', 'Spatial Reasoning', 'Coding-Decoding', 'Logical Sequences', 'Series', 'Puzzles', 'Critical Thinking', 'Challenge Reasoning'] },
  9: { maths: ['Linear Equations', 'Coordinate Geometry', 'Number Systems', 'Polynomials', 'Lines and Angles', 'Triangles', 'Statistics', 'Probability'], physics: ['Work, Energy & Power', 'Gravitation', 'Motion', 'Force', 'Sound Waves', 'Heat', 'Light', 'Electricity'], chemistry: ['Periodic Table', 'Chemical Reactions', 'Atoms and Molecules', 'Structure of Atom', 'Matter', 'Acids and Bases', 'Metals', 'Carbon Basics'], reasoning: ['Puzzles & Data Logic', 'Critical Thinking', 'Advanced Series', 'Analogy Reasoning', 'Coding-Decoding', 'Spatial Logic', 'Statements', 'Competitive Practice'] },
  10: { maths: ['Real Numbers', 'Probability & Statistics', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry', 'IIT Foundation Problems'], physics: ['Electricity & Magnetism', 'Waves', 'Light Reflection', 'Human Eye', 'Electric Current', 'Magnetic Effects', 'Energy', 'Pre-JEE Physics'], chemistry: ['Carbon Compounds', 'Chemical Bonding', 'Periodic Classification', 'Chemical Reactions', 'Acids Bases Salts', 'Metals and Non-metals', 'Molecules', 'Foundation Chemistry'], reasoning: ['Advanced Series', 'Competitive Reasoning', 'Data Interpretation', 'Logical Puzzles', 'Critical Thinking', 'Spatial Reasoning', 'Assertion Logic', 'Challenge Problems'] }
};
const subjectMeta = { maths: { label: 'Mathematics', icon: '∑', tone: 'math', description: 'Numbers, algebra, geometry and problem-solving.' }, physics: { label: 'Physics', icon: '◌', tone: 'science', description: 'Understand motion, energy, light and the world around you.' }, chemistry: { label: 'Chemistry', icon: '⚗', tone: 'chemistry', description: 'Explore matter, atoms, reactions and materials.' }, reasoning: { label: 'Logical Reasoning', icon: '⌁', tone: 'reasoning', description: 'Build patterns, puzzles and clear thinking skills.' } };
let selectedGrade = 8;
let selectedChapter = 0;

function buildLearningCatalog() {
  const gradeTabs = [6, 7, 8, 9, 10].map((grade) => `<button class="grade-tab ${grade === selectedGrade ? 'active' : ''}" data-grade="${grade}">Class ${grade}</button>`).join('');
  const cards = Object.entries(learningCatalog[selectedGrade]).map(([subject, topics], index) => {
    const meta = subjectMeta[subject];
    return `<article class="subject-learning-card"><div class="subject-card-top"><div class="route-subject ${meta.tone}">${meta.icon}</div><span class="difficulty ${index === 0 ? 'foundation' : 'basic'}">NOT STARTED</span></div><h2>${meta.label}</h2><p>${meta.description}</p><div class="catalog-topic"><b>${topics[0]}</b><span>0% complete</span></div><div class="progress-line"><span style="width:0%"></span></div><div class="subject-card-actions"><button class="outline-button page-action" data-action="topic" data-topic="${subject}">Explore subject <span>→</span></button><button class="soft-button page-action" data-action="subject-quiz" data-topic="${subject}">Start quiz</button></div><small>${topics.length} chapters · Theory, practice & quiz</small></article>`;
  }).join('');
  return `<div class="route-heading catalog-heading"><div><span class="overline">FOUNDATION LEARNING PATHS</span><h1>Learn at your pace</h1><p>Choose your class and build strong foundations in every subject.</p></div><div class="catalog-summary"><b>5</b><small>classes · 4 subjects</small></div></div><div class="grade-tabs">${gradeTabs}</div><div class="catalog-note"><span>✓</span> Content is matched to Class ${selectedGrade}. Harder levels unlock as your mastery grows.</div><div class="subject-learning-grid">${cards}</div>`;
}

function showTopicPage() {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === 'Learn'));
  document.getElementById('pageTitle').textContent = 'Fractions & Decimals';
  dashboardView.hidden = true;
  routedPage.hidden = false;
  routedPage.innerHTML = `<div class="topic-header"><button class="back-link" id="backToLearn">← Back to Learn</button><div class="topic-heading"><div><span class="overline coral-text">CLASS 8 · MATHEMATICS · NUMBER SYSTEM</span><h1>Fractions & Decimals</h1><p>Build a strong base by seeing parts, wholes and numbers in everyday life.</p></div><div class="topic-mastery"><div class="ring" style="--progress:72"><span>72%</span></div><div><b>Topic mastery</b><small>Keep practising</small></div></div></div></div><div class="learning-cycle"><span class="cycle-done">✓ Learn</span><span class="cycle-done">✓ Understand</span><span class="cycle-current">3 Solve</span><span>4 Test</span><span>5 Analyze</span><span>6 Revise</span></div><div class="topic-layout"><main><section class="topic-section"><div class="section-kicker">01 · LEARN</div><h2>What is a fraction?</h2><p>A fraction shows equal parts of a whole. The <b>numerator</b> tells how many parts we have. The <b>denominator</b> tells how many equal parts make the whole.</p><div class="fraction-visual"><div class="fraction-pieces"><i class="filled"></i><i class="filled"></i><i></i><i></i></div><div><b>2/4 = 1/2</b><small>Two of four equal parts is one half.</small></div></div><div class="topic-columns"><article><h3>Important points</h3><ul><li>Denominator can never be zero.</li><li>Equivalent fractions have the same value.</li><li>Simplify by dividing top and bottom by the same number.</li></ul></article><article class="formula-box"><h3>Formula box</h3><b>Fraction of a quantity =</b><strong>fraction × quantity</strong><small>For 1/4 of 20: 1/4 × 20 = 5</small></article></div><div class="mistake-box"><b>Common mistakes students make</b><p>Do not add denominators when adding fractions. First make the denominators alike, then add the numerators.</p></div></section><section class="topic-section"><div class="section-kicker">02 · UNDERSTAND</div><h2>Solved example</h2><div class="solved-problem"><div><span class="difficulty foundation">LEVEL 2 · FOUNDATION</span><h3>What is 2/3 + 1/6?</h3></div><div class="solution-steps"><p><b>Given:</b> 2/3 and 1/6</p><p><b>Concept used:</b> Equivalent fractions</p><p><b>Step 1:</b> Change 2/3 into sixths: 2/3 = 4/6.</p><p><b>Step 2:</b> Add the numerators: 4/6 + 1/6 = 5/6.</p><p><b>Final answer:</b> <strong>5/6</strong></p></div><div class="why-box"><b>Why this method works</b><span>Sixths are equal-sized parts, so we can combine them fairly.</span></div></div></section><section class="topic-section practice-section"><div class="section-kicker">03 · SOLVE</div><div class="practice-title"><div><h2>Practice ladder</h2><p>Difficulty increases when your answers show you are ready.</p></div><span class="practice-score">1 / 5 solved</span></div><div class="difficulty-ladder"><button class="level active" data-level="1"><b>1</b><span>Basic</span></button><button class="level" data-level="2"><b>2</b><span>Foundation</span></button><button class="level" data-level="3"><b>3</b><span>Application</span></button><button class="level locked" data-level="4"><b>4</b><span>IIT Foundation</span></button><button class="level locked" data-level="5"><b>5</b><span>Challenge</span></button></div><div class="practice-question"><span class="difficulty basic">LEVEL 1 · BASIC</span><h3>Which fraction is equal to 1/2?</h3><div class="practice-options"><button data-practice-answer="wrong">A. 2/3</button><button data-practice-answer="correct">B. 3/6</button><button data-practice-answer="wrong">C. 2/5</button><button data-practice-answer="wrong">D. 4/10</button></div><div class="hint-row"><button id="hintButton">▢ Show Hint 1</button><span id="hintText"></span></div><div class="practice-feedback" id="practiceFeedback"></div></div></section></main><aside class="topic-sidebar"><section class="topic-section"><div class="section-kicker">04 · TEST</div><h2>Topic quiz</h2><p>10 questions · 8 minutes</p><button class="primary-button topic-action" data-action="quiz">Start quiz <span>→</span></button></section><section class="topic-section analysis-card"><div class="section-kicker">05 · ANALYZE</div><h2>Your learning signals</h2><div class="signal"><span>Concept understanding</span><b>82%</b><div class="progress-line"><span style="width:82%"></span></div></div><div class="signal"><span>Accuracy</span><b>68%</b><div class="progress-line"><span style="width:68%"></span></div></div><div class="signal"><span>Speed</span><b>Good</b><div class="progress-line"><span style="width:74%"></span></div></div><div class="recommendation-mini"><b>Recommended next step</b><p>Revise equivalent fractions, then attempt Practice Set 2.</p></div></section><section class="topic-section revision-card"><div class="section-kicker">06 · REVISE</div><h2>Revision summary</h2><p>Fractions describe equal parts. Make denominators alike before adding or subtracting.</p><button class="soft-button topic-action" data-action="revision">Open revision <span>→</span></button></section></aside></div>`;
}

function showTopicPage(topicKey = 'maths', chapterIndex = 0) {
  const meta = subjectMeta[topicKey];
  const topics = learningCatalog[selectedGrade][topicKey];
  selectedChapter = chapterIndex;
  const title = topics[selectedChapter] || topics[0];
  const examples = {
    maths: ['What is 2/3 + 1/6?', 'Change 2/3 into sixths: 4/6. Add: 4/6 + 1/6 = 5/6.', 'Use equivalent fractions before adding or subtracting.'],
    physics: ['A bicycle travels 120 metres in 20 seconds. What is its speed?', 'Speed = distance ÷ time = 120 ÷ 20 = 6 m/s.', 'Speed compares how much distance is covered in a given time.'],
    chemistry: ['Why does a lump of sugar disappear in water?', 'Sugar particles spread between water particles. The sugar has dissolved; it has not vanished.', 'Matter can change its form or mix while its particles remain present.'],
    reasoning: ['Find the next number: 3, 6, 12, 24, __', 'Each number is multiplied by 2. The next number is 48.', 'Look for the simplest rule that connects every pair in the sequence.']
  }[topicKey];
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === 'Learn'));
  document.getElementById('pageTitle').textContent = title;
  dashboardView.hidden = true;
  routedPage.hidden = false;
  routedPage.innerHTML = `<div class="topic-header"><button class="back-link" id="backToLearn">← Back to all subjects</button><div class="topic-heading"><div><span class="overline coral-text">CLASS ${selectedGrade} · ${meta.label.toUpperCase()} · FOUNDATION PATH</span><h1>${title}</h1><p>${meta.description} Learn the idea, solve carefully, then test your thinking.</p></div><div class="topic-mastery"><div class="ring" style="--progress:72"><span>72%</span></div><div><b>Topic mastery</b><small>Keep practising</small></div></div></div></div><div class="learning-cycle"><span class="cycle-done">✓ Learn</span><span class="cycle-done">✓ Understand</span><span class="cycle-current">3 Solve</span><span>4 Test</span><span>5 Analyze</span><span>6 Revise</span></div><div class="topic-layout"><main><section class="topic-section"><div class="section-kicker">01 · LEARN</div><h2>What is ${title}?</h2><p>${meta.description} In this chapter, we begin with the idea in simple language, connect it to everyday examples, and build towards Class ${selectedGrade} foundation problems.</p><div class="concept-banner"><span class="concept-icon ${meta.tone}">${meta.icon}</span><div><b>Why do we need it?</b><small>These ideas help us explain real situations, make predictions and solve problems with confidence.</small></div></div><div class="topic-columns"><article><h3>Important points</h3><ul><li>Start by naming the concept clearly.</li><li>Draw or describe what is happening.</li><li>Check units, signs and assumptions.</li></ul></article><article class="formula-box"><h3>Rule box</h3><b>Think → Choose → Solve</b><strong>Explain every step</strong><small>Use a worked example before independent practice.</small></article></div><div class="mistake-box"><b>Common mistakes students make</b><p>Jumping to a formula without identifying the concept, skipping units, and changing an answer without checking the original question.</p></div></section><section class="topic-section"><div class="section-kicker">02 · UNDERSTAND</div><h2>Solved example</h2><div class="solved-problem"><div><span class="difficulty foundation">LEVEL 2 · FOUNDATION</span><h3>${examples[0]}</h3></div><div class="solution-steps"><p><b>Given:</b> The information in the question.</p><p><b>Concept used:</b> ${title}</p><p><b>Step 1:</b> Identify the quantities or pattern.</p><p><b>Step 2:</b> Apply the correct rule carefully.</p><p><b>Final answer:</b> <strong>${examples[1]}</strong></p></div><div class="why-box"><b>Why this method works</b><span>${examples[2]}</span></div></div></section><section class="topic-section practice-section"><div class="section-kicker">03 · SOLVE</div><div class="practice-title"><div><h2>Practice ladder</h2><p>Questions become harder as your performance improves.</p></div><span class="practice-score">1 / 5 solved</span></div><div class="difficulty-ladder"><button class="level active"><b>1</b><span>Basic</span></button><button class="level"><b>2</b><span>Foundation</span></button><button class="level"><b>3</b><span>Application</span></button><button class="level locked"><b>4</b><span>IIT Foundation</span></button><button class="level locked"><b>5</b><span>Challenge</span></button></div><div class="practice-question"><span class="difficulty basic">LEVEL 1 · BASIC</span><h3>Which statement best describes ${title}?</h3><div class="practice-options"><button data-practice-answer="wrong">A. It is only used in exams.</button><button data-practice-answer="correct">B. It helps us understand and solve related problems.</button><button data-practice-answer="wrong">C. It has no connection to daily life.</button><button data-practice-answer="wrong">D. It can be solved without thinking.</button></div><div class="hint-row"><button id="hintButton">▢ Show Hint 1</button><span id="hintText"></span></div><div class="practice-feedback" id="practiceFeedback"></div></div></section></main><aside class="topic-sidebar"><section class="topic-section"><div class="section-kicker">04 · TEST</div><h2>${meta.label} quiz</h2><p>10 questions · 8 minutes · Class ${selectedGrade}</p><button class="primary-button topic-action" data-action="quiz">Start quiz <span>→</span></button></section><section class="topic-section analysis-card"><div class="section-kicker">05 · ANALYZE</div><h2>Your learning signals</h2><div class="signal"><span>Theory progress</span><b>82%</b><div class="progress-line"><span style="width:82%"></span></div></div><div class="signal"><span>Quiz accuracy</span><b>68%</b><div class="progress-line"><span style="width:68%"></span></div></div><div class="signal"><span>Difficulty</span><b>Level 2</b><div class="progress-line"><span style="width:55%"></span></div></div><div class="recommendation-mini"><b>Recommended next step</b><p>Revise this concept, then attempt Practice Set 2.</p></div></section><section class="topic-section revision-card"><div class="section-kicker">06 · REVISE</div><h2>Revision summary</h2><p>Review definitions, rules and the solved example before moving to a harder level.</p><button class="soft-button topic-action" data-action="revision">Open revision <span>→</span></button></section></aside></div>`;
}

document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => showPage(item.dataset.view)));
routedPage.addEventListener('click', (event) => {
  const quizPageButton = event.target.closest('[data-quiz-page]');
  if (quizPageButton) {
    quizPage = Number(quizPageButton.dataset.quizPage);
    routedPage.innerHTML = buildQuizCatalog();
    return;
  }
  const topicQuiz = event.target.closest('.topic-action');
  if (topicQuiz) { openTest(`${topicQuiz.closest('.topic-section').querySelector('h2').textContent} · Chapter quiz`, 10); return; }
  const action = event.target.closest('.page-action')?.dataset.action;
  if (action === 'topic') { const topic = event.target.closest('.page-action').dataset.topic || 'maths'; showTopicPage(topic); resetOpenedTopicProgress(); addChapterNavigator(topic); return; }
  if (action === 'subject-quiz') { const subject = event.target.closest('.page-action').dataset.topic || 'maths'; openQuiz(`${subjectMeta[subject].label} quiz`, subject); return; }
  if (action === 'quiz') { const topicQuiz = event.target.closest('.topic-action'); if (topicQuiz) openTest(`${topicQuiz.closest('.topic-section').querySelector('h2').textContent} · Chapter quiz`, 10); else openQuiz(); }
  if (action === 'quiz' && event.target.closest('[data-quiz-id]')) { const question = quizQuestionBank[Number(event.target.closest('[data-quiz-id]').dataset.quizId) - 1]; openQuiz(`Quiz Question ${question.number}`, question.subject, question); }
  if (action === 'continue' || action === 'lesson') showToast('Lesson opened: Fractions and Decimals.');
  if (action === 'practice') openTest('Daily 15 · IIT Foundation Practice', 15, dailyPracticeQuestions);
  if (action === 'test') openTest(event.target.closest('.page-action').dataset.test || 'Your test');
  if (action === 'report') downloadReport();
  if (action === 'save') showToast('Profile details saved.');
  if (action === 'revision') showToast('Revision lesson opened: equivalent fractions.');
});

routedPage.addEventListener('click', (event) => {
  const levelChoice = event.target.closest('.level');
  if (levelChoice) {
    document.querySelectorAll('.level').forEach((level) => level.classList.remove('active'));
    levelChoice.classList.add('active');
    levelChoice.classList.remove('locked');
    const levelNumber = levelChoice.dataset.level || levelChoice.querySelector('b')?.textContent || '1';
    const levelNames = { 1: 'BASIC', 2: 'FOUNDATION', 3: 'APPLICATION', 4: 'IIT FOUNDATION', 5: 'CHALLENGE' };
    const difficulty = document.querySelector('.practice-question .difficulty');
    const question = document.querySelector('.practice-question h3');
    const feedback = document.getElementById('practiceFeedback');
    if (difficulty) difficulty.textContent = `LEVEL ${levelNumber} · ${levelNames[levelNumber]}`;
    if (question) question.textContent = `Level ${levelNumber} practice: apply this chapter's idea carefully.`;
    if (feedback) feedback.textContent = `Level ${levelNumber} is ready. Try the question below.`;
    return;
  }
  const chapterChoice = event.target.closest('[data-chapter]');
  if (chapterChoice) { const topic = chapterChoice.dataset.topic; showTopicPage(topic, Number(chapterChoice.dataset.chapter)); resetOpenedTopicProgress(); addChapterNavigator(topic); return; }
  const gradeTab = event.target.closest('[data-grade]');
  if (gradeTab) {
    selectedGrade = Number(gradeTab.dataset.grade);
    routedPage.innerHTML = buildLearningCatalog();
    return;
  }
  if (event.target.id === 'backToLearn') showPage('Learn');
  if (event.target.id === 'hintButton') {
    document.getElementById('hintText').textContent = 'Hint 1: Look for a fraction with the same value as one-half.';
    event.target.textContent = '✓ Hint 1 shown';
  }
  const practiceAnswer = event.target.closest('[data-practice-answer]');
  if (practiceAnswer) {
    document.querySelectorAll('[data-practice-answer]').forEach((option) => { option.disabled = true; });
    const result = document.getElementById('practiceFeedback');
    if (practiceAnswer.dataset.practiceAnswer === 'correct') {
      practiceAnswer.classList.add('practice-correct');
      result.innerHTML = '<strong>Correct.</strong> 3/6 simplifies to 1/2. Level 2 Foundation is now unlocked.';
    } else {
      practiceAnswer.classList.add('practice-wrong');
      document.querySelector('[data-practice-answer="correct"]').classList.add('practice-correct');
      result.innerHTML = '<strong>Let us learn together.</strong> Divide the numerator and denominator of 3/6 by 3.';
    }
  }
});

document.querySelectorAll('[data-view-link]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = link.dataset.viewLink;
    document.querySelector(`[data-view="${target}"]`).click();
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

document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('languageToggle').addEventListener('click', (event) => {
  event.target.textContent = event.target.textContent === 'EN' ? 'తె' : 'EN';
  showToast(event.target.textContent === 'తె' ? 'Telugu labels enabled for your next lesson.' : 'English labels enabled.');
});
