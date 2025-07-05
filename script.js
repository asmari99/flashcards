
const allFlashcardsByLesson = JSON.parse(localStorage.getItem('allFlashcardsByLesson') || '{}');
const sidebar = document.getElementById('sidebar');

let cards = [];
let hardCards = [];
let currentLesson = '';
let currentIndex = 0;
let speechRate = 1;
let knownCount = 0;
let unknownCount = 0;

let quizIndex = 0;
let correctAnswers = 0;
let quizCards = [];

const lessonsSorted = Object.keys(allFlashcardsByLesson).sort((a, b) => a.localeCompare(b));
lessonsSorted.forEach(lesson => {
  const count = allFlashcardsByLesson[lesson]?.length || 0;
  const btn = document.createElement('button');
  btn.textContent = `${lesson} (${count})`;

  if (localStorage.getItem(`done-${lesson}`)) {
    btn.textContent += ' ✅';
    btn.classList.add('done');
  }

  btn.onclick = () => selectLesson(lesson, btn);
  sidebar.appendChild(btn);
});

function selectLesson(lessonName, clickedBtn) {
  currentLesson = lessonName;
  cards = allFlashcardsByLesson[lessonName] || [];
  hardCards = [];
  currentIndex = 0;
  knownCount = 0;
  unknownCount = 0;
  quizIndex = 0;
  correctAnswers = 0;
  updateSidebarActive(clickedBtn);
  renderCard();
  updateProgress();
}

function updateSidebarActive(activeBtn) {
  const buttons = sidebar.querySelectorAll('button');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}

