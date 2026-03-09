const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const npcCountEl = document.getElementById('npcCount');
const correctCountEl = document.getElementById('correctCount');
const loveLevelEl = document.getElementById('loveLevel');
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

const rewardModal = document.getElementById('rewardModal');
const rewardStage = document.getElementById('rewardStage');
const rewardText = document.getElementById('rewardText');
const rewardContinueBtn = document.getElementById('rewardContinueBtn');

const endModal = document.getElementById('endModal');
const endText = document.getElementById('endText');
const playAgainBtn = document.getElementById('playAgainBtn');

const TILE = 32;
const MAP_COLS = 9;
const MAP_ROWS = 16;
const SPEED = 2.3;

const map = [
  [1,1,1,1,1,1,1,1,1],
  [1,0,0,0,2,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,4,0,0,1],
  [1,0,0,4,4,4,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,5,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,2,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,0,0,0,6,0,0,0,1],
  [1,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1]
];

const npcs = [
  {
    id: 'rose',
    name: 'Rosenfee',
    x: TILE * 2,
    y: TILE * 3,
    color: '#ff7aa8',
    intro: 'Ich bewache die Erinnerung an einen ganz besonderen Tag.',
    question: 'Wann ist dein Geburtstag?',
    answers: ['10.03.1993', '10.03.1992', '03.10.1993'],
    correct: 0
  },
  {
    id: 'cupido',
    name: 'Cupido',
    x: TILE * 6,
    y: TILE * 8,
    color: '#ffd166',
    intro: 'Ich erinnere mich an den Anfang eurer Geschichte.',
    question: 'Wann war euer erstes Date?',
    answers: ['14.05.2025', '14.06.2025', '24.08.2025'],
    correct: 1
  },
  {
    id: 'star',
    name: 'Sternenherz',
    x: TILE * 4,
    y: TILE * 12,
    color: '#9ed0ff',
    intro: 'Ich kenne den Tag, an dem ihr euch das Ja-Wort gegeben habt.',
    question: 'Wann habt ihr geheiratet?',
    answers: ['24.08.2025', '24.07.2025', '08.24.2025'],
    correct: 0
  }
];

const rewardStages = [
  { symbol: '♥', text: 'Erstes Herz freigeschaltet! Eine kleine Wolke aus Herzen steigt auf.' },
  { symbol: '♥♥', text: 'Zweites Herz freigeschaltet! Noch mehr Liebe liegt in der Luft.' },
  { symbol: '♥♥♥', text: 'Drittes Herz freigeschaltet! Die volle Geburtstagsliebe ist entfesselt.' }
];

const player = {
  x: TILE * 4,
  y: TILE * 14,
  size: 22,
  direction: 'up'
};

const keys = { up: false, down: false, left: false, right: false };
let activeNpc = null;
let dialogOpen = false;
let lastHintNpc = null;

function resetGame() {
  player.x = TILE * 4;
  player.y = TILE * 14;
  player.direction = 'up';
  activeNpc = null;
  dialogOpen = false;
  lastHintNpc = null;
  npcs.forEach((npc) => {
    npc.spoken = false;
    npc.answered = false;
    npc.correctlyAnswered = false;
    npc.selected = null;
  });
  updateHud();
  hideModal(dialogModal);
  hideModal(rewardModal);
  hideModal(endModal);
  hintEl.textContent = 'Bewege dich mit dem Steuerkreuz. Geh zu einer Person und tippe auf „Aktion“ oder „Sprechen“.';
}

function updateHud() {
  const spoken = npcs.filter((n) => n.spoken).length;
  const correct = npcs.filter((n) => n.correctlyAnswered).length;
  npcCountEl.textContent = `${spoken}/3`;
  correctCountEl.textContent = `${correct}/3`;
  loveLevelEl.textContent = String(correct + 1);
}

function showModal(element) {
  element.classList.remove('hidden');
}

function hideModal(element) {
  element.classList.add('hidden');
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
  return npcs.find((npc) => Math.hypot(player.x - npc.x, player.y - npc.y) < 38) || null;
}

