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

const TILE = 32;
const MAP_COLS = 9;
const MAP_ROWS = 16;
const SPEED = 2.3;

const map = [
  [1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,4,0,0,1],
  [1,0,0,4,4,4,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,5,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1]
];

const npcs = [
  {
    id: 'mira',
    name: 'Mira',
    x: TILE * 2,
    y: TILE * 3,
    color: '#d96b5f',
    intro: 'Willkommen, Abenteurer! Nur wer aufmerksam ist, findet den Weg.',
    question: 'Welche Steuerung funktioniert auf dem Smartphone am besten?',
    answers: [
      'Kleine Links in der Ecke',
      'Große Touch-Buttons mit genug Abstand',
      'Nur Tastatursteuerung'
    ],
    correct: 1
  },
  {
    id: 'taro',
    name: 'Taro',
    x: TILE * 6,
    y: TILE * 8,
    color: '#6f8fe8',
    intro: 'Auf mobilen Geräten zählt Übersicht mehr als alles andere.',
    question: 'Was ist für mobile Spielbarkeit besonders wichtig?',
    answers: [
      'Responsive Layout und gut lesbare Buttons',
      'Sehr kleine Schrift',
      'Nur Hover-Effekte'
    ],
    correct: 0
  },
  {
    id: 'sena',
    name: 'Sena',
    x: TILE * 4,
    y: TILE * 12,
    color: '#f0bb4d',
    intro: 'Das letzte Rätsel prüft, ob du sauber entwickelst.',
    question: 'Worauf sollte man bei so einer Web-Entwicklung zusätzlich achten?',
    answers: [
      'Touch-Steuerung, Performance, Accessibility und klare UI',
      'Viele Pop-ups',
      'Automatische Musik ohne Kontrolle'
    ],
    correct: 0
  }
];

const player = {
  x: TILE * 4,
  y: TILE * 14,
  size: 22,
  direction: 'up'
};

const keys = { up: false, down: false, left: false, right: false };
let activeNpc = null;
let correctAnswers = 0;
let dialogOpen = false;

function resetGame() {
  player.x = TILE * 4;
  player.y = TILE * 14;
  player.direction = 'up';
  correctAnswers = 0;
  activeNpc = null;
  npcs.forEach(npc => {
    npc.spoken = false;
    npc.answered = false;
    npc.correctlyAnswered = false;
  });
  updateHud();
  hideModal(dialogModal);
  hideModal(endModal);
  dialogOpen = false;
  hintEl.textContent = 'Bewege dich mit dem Steuerkreuz. Geh zu einer Person und tippe auf „Aktion“."';
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

  const coords = [
    [left, top], [right, top], [left, bottom], [right, bottom]
  ];

  return coords.every(([cx, cy]) => map[cy] && map[cy][cx] !== 1 && map[cy][cx] !== 4);
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
  return npcs.find(npc => {
    const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
    return distance < 38;
  }) || null;
}

function interact() {
  const npc = nearestNpc();
  if (!npc) {
    hintEl.textContent = 'Hier ist niemand in deiner Nähe.';
    return;
  }

  activeNpc = npc;
  npc.spoken = true;
  dialogText.textContent = `${npc.name}: ${npc.intro}`;
  questionLegend.textContent = npc.question;
  answersEl.innerHTML = '';

  npc.answers.forEach((answer, index) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'answer-option';
    wrapper.innerHTML = `
      <input type="radio" name="answer" value="${index}" ${npc.answered && npc.selected === index ? 'checked' : ''}>
      <span>${answer}</span>
    `;
    answersEl.appendChild(wrapper);
  });

  updateHud();
  showModal(dialogModal);
  dialogOpen = true;
}

function showModal(el) { el.classList.remove('hidden'); }
function hideModal(el) { el.classList.add('hidden'); }

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeNpc) return;

  const selected = new FormData(questionForm).get('answer');
  if (selected === null) {
    hintEl.textContent = 'Bitte wähle eine Antwort aus.';
    return;
  }

  const choice = Number(selected);
  activeNpc.selected = choice;
  activeNpc.answered = true;
  activeNpc.correctlyAnswered = choice === activeNpc.correct;

  hintEl.textContent = activeNpc.correctlyAnswered
    ? `${activeNpc.name} sagt: Richtig!`
    : `${activeNpc.name} sagt: Fast. Probiere beim nächsten NPC dein Glück.`;

  updateHud();
  hideModal(dialogModal);
  dialogOpen = false;

  if (npcs.every(npc => npc.answered)) {
    const correct = npcs.filter(npc => npc.correctlyAnswered).length;
    endText.textContent = `Du hast alle 3 Bewohner getroffen und ${correct} von 3 Fragen richtig beantwortet.`;
    showModal(endModal);
    dialogOpen = true;
  }
});

closeModal.addEventListener('click', () => {
  hideModal(dialogModal);
  dialogOpen = false;
});

playAgainBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);
actionBtn.addEventListener('click', interact);
talkBtn.addEventListener('click', interact);

function bindTouchButton(button, dir) {
  const activate = (e) => {
    e.preventDefault();
    keys[dir] = true;
  };
  const release = (e) => {
    e.preventDefault();
    keys[dir] = false;
  };

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
      ctx.fillStyle = '#325f2f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#264824';
      ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      break;
    case 2:
      ctx.fillStyle = '#6d9a59';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#8dbd73';
      ctx.fillRect(x + 11, y + 11, 10, 10);
      break;
    case 3:
      ctx.fillStyle = '#b89b62';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#d5bc84';
      ctx.fillRect(x + 0, y + 12, TILE, 8);
      break;
    case 4:
      ctx.fillStyle = '#4f7db2';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#76a2d8';
      ctx.fillRect(x + 2, y + 4, TILE - 4, 8);
      break;
    case 5:
      ctx.fillStyle = '#6d9a59';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#927445';
      ctx.fillRect(x + 9, y + 8, 14, 16);
      ctx.fillStyle = '#db5d4b';
      ctx.fillRect(x + 6, y + 6, 20, 6);
      break;
    default:
      ctx.fillStyle = '#6d9a59';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#7eb564';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  }
}

function drawNpc(npc) {
  ctx.fillStyle = '#2b1c12';
  ctx.fillRect(npc.x - 11, npc.y - 10, 22, 22);
  ctx.fillStyle = npc.color;
  ctx.fillRect(npc.x - 9, npc.y - 8, 18, 18);
  ctx.fillStyle = '#f8ddb5';
  ctx.fillRect(npc.x - 5, npc.y - 14, 10, 8);

  if (!npc.answered) {
    ctx.fillStyle = '#fff4a8';
    ctx.fillRect(npc.x - 4, npc.y - 26, 8, 8);
  }
}

function drawPlayer() {
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(player.x - 11, player.y - 10, 22, 22);
  ctx.fillStyle = '#6eb6e8';
  ctx.fillRect(player.x - 9, player.y - 8, 18, 18);
  ctx.fillStyle = '#f8ddb5';
  ctx.fillRect(player.x - 5, player.y - 14, 10, 8);

  ctx.fillStyle = '#f5f5f5';
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
  if (npc && !dialogOpen) {
    hintEl.textContent = `${npc.name} ist in der Nähe. Tippe auf „Aktion“ oder „Sprechen“.`;
  }

  movePlayer();
  requestAnimationFrame(render);
}

resetGame();
render();
