const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const npcCountEl = document.getElementById('npcCount');
const correctCountEl = document.getElementById('correctCount');
const hintEl = document.getElementById('hint');
const actionBtn = document.getElementById('actionBtn');
const talkBtn = document.getElementById('talkBtn');
const restartBtn = document.getElementById('restartBtn');
const dialogModal = document.getElementById('dialogModal');
const dialogText = document.getElementById('dialogText');
const questionLegend = document.getElementById('questionLegend');
const answersEl = document.getElementById('answers');
const questionForm = document.getElementById('questionForm');
const closeModal = document.getElementById('closeModal');
const endModal = document.getElementById('endModal');
const endText = document.getElementById('endText');
const playAgainBtn = document.getElementById('playAgainBtn');
const rewardOverlay = document.getElementById('rewardOverlay');
const rewardTitle = document.getElementById('rewardTitle');
const rewardText = document.getElementById('rewardText');
const rewardHearts = document.getElementById('rewardHearts');

if (!ctx) {
  hintEl.textContent = 'Canvas konnte auf diesem Gerät nicht geladen werden.';
  throw new Error('Canvas not supported');
}

const TILE = 32;
const MAP_COLS = 9;
const MAP_ROWS = 16;
const SPEED = 2.4;
const keys = { up: false, down: false, left: false, right: false };
let activeNpc = null;
let dialogOpen = false;
let rewardTimer = null;
let rewardLevel = 0;

const map = [
  [1,1,1,1,1,1,1,1,1],
  [1,0,0,0,6,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,5,5,5,0,0,1],
  [1,0,0,5,5,5,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,7,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1]
];

const npcs = [
  {
    id: 'birthday', name: 'Geburtstags-Herz', x: TILE * 2.5, y: TILE * 3.5, color: '#ff4f93',
    intro: 'Ellaha, mein Herz, starten wir mit deinem besonderen Tag.',
    question: 'Wann ist dein Geburtstag?',
    answers: ['10.03.1993', '10.03.1994', '09.03.1993'], correct: 0,
    rewardTitle: 'Erstes Herz gefunden! 💗', rewardText: 'Kamal: Genau, mein Schatz. Dein Lächeln macht jeden Tag schöner.'
  },
  {
    id: 'date', name: 'Date-Herz', x: TILE * 6.5, y: TILE * 8.5, color: '#ffd86f',
    intro: 'Weißt du noch, wann unser erstes Date war?',
    question: 'Wann war unser erstes Date?',
    answers: ['14.06.2024', '14.06.2025', '24.08.2025'], correct: 1,
    rewardTitle: 'Zweites Herz leuchtet! 💖💖', rewardText: 'Kamal: Perfekt. Dieser Tag bleibt für immer einer meiner liebsten.'
  },
  {
    id: 'wedding', name: 'Ewigkeits-Herz', x: TILE * 4.5, y: TILE * 12.5, color: '#fff2a8',
    intro: 'Und jetzt die schönste Erinnerung von allen.',
    question: 'Wann haben wir geheiratet?',
    answers: ['24.08.2024', '14.06.2025', '24.08.2025'], correct: 2,
    rewardTitle: 'Drittes Herz vollendet! 💖💖💖', rewardText: 'Kamal: Ja, mein Schatz. Dieser Tag hat mein Leben vollkommen gemacht.'
  }
];

const player = { x: TILE * 4.5, y: TILE * 14.2, size: 20, direction: 'up', name: 'Ellaha' };

function updateHud() {
  npcCountEl.textContent = `${npcs.filter(n => n.spoken).length}/3`;
  correctCountEl.textContent = `${npcs.filter(n => n.correctlyAnswered).length}/3`;
}

function showModal(el) { el.classList.remove('hidden'); }
function hideModal(el) { el.classList.add('hidden'); }
function showReward() { rewardOverlay.classList.remove('hidden'); }
function hideReward() { rewardOverlay.classList.add('hidden'); if (rewardTimer) clearTimeout(rewardTimer); }

function resetGame() {
  player.x = TILE * 4.5;
  player.y = TILE * 14.2;
  player.direction = 'up';
  activeNpc = null;
  dialogOpen = false;
  rewardLevel = 0;
  npcs.forEach(npc => { npc.spoken = false; npc.answered = false; npc.correctlyAnswered = false; npc.selected = null; });
  hideModal(dialogModal); hideModal(endModal); hideReward(); updateHud();
  hintEl.textContent = 'Steuere Ellaha mit dem Kreuz. Geh zu einem Herz und tippe auf „Sprechen“. ';}