function openNpcDialog(npc) {
  activeNpc = npc;
  npc.spoken = true;
  dialogText.textContent = `${npc.name}: ${npc.intro}`;
  questionLegend.textContent = npc.question;
  answersEl.innerHTML = '';

  npc.answers.forEach((answer, index) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'answer-option';
    wrapper.innerHTML = `
      <input type="radio" name="answer" value="${index}" ${npc.selected === index ? 'checked' : ''}>
      <span>${answer}</span>
    `;
    answersEl.appendChild(wrapper);
  });

  updateHud();
  showModal(dialogModal);
  dialogOpen = true;
}

function interact() {
  const npc = nearestNpc();
  if (!npc) {
    hintEl.textContent = 'Hier ist gerade niemand in deiner Nähe. Suche weiter nach einem Herzsymbol.';
    return;
  }

  if (npc.answered) {
    hintEl.textContent = `${npc.name} lächelt dich an. Diese Frage ist schon beantwortet.`;
    return;
  }

  openNpcDialog(npc);
}

function createHeartBurst(amount) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < amount; i += 1) {
    const heart = document.createElement('div');
    heart.className = 'heart-burst';
    heart.textContent = Math.random() > 0.25 ? '♥' : '✨';
    heart.style.left = `${centerX + (Math.random() * 80 - 40)}px`;
    heart.style.top = `${centerY + (Math.random() * 40 - 20)}px`;
    heart.style.setProperty('--dx', `${Math.random() * 220 - 110}px`);
    heart.style.setProperty('--dy', `${-80 - Math.random() * 220}px`);
    heart.style.setProperty('--rot', `${Math.random() * 90 - 45}deg`);
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
  }
}

function showReward(correctCount) {
  const stage = rewardStages[Math.max(0, Math.min(correctCount - 1, rewardStages.length - 1))];
  rewardStage.textContent = stage.symbol;
  rewardText.textContent = stage.text;
  createHeartBurst(12 + (correctCount * 8));
  showModal(rewardModal);
  dialogOpen = true;
}

function finishGame() {
  const correct = npcs.filter((npc) => npc.correctlyAnswered).length;
  endText.textContent = `Du hast alle 3 Herzensfragen beantwortet und ${correct} von 3 Antworten richtig gehabt. Ganz egal wie viele Punkte: Diese Reise gehört nur euch beiden.`;
  createHeartBurst(40);
  showModal(endModal);
  dialogOpen = true;
}

questionForm.addEventListener('submit', (event) => {
  event.preventDefault();
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

  hideModal(dialogModal);
  dialogOpen = false;

  if (activeNpc.correctlyAnswered) {
    const correct = npcs.filter((npc) => npc.correctlyAnswered).length;
    hintEl.textContent = `${activeNpc.name} sagt: Richtig, wie schön du dich erinnerst!`;
    updateHud();
    showReward(correct);
  } else {
    hintEl.textContent = `${activeNpc.name} sagt: Fast! Aber die Erinnerung bleibt trotzdem voller Liebe.`;
    updateHud();
    const allAnswered = npcs.every((npc) => npc.answered);
    if (allAnswered) finishGame();
  }

  const allAnswered = npcs.every((npc) => npc.answered);
  const anyModalVisible = !rewardModal.classList.contains('hidden') || !endModal.classList.contains('hidden');
  if (allAnswered && !anyModalVisible && !activeNpc.correctlyAnswered) {
    finishGame();
  }
});

closeModal.addEventListener('click', () => {
  hideModal(dialogModal);
  dialogOpen = false;
});

rewardContinueBtn.addEventListener('click', () => {
  hideModal(rewardModal);
  dialogOpen = false;
  if (npcs.every((npc) => npc.answered)) {
    finishGame();
  }
});

playAgainBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);
actionBtn.addEventListener('click', interact);
talkBtn.addEventListener('click', interact);

function bindTouchButton(button, dir) {
  const activate = (event) => {
    event.preventDefault();
    keys[dir] = true;
  };

  const release = (event) => {
    event.preventDefault();
    keys[dir] = false;
  };

  button.addEventListener('touchstart', activate, { passive: false });
  button.addEventListener('touchend', release, { passive: false });
  button.addEventListener('touchcancel', release, { passive: false });
  button.addEventListener('mousedown', activate);
  button.addEventListener('mouseup', release);
  button.addEventListener('mouseleave', release);
}

document.querySelectorAll('[data-dir]').forEach((btn) => bindTouchButton(btn, btn.dataset.dir));

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') keys.up = true;
  if (key === 'arrowdown' || key === 's') keys.down = true;
  if (key === 'arrowleft' || key === 'a') keys.left = true;
  if (key === 'arrowright' || key === 'd') keys.right = true;
  if (event.key === ' ' || event.key === 'Enter') interact();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') keys.up = false;
  if (key === 'arrowdown' || key === 's') keys.down = false;
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
});

function drawTile(x, y, type) {
  switch (type) {
    case 1:
      ctx.fillStyle = '#8d2857';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6a1d41';
      ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      break;
    case 2:
      ctx.fillStyle = '#ffbfd6';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ff7aa8';
      ctx.fillRect(x + 11, y + 11, 10, 10);
      ctx.fillStyle = '#fff0f6';
      ctx.fillRect(x + 13, y + 9, 6, 14);
      ctx.fillRect(x + 9, y + 13, 14, 6);
      break;
    case 3:
      ctx.fillStyle = '#f6d7b0';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#dba15f';
      ctx.fillRect(x, y + 12, TILE, 8);
      break;
    case 4:
      ctx.fillStyle = '#ff95b8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ffc6d9';
      ctx.fillRect(x + 2, y + 4, TILE - 4, 8);
      break;
    case 5:
      ctx.fillStyle = '#ffbfd6';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#a75a7a';
      ctx.fillRect(x + 10, y + 8, 12, 16);
      ctx.fillStyle = '#ff7aa8';
      ctx.fillRect(x + 6, y + 4, 20, 8);
      break;
    case 6:
      ctx.fillStyle = '#ffdce8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#fff4f8';
      ctx.fillRect(x + 8, y + 8, 16, 16);
      ctx.fillStyle = '#ff6f9f';
      ctx.fillRect(x + 12, y + 12, 8, 8);
      break;
    default:
      ctx.fillStyle = '#ffc6d9';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#ffd8e6';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  }
}

function drawNpc(npc) {
  ctx.fillStyle = '#592138';
  ctx.fillRect(npc.x - 11, npc.y - 10, 22, 22);
  ctx.fillStyle = npc.color;
  ctx.fillRect(npc.x - 9, npc.y - 8, 18, 18);
  ctx.fillStyle = '#fff0d9';
  ctx.fillRect(npc.x - 5, npc.y - 14, 10, 8);

  if (!npc.answered) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(npc.x - 4, npc.y - 26, 8, 8);
    ctx.fillStyle = '#ff6f9f';
    ctx.fillRect(npc.x - 2, npc.y - 28, 4, 12);
    ctx.fillRect(npc.x - 6, npc.y - 24, 12, 4);
  }
}

function drawPlayer() {
  ctx.fillStyle = '#53233a';
  ctx.fillRect(player.x - 11, player.y - 10, 22, 22);
  ctx.fillStyle = '#8ec5ff';
  ctx.fillRect(player.x - 9, player.y - 8, 18, 18);
  ctx.fillStyle = '#fff0d9';
  ctx.fillRect(player.x - 5, player.y - 14, 10, 8);

  ctx.fillStyle = '#fff';
  if (player.direction === 'up') ctx.fillRect(player.x - 2, player.y - 20, 4, 4);
  if (player.direction === 'down') ctx.fillRect(player.x - 2, player.y + 10, 4, 4);
  if (player.direction === 'left') ctx.fillRect(player.x - 20, player.y - 2, 4, 4);
  if (player.direction === 'right') ctx.fillRect(player.x + 16, player.y - 2, 4, 4);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      drawTile(col * TILE, row * TILE, map[row][col]);
    }
  }

  npcs.forEach(drawNpc);
  drawPlayer();

  const npc = nearestNpc();
  if (npc && !dialogOpen && npc !== lastHintNpc && !npc.answered) {
    hintEl.textContent = `${npc.name} ist in der Nähe. Tippe auf „Aktion ♥“ oder „Sprechen“.`;
    lastHintNpc = npc;
  } else if (!npc) {
    lastHintNpc = null;
  }

  movePlayer();
  window.requestAnimationFrame(render);
}

resetGame();
render();
