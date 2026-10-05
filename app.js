const QUIZ_LENGTH = 15;

const screens = {
  home: document.getElementById("screen-home"),
  quiz: document.getElementById("screen-quiz"),
  result: document.getElementById("screen-result"),
};

const el = {
  count: document.getElementById("q-count"),
  bar: document.getElementById("progress-bar"),
  text: document.getElementById("q-text"),
  choices: document.getElementById("choices"),
  resultNum: document.getElementById("result-num"),
  resultRank: document.getElementById("result-rank"),
  resultMsg: document.getElementById("result-msg"),
  review: document.getElementById("review"),
};

let deck = [];
let current = 0;
let score = 0;
let answers = [];

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
  answers = [];
  show("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = deck[current];
  el.count.textContent = `Q${current + 1} / ${QUIZ_LENGTH}`;
  el.bar.style.width = `${(current / QUIZ_LENGTH) * 100}%`;
  el.text.textContent = q.q;
  el.choices.innerHTML = "";

  shuffle([q.a, ...q.w]).forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = label;
    btn.addEventListener("click", () => answer(label));
    el.choices.appendChild(btn);
  });
}

// 回答は記録するだけで、正誤と解説は15問終了後にまとめて表示する
function answer(picked) {
  const q = deck[current];
  const isCorrect = picked === q.a;
  if (isCorrect) score++;
  answers.push({ q, picked, isCorrect });

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
  renderReview();
  show("result");
}

function renderReview() {
  el.review.innerHTML = "";
  answers.forEach(({ q, picked, isCorrect }, i) => {
    const li = document.createElement("li");
    li.className = `review-item ${isCorrect ? "ok" : "ng"}`;

    const head = document.createElement("p");
    head.className = "review-head";
    head.textContent = `Q${i + 1}　${isCorrect ? "○ 正解" : "× 不正解"}`;

    const question = document.createElement("p");
    question.className = "review-q";
    question.textContent = q.q;

    const ans = document.createElement("p");
    ans.className = "review-a";
    ans.textContent = isCorrect
      ? `あなたの答え：${picked}`
      : `あなたの答え：${picked}　／　正解：${q.a}`;

    const explain = document.createElement("p");
    explain.className = "review-e";
    explain.textContent = q.e;

    li.append(head, question, ans, explain);
    el.review.appendChild(li);
  });
}

document.getElementById("btn-play").addEventListener("click", startQuiz);
document.getElementById("btn-retry").addEventListener("click", startQuiz);
document.getElementById("btn-home").addEventListener("click", () => show("home"));
