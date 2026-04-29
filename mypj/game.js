const gameArea    = document.getElementById('game-area');
const hintText    = document.getElementById('hint-text');
const weightInput = document.getElementById('weight-input');
const submitBtn   = document.getElementById('submit-btn');
const resultToast = document.getElementById('result-toast');
const scaleFill   = document.getElementById('scale-fill');

let score = 0, correct = 0, total = 0, best = 0;
let activePoop   = null;
let growInterval = null;
let toastTimer   = null;
const MAX_WEIGHT    = 9999;
const GROW_PER_TICK = 60;
const TICK_MS       = 50;

function poopSize(weight) {
  return Math.round(16 + 164 * Math.sqrt(weight / MAX_WEIGHT));
}

function labelOffset(weight) {
  return Math.round(poopSize(weight) / 2 + 10);
}


document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('intro').style.display = 'none';
});

gameArea.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (activePoop) return;
  if (e.target.dataset.guessed === 'true') return;
  e.preventDefault();
  spawnPoop(e.clientX, e.clientY);
});

document.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !growInterval) return;
  stopGrowing();
});

function spawnPoop(x, y) {
  const poop = document.createElement('div');
  poop.className = 'poop growing';
  poop.style.left     = x + 'px';
  poop.style.top      = y + 'px';
  poop.style.fontSize = poopSize(1) + 'px';
  // 💩 이모지 + 빈 face 오버레이 (결과 전까지는 숨김)
  poop.textContent = '💩';
  poop.dataset.weight  = 1;
  poop.dataset.guessed = 'false';

  const label = document.createElement('div');
  label.className = 'weight-label';
  label.style.left      = x + 'px';
  label.style.top       = y + 'px';
  label.style.transform = `translate(-50%, ${labelOffset(1)}px)`;
  label.textContent = '???g';
  label.id = 'active-label';

  gameArea.appendChild(poop);
  gameArea.appendChild(label);
  activePoop = poop;

  hintText.textContent = '누르고 있는 동안 똥이 자라요! 손을 떼면 제출할 수 있어요.';
  updateScaleBar(1);

  growInterval = setInterval(() => {
    const cur = parseInt(activePoop.dataset.weight);
    if (cur >= MAX_WEIGHT) { stopGrowing(); return; }
    applyWeight(Math.min(cur + GROW_PER_TICK, MAX_WEIGHT));
  }, TICK_MS);
}

function applyWeight(w) {
  activePoop.dataset.weight = w;
  activePoop.style.fontSize = poopSize(w) + 'px';
  const label = document.getElementById('active-label');
  if (label) label.style.transform = `translate(-50%, ${labelOffset(w)}px)`;
  updateScaleBar(w);
}

function stopGrowing() {
  clearInterval(growInterval);
  growInterval = null;
  activePoop.classList.remove('growing');
  activePoop.classList.add('selected');
  const w = parseInt(activePoop.dataset.weight);
  hintText.textContent = w >= MAX_WEIGHT ? '최대 무게 도달! 무게를 맞춰보세요.' : '이제 무게를 맞춰보세요!';
  weightInput.disabled = false;
  submitBtn.disabled   = false;
  weightInput.value    = '';
  weightInput.focus();
}

function updateScaleBar(w) {
  scaleFill.style.height = Math.min((w / MAX_WEIGHT) * 100, 100) + '%';
}

submitBtn.addEventListener('click', submitGuess);
weightInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitGuess(); });

function submitGuess() {
  if (!activePoop) return;
  const guess = parseInt(weightInput.value);
  if (isNaN(guess) || guess <= 0) {
    weightInput.style.borderColor = '#ff2d78';
    setTimeout(() => weightInput.style.borderColor = '', 500);
    return;
  }

  const actual = parseInt(activePoop.dataset.weight);
  const diff   = Math.abs(guess - actual);
  const pct    = diff / actual;

  total++;
  let points, emoji, msg, detail, expression;

  if (diff === 0) {
    points = 1000; emoji = '🤩'; msg = '완벽한 정답!';
    detail = `정확히 ${actual}g!`;
    expression = 'very-happy'; correct++;
  } else if (pct <= 0.01) {
    points = 700; emoji = '😄'; msg = '거의 완벽!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    expression = 'very-happy'; correct++;
  } else if (pct <= 0.05) {
    points = 400; emoji = '😊'; msg = '아주 가깝네요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    expression = 'happy'; correct++;
  } else if (pct <= 0.15) {
    points = 150; emoji = '🙂'; msg = '괜찮아요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    expression = 'neutral';
  } else if (pct <= 0.30) {
    points = 50; emoji = '😟'; msg = '조금 틀렸어요';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    expression = 'sad';
  } else {
    points = -100; emoji = '😭'; msg = '많이 틀렸어요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    expression = 'very-sad';
  }

  score = Math.max(0, score + points);
  if (score > best) best = score;

  activePoop.classList.remove('selected');
  activePoop.dataset.guessed = 'true';

  updateHUD();
  showToast(emoji, msg, detail, points);
  showFloatText(activePoop, points > 0 ? `+${points}` : `${points}`, points > 0);

  const label = document.getElementById('active-label');
  if (label) {
    label.id = '';
    label.textContent = `${actual}g`;
    label.style.color = points >= 400 ? '#ffe000' : points >= 0 ? 'rgba(0,245,255,0.6)' : '#ff2d78';
  }

  activePoop = null;
  weightInput.disabled = true;
  weightInput.value    = '';
  submitBtn.disabled   = true;
  document.getElementById('selected-info').textContent = '없음';
  hintText.textContent = '화면을 클릭해서 새 똥을 소환하세요!';
  scaleFill.style.height = '0%';
}

function updateHUD() {
  document.getElementById('score-display').textContent   = score.toLocaleString();
  document.getElementById('correct-display').textContent = correct;
  document.getElementById('total-display').textContent   = total;
  document.getElementById('best-display').textContent    = best.toLocaleString();
}

function showToast(emoji, msg, detail, points) {
  document.getElementById('result-emoji').textContent  = emoji;
  document.getElementById('result-msg').textContent    = msg;
  document.getElementById('result-detail').textContent = detail;
  document.getElementById('result-points').textContent = (points > 0 ? '+' : '') + points + '점';
  document.getElementById('result-points').style.color = points > 0 ? '#ffe000' : '#ff2d78';
  resultToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => resultToast.classList.remove('show'), 2200);
}

function showFloatText(poop, text, positive) {
  const el = document.createElement('div');
  el.className   = 'float-text';
  el.style.left  = poop.style.left;
  el.style.top   = poop.style.top;
  el.style.color = positive ? '#ffe000' : '#ff2d78';
  el.textContent = text + '점';
  gameArea.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function spawnAmbient() {
  const el = document.createElement('div');
  el.style.position      = 'absolute';
  el.style.fontSize      = Math.random() * 20 + 12 + 'px';
  el.style.left          = Math.random() * 100 + 'vw';
  el.style.top           = '-2rem';
  el.style.opacity       = 0.08 + Math.random() * 0.06;
  el.style.pointerEvents = 'none';
  el.textContent         = '💩';
  el.style.animation     = `ambientFall ${4 + Math.random() * 6}s linear forwards`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12000);
}

setInterval(spawnAmbient, 1800);
