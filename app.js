const QUIZ_LENGTH = 15;
// シェア投稿に載せるURL（GitHub Pagesで公開したときのアドレス）
const SHARE_URL = "https://riku-meiship-it.github.io/My-app/";
const SHARE_TAGS = "#SixTONESクイズ #SixTONES";

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
  prev: document.getElementById("btn-prev"),
  quitConfirm: document.getElementById("quit-confirm"),
};

let deck = [];
let current = 0;
let score = 0;
let answers = []; // answers[i] = i問目で選んだ選択肢（未回答は undefined）

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
  // 前の問題に戻っても選択肢の並びが変わらないよう、出題時に1度だけシャッフルする
  deck = shuffle(QUESTIONS)
    .slice(0, QUIZ_LENGTH)
    .map((q) => ({ ...q, choices: shuffle([q.a, ...q.w]) }));
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
  el.prev.disabled = current === 0;
  el.quitConfirm.hidden = true;

  q.choices.forEach((label) => {
    const btn = document.createElement("button");
    btn.className = label === answers[current] ? "choice selected" : "choice";
    btn.textContent = label;
    btn.addEventListener("click", () => answer(label));
    el.choices.appendChild(btn);
  });
}

// 回答は記録するだけで、正誤と解説は15問終了後にまとめて表示する
function answer(picked) {
  answers[current] = picked;
  current++;
  if (current < QUIZ_LENGTH) renderQuestion();
  else showResult();
}

function prev() {
  if (current === 0) return;
  current--;
  renderQuestion();
}

function showResult() {
  score = deck.filter((q, i) => answers[i] === q.a).length;
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
  renderShare(rank);
  show("result");
}

function renderReview() {
  el.review.innerHTML = "";
  deck.forEach((q, i) => {
    const picked = answers[i];
    const isCorrect = picked === q.a;
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

function renderShare(rank) {
  const text = `SixTONESクイズで${QUIZ_LENGTH}問中${score}問正解！\n称号は「${rank}」でした。\n${SHARE_TAGS}`;
  const full = `${text}\n${SHARE_URL}`;
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(SHARE_URL);
  document.getElementById("share-text").textContent = full;
  document.getElementById("share-x").href = `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  document.getElementById("share-line").href = `https://line.me/R/share?text=${encodeURIComponent(full)}`;
  document.getElementById("share-threads").href = `https://www.threads.net/intent/post?text=${encodeURIComponent(full)}`;
  document.getElementById("share-status").textContent = "";
  shareText = full;
}

let shareText = "";
const shareStatus = document.getElementById("share-status");

document.getElementById("share-copy").addEventListener("click", () => {
  const done = () => (shareStatus.textContent = "コピーしました。Instagramなど好きなアプリに貼り付けてください。");
  const fallback = () => {
    // クリップボードが使えない環境では、文章を選択状態にして手動コピーしてもらう
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("share-text"));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    shareStatus.textContent = "自動でコピーできませんでした。選択された文章を長押し（右クリック）でコピーしてください。";
  };
  try {
    navigator.clipboard.writeText(shareText).then(done, fallback);
  } catch (e) {
    fallback();
  }
});

// スマホの共有メニュー（対応しているブラウザだけボタンを表示）
const nativeBtn = document.getElementById("share-native");
if (navigator.share) {
  nativeBtn.hidden = false;
  nativeBtn.addEventListener("click", () => {
    navigator.share({ text: shareText }).catch(() => {});
  });
}

// BGM：ブラウザは操作前の自動再生を許さないので、PLAYを押したときに鳴らし始める。
// 利用者がOFFにした場合はその選択を覚えておく。
const bgmBtn = document.getElementById("btn-bgm");
const bgmLabel = document.getElementById("bgm-label");
let bgmMuted = false;
try {
  bgmMuted = localStorage.getItem("bgm-muted") === "1";
} catch (e) {}

function updateBgmButton() {
  const on = BGM.isPlaying();
  bgmBtn.classList.toggle("on", on);
  bgmBtn.setAttribute("aria-pressed", String(on));
  bgmLabel.textContent = on ? "BGM ON" : "BGM OFF";
}

function setBgmMuted(muted) {
  bgmMuted = muted;
  try {
    localStorage.setItem("bgm-muted", muted ? "1" : "0");
  } catch (e) {}
}

bgmBtn.addEventListener("click", () => {
  if (BGM.isPlaying()) {
    BGM.stop();
    setBgmMuted(true);
  } else {
    BGM.start();
    setBgmMuted(false);
  }
  updateBgmButton();
});

document.getElementById("btn-play").addEventListener("click", () => {
  if (!bgmMuted) BGM.start();
  updateBgmButton();
  startQuiz();
});
document.getElementById("btn-retry").addEventListener("click", startQuiz);
document.getElementById("btn-home").addEventListener("click", () => show("home"));
el.prev.addEventListener("click", prev);
document.getElementById("btn-quit").addEventListener("click", () => {
  el.quitConfirm.hidden = false;
  document.getElementById("btn-quit-no").focus();
});
document.getElementById("btn-quit-no").addEventListener("click", () => {
  el.quitConfirm.hidden = true;
});
document.getElementById("btn-quit-yes").addEventListener("click", () => {
  el.quitConfirm.hidden = true;
  show("home");
});
