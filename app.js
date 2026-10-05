const QUIZ_LENGTH = 15;
const TIME_LIMIT_MS = 90 * 1000; // タイムアタックの制限時間（1分半）
const TIME_LABEL = "1分半タイムアタック";
const WARN_MS = 10 * 1000; // 残りこの時間を切るとタイマーを赤く点滅させる
// シェア投稿に載せるURL（GitHub Pagesで公開したときのアドレス）
const SHARE_URL = "https://riku-meiship-it.github.io/My-app/";
const SHARE_TAGS = "#SixTONESクイズ #SixTONES";

// 正解数に応じた称号（[必要な正解数, 称号, メッセージ]、正解数の多い順）
// ホーム画面の称号一覧と結果画面の両方でこの表を使う
const RANKS = [
  [15, "SixTONES博士", "全問正解！もはや7人目のメンバー級の知識です。"],
  [12, "ガチのスト担", "かなりの上級者！あと少しで全問正解です。"],
  [9, "立派なスト担", "しっかりSixTONESを追いかけていますね。"],
  [5, "スト担見習い", "もっとSixTONESを知れば、もっと好きになるはず。"],
  [0, "原石", "これから輝く原石です。もう一度挑戦してみよう！"],
];

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
  timer: document.getElementById("q-timer"),
  resultMode: document.getElementById("result-mode"),
};

let deck = [];
let current = 0;
let score = 0;
let answers = []; // answers[i] = i問目で選んだ選択肢（未回答は undefined）
let timeAttack = false; // タイムアタック中かどうか
let deadline = 0;
let timerId = null;
let timeUp = false;
let finished = false;
let elapsedMs = 0;

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

// 残り時間は切り上げ、かかった時間は切り捨てで表示する
function formatTime(ms, roundUp = true) {
  const sec = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function startTimer() {
  deadline = Date.now() + TIME_LIMIT_MS;
  el.timer.hidden = false;
  tickTimer();
  timerId = setInterval(tickTimer, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function tickTimer() {
  const left = deadline - Date.now();
  el.timer.textContent = formatTime(left);
  el.timer.classList.toggle("warn", left <= WARN_MS);
  if (left <= 0) {
    timeUp = true;
    showResult();
  }
}

function startQuiz() {
  // 前の問題に戻っても選択肢の並びが変わらないよう、出題時に1度だけシャッフルする
  deck = shuffle(QUESTIONS)
    .slice(0, QUIZ_LENGTH)
    .map((q) => ({ ...q, choices: shuffle([q.a, ...q.w]) }));
  current = 0;
  score = 0;
  answers = [];
  timeUp = false;
  finished = false;
  stopTimer();
  el.timer.hidden = true;
  el.timer.classList.remove("warn");
  show("quiz");
  renderQuestion();
  if (timeAttack) startTimer();
}

function renderQuestion() {
  const q = deck[current];
  el.count.textContent = `Q${current + 1} / ${QUIZ_LENGTH}`;
  el.bar.style.width = `${(current / QUIZ_LENGTH) * 100}%`;
  el.text.textContent = q.q;
  el.choices.innerHTML = "";
  el.choices.classList.add("no-hover"); // マウスが動くまでhoverの強調を止める（style.css参照）
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
  if (finished) return;
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
  if (finished) return;
  finished = true;
  if (timeAttack) {
    stopTimer();
    elapsedMs = Math.min(TIME_LIMIT_MS, TIME_LIMIT_MS - (deadline - Date.now()));
    el.resultMode.textContent = timeUp
      ? `${TIME_LABEL} ／ 時間切れ！`
      : `${TIME_LABEL} ／ クリアタイム ${formatTime(elapsedMs, false)}`;
  }
  el.resultMode.hidden = !timeAttack;
  score = deck.filter((q, i) => answers[i] === q.a).length;
  el.resultNum.textContent = score;
  const [, rank, msg] = RANKS.find(([min]) => score >= min);
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
    const pickedLabel = picked === undefined ? "未回答" : picked;
    ans.textContent = isCorrect
      ? `あなたの答え：${pickedLabel}`
      : `あなたの答え：${pickedLabel}　／　正解：${q.a}`;

    const explain = document.createElement("p");
    explain.className = "review-e";
    explain.textContent = q.e;

    li.append(head, question, ans, explain);
    el.review.appendChild(li);
  });
}

function renderShare(rank) {
  const mode = !timeAttack ? "" : timeUp ? `【${TIME_LABEL}・時間切れ】\n` : `【${TIME_LABEL}・${formatTime(elapsedMs, false)}でクリア】\n`;
  const text = `${mode}SixTONESクイズで${QUIZ_LENGTH}問中${score}問正解！\n称号は「${rank}」でした。\n${SHARE_TAGS}`;
  const full = `${text}\n${SHARE_URL}`;
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(SHARE_URL);
  document.getElementById("share-text").textContent = full;
  document.getElementById("share-x").href = `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  document.getElementById("share-line").href = `https://line.me/R/share?text=${encodeURIComponent(full)}`;
  document.getElementById("share-threads").href = `https://www.threads.net/intent/post?text=${encodeURIComponent(full)}`;
  document.getElementById("share-status").textContent = "";
  document.getElementById("share-panel").hidden = true;
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

// 「結果をシェアする」ボタン：
// スマホなど共有メニューが使える環境ではそれを開き、使えない環境ではアプリの選択肢を表示する
const sharePanel = document.getElementById("share-panel");
document.getElementById("share-open").addEventListener("click", () => {
  if (navigator.share) {
    navigator.share({ text: shareText }).catch((e) => {
      // 利用者が閉じた場合は何もしない。共有できなかった場合は選択肢を表示する
      if (e && e.name !== "AbortError") sharePanel.hidden = false;
    });
  } else {
    sharePanel.hidden = !sharePanel.hidden;
  }
});

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

// ホーム画面の称号一覧
function renderRankList() {
  const list = document.getElementById("rank-list");
  RANKS.forEach(([min, rank], i) => {
    const max = i === 0 ? QUIZ_LENGTH : RANKS[i - 1][0] - 1;
    const li = document.createElement("li");
    const count = document.createElement("span");
    count.className = "rank-count";
    count.textContent = min === max ? `${min}問` : `${min}〜${max}問`;
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = rank;
    li.append(count, name);
    list.appendChild(li);
  });
}
renderRankList();

function startFromHome(withTimer) {
  timeAttack = withTimer;
  if (!bgmMuted) BGM.start();
  updateBgmButton();
  startQuiz();
}
document.getElementById("btn-play").addEventListener("click", () => startFromHome(false));
document.getElementById("btn-time").addEventListener("click", () => startFromHome(true));
document.getElementById("btn-retry").addEventListener("click", startQuiz);
document.getElementById("btn-home").addEventListener("click", () => show("home"));
el.prev.addEventListener("click", prev);
el.choices.addEventListener("pointermove", () => el.choices.classList.remove("no-hover"));
document.getElementById("btn-quit").addEventListener("click", () => {
  el.quitConfirm.hidden = false;
  document.getElementById("btn-quit-no").focus();
});
document.getElementById("btn-quit-no").addEventListener("click", () => {
  el.quitConfirm.hidden = true;
});
document.getElementById("btn-quit-yes").addEventListener("click", () => {
  stopTimer();
  finished = true;
  el.quitConfirm.hidden = true;
  show("home");
});
