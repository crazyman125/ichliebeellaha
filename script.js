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

const TILE = 32;
const MAP_COLS = 9;
const MAP_ROWS = 16;
const SPEED = 2.25;

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
    id: 'rose',
    name: 'Erinnerungsherz',
    x: TILE * 2,
    y: TILE * 3,
    color: '#ff5c93',
    intro: 'Ellaha, mein Herz, beginnen wir mit einem besonderen Datum. Weißt du noch, wann du Geburtstag hast?',
    question: 'Wann ist dein Geburtstag?',
    answers: ['10.03.1993', '10.03.1994', '09.03.1993'],
    correct: 0,
    rewardTitle: 'Erstes Herz gefunden! 💗',
    rewardText: 'Kamal lächelt: Genau, mein Schatz. Das erste Herz gehört dir.'
  },
  {
    id: 'date',
    name: 'Date-Herz',
    x: TILE * 6,
    y: TILE * 8,
    color: '#ffd36e',
    intro: 'Ellaha, jeder Schritt mit dir ist wunderschön. Erinnerst du dich an unser erstes Date?',
    question: 'Wann war unser erstes Date?',
    answers: ['14.06.2024', '14.06.2025', '24.08.2025'],
    correct: 1,
    rewardTitle: 'Zweites Herz freigeschaltet! 💖💖',
    rewardText: 'Kamal sagt: Perfekt. Unser erstes Date bleibt für immer in meinem Herzen.'
  },
  {
    id: 'wedding',
    name: 'Ewigkeitsherz',
    x: TILE * 4,
    y: TILE * 12,
    color: '#fff0a8',
    intro: 'Ellaha, die schönste Erinnerung wartet jetzt. Weißt du noch unser Hochzeitsdatum?',
    question: 'Wann haben wir geheiratet?',
    answers: ['24.08.2024', '14.06.2025', '24.08.2025'],
    correct: 2,
    rewardTitle: 'Drittes Herz vervollständigt! 💖💖💖',
    rewardText: 'Kamal sagt: Ja, mein Schatz. Dieser Tag hat mein Leben vollkommen gemacht.'
  }
];

const player = {
  x: TILE * 4,
  y: TILE * 14,
  size: 22,
  direction: 'up',
  name: 'Ellaha'
};

const keys = { up: false, down: false, left: false, right: false };
let activeNpc = null;
let dialogOpen = false;
let rewardTimer = null;
let rewardLevel = 0;

function resetGame() {
  player.x = TILE * 4;
  player.y = TILE * 14;
  player.direction = 'up';
  activeNpc = null;
  rewardLevel = 0;
  npcs.forEach(npc => {
    npc.spoken = false;
    npc.answered = false;
    npc.correctlyAnswered = false;
    npc.selected = null;
  });
  updateHud();
  hideModal(dialogModal);
  hideModal(endModal);
  hideReward();
  dialogOpen = false;
  hintEl.textContent = 'Steuere Ellaha mit dem Steuerkreuz. Geh zu einem Herzpunkt und tippe auf „Sprechen“.';
}

function updateHud() {
  const spoken = npcs.filter(n => n.spoken).length;
  const correct = npcs.filter(n => n.correctlyAnswered).length;
  npcCountEl.textContent = `${spoken}/3`;
  correctCountEl.textContent = `${correct}/3`;
}

function isWalkable(x, y) {
  const left = Math.floor((x - player.size / 2) / TILE);
  const right = Math.floor((x + player.size / 2 - 1) / TILE);
  const top = Math.floor((y - player.size / 2) / TILE);
  const bottom = Math.floor((y + player.size / 2 - 1) / TILE);
  const coords = [[left, top], [right, top], [left, bottom], [right, bottom]];
  return coords.every(([cx, cy]) => map[cy] && map[cy][cx] !== 1 && map[cy][cx] !== 5);
}