function isBlockedType(type) { return type === 1 || type === 5; }
function getTileAt(px, py) {
  const cx = Math.floor(px / TILE); const cy = Math.floor(py / TILE);
  return map[cy]?.[cx] ?? 1;
}
function isWalkable(x, y) {
  const half = player.size / 2;
  return ![getTileAt(x-half, y-half), getTileAt(x+half, y-half), getTileAt(x-half, y+half), getTileAt(x+half, y+half)].some(isBlockedType);
}

function movePlayer() {
  if (dialogOpen) return;
  let dx = 0, dy = 0;
  if (keys.up) { dy -= SPEED; player.direction = 'up'; }
  if (keys.down) { dy += SPEED; player.direction = 'down'; }
  if (keys.left) { dx -= SPEED; player.direction = 'left'; }
  if (keys.right) { dx += SPEED; player.direction = 'right'; }
  if (dx && isWalkable(player.x + dx, player.y)) player.x += dx;
  if (dy && isWalkable(player.x, player.y + dy)) player.y += dy;
}

function nearestNpc() {
  return npcs.find(npc => Math.hypot(player.x - npc.x, player.y - npc.y) < 34) || null;
}

function interact() {
  const npc = nearestNpc();
  if (!npc) { hintEl.textContent = 'Geh näher an ein Herz heran.'; return; }
  activeNpc = npc; npc.spoken = true; updateHud();
  dialogText.textContent = `Kamal: ${npc.intro}`;
  questionLegend.textContent = npc.question;
  answersEl.innerHTML = '';
  npc.answers.forEach((answer, index) => {
    const label = document.createElement('label');
    label.className = 'answer-option';
    label.innerHTML = `<input type="radio" name="answer" value="${index}" ${npc.selected === index ? 'checked' : ''}><span>${answer}</span>`;
    answersEl.appendChild(label);
  });
  dialogOpen = true; showModal(dialogModal);
}

function triggerReward(npc) {
  rewardLevel += 1;
  const hearts = '💖'.repeat(Math.min(5, rewardLevel + 1)).split('');
  rewardHearts.innerHTML = hearts.map(h => `<span>${h}</span>`).join('');
  rewardTitle.textContent = npc.rewardTitle;
  rewardText.textContent = npc.rewardText;
  showReward();
  rewardTimer = setTimeout(() => { hideReward(); dialogOpen = false; checkEnd(); }, 1900);
}

function checkEnd() {
  if (npcs.every(n => n.answered)) {
    const correct = npcs.filter(n => n.correctlyAnswered).length;
    endText.textContent = correct === 3
      ? 'Ellaha, du hast alle drei Erinnerungen gefunden. Alles Gute zum Geburtstag. Ich liebe dich. ❤️'
      : `Ellaha, du hast ${correct} von 3 Fragen richtig beantwortet und alle Herzen mit Liebe gefüllt.`;
    dialogOpen = true; showModal(endModal);
  }
}

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeNpc) return;
  const selected = new FormData(questionForm).get('answer');
  if (selected === null) { hintEl.textContent = 'Bitte wähle eine Antwort aus. 💕'; return; }
  const choice = Number(selected);
  activeNpc.selected = choice;
  activeNpc.answered = true;
  activeNpc.correctlyAnswered = choice === activeNpc.correct;
  hideModal(dialogModal);
  updateHud();
  if (activeNpc.correctlyAnswered) {
    hintEl.textContent = 'Richtig! Ein neues Herz leuchtet auf.';
    triggerReward(activeNpc);
  } else {
    dialogOpen = false;
    hintEl.textContent = 'Fast, mein Schatz. Das nächste Herz wartet schon.';
    checkEnd();
  }
});

closeModal.addEventListener('click', () => { hideModal(dialogModal); dialogOpen = false; });
playAgainBtn.addEventListener('click', () => { hideModal(endModal); resetGame(); });
restartBtn.addEventListener('click', resetGame);
actionBtn.addEventListener('click', interact);
talkBtn.addEventListener('click', interact);

