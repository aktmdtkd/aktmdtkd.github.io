const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === 1. 게임 설정 (Config) ===
const GAME_CONFIG = {
    playerSpeed: 3,
    playerRadius: 10,
    playerMaxHp: 100,
    
    // 공격 관련
    attackCooldown: 30, // 0.5초 (60fps 기준)
    bulletSpeed: 7,
    bulletRadius: 4,
    bulletDamage: 35,
    
    // 적 관련
    enemySpeed: 1.5,
    enemyRadius: 10,
    enemyMaxHp: 100,
    enemySpawnRate: 30,
    maxEnemies: 100,

    // 아이템 관련
    gemRadius: 5,
    magnetRadius: 100, // 자석 범위
    
    joystickRadius: 50
};

// === 2. 상태 변수 및 객체 풀 ===
let frameCount = 0;
let score = 0;

const camera = { x: 0, y: 0 };

const player = {
    x: 0, y: 0,
    hp: GAME_CONFIG.playerMaxHp,
    xp: 0,
    level: 1,
    nextLevelXp: 100,
    attackTimer: 0,
    color: '#00ff00' 
};

// 객체 풀링 (Pooling)
const enemies = []; 
const bullets = [];
const gems = []; // 경험치 보석

const input = {
    keys: {},
    touch: { active: false, startX: 0, startY: 0, currX: 0, currY: 0 }
};

// === 3. 초기화 ===
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // 객체 풀 미리 생성
    for(let i=0; i<GAME_CONFIG.maxEnemies; i++) createObj(enemies);
    for(let i=0; i<50; i++) createObj(bullets);
    for(let i=0; i<100; i++) createObj(gems);

    // 플레이어 초기화
    resetGame();
}

function createObj(pool) {
    pool.push({ active: false, x: 0, y: 0 });
}

function resetGame() {
    player.hp = GAME_CONFIG.playerMaxHp;
    player.xp = 0;
    player.level = 1;
    player.nextLevelXp = 100;
    score = 0;
    
    // 모든 객체 비활성화
    enemies.forEach(e => e.active = false);
    bullets.forEach(b => b.active = false);
    gems.forEach(g => g.active = false);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// === 4. 게임 로직 (Update) ===

// 거리 계산 유틸
function getDist(o1, o2) {
    return Math.sqrt((o1.x - o2.x)**2 + (o1.y - o2.y)**2);
}

function update() {
    frameCount++;

    // A. 플레이어 이동
    handlePlayerMove();

    // B. 카메라 업데이트
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // C. 자동 공격 (가장 가까운 적 찾기)
    if (player.attackTimer > 0) player.attackTimer--;
    else {
        let nearestEnemy = null;
        let minDist = Infinity;

        enemies.forEach(e => {
            if (!e.active) return;
            const dist = getDist(player, e);
            // 화면 안에 있는 적만 공격 대상 (너무 멀면 공격 X)
            if (dist < canvas.width/2 && dist < minDist) {
                minDist = dist;
                nearestEnemy = e;
            }
        });

        if (nearestEnemy) {
            fireBullet(nearestEnemy);
            player.attackTimer = GAME_CONFIG.attackCooldown; // 쿨타임 초기화
        }
    }

    // D. 객체 업데이트
    updateBullets();
    updateEnemies();
    updateGems();
    
    // E. 게임 오버 체크
    if (player.hp <= 0) {
        alert(`Game Over! Lv.${player.level} Score: ${score}`);
        resetGame();
    }
}

// 플레이어 이동 로직
function handlePlayerMove() {
    let dx = 0, dy = 0;
    // PC
    if (input.keys['ArrowUp'] || input.keys['KeyW']) dy -= 1;
    if (input.keys['ArrowDown'] || input.keys['KeyS']) dy += 1;
    if (input.keys['ArrowLeft'] || input.keys['KeyA']) dx -= 1;
    if (input.keys['ArrowRight'] || input.keys['KeyD']) dx += 1;
    // Mobile
    if (input.touch.active) {
        const tdx = input.touch.currX - input.touch.startX;
        const tdy = input.touch.currY - input.touch.startY;
        const dist = Math.sqrt(tdx*tdx + tdy*tdy);
        if (dist > 0) {
            const angle = Math.atan2(tdy, tdx);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            if (dist > GAME_CONFIG.joystickRadius) {
                input.touch.currX = input.touch.startX + Math.cos(angle) * GAME_CONFIG.joystickRadius;
                input.touch.currY = input.touch.startY + Math.sin(angle) * GAME_CONFIG.joystickRadius;
            }
        }
    }
    // Normalize
    if ((dx !== 0 || dy !== 0) && !input.touch.active) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len; dy /= len;
    }
    player.x += dx * GAME_CONFIG.playerSpeed;
    player.y += dy * GAME_CONFIG.playerSpeed;
}

// 총알 발사 및 이동
function fireBullet(target) {
    const b = bullets.find(b => !b.active);
    if (!b) return;

    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    b.active = true;
    b.x = player.x;
    b.y = player.y;
    b.vx = Math.cos(angle) * GAME_CONFIG.bulletSpeed;
    b.vy = Math.sin(angle) * GAME_CONFIG.bulletSpeed;
    b.life = 60; // 1초 뒤 사라짐
}

function updateBullets() {
    bullets.forEach(b => {
        if (!b.active) return;
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life <= 0) b.active = false;
    });
}

// 적 생성, 이동, 충돌 처리
function updateEnemies() {
    // 스폰
    if (frameCount % GAME_CONFIG.enemySpawnRate === 0) {
        const e = enemies.find(e => !e.active);
        if (e) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(canvas.width, canvas.height) / 2 + 50;
            e.active = true;
            e.x = player.x + Math.cos(angle) * dist;
            e.y = player.y + Math.sin(angle) * dist;
            e.hp = GAME_CONFIG.enemyMaxHp;
            e.maxHp = GAME_CONFIG.enemyMaxHp; // 체력바 표시용
        }
    }

    enemies.forEach(e => {
        if (!e.active) return;

        // 플레이어 추적
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
            e.x += (dx / dist) * GAME_CONFIG.enemySpeed;
            e.y += (dy / dist) * GAME_CONFIG.enemySpeed;
        }

        // 플레이어와 충돌 (데미지)
        if (dist < GAME_CONFIG.playerRadius + GAME_CONFIG.enemyRadius) {
            player.hp -= 0.5; // 프레임당 데미지
        }

        // 총알과 충돌 체크
        bullets.forEach(b => {
            if (!b.active) return;
            const bDist = getDist(b, e);
            if (bDist < GAME_CONFIG.enemyRadius + GAME_CONFIG.bulletRadius) {
                // 히트!
                e.hp -= GAME_CONFIG.bulletDamage;
                b.active = false; // 총알 소멸
                
                // 넉백 효과 (뒤로 살짝 밀림)
                e.x -= b.vx * 2;
                e.y -= b.vy * 2;

                // 적 사망
                if (e.hp <= 0) {
                    e.active = false;
                    score += 10;
                    spawnGem(e.x, e.y); // 보석 드랍
                }
            }
        });

        if (getDist(player, e) > 2000) e.active = false;
    });
}

// 보석 생성 및 획득
function spawnGem(x, y) {
    const g = gems.find(g => !g.active);
    if (!g) return;
    g.active = true;
    g.x = x;
    g.y = y;
}

function updateGems() {
    gems.forEach(g => {
        if (!g.active) return;
        
        const dist = getDist(player, g);

        // 자석 효과 (일정 범위 안에 들어오면 빨려옴)
        if (dist < GAME_CONFIG.magnetRadius) {
            g.x += (player.x - g.x) * 0.1; // 0.1의 힘으로 빨려옴
            g.y += (player.y - g.y) * 0.1;
        }

        // 획득 판정
        if (dist < GAME_CONFIG.playerRadius + GAME_CONFIG.gemRadius) {
            g.active = false;
            gainXp(10);
        }
    });
}

function gainXp(amount) {
    player.xp += amount;
    if (player.xp >= player.nextLevelXp) {
        player.level++;
        player.xp -= player.nextLevelXp;
        player.nextLevelXp = Math.floor(player.nextLevelXp * 1.2); // 필요 경험치 증가
        
        // 레벨업 보상 (단순화: 공격속도 빨라짐)
        GAME_CONFIG.attackCooldown = Math.max(5, GAME_CONFIG.attackCooldown - 2);
        
        // 체력 회복
        player.hp = Math.min(player.hp + 20, GAME_CONFIG.playerMaxHp);
    }
}

// === 5. 입력 이벤트 (PC/모바일 통합) ===
window.addEventListener('keydown', (e) => input.keys[e.code] = true);
window.addEventListener('keyup', (e) => input.keys[e.code] = false);
function handleStart(x, y) {
    input.touch.active = true;
    input.touch.startX = x; input.touch.startY = y;
    input.touch.currX = x; input.touch.currY = y;
    // PC에서 키보드 포커스 잡기 위함
    window.focus(); 
}
function handleMove(x, y) {
    if (!input.touch.active) return;
    input.touch.currX = x; input.touch.currY = y;
}
function handleEnd() { input.touch.active = false; }
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(); }, { passive: false });
canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
window.addEventListener('mouseup', (e) => handleEnd());


// === 6. 그리기 (Draw) ===
function draw() {
    // 배경
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // 1. 경험치 보석 (파란색 다이아몬드)
    gems.forEach(g => {
        if (!g.active) return;
        const sx = g.x - camera.x, sy = g.y - camera.y;
        if(isOffScreen(sx, sy)) return;
        
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.rect(sx - 3, sy - 3, 6, 6);
        ctx.fill();
    });

    // 2. 적
    enemies.forEach(e => {
        if (!e.active) return;
        const sx = e.x - camera.x, sy = e.y - camera.y;
        if(isOffScreen(sx, sy)) return;

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(sx, sy, GAME_CONFIG.enemyRadius, 0, Math.PI*2);
        ctx.fill();
        
        // 적 체력바 (작게)
        ctx.fillStyle = '#550000';
        ctx.fillRect(sx - 10, sy - 15, 20, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(sx - 10, sy - 15, 20 * (e.hp / e.maxHp), 4);
    });

    // 3. 총알 (노란색)
    bullets.forEach(b => {
        if (!b.active) return;
        const sx = b.x - camera.x, sy = b.y - camera.y;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(sx, sy, GAME_CONFIG.bulletRadius, 0, Math.PI*2);
        ctx.fill();
    });

    // 4. 플레이어
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, py, GAME_CONFIG.playerRadius, 0, Math.PI*2);
    ctx.fill();

    // 5. 조이스틱
    if (input.touch.active) drawJoystick();

    // 6. UI (HUD) - 카메라 영향 안받음
    drawUI();
}

function isOffScreen(x, y) {
    return x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50;
}

function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const sz = 100;
    const ox = -camera.x % sz, oy = -camera.y % sz;
    for (let x = ox; x < canvas.width; x += sz) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = oy; y < canvas.height; y += sz) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawJoystick() {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.arc(input.touch.startX, input.touch.startY, GAME_CONFIG.joystickRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.arc(input.touch.currX, input.touch.currY, 15, 0, Math.PI * 2);
    ctx.fill();
}

function drawUI() {
    // 상단 경험치 바
    const xpPercent = player.xp / player.nextLevelXp;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, 20); // 배경
    ctx.fillStyle = '#0000ff'; // 파란색 XP
    ctx.fillRect(0, 0, canvas.width * xpPercent, 20);
    
    // 레벨 텍스트
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv. ${player.level}`, canvas.width / 2, 15);

    // 하단 체력 바
    const hpPercent = Math.max(0, player.hp / GAME_CONFIG.playerMaxHp);
    ctx.fillStyle = '#330000'; // 배경
    ctx.fillRect(canvas.width/2 - 100, canvas.height - 40, 200, 20);
    ctx.fillStyle = '#ff0000'; // 빨간색 HP
    ctx.fillRect(canvas.width/2 - 100, canvas.height - 40, 200 * hpPercent, 20);
    
    // 점수
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${score}`, canvas.width - 20, 50);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start
init();
loop();