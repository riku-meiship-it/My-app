const QUIZ_LENGTH = 15;

const screens = {
  home: document.getElementById("screen-home"),
  quiz: document.getElementById("screen-quiz"),
  result: document.getElementById("screen-result"),
};

const el = {
  count: document.getElementById("q-count"),
  score: document.getElementById("q-score"),
  bar: document.getElementById("progress-bar"),
  text: document.getElementById("q-text"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  feedbackResult: document.getElementById("feedback-result"),
  feedbackExplain: document.getElementById("feedback-explain"),
  next: document.getElementById("btn-next"),
  resultNum: document.getElementById("result-num"),
  resultRank: document.getElementById("result-rank"),
  resultMsg: document.getElementById("result-msg"),
};

let deck = [];
let current = 0;
let score = 0;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo(0, 0);
}

function startQuiz() {
  deck = shuffle(QUESTIONS).slice(0, QUIZ_LENGTH);
  current = 0;
  score = 0;
  show("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = deck[current];
  el.count.textContent = `Q${current + 1} / ${QUIZ_LENGTH}`;
  el.score.textContent = `正解 ${score}`;
  el.bar.style.width = `${(current / QUIZ_LENGTH) * 100}%`;
  el.text.textContent = q.q;
  el.feedback.classList.add("hidden");
  el.choices.innerHTML = "";

  shuffle([q.a, ...q.w]).forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = label;
    btn.addEventListener("click", () => answer(btn, label === q.a));
    el.choices.appendChild(btn);
  });
}

function answer(picked, isCorrect) {
  const q = deck[current];
  if (isCorrect) score++;

  el.choices.querySelectorAll(".choice").forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === q.a) btn.classList.add("correct");
    else if (btn === picked) btn.classList.add("wrong");
    else btn.classList.add("dim");
  });

  el.score.textContent = `正解 ${score}`;
  el.bar.style.width = `${((current + 1) / QUIZ_LENGTH) * 100}%`;
  el.feedbackResult.textContent = isCorrect ? "正解！" : `不正解… 正解は「${q.a}」`;
  el.feedbackResult.className = `feedback-result ${isCorrect ? "ok" : "ng"}`;
  el.feedbackExplain.textContent = q.e;
  el.next.textContent = current + 1 < QUIZ_LENGTH ? "次へ" : "結果を見る";
  el.feedback.classList.remove("hidden");
  el.next.focus();
}

function next() {
  current++;
  if (current < QUIZ_LENGTH) renderQuestion();
  else showResult();
}

function showResult() {
  el.resultNum.textContent = score;
  const ranks = [
    [15, "SixTONES博士", "全問正解！もはや7人目のメンバー級の知識です。"],
    [12, "ガチのスト担", "かなりの上級者！あと少しで全問正解です。"],
    [9, "立派なスト担", "しっかりSixTONESを追いかけていますね。"],
    [5, "スト担見習い", "もっとSixTONESを知れば、もっと好きになるはず。"],
    [0, "原石", "これから輝く原石です。もう一度挑戦してみよう！"],
  ];
  const [, rank, msg] = ranks.find(([min]) => score >= min);
  el.resultRank.textContent = rank;
  el.resultMsg.textContent = msg;
  show("result");
}

document.getElementById("btn-play").addEventListener("click", startQuiz);
document.getElementById("btn-retry").addEventListener("click", startQuiz);
document.getElementById("btn-home").addEventListener("click", () => show("home"));
el.next.addEventListener("click", next);