function bindTouchButton(button, dir) {
  const activate = (e) => { e.preventDefault(); keys[dir] = true; };
  const release = (e) => { e.preventDefault(); keys[dir] = false; };
  button.addEventListener('touchstart', activate, { passive: false });
  button.addEventListener('touchend', release, { passive: false });
  button.addEventListener('touchcancel', release, { passive: false });
  button.addEventListener('mousedown', activate);
  button.addEventListener('mouseup', release);
  button.addEventListener('mouseleave', release);
}
document.querySelectorAll('[data-dir]').forEach(btn => bindTouchButton(btn, btn.dataset.dir));
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = true;
  if (k === 'arrowdown' || k === 's') keys.down = true;
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  if (k === 'arrowright' || k === 'd') keys.right = true;
  if (k === ' ' || k === 'enter') interact();
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
});

function drawHeart(cx, cy, size, fill = '#ff5b98') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size / 2);
  ctx.bezierCurveTo(cx + size, cy - size, cx + size * 2.1, cy + size / 1.5, cx, cy + size * 2.2);
  ctx.bezierCurveTo(cx - size * 2.1, cy + size / 1.5, cx - size, cy - size, cx, cy + size / 2);
  ctx.fill();
}
function drawStar(cx, cy, r, fill = '#ffe17d') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI / 180) * (i * 72 - 90);
    const a2 = (Math.PI / 180) * (i * 72 + 36 - 90);
    const x1 = cx + Math.cos(a1) * r; const y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * (r * .45); const y2 = cy + Math.sin(a2) * (r * .45);
    if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath(); ctx.fill();
}

function drawTile(col, row, type) {
  const x = col * TILE, y = row * TILE;
  if (type === 1) {
    ctx.fillStyle = '#8f2357'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#5b0f36'; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8); return;
  }
  ctx.fillStyle = '#ffcfe0'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = ((col + row) % 2 === 0) ? '#ffd9e7' : '#ffc5d9';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  if (type === 2) drawHeart(x + 16, y + 12, 4, '#ff89b2');
  if (type === 3) { ctx.fillStyle = '#fff0c4'; ctx.fillRect(x, y + 12, TILE, 8); }
  if (type === 5) { ctx.fillStyle = '#d76f97'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#ec93b5'; ctx.fillRect(x + 2, y + 4, TILE - 4, 8); }
  if (type === 6) drawHeart(x + 16, y + 14, 7, '#ff4f93');
  if (type === 7) drawStar(x + 16, y + 16, 7, '#ffd86f');
}

function drawNpc(npc) {
  ctx.fillStyle = '#6b193f'; ctx.fillRect(npc.x - 10, npc.y - 9, 20, 20);
  ctx.fillStyle = npc.color; ctx.fillRect(npc.x - 8, npc.y - 7, 16, 16);
  ctx.fillStyle = '#fff0dc'; ctx.fillRect(npc.x - 4, npc.y - 13, 8, 7);
  if (!npc.answered) drawHeart(npc.x, npc.y - 22, 4, '#ffffff');
}
function drawPlayer() {
  ctx.fillStyle = '#7a1640'; ctx.fillRect(player.x - 10, player.y - 9, 20, 20);
  ctx.fillStyle = '#ff8fb6'; ctx.fillRect(player.x - 8, player.y - 7, 16, 16);
  ctx.fillStyle = '#fff0dc'; ctx.fillRect(player.x - 4, player.y - 13, 8, 7);
  ctx.fillStyle = '#ffffff';
  if (player.direction === 'up') ctx.fillRect(player.x - 2, player.y - 18, 4, 4);
  if (player.direction === 'down') ctx.fillRect(player.x - 2, player.y + 8, 4, 4);
  if (player.direction === 'left') ctx.fillRect(player.x - 18, player.y - 2, 4, 4);
  if (player.direction === 'right') ctx.fillRect(player.x + 14, player.y - 2, 4, 4);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) drawTile(col, row, map[row][col]);
  }
  npcs.forEach(drawNpc);
  drawPlayer();
  const npc = nearestNpc();
  if (npc && !dialogOpen && rewardOverlay.classList.contains('hidden')) hintEl.textContent = `${npc.name} ist in der Nähe. Tippe auf „Sprechen“.`;
  movePlayer();
  requestAnimationFrame(render);
}

resetGame();
render();