function renderCard() {
  const card = cards[currentIndex];

  if (currentIndex >= cards.length) {
    document.getElementById('cardFrontWord').innerText = "🎉 انتهيت من الدرس!";
    document.getElementById('cardBackTranslation').innerText = "";
    document.getElementById('cardSentenceEn').innerText = "";
    document.getElementById('cardSentenceAr').innerText = "";
    document.getElementById('cardImage').style.display = 'none';
    document.getElementById('cardNumber').innerText = cards.length;
    document.getElementById('totalCards').innerText = cards.length;

    localStorage.setItem(`done-${currentLesson}`, 'true');
    quizIndex = 0;
    correctAnswers = 0;
    quizCards = cards.slice(); // نسخة من بطاقات الدرس للاختبار
    showQuiz();
    return;
  }

  document.getElementById('cardNumber').innerText = currentIndex + 1;
  document.getElementById('totalCards').innerText = cards.length;
  document.getElementById('cardFrontWord').innerText = card.frontWord;
  document.getElementById('cardBackTranslation').innerText = card.backTranslation;
  document.getElementById('cardSentenceEn').innerText = card.backSentenceEn;
  document.getElementById('cardSentenceAr').innerText = card.backSentenceAr;

  const imageEl = document.getElementById('cardImage');
  if (card.image && card.image.trim() !== '') {
    imageEl.src = card.image;
    imageEl.style.display = 'block';
  } else {
    imageEl.style.display = 'none';
  }

  document.getElementById('flashcard').classList.remove('flipped');
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function updateRate() {
  const rate = document.getElementById('rateSlider').value;
  speechRate = parseFloat(rate);
  document.getElementById('rateValue').innerText = rate;
}

function playWord(e) {
  e.stopPropagation();
  const utter = new SpeechSynthesisUtterance(cards[currentIndex].frontWord);
  utter.lang = 'en-US';
  utter.rate = speechRate;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function playSentence(e) {
  e.stopPropagation();
  const utter = new SpeechSynthesisUtterance(cards[currentIndex].backSentenceEn);
  utter.lang = 'en-US';
  utter.rate = speechRate;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function markKnown() {
  knownCount++;
  currentIndex++;
  renderCard();
  updateProgress();
}

function markUnknown() {
  unknownCount++;
  const card = cards[currentIndex];
  if (card && !hardCards.includes(card)) {
    hardCards.push(card);
    const saved = JSON.parse(localStorage.getItem('hardCards') || '{}');
    if (!saved[currentLesson]) saved[currentLesson] = [];
    saved[currentLesson].push(card);
    localStorage.setItem('hardCards', JSON.stringify(saved));
  }
  currentIndex++;
  renderCard();
  updateProgress();
}

function reviewHardCards() {
  const saved = JSON.parse(localStorage.getItem('hardCards') || '{}');
  const savedCards = saved[currentLesson] || [];
  if (savedCards.length === 0) {
    alert("ما فيه بطاقات صعبة محفوظة لهذا الدرس ✅");
    return;
  }
  cards = savedCards.slice();
  currentIndex = 0;
  knownCount = 0;
  unknownCount = 0;
  renderCard();
  updateProgress();
}

function updateProgress() {
  const total = knownCount + unknownCount;
  const stats = document.getElementById('progressStats');
  if (!stats) return;
  const percent = cards.length > 0 ? Math.round((total / cards.length) * 100) : 0;
  stats.innerText = `✅ ${knownCount} / ❌ ${unknownCount} — تقدّم: ${percent}%`;
}

function showQuiz() {
  if (document.getElementById("quizContainer")) return;

  const container = document.querySelector('.content');
  const quizBox = document.createElement('div');
  quizBox.id = "quizContainer";
  quizBox.style.marginTop = "30px";
  quizBox.style.background = "#fff3e0";
  quizBox.style.padding = "20px";
  quizBox.style.borderRadius = "12px";
  quizBox.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  quizBox.innerHTML = `<h3>🧠 اختبار سريع</h3><div id="quizQuestion"></div><div id="quizChoices"></div>`;
  container.appendChild(quizBox);

  showNextQuizQuestion();
}

function showNextQuizQuestion() {
  if (quizIndex >= quizCards.length) {
    document.getElementById("quizContainer").remove();
    showFinalResult();
    return;
  }

  const questionCard = quizCards[quizIndex];
  const correctAnswer = questionCard.backTranslation;

  const choices = [correctAnswer];
  while (choices.length < 3) {
    const random = cards[Math.floor(Math.random() * cards.length)].backTranslation;
    if (!choices.includes(random)) choices.push(random);
  }

  choices.sort(() => Math.random() - 0.5);

  document.getElementById("quizQuestion").innerHTML = `
    <p><strong>${questionCard.frontWord}</strong></p>
    <p style="font-size:14px;color:#666;">اختر الترجمة الصحيحة:</p>
  `;

  const choiceHTML = choices.map(choice => {
    return `<button onclick="handleQuizAnswer('${choice}', '${correctAnswer}')">${choice}</button>`;
  }).join("");

  document.getElementById("quizChoices").innerHTML = choiceHTML;
}

function handleQuizAnswer(selected, correct) {
  const feedback = document.createElement('div');
  feedback.style.marginTop = "15px";
  feedback.style.padding = "10px";
  feedback.style.borderRadius = "8px";
  feedback.style.fontWeight = "bold";
  feedback.style.fontSize = "16px";
  feedback.style.textAlign = "center";

  if (selected === correct) {
    correctAnswers++;
    feedback.innerText = "✅ إجابة صحيحة!";
    feedback.style.backgroundColor = "#C8E6C9";
    feedback.style.color = "#2E7D32";
  } else {
    feedback.innerText = `❌ خطأ. الإجابة الصحيحة: ${correct}`;
    feedback.style.backgroundColor = "#FFCDD2";
    feedback.style.color = "#C62828";
  }

  const container = document.getElementById("quizChoices");
  container.innerHTML = "";
  container.appendChild(feedback);

  quizIndex++;
  setTimeout(showNextQuizQuestion, 1500);
}

function showFinalResult() {
  const result = document.createElement('div');
  result.style.marginTop = "30px";
  result.style.padding = "20px";
  result.style.backgroundColor = "#E8F5E9";
  result.style.borderRadius = "12px";
  result.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  result.style.maxWidth = "420px";
  result.style.margin = "auto";
  result.style.textAlign = "center";

  result.innerHTML = `
    <h3 style="color:#2E7D32;">🎓 النتيجة النهائية للاختبار</h3>
    <p>✅ أجبت ${correctAnswers} من ${quizCards.length} بشكل صحيح!</p>
    <p style="margin-top:10px;">${correctAnswers === quizCards.length ? "ممتاز يا بطل! 🏆" : "استمر بالتعلّم، طريقك للنجاح واضح! 🚀"}</p>
  `;

  document.querySelector('.content').appendChild(result);
}