function movePlayer() {
  if (dialogOpen) return;
  let dx = 0;
  let dy = 0;
  if (keys.up) { dy -= SPEED; player.direction = 'up'; }
  if (keys.down) { dy += SPEED; player.direction = 'down'; }
  if (keys.left) { dx -= SPEED; player.direction = 'left'; }
  if (keys.right) { dx += SPEED; player.direction = 'right'; }
  const nextX = player.x + dx;
  const nextY = player.y + dy;
  if (dx !== 0 && isWalkable(nextX, player.y)) player.x = nextX;
  if (dy !== 0 && isWalkable(player.x, nextY)) player.y = nextY;
}

function nearestNpc() {
  return npcs.find(npc => Math.hypot(player.x - npc.x, player.y - npc.y) < 38) || null;
}

function interact() {
  const npc = nearestNpc();
  if (!npc) {
    hintEl.textContent = 'Hier wartet gerade kein Herzpunkt auf Ellaha.';
    return;
  }
  activeNpc = npc;
  npc.spoken = true;
  dialogText.textContent = `Kamal: ${npc.intro}`;
  questionLegend.textContent = npc.question;
  answersEl.innerHTML = '';

  npc.answers.forEach((answer, index) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'answer-option';
    wrapper.innerHTML = `<input type="radio" name="answer" value="${index}" ${npc.selected === index ? 'checked' : ''}><span>${answer}</span>`;
    answersEl.appendChild(wrapper);
  });

  updateHud();
  showModal(dialogModal);
  dialogOpen = true;
}

function showModal(el) { el.classList.remove('hidden'); }
function hideModal(el) { el.classList.add('hidden'); }
function showReward() { rewardOverlay.classList.remove('hidden'); }
function hideReward() { rewardOverlay.classList.add('hidden'); if (rewardTimer) clearTimeout(rewardTimer); }

function triggerReward(npc) {
  rewardLevel += 1;
  const hearts = '💖'.repeat(Math.min(5, rewardLevel + 1)).split('');
  rewardHearts.innerHTML = hearts.map(h => `<span>${h}</span>`).join('');
  rewardTitle.textContent = npc.rewardTitle;
  rewardText.textContent = npc.rewardText;
  showReward();
  rewardTimer = setTimeout(() => {
    hideReward();
    dialogOpen = false;
    checkEnd();
  }, 2100);
}

function checkEnd() {
  if (npcs.every(npc => npc.answered)) {
    const correct = npcs.filter(npc => npc.correctlyAnswered).length;
    const perfect = correct === 3;
    endText.textContent = perfect
      ? 'Ellaha, du hast alle Erinnerungen gefunden und alle Herzen gesammelt. Diese kleine Reise ist nur ein Symbol dafür, wie besonders du für mich bist.'
      : `Ellaha, du hast ${correct} von 3 Herzensfragen richtig beantwortet und jedes einzelne Herz mit Liebe gefüllt.`;
    showModal(endModal);
    dialogOpen = true;
  }
}

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeNpc) return;
  const selected = new FormData(questionForm).get('answer');
  if (selected === null) {
    hintEl.textContent = 'Bitte wähle eine Antwort aus, Ellaha. 💕';
    return;
  }

  const choice = Number(selected);
  activeNpc.selected = choice;
  activeNpc.answered = true;
  activeNpc.correctlyAnswered = choice === activeNpc.correct;

  hideModal(dialogModal);

  if (activeNpc.correctlyAnswered) {
    hintEl.textContent = `${activeNpc.name}: Richtig beantwortet. Ein weiteres Herz leuchtet auf.`;
    dialogOpen = true;
    triggerReward(activeNpc);
  } else {
    hintEl.textContent = `Kamal: Fast, mein Schatz. Geh weiter – das nächste Herz wartet schon.`;
    dialogOpen = false;
    checkEnd();
  }

  updateHud();
});

closeModal.addEventListener('click', () => {
  hideModal(dialogModal);
  dialogOpen = false;
});

