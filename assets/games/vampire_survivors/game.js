const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === 1. 게임 상태 및 설정 ===
const GAME_CONFIG = {
    playerSpeed: 3,
    playerRadius: 10,
    joystickRadius: 50 // 조이스틱 최대 반경
};

// 플레이어 객체
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: '#00ff00' // 초록색 네모 (임시)
};

// 입력 상태
const input = {
    keys: {}, // 키보드 상태
    touch: {  // 터치 상태
        active: false,
        startX: 0,
        startY: 0,
        currX: 0,
        currY: 0
    }
};

// === 2. 초기화 및 리사이징 ===
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 플레이어를 화면 중앙에 배치 (처음 한 번만)
    if (player.x === 0 && player.y === 0) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
}
window.addEventListener('resize', resize);
resize();

// === 3. 입력 이벤트 핸들러 ===

// [PC] 키보드 입력
window.addEventListener('keydown', (e) => input.keys[e.code] = true);
window.addEventListener('keyup', (e) => input.keys[e.code] = false);

// [Mobile] 터치 입력 (플로팅 조이스틱)
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
    // 터치 끝나면 속도 0으로 초기화
    input.touch.currX = input.touch.startX;
    input.touch.currY = input.touch.startY;
}, { passive: false });


// === 4. 게임 루프 ===
function update() {
    let dx = 0;
    let dy = 0;

    // A. 키보드 입력 처리 (WASD or 화살표)
    if (input.keys['ArrowUp'] || input.keys['KeyW']) dy -= 1;
    if (input.keys['ArrowDown'] || input.keys['KeyS']) dy += 1;
    if (input.keys['ArrowLeft'] || input.keys['KeyA']) dx -= 1;
    if (input.keys['ArrowRight'] || input.keys['KeyD']) dx += 1;

    // B. 터치 입력 처리 (우선순위 높음 or 합산)
    if (input.touch.active) {
        const deltaX = input.touch.currX - input.touch.startX;
        const deltaY = input.touch.currY - input.touch.startY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 0) {
            // 조이스틱 범위 내로 정규화
            const angle = Math.atan2(deltaY, deltaX);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            
            // 시각적 조이스틱 제한 (로직엔 영향 X, 그리기용)
            if (distance > GAME_CONFIG.joystickRadius) {
                input.touch.currX = input.touch.startX + Math.cos(angle) * GAME_CONFIG.joystickRadius;
                input.touch.currY = input.touch.startY + Math.sin(angle) * GAME_CONFIG.joystickRadius;
            }
        }
    }

    // 벡터 정규화 (대각선 이동 속도 일정하게)
    if (dx !== 0 || dy !== 0) {
        // 키보드 입력일 경우 정규화 필요 (터치는 이미 cos/sin이라 괜찮음)
        if (!input.touch.active) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
    }

    // 플레이어 이동 적용
    player.x += dx * GAME_CONFIG.playerSpeed;
    player.y += dy * GAME_CONFIG.playerSpeed;
    
    // 화면 밖으로 나가지 않게 (임시: 무한맵 아님)
    // player.x = Math.max(player.playerRadius, Math.min(canvas.width - player.playerRadius, player.x));
    // player.y = Math.max(player.playerRadius, Math.min(canvas.height - player.playerRadius, player.y));
}

function draw() {
    // 배경 지우기
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 격자 그리기 (이동 확인용)
    drawGrid();

    // 플레이어 그리기
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, GAME_CONFIG.playerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 조이스틱 그리기 (터치 중일 때만)
    if (input.touch.active) {
        drawJoystick();
    }
}

function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // 배경이 움직이는 느낌을 주기 위해 오프셋 계산 (카메라가 없으므로 지금은 고정)
    // * 2단계에서 '카메라' 개념이 추가되면 격자가 반대로 움직여야 함
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawJoystick() {
    // 조이스틱 배경 (Base)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.arc(input.touch.startX, input.touch.startY, GAME_CONFIG.joystickRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 조이스틱 핸들 (Stick)
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

// 게임 시작
loop();