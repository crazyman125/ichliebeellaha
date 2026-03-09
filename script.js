const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const talkCount = document.getElementById('talkCount');
const heartCount = document.getElementById('heartCount');
const hint = document.getElementById('hint');
const answerForm = document.getElementById('answerForm');
const answerList = document.getElementById('answerList');
const dialogText = document.getElementById('dialogText');
const questionText = document.getElementById('questionText');
const dialogOverlay = document.getElementById('dialogOverlay');
const rewardOverlay = document.getElementById('rewardOverlay');
const rewardHearts = document.getElementById('rewardHearts');
const rewardTitle = document.getElementById('rewardTitle');
const rewardText = document.getElementById('rewardText');
const endOverlay = document.getElementById('endOverlay');
const endText = document.getElementById('endText');
const talkTriggers = [document.getElementById('talkBtn'), document.getElementById('talkFloating')];

const TILE = 32, COLS = 10, ROWS = 16, SPEED = 3;
const keys = {up:false,down:false,left:false,right:false};
let activeHeart = null;
let paused = false;
let rewardTimeout = null;

const hearts = [
  {id:'birthday',x:2,y:3,color:'#ff4f98',intro:'Mein Schatz, beginnen wir mit deinem besonderen Tag.',question:'Wann ist dein Geburtstag?',answers:['10.03.1993','10.03.1994','09.03.1993'],correct:0,reward:'Das erste Herz leuchtet für dich, Ellaha.'},
  {id:'date',x:7,y:8,color:'#ffcc62',intro:'Weißt du noch, wann unser erstes Date war?',question:'Wann war unser erstes Date?',answers:['14.06.2024','14.06.2025','24.08.2025'],correct:1,reward:'Das zweite Herz schlägt noch stärker. Ich erinnere mich so gern daran.'},
  {id:'wedding',x:5,y:12,color:'#fff3a5',intro:'Jetzt die schönste Erinnerung von allen.',question:'Wann haben wir geheiratet?',answers:['24.08.2024','14.06.2025','24.08.2025'],correct:2,reward:'Das dritte Herz ist vollständig. Du bist mein Zuhause.'}
];

const player = {x:5*TILE+16,y:14*TILE+16,size:18,dir:'up'};

function resetGame(){
  player.x = 5*TILE+16; player.y = 14*TILE+16; player.dir='up';
  hearts.forEach(h => {h.spoken=false; h.answered=false; h.correctlyAnswered=false; h.selected=null;});
  paused = false; activeHeart = null;
  hide(dialogOverlay); hide(rewardOverlay); hide(endOverlay);
  if (rewardTimeout) clearTimeout(rewardTimeout);
  updateHud();
  hint.textContent = 'Bewege Ellaha mit den Pfeilen und stelle dich auf ein Herz.';
}

function show(el){el.classList.remove('hidden')}
function hide(el){el.classList.add('hidden')}
function updateHud(){
  talkCount.textContent = `${hearts.filter(h=>h.spoken).length}/3`;
  heartCount.textContent = `${hearts.filter(h=>h.correctlyAnswered).length}/3`;
}

function bindMoveButton(btn, dir){
  const on = e => { e.preventDefault(); keys[dir]=true; stepMove(); };
  const off = e => { e.preventDefault(); keys[dir]=false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
}

document.querySelectorAll('[data-dir]').forEach(btn => bindMoveButton(btn, btn.dataset.dir));

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = true;
  if (k === 'arrowdown' || k === 's') keys.down = true;
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  if (k === 'arrowright' || k === 'd') keys.right = true;
  if (k === 'enter' || k === ' ') interact();
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
});

talkTriggers.forEach(btn => btn.addEventListener('click', interact));
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('closeDialog').addEventListener('click', () => { hide(dialogOverlay); paused = false; });
document.getElementById('playAgain').addEventListener('click', resetGame);

function nearbyHeart(){
  return hearts.find(h => Math.abs(player.x - (h.x*TILE+16)) < 24 && Math.abs(player.y - (h.y*TILE+16)) < 24) || null;
}

function interact(){
  if (paused && !dialogOverlay.classList.contains('hidden')) return;
  const heart = nearbyHeart();
  if (!heart){ hint.textContent = 'Stelle dich direkt auf ein Herz und tippe auf Sprechen.'; return; }
  activeHeart = heart;
  heart.spoken = true;
  updateHud();
  dialogText.textContent = `Kamal: ${heart.intro}`;
  questionText.textContent = heart.question;
  answerList.innerHTML = '';
  heart.answers.forEach((ans, i) => {
    const label = document.createElement('label');
    label.className = 'answer';
    label.innerHTML = `<input type="radio" name="answer" value="${i}" ${heart.selected===i?'checked':''}><span>${ans}</span>`;
    answerList.appendChild(label);
  });
  paused = true;
  show(dialogOverlay);
}

answerForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!activeHeart) return;
  const selected = new FormData(answerForm).get('answer');
  if (selected === null) { hint.textContent = 'Bitte wähle eine Antwort aus.'; return; }
  activeHeart.selected = Number(selected);
  activeHeart.answered = true;
  activeHeart.correctlyAnswered = activeHeart.selected === activeHeart.correct;
  hide(dialogOverlay);
  updateHud();
  if (activeHeart.correctlyAnswered) showReward(activeHeart); else {
    paused = false;
    hint.textContent = 'Fast richtig, mein Schatz. Geh zum nächsten Herz.';
    checkEnd();
  }
});

function showReward(heart){
  const count = hearts.filter(h => h.correctlyAnswered).length;
  rewardHearts.textContent = '💖'.repeat(count);
  rewardTitle.textContent = ['Erstes Herz gefunden!','Zweites Herz gefunden!','Drittes Herz gefunden!'][count-1];
  rewardText.textContent = `Kamal: ${heart.reward}`;
  show(rewardOverlay);
  rewardTimeout = setTimeout(() => { hide(rewardOverlay); paused = false; checkEnd(); }, 1600);
}

function checkEnd(){
  if (hearts.every(h => h.answered)){
    const count = hearts.filter(h => h.correctlyAnswered).length;
    endText.textContent = count === 3
      ? 'Du hast alle drei Erinnerungen richtig beantwortet. Alles Gute zum Geburtstag, meine Liebe. Ich liebe dich.'
      : `Du hast ${count} von 3 Erinnerungen richtig beantwortet und alle Herzen gefunden.`;
    paused = true;
    show(endOverlay);
  }
}

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function stepMove(){
  if (paused) return;
  if (keys.up) { player.y -= SPEED; player.dir = 'up'; }
  if (keys.down) { player.y += SPEED; player.dir = 'down'; }
  if (keys.left) { player.x -= SPEED; player.dir = 'left'; }
  if (keys.right) { player.x += SPEED; player.dir = 'right'; }
  player.x = clamp(player.x, 16, canvas.width - 16);
  player.y = clamp(player.y, 16, canvas.height - 16);
}

function drawBackground(){
  ctx.fillStyle = '#ffc7db';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      ctx.fillStyle = (r+c)%2===0 ? '#ffd9e8' : '#ffcfe0';
      ctx.fillRect(c*TILE, r*TILE, TILE, TILE);
      if ((r+c)%3===0) drawSmallHeart(c*TILE+16, r*TILE+14, 4, '#f7a8c4');
    }
  }
  ctx.fillStyle = '#fff2c8';
  ctx.fillRect(0, 96, canvas.width, 10);
  ctx.fillRect(0, 256, canvas.width, 10);
}

function drawSmallHeart(cx, cy, s, fill){
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy+s/2);
  ctx.bezierCurveTo(cx+s, cy-s, cx+s*2, cy+s/2, cx, cy+s*2);
  ctx.bezierCurveTo(cx-s*2, cy+s/2, cx-s, cy-s, cx, cy+s/2);
  ctx.fill();
}

function drawStation(heart){
  const x = heart.x*TILE+16, y = heart.y*TILE+16;
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI*2); ctx.fill();
  drawSmallHeart(x, y-4, 8, heart.color);
  if (!heart.answered){ ctx.fillStyle = '#ffffff'; ctx.fillRect(x-4, y-28, 8, 8); }
}

function drawPlayer(){
  const x = player.x, y = player.y;
  ctx.fillStyle = '#762041';
  ctx.fillRect(x-10, y-7, 20, 16);
  ctx.fillStyle = '#ff8fbb';
  ctx.fillRect(x-8, y-5, 16, 12);
  ctx.fillStyle = '#ffe9d9';
  ctx.fillRect(x-5, y-15, 10, 9);
  ctx.fillStyle = '#5b1530';
  ctx.fillRect(x-6, y-18, 12, 4);
  ctx.fillStyle = '#ffffff';
  if (player.dir === 'up') ctx.fillRect(x-2, y-20, 4, 3);
  if (player.dir === 'down') ctx.fillRect(x-2, y+9, 4, 3);
  if (player.dir === 'left') ctx.fillRect(x-18, y-2, 3, 4);
  if (player.dir === 'right') ctx.fillRect(x+15, y-2, 3, 4);
}

function loop(){
  stepMove();
  drawBackground();
  hearts.forEach(drawStation);
  drawPlayer();
  const near = nearbyHeart();
  if (near && !paused && rewardOverlay.classList.contains('hidden')) hint.textContent = `${near.id === 'birthday' ? 'Geburtstags' : near.id === 'date' ? 'Date' : 'Hochzeits'}-Herz erreicht. Tippe auf Sprechen.`;
  requestAnimationFrame(loop);
}

resetGame();
loop();