playAgainBtn.addEventListener('click', () => {
  hideModal(endModal);
  resetGame();
});
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
  if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = true;
  if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = true;
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
  if (e.key === ' ' || e.key === 'Enter') interact();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = false;
  if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = false;
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
});

function drawTile(x, y, type) {
  switch (type) {
    case 1:
      ctx.fillStyle = '#7d2b4b';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5e1d39';
      ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      break;
    case 2:
      ctx.fillStyle = '#f6b6cc';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ffe5ef';
      ctx.fillRect(x + 12, y + 8, 8, 16);
      ctx.fillRect(x + 8, y + 12, 16, 8);
      break;
    case 3:
      ctx.fillStyle = '#ffd7a8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#fff0cf';
      ctx.fillRect(x, y + 12, TILE, 8);
      break;
    case 5:
      ctx.fillStyle = '#d1688e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#e889aa';
      ctx.fillRect(x + 2, y + 4, TILE - 4, 8);
      break;
    case 6:
      ctx.fillStyle = '#f8bfd0';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ff6f9f';
      drawHeart(x + 16, y + 14, 6);
      break;
    case 7:
      ctx.fillStyle = '#f8bfd0';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ffd36e';
      drawStar(x + 16, y + 16, 7);
      break;
    default:
      ctx.fillStyle = '#f8bfd0';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#f9cad9';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  }
}

function drawHeart(cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size / 2);
  ctx.bezierCurveTo(cx + size, cy - size, cx + size * 2.2, cy + size / 1.5, cx, cy + size * 2.3);
  ctx.bezierCurveTo(cx - size * 2.2, cy + size / 1.5, cx - size, cy - size, cx, cy + size / 2);
  ctx.fill();
}

function drawStar(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI / 180) * (i * 72 - 90);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    const angle2 = (Math.PI / 180) * (i * 72 + 36 - 90);
    ctx.lineTo(cx + Math.cos(angle2) * (r * .45), cy + Math.sin(angle2) * (r * .45));
  }
  ctx.closePath();
  ctx.fill();
}

function drawNpc(npc) {
  ctx.fillStyle = '#5a1931';
  ctx.fillRect(npc.x - 11, npc.y - 10, 22, 22);
  ctx.fillStyle = npc.color;
  ctx.fillRect(npc.x - 9, npc.y - 8, 18, 18);
  ctx.fillStyle = '#fff0da';
  ctx.fillRect(npc.x - 5, npc.y - 14, 10, 8);
  ctx.fillStyle = '#fff';
  if (!npc.answered) drawHeart(npc.x, npc.y - 24, 4);
}

function drawPlayer() {
  ctx.fillStyle = '#5f1834';
  ctx.fillRect(player.x - 11, player.y - 10, 22, 22);
  ctx.fillStyle = '#ff8eb3';
  ctx.fillRect(player.x - 9, player.y - 8, 18, 18);
  ctx.fillStyle = '#fff0da';
  ctx.fillRect(player.x - 5, player.y - 14, 10, 8);
  ctx.fillStyle = '#fff';
  if (player.direction === 'up') ctx.fillRect(player.x - 2, player.y - 20, 4, 4);
  if (player.direction === 'down') ctx.fillRect(player.x - 2, player.y + 10, 4, 4);
  if (player.direction === 'left') ctx.fillRect(player.x - 20, player.y - 2, 4, 4);
  if (player.direction === 'right') ctx.fillRect(player.x + 16, player.y - 2, 4, 4);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      drawTile(col * TILE, row * TILE, map[row][col]);
    }
  }
  npcs.forEach(drawNpc);
  drawPlayer();
  const npc = nearestNpc();
  if (npc && !dialogOpen && rewardOverlay.classList.contains('hidden')) {
    hintEl.textContent = `${npc.name} ist in der Nähe. Tippe auf „Sprechen“.`;
  }
  movePlayer();
  requestAnimationFrame(render);
}

resetGame();
render();
