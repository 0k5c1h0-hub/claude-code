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
const GROW_PER_TICK = 60;   // g per 50ms tick (~1200g/s)
const TICK_MS       = 50;

// sqrt 스케일: 5g → 16px,  500g → 57px,  2000g → 97px,  9999g → 180px
function poopSize(weight) {
  return Math.round(16 + 164 * Math.sqrt(weight / MAX_WEIGHT));
}

function labelOffset(weight) {
  return Math.round(poopSize(weight) / 2 + 10);
}

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('intro').style.display = 'none';
});

// 마우스 누르는 순간 → 소환 or 무시
gameArea.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (activePoop) return;                          // 이미 키우는 중
  if (e.target.dataset.guessed === 'true') return; // 완료된 똥

  e.preventDefault();
  spawnPoop(e.clientX, e.clientY);
});

// 마우스 떼는 순간 → 성장 멈춤, 제출 활성화
document.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  if (!growInterval) return;

  stopGrowing();
});

function spawnPoop(x, y) {
  const poop = document.createElement('div');
  poop.className = 'poop growing';
  poop.style.left = x + 'px';
  poop.style.top  = y + 'px';
  poop.style.fontSize = poopSize(1) + 'px';
  poop.textContent = '💩';
  poop.dataset.weight  = 1;
  poop.dataset.guessed = 'false';

  const label = document.createElement('div');
  label.className = 'weight-label';
  label.style.left = x + 'px';
  label.style.top  = y + 'px';
  label.style.transform = `translate(-50%, ${labelOffset(1)}px)`;
  label.textContent = '???g';
  label.id = 'active-label';

  gameArea.appendChild(poop);
  gameArea.appendChild(label);
  activePoop = poop;

  hintText.textContent = '누르고 있는 동안 똥이 자라요! 손을 떼면 제출할 수 있어요.';
  updateScaleBar(1);

  growInterval = setInterval(() => {
    const current = parseInt(activePoop.dataset.weight);
    if (current >= MAX_WEIGHT) {
      stopGrowing();
      return;
    }
    const newWeight = Math.min(current + GROW_PER_TICK, MAX_WEIGHT);
    applyWeight(newWeight);
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
  if (w >= MAX_WEIGHT) {
    hintText.textContent = '최대 무게 도달! 무게를 맞춰보세요.';
  } else {
    hintText.textContent = '이제 무게를 맞춰보세요!';
  }

  weightInput.disabled = false;
  submitBtn.disabled = false;
  weightInput.value = '';
  weightInput.focus();
}

function updateScaleBar(w) {
  const pct = Math.min((w / MAX_WEIGHT) * 100, 100);
  scaleFill.style.height = pct + '%';
}

submitBtn.addEventListener('click', submitGuess);
weightInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitGuess();
});

function submitGuess() {
  if (!activePoop) return;

  const guess = parseInt(weightInput.value);
  if (isNaN(guess) || guess <= 0) {
    weightInput.style.borderColor = '#f44';
    setTimeout(() => weightInput.style.borderColor = '', 500);
    return;
  }

  const actual = parseInt(activePoop.dataset.weight);
  const diff   = Math.abs(guess - actual);
  const pct    = diff / actual;

  total++;
  let points, emoji, msg, detail;

  if (diff === 0) {
    points = 1000; emoji = '🎯'; msg = '완벽한 정답!';
    detail = `정확히 ${actual}g!`;
    correct++;
  } else if (pct <= 0.01) {
    points = 700; emoji = '🔥'; msg = '거의 완벽!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    correct++;
  } else if (pct <= 0.05) {
    points = 400; emoji = '😮'; msg = '아주 가깝네요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
    correct++;
  } else if (pct <= 0.15) {
    points = 150; emoji = '🙂'; msg = '괜찮아요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
  } else if (pct <= 0.30) {
    points = 50; emoji = '😅'; msg = '조금 틀렸어요';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
  } else {
    points = -100; emoji = '💀'; msg = '많이 틀렸어요!';
    detail = `실제: ${actual}g / 오차: ${diff}g (${(pct*100).toFixed(1)}%)`;
  }

  score = Math.max(0, score + points);
  if (score > best) best = score;

  updateHUD();
  showToast(emoji, msg, detail, points);
  showFloatText(activePoop, points > 0 ? `+${points}` : `${points}`, points > 0);

  // 정답 공개
  activePoop.dataset.guessed = 'true';
  activePoop.classList.remove('selected');

  const label = document.getElementById('active-label');
  if (label) {
    label.id = '';
    label.textContent = `${actual}g`;
    label.style.color = points >= 400 ? '#f5c842' : points >= 0 ? '#ccc' : '#f55';
  }

  // 리셋
  activePoop = null;
  weightInput.disabled = true;
  weightInput.value = '';
  submitBtn.disabled = true;
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
  document.getElementById('result-points').style.color = points > 0 ? '#f5c842' : '#f55';

  resultToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => resultToast.classList.remove('show'), 2200);
}

function showFloatText(poop, text, positive) {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.style.left  = poop.style.left;
  el.style.top   = poop.style.top;
  el.style.color = positive ? '#f5c842' : '#f55';
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
