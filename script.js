// ===== 설정 =====
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const INTERVALS = [3, 7, 14, 30]; // 맞혔을 때 복습 간격(일)
const WRONG_DELAY = 12 * HOUR;    // 틀렸을 때 12시간 뒤
const MISSED_DAY_RATE = 0.5;      // 접속 안 한 날은 0.5일로 계산

// ===== 저장 / 불러오기 =====
function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
}

let words = [];
let progress = loadData("toeic-progress", {}); // { 단어id: { level, due } }
let clock = loadData("toeic-clock", null);     // { studyTime, lastVisit }
let current = null;

// ===== 학습 시계 (접속 안 한 날은 반나절만 흐름) =====
function startOfDay(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function countMissedDays(from, to) {
  const days = Math.round((startOfDay(to) - startOfDay(from)) / DAY) - 1;
  return Math.max(0, days);
}

function advanceClock() {
  const now = Date.now();
  if (!clock) {
    clock = { studyTime: now, lastVisit: now };
  } else {
    const gap = now - clock.lastVisit;
    const missed = countMissedDays(clock.lastVisit, now);
    clock.studyTime += gap - missed * DAY * (1 - MISSED_DAY_RATE);
    clock.lastVisit = now;
  }
  saveData("toeic-clock", clock);
}

// ===== 문제 고르기 =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDueWords() {
  return words
    .filter((w) => progress[w.id] && progress[w.id].due <= clock.studyTime)
    .sort((a, b) => progress[a.id].due - progress[b.id].due);
}

function getNewWords() {
  return words.filter((w) => !progress[w.id]);
}

function pickNext() {
  const due = getDueWords();
  if (due.length) return due[0]; // 복습할 단어 먼저
  const fresh = getNewWords();
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  return null;
}

function makeChoices(answer) {
  let pool = words.filter((w) => w.id !== answer.id && w.pos === answer.pos);
  if (pool.length < 3) pool = words.filter((w) => w.id !== answer.id);
  const wrong = shuffle(pool).slice(0, 3);
  return shuffle([answer, ...wrong]);
}

// ===== 채점 =====
function grade(word, isCorrect) {
  advanceClock();
  const p = progress[word.id] || { level: 0 };
  let delay;
  if (isCorrect) {
    const days = INTERVALS[Math.min(p.level, INTERVALS.length - 1)];
    delay = days * DAY;
    p.level = Math.min(p.level + 1, INTERVALS.length);
  } else {
    delay = WRONG_DELAY;
    p.level = 0;
  }
  p.due = clock.studyTime + delay;
  progress[word.id] = p;
  saveData("toeic-progress", progress);
  return delay;
}

function formatDelay(ms) {
  return ms >= DAY ? `${ms / DAY}일 뒤` : `${ms / HOUR}시간 뒤`;
}

// ===== 화면 =====
const statsEl = document.getElementById("quiz-stats");
const wordEl = document.getElementById("quiz-word");
const choicesEl = document.getElementById("quiz-choices");
const feedbackEl = document.getElementById("quiz-feedback");
const nextBtn = document.getElementById("next-btn");

function renderStats() {
  const learned = Object.keys(progress).length;
  statsEl.textContent =
    `복습할 단어 ${getDueWords().length}개 · 새 단어 ${getNewWords().length}개 · 학습한 단어 ${learned}개`;
}

function showQuestion() {
  advanceClock();
  renderStats();
  feedbackEl.textContent = "";
  nextBtn.hidden = true;
  choicesEl.innerHTML = "";

  current = pickNext();
  if (!current) {
    wordEl.textContent = "🎉 지금 풀 문제가 없습니다. 나중에 다시 오세요!";
    return;
  }

  wordEl.textContent = current.word;

  makeChoices(current).forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice.meaning;
    btn.addEventListener("click", () => handleAnswer(btn, choice));
    choicesEl.appendChild(btn);
  });
}

function handleAnswer(clickedBtn, choice) {
  const isCorrect = choice.id === current.id;
  const delay = grade(current, isCorrect);

  choicesEl.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === current.meaning) btn.classList.add("correct");
  });
  if (!isCorrect) clickedBtn.classList.add("wrong");

  feedbackEl.textContent = isCorrect
    ? `⭕ 정답! ${formatDelay(delay)} 다시 나옵니다.`
    : `❌ 오답. 정답은 "${current.meaning}" · ${formatDelay(delay)} 다시 나옵니다.`;

  renderStats();
  nextBtn.hidden = false;
}

nextBtn.addEventListener("click", showQuestion);

// ===== 시작 =====
async function init() {
  try {
    const response = await fetch("words.json");
    words = await response.json();
    showQuestion();
  } catch (error) {
    wordEl.textContent = "단어를 불러오지 못했습니다.";
    console.error(error);
  }
}

init();