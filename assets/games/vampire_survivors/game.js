const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === 1. 게임 설정 (Config) ===
const GAME_CONFIG = {
    playerSpeed: 4,
    playerRadius: 10,
    joystickRadius: 50,
    enemySpeed: 2,
    enemyRadius: 8,
    enemySpawnRate: 30, // 프레임 단위 (60 = 1초에 한번)
    maxEnemies: 100     // 화면에 존재할 수 있는 최대 적 수 (풀링 제한)
};

// === 2. 상태 변수들 ===
let frameCount = 0;

// 카메라 (화면의 좌상단이 월드의 어디를 비추고 있는지)
const camera = { x: 0, y: 0 };

// 플레이어 (월드 좌표 기준)
const player = {
    x: 0, 
    y: 0,
    color: '#00ff00' 
};

// 적 목록 (Object Pooling을 위한 배열)
const enemies = []; 

// 입력 상태
const input = {
    keys: {},
    touch: { active: false, startX: 0, startY: 0, currX: 0, currY: 0 }
};

// === 3. 초기화 ===
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // 적 객체 미리 생성 (풀링 초기화)
    for(let i=0; i<GAME_CONFIG.maxEnemies; i++) {
        enemies.push({
            active: false,
            x: 0,
            y: 0,
            color: 'red'
        });
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// === 4. 적 관련 로직 (Spawning & AI) ===
function spawnEnemy() {
    // 비활성화된 적 하나를 찾아서 활성화 (재사용)
    const enemy = enemies.find(e => !e.active);
    if (!enemy) return; // 풀이 꽉 찼으면 생성 안 함

    // 화면 바깥 랜덤 위치 계산
    const angle = Math.random() * Math.PI * 2;
    // 화면 대각선 길이보다 조금 더 멀리 생성
    const distance = Math.sqrt(canvas.width**2 + canvas.height**2) / 2 + 50;
    
    enemy.x = player.x + Math.cos(angle) * distance;
    enemy.y = player.y + Math.sin(angle) * distance;
    enemy.active = true;
}

function updateEnemies() {
    // 스폰 타이머
    if (frameCount % GAME_CONFIG.enemySpawnRate === 0) {
        spawnEnemy();
    }

    enemies.forEach(enemy => {
        if (!enemy.active) return;

        // 플레이어를 향해 이동 (추적 AI)
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 0) {
            enemy.x += (dx / dist) * GAME_CONFIG.enemySpeed;
            enemy.y += (dy / dist) * GAME_CONFIG.enemySpeed;
        }

        // 충돌 체크 (플레이어와 닿으면? 지금은 그냥 콘솔만 찍음)
        // const distToPlayer = dist; 
        // if (distToPlayer < GAME_CONFIG.playerRadius + GAME_CONFIG.enemyRadius) {
        //     console.log("아야!");
        // }
        
        // 너무 멀어지면 비활성화 (메모리 절약)
        if (dist > 2000) enemy.active = false;
    });
}

// === 5. 입력 이벤트 (이전과 동일) ===
window.addEventListener('keydown', (e) => input.keys[e.code] = true);
window.addEventListener('keyup', (e) => input.keys[e.code] = false);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    input.touch.active = true;
    input.touch.startX = touch.clientX;
    input.touch.startY = touch.clientY;
    input.touch.currX = touch.clientX;
    input.touch.currY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!input.touch.active) return;
    const touch = e.touches[0];
    input.touch.currX = touch.clientX;
    input.touch.currY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    input.touch.active = false;
}, { passive: false });


// === 6. 메인 업데이트 ===
function update() {
    frameCount++;

    // --- 플레이어 이동 계산 ---
    let dx = 0;
    let dy = 0;

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
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            // 시각적 조이스틱 제한
            if (dist > GAME_CONFIG.joystickRadius) {
                input.touch.currX = input.touch.startX + Math.cos(angle) * GAME_CONFIG.joystickRadius;
                input.touch.currY = input.touch.startY + Math.sin(angle) * GAME_CONFIG.joystickRadius;
            }
        }
    }

    if ((dx !== 0 || dy !== 0) && !input.touch.active) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len; dy /= len;
    }

    player.x += dx * GAME_CONFIG.playerSpeed;
    player.y += dy * GAME_CONFIG.playerSpeed;

    // --- 카메라 업데이트 ---
    // 플레이어가 항상 화면 중앙에 오도록 카메라 위치 조정
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // --- 적 업데이트 ---
    updateEnemies();
}

// === 7. 메인 그리기 ===
function draw() {
    // 배경
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 격자 (무한 배경 효과)
    drawGrid();

    // 플레이어 그리기 (화면 중앙 = 플레이어 월드좌표 - 카메라좌표)
    // 사실상 (canvas.width/2, canvas.height/2) 위치에 그려짐
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, GAME_CONFIG.playerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 적 그리기
    enemies.forEach(enemy => {
        if (!enemy.active) return;
        // 월드 좌표 -> 스크린 좌표 변환
        const eScreenX = enemy.x - camera.x;
        const eScreenY = enemy.y - camera.y;

        // 화면 안에 있을 때만 그리기 (최적화)
        if (eScreenX < -50 || eScreenX > canvas.width + 50 || 
            eScreenY < -50 || eScreenY > canvas.height + 50) return;

        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(eScreenX, eScreenY, GAME_CONFIG.enemyRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 조이스틱 (UI는 카메라 영향을 받지 않음)
    if (input.touch.active) {
        drawJoystick();
    }
}

function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 100;

    // 카메라 위치에 따른 격자 오프셋 계산 (모듈러 연산)
    const offsetX = -camera.x % gridSize;
    const offsetY = -camera.y % gridSize;

    // 화면 크기보다 여유있게 반복
    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
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

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// 시작
init();
loop();