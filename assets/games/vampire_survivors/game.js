const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === DOM Elements ===
const ui = {
    start: document.getElementById('start-screen'),
    gameover: document.getElementById('gameover-screen'),
    levelup: document.getElementById('levelup-screen'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    upgradeContainer: document.getElementById('upgrade-container'),
    xpBar: document.getElementById('xp-bar'),
    hpBar: document.getElementById('hp-bar'),
    hpText: document.getElementById('hp-text'),
    lvText: document.getElementById('level-display'),
    scoreText: document.getElementById('score-display'),
    finalScore: document.getElementById('final-score')
};

// === Game State ===
let gameState = 'START'; 

// === Config (난이도 조절 변수들) ===
// 이 값들은 게임 시작 시 초기화되고, 레벨업 할 때마다 변합니다.
const GAME_CONFIG = {
    playerSpeed: 3, playerRadius: 10, playerMaxHp: 100,
    bulletSpeed: 7, bulletRadius: 4, bulletDamage: 20, attackCooldown: 40,
    
    // 적 관련 (초기값 - 매우 쉽게 설정)
    enemySpeed: 1.5, enemyRadius: 10, 
    enemyMaxHp: 10,       // 초기 체력 10
    enemySpawnRate: 60,   // 초기 스폰 속도 (느림)
    maxEnemies: 20,       // 초기 최대 마리수 (적음)
    
    gemRadius: 5, magnetRadius: 100, joystickRadius: 50
};

const POOL_SIZE = 300; // 적이 늘어날 것을 대비해 객체 풀은 넉넉하게 잡음

// 업그레이드 목록
const UPGRADES = [
    { type: 'might', title: '공격력 증가', desc: '데미지 +10', apply: () => GAME_CONFIG.bulletDamage += 10 },
    { type: 'haste', title: '공격 속도', desc: '쿨타임 -10%', apply: () => GAME_CONFIG.attackCooldown = Math.max(5, GAME_CONFIG.attackCooldown * 0.9) },
    { type: 'speed', title: '이동 속도', desc: '이동속도 +10%', apply: () => GAME_CONFIG.playerSpeed *= 1.1 },
    { type: 'magnet', title: '자석 범위', desc: '획득 범위 +20%', apply: () => GAME_CONFIG.magnetRadius *= 1.2 },
    { type: 'heal', title: '체력 회복', desc: '체력 30 회복', apply: () => player.hp = Math.min(player.hp + 30, GAME_CONFIG.playerMaxHp) },
    { type: 'maxHp', title: '최대 체력', desc: '최대 체력 +20', apply: () => { GAME_CONFIG.playerMaxHp += 20; player.hp += 20; } }
];

// === Objects ===
let frameCount = 0;
let score = 0;
const camera = { x: 0, y: 0 };
const player = { x: 0, y: 0, hp: 100, xp: 0, level: 1, nextLevelXp: 50, attackTimer: 0, color: '#00ff00' };
const enemies = [], bullets = [], gems = [];
const input = { keys: {}, touch: { active: false, startX: 0, startY: 0, currX: 0, currY: 0 } };

// === Init ===
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // 객체 풀 생성 (최대치만큼 미리 생성)
    for(let i=0; i<POOL_SIZE; i++) enemies.push({ active: false, x:0, y:0 });
    for(let i=0; i<50; i++) bullets.push({ active: false, x:0, y:0 });
    for(let i=0; i<200; i++) gems.push({ active: false, x:0, y:0 });

    ui.startBtn.addEventListener('click', startGame);
    ui.restartBtn.addEventListener('click', startGame);
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

function startGame() {
    // === 난이도 초기화 (쉽게 시작) ===
    GAME_CONFIG.attackCooldown = 40; 
    GAME_CONFIG.bulletDamage = 20;
    GAME_CONFIG.playerSpeed = 3;
    GAME_CONFIG.magnetRadius = 100;
    GAME_CONFIG.playerMaxHp = 100;
    
    GAME_CONFIG.enemyMaxHp = 10;
    GAME_CONFIG.enemySpawnRate = 60;
    GAME_CONFIG.maxEnemies = 20;

    // 플레이어 초기화
    player.hp = 100; player.xp = 0; player.level = 1; player.nextLevelXp = 50;
    score = 0;
    frameCount = 0;

    enemies.forEach(e => e.active = false);
    bullets.forEach(b => b.active = false);
    gems.forEach(g => g.active = false);
    player.x = 0; player.y = 0;

    ui.start.classList.remove('active');
    ui.gameover.classList.remove('active');
    gameState = 'PLAYING';
    updateHUD();
}

// === Game Logic ===
function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    handlePlayerMove();
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // 자동 공격
    if (player.attackTimer > 0) player.attackTimer--;
    else {
        let target = null, minDist = Infinity;
        enemies.forEach(e => {
            if (!e.active) return;
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < canvas.width/2 + 100 && d < minDist) { minDist = d; target = e; }
        });
        if (target) {
            fireBullet(target);
            player.attackTimer = GAME_CONFIG.attackCooldown;
        }
    }

    updateBullets();
    updateEnemies();
    updateGems();
    updateHUD();

    if (player.hp <= 0) gameOver();
}

function handlePlayerMove() {
    let dx = 0, dy = 0;
    if (input.keys['ArrowUp'] || input.keys['KeyW']) dy -= 1;
    if (input.keys['ArrowDown'] || input.keys['KeyS']) dy += 1;
    if (input.keys['ArrowLeft'] || input.keys['KeyA']) dx -= 1;
    if (input.keys['ArrowRight'] || input.keys['KeyD']) dx += 1;

    if (input.touch.active) {
        const tdx = input.touch.currX - input.touch.startX;
        const tdy = input.touch.currY - input.touch.startY;
        const dist = Math.sqrt(tdx*tdx + tdy*tdy);
        if (dist > 0) {
            const angle = Math.atan2(tdy, tdx);
            dx = Math.cos(angle); dy = Math.sin(angle);
            if (dist > GAME_CONFIG.joystickRadius) {
                input.touch.currX = input.touch.startX + Math.cos(angle) * GAME_CONFIG.joystickRadius;
                input.touch.currY = input.touch.startY + Math.sin(angle) * GAME_CONFIG.joystickRadius;
            }
        }
    }
    if ((dx || dy) && !input.touch.active) {
        const l = Math.hypot(dx, dy);
        dx/=l; dy/=l;
    }
    player.x += dx * GAME_CONFIG.playerSpeed;
    player.y += dy * GAME_CONFIG.playerSpeed;
}

function fireBullet(target) {
    const b = bullets.find(x => !x.active);
    if (!b) return;
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    b.active = true; b.x = player.x; b.y = player.y; b.life = 60;
    b.vx = Math.cos(a) * GAME_CONFIG.bulletSpeed;
    b.vy = Math.sin(a) * GAME_CONFIG.bulletSpeed;
}

function updateBullets() {
    bullets.forEach(b => {
        if (!b.active) return;
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.life <= 0) b.active = false;
    });
}

function updateEnemies() {
    // === 난이도 반영: 동적 스폰 ===
    // 적의 현재 수가 설정된 최대치(maxEnemies)보다 적을 때만 생성
    const activeCount = enemies.filter(e => e.active).length;
    
    if (activeCount < GAME_CONFIG.maxEnemies && frameCount % GAME_CONFIG.enemySpawnRate === 0) {
        const e = enemies.find(x => !x.active);
        if (e) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.max(canvas.width, canvas.height)/2 + 50;
            e.active = true; 
            e.x = player.x + Math.cos(a)*r; 
            e.y = player.y + Math.sin(a)*r;
            // 현재 난이도에 맞는 체력 부여
            e.hp = GAME_CONFIG.enemyMaxHp; 
            e.maxHp = GAME_CONFIG.enemyMaxHp;
        }
    }

    enemies.forEach(e => {
        if (!e.active) return;
        const dx = player.x - e.x, dy = player.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) { e.x += (dx/d)*GAME_CONFIG.enemySpeed; e.y += (dy/d)*GAME_CONFIG.enemySpeed; }
        
        if (d < GAME_CONFIG.playerRadius + GAME_CONFIG.enemyRadius) player.hp -= 0.5;

        bullets.forEach(b => {
            if (!b.active) return;
            if (Math.hypot(b.x - e.x, b.y - e.y) < GAME_CONFIG.enemyRadius + GAME_CONFIG.bulletRadius) {
                e.hp -= GAME_CONFIG.bulletDamage; b.active = false;
                e.x -= b.vx * 1.5; e.y -= b.vy * 1.5; // 넉백
                if (e.hp <= 0) {
                    e.active = false; score += 10;
                    const g = gems.find(x => !x.active);
                    if(g) { g.active=true; g.x=e.x; g.y=e.y; }
                }
            }
        });
        if (d > 2000) e.active = false;
    });
}

function updateGems() {
    gems.forEach(g => {
        if (!g.active) return;
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        if (d < GAME_CONFIG.magnetRadius) {
            g.x += (player.x - g.x)*0.15; g.y += (player.y - g.y)*0.15;
        }
        if (d < GAME_CONFIG.playerRadius + GAME_CONFIG.gemRadius) {
            g.active = false;
            gainXp(20);
        }
    });
}

function gainXp(amount) {
    player.xp += amount;
    if (player.xp >= player.nextLevelXp) {
        player.xp -= player.nextLevelXp;
        player.level++;
        player.nextLevelXp = Math.floor(player.nextLevelXp * 1.3);
        
        // === 난이도 상승 (Dynamic Difficulty) ===
        // 레벨업 할 때마다 적들이 더 강해지고 많아짐
        GAME_CONFIG.maxEnemies = Math.min(POOL_SIZE, GAME_CONFIG.maxEnemies + 5); // 최대 적 수 5 증가
        GAME_CONFIG.enemySpawnRate = Math.max(10, GAME_CONFIG.enemySpawnRate - 2); // 스폰 속도 빨라짐
        GAME_CONFIG.enemyMaxHp += 10; // 적 체력 10 증가
        
        showLevelUp();
    }
}

function showLevelUp() {
    gameState = 'LEVEL_UP';
    ui.levelup.classList.add('active');
    ui.upgradeContainer.innerHTML = ''; 

    const choices = [];
    while(choices.length < 3) {
        const pick = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
        choices.push(pick);
    }

    choices.forEach(u => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<span class="upgrade-title">${u.title}</span><span class="upgrade-desc">${u.desc}</span>`;
        card.onclick = () => {
            u.apply();
            ui.levelup.classList.remove('active');
            gameState = 'PLAYING';
            input.touch.active = false;
        };
        ui.upgradeContainer.appendChild(card);
    });
}

function gameOver() {
    gameState = 'GAME_OVER';
    ui.finalScore.innerText = `Score: ${score} (Lv.${player.level})`;
    ui.gameover.classList.add('active');
}

function updateHUD() {
    ui.xpBar.style.width = `${(player.xp / player.nextLevelXp) * 100}%`;
    ui.hpBar.style.width = `${Math.max(0, player.hp / GAME_CONFIG.playerMaxHp) * 100}%`;
    ui.hpText.innerText = `${Math.ceil(player.hp)} / ${GAME_CONFIG.playerMaxHp}`;
    ui.lvText.innerText = `Lv. ${player.level}`;
    ui.scoreText.innerText = `Score: ${score}`;
}

function draw() {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; const sz=100;
    const ox = -camera.x % sz, oy = -camera.y % sz;
    for (let x=ox; x<canvas.width; x+=sz) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for (let y=oy; y<canvas.height; y+=sz) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

    // Gems
    gems.forEach(g => { if(g.active) { 
        const sx=g.x-camera.x, sy=g.y-camera.y; if(onScreen(sx,sy)){ ctx.fillStyle='#00ffff'; ctx.fillRect(sx-3,sy-3,6,6); } 
    }});
    
    // Enemies
    enemies.forEach(e => { if(e.active) { 
        const sx=e.x-camera.x, sy=e.y-camera.y; 
        if(onScreen(sx,sy)){ 
            // 적 본체
            ctx.fillStyle='red'; 
            ctx.beginPath(); ctx.arc(sx,sy,GAME_CONFIG.enemyRadius,0,Math.PI*2); ctx.fill(); 
            
            // === 적 체력바 추가 ===
            const hpPct = e.hp / e.maxHp;
            ctx.fillStyle = '#330000'; // 배경 (어두운 빨강)
            ctx.fillRect(sx - 10, sy - 18, 20, 4);
            ctx.fillStyle = '#ff0000'; // 현재 체력 (밝은 빨강)
            ctx.fillRect(sx - 10, sy - 18, 20 * hpPct, 4);
        } 
    }});

    // Bullets
    bullets.forEach(b => { if(b.active) {
        const sx=b.x-camera.x, sy=b.y-camera.y; if(onScreen(sx,sy)){
            ctx.fillStyle='yellow'; ctx.beginPath(); ctx.arc(sx,sy,GAME_CONFIG.bulletRadius,0,Math.PI*2); ctx.fill();
        }
    }});
    
    // Player
    if(gameState !== 'GAME_OVER') {
        const px = player.x - camera.x, py = player.y - camera.y;
        ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(px,py,GAME_CONFIG.playerRadius,0,Math.PI*2); ctx.fill();
    }

    // Joystick
    if (input.touch.active && gameState === 'PLAYING') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(input.touch.startX, input.touch.startY, GAME_CONFIG.joystickRadius, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(input.touch.currX, input.touch.currY, 15, 0, Math.PI*2); ctx.fill();
    }
}

function onScreen(x, y) { return x>-50 && x<canvas.width+50 && y>-50 && y<canvas.height+50; }

function loop() { update(); draw(); requestAnimationFrame(loop); }

// Inputs
window.addEventListener('keydown', e => input.keys[e.code]=true);
window.addEventListener('keyup', e => input.keys[e.code]=false);
function handleStart(x,y){ if(gameState!=='PLAYING')return; input.touch.active=true; input.touch.startX=x; input.touch.startY=y; input.touch.currX=x; input.touch.currY=y; window.focus(); }
function handleMove(x,y){ if(!input.touch.active)return; input.touch.currX=x; input.touch.currY=y; }
function handleEnd(){ input.touch.active=false; }
canvas.addEventListener('touchstart',e=>{e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY)},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY)},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault(); handleEnd()},{passive:false});
canvas.addEventListener('mousedown',e=>handleStart(e.clientX,e.clientY));
window.addEventListener('mousemove',e=>handleMove(e.clientX,e.clientY));
window.addEventListener('mouseup',e=>handleEnd());

init();
loop();