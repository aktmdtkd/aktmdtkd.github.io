import { GridMap } from '../battle/GridMap.js';
import { Unit } from '../battle/Unit.js';
import { PathFinder } from '../battle/PathFinder.js';
import { BattleSystem, SKILLS } from '../battle/BattleSystem.js';
import { AI } from '../battle/AI.js';
import { Renderer } from '../ui/Renderer.js';
import { UIManager } from '../ui/UIManager.js';
import { EffectManager } from '../ui/EffectManager.js';

export class GameManager {
    constructor() {
        this.gridMap = new GridMap();
        this.renderer = new Renderer('gameCanvas');
        this.uiManager = new UIManager();
        this.effectManager = new EffectManager();
        this.pathFinder = new PathFinder();
        this.battleSystem = new BattleSystem();
        this.ai = new AI();
        
        this.units = [];
        this.classes = {};
        this.roster = [];
        this.items = []; // [신규] 아이템 데이터
        this.selectedRoster = [];

        this.gameState = 'IDLE'; 
        this.turn = 'PLAYER'; 
        this.isAnimating = false;
        this.gameOver = null;
        
        this.selectedUnit = null;
        this.selectedAction = null; 
        this.movableTiles = [];
        this.attackableTiles = [];
        
        // Input Vars
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartX = 0; this.dragStartY = 0;
        this.cameraStartX = 0; this.cameraStartY = 0;
        this.lastHoverX = -1; this.lastHoverY = -1;

        this.turnIndicator = document.getElementById('turn-indicator');
        
        // Dialogue Vars
        this.dialogueQueue = [];
        this.dialogueEl = document.getElementById('dialogue-overlay');
        this.diaNameEl = document.getElementById('dia-name');
        this.diaTextEl = document.getElementById('dia-text');
    }

    async init() {
        await this.loadClassData();
        await this.loadItemData(); // [신규]
        await this.loadRosterAndShowUI();
        
        this.setupInput();
        this.uiManager.setupZoomControls(() => this.handleZoom(10), () => this.handleZoom(-10));
        window.addEventListener('resize', () => this.handleResize());
    }

    async loadClassData() {
        const res = await fetch('./js/data/classes.json');
        this.classes = await res.json();
    }

    // [신규] 아이템 데이터 로드
    async loadItemData() {
        const res = await fetch('./js/data/items.json');
        this.items = await res.json();
    }

    async loadRosterAndShowUI() {
        const res = await fetch('./js/data/roster.json');
        this.roster = await res.json();
        // 각 로스터 멤버에게 equippedItemId 속성 초기화 (없으면 null)
        this.roster.forEach(c => { if(c.equippedItemId === undefined) c.equippedItemId = null; });
        
        this.selectedRoster = this.roster.filter(c => c.isFixed).map(c => c.id);
        this.renderBarracks();
    }

    // [수정] 병영 렌더링 (장비 버튼 추가)
    renderBarracks() {
        const listEl = document.getElementById('roster-list');
        const countEl = document.getElementById('deploy-count');
        const deployBtn = document.getElementById('btn-deploy');
        listEl.innerHTML = '';

        this.roster.forEach(char => {
            const el = document.createElement('div');
            el.className = 'roster-item';
            if (char.isFixed) el.classList.add('fixed', 'selected');
            else if (this.selectedRoster.includes(char.id)) el.classList.add('selected');

            const className = this.classes[char.class] ? this.classes[char.class].name : char.class;
            
            // 장착된 아이템 이름 찾기
            let equipName = "장비 없음";
            if (char.equippedItemId) {
                const item = this.items.find(i => i.id === char.equippedItemId);
                if (item) equipName = `<span style="color:#88ccff">${item.name}</span>`;
            }

            // 왼쪽: 캐릭터 정보 / 오른쪽: 장비 버튼
            el.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <div><span style="font-weight:bold; font-size:16px;">${char.name}</span> <span style="font-size:12px; color:#aaa;">${className}</span></div>
                    <div style="font-size:12px; color:#ddd;">${equipName}</div>
                </div>
                <button class="equip-btn">장비 변경</button>
            `;

            // 1. 아이템 클릭 이벤트 (버블링 방지)
            const equipBtn = el.querySelector('.equip-btn');
            equipBtn.onclick = (e) => {
                e.stopPropagation(); // 부모 클릭(출진선택) 방지
                this.openEquipmentModal(char.id);
            };

            // 2. 전체 클릭 이벤트 (출진 선택)
            if (!char.isFixed) {
                el.onclick = () => {
                    if (this.selectedRoster.includes(char.id)) {
                        this.selectedRoster = this.selectedRoster.filter(id => id !== char.id);
                    } else {
                        if (this.selectedRoster.length < 4) this.selectedRoster.push(char.id);
                        else { alert("최대 4명까지만 출진할 수 있습니다."); return; }
                    }
                    this.renderBarracks();
                };
            }
            listEl.appendChild(el);
        });

        const count = this.selectedRoster.length;
        countEl.innerText = `선택: ${count} / 4`;
        deployBtn.disabled = count < 1;
        deployBtn.onclick = () => this.startBattle();
    }

    // [신규] 장비 선택 모달 열기
    openEquipmentModal(charId) {
        const modal = document.getElementById('equipment-modal');
        const list = document.getElementById('item-list');
        const char = this.roster.find(c => c.id === charId);
        
        list.innerHTML = '';
        modal.style.display = 'flex';

        // '해제' 버튼 추가
        const unequip = document.createElement('div');
        unequip.className = 'item-row';
        unequip.innerHTML = `<span style="color:#aaa;">장비 해제</span>`;
        unequip.onclick = () => {
            char.equippedItemId = null;
            modal.style.display = 'none';
            this.renderBarracks();
        };
        list.appendChild(unequip);

        // 아이템 목록 표시
        this.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            
            // 현재 장착중인지 표시
            const isEquipped = (char.equippedItemId === item.id);
            const style = isEquipped ? 'border:1px solid #00ff00;' : '';

            row.style.cssText = style;
            row.innerHTML = `
                <div>
                    <div><span class="tier-badge">T${item.tier}</span> <span class="item-name">${item.name}</span></div>
                    <div class="item-desc">${item.desc}</div>
                </div>
            `;
            
            row.onclick = () => {
                // 다른 캐릭터가 이미 끼고 있는지 체크? (일단 중복 장착 허용 or 단순 교체)
                // 여기서는 1인 1무기, 중복 소유 가능(재고 무제한 가정)으로 구현
                char.equippedItemId = item.id;
                modal.style.display = 'none';
                this.renderBarracks();
            };
            list.appendChild(row);
        });
    }

    async startBattle() {
        document.getElementById('barracks-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        this.handleResize();
        await this.loadMapAndUnits();
        this.playIntroDialogue();
        this.loop();
    }

    playIntroDialogue() {
        const script = [
            { name: "조조", text: "네 이놈 장보야! 하늘이 두렵지 않느냐!" },
            { name: "장보", text: "푸하하! 황천의 세상이 오고 있다! 내 불맛을 보여주마!" },
            { name: "조조", text: "전군, 공격하라! 저 요괴를 처단하라!" }
        ];
        this.startDialogue(script);
    }

    startDialogue(script) {
        this.dialogueQueue = script;
        this.gameState = 'DIALOGUE';
        this.dialogueEl.style.display = 'block';
        document.getElementById('game-ui').style.opacity = '0';
        this.advanceDialogue();
    }

    advanceDialogue() {
        if (this.dialogueQueue.length === 0) {
            this.gameState = 'IDLE';
            this.dialogueEl.style.display = 'none';
            document.getElementById('game-ui').style.opacity = '1';
            this.startPlayerTurn();
            return;
        }
        const line = this.dialogueQueue.shift();
        this.diaNameEl.innerText = line.name;
        this.diaNameEl.style.color = (['조조','곽가','하후돈','하후연','조홍','악진','허저','순욱','순유','정욱'].includes(line.name)) ? '#00ccff' : '#ff6666';
        this.diaTextEl.innerText = line.text;

        const speaker = this.units.find(u => u.name === line.name && !u.isDead());
        if (speaker) {
            const viewW = this.renderer.canvas.width;
            const viewH = this.renderer.canvas.height;
            const cx = speaker.pixelX - (viewW / 2) + 20;
            const cy = speaker.pixelY - (viewH / 2) + 20;
            this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
        }
    }

    async loadMapAndUnits() {
        try {
            const mapRes = await fetch('./js/data/maps.json');
            const mapJson = await mapRes.json();
            const stage1 = mapJson.stage1;
            
            this.gridMap.load(stage1);
            
            // 1. 적군 배치
            stage1.units.forEach(uConfig => {
                const classInfo = this.classes[uConfig.class];
                const newUnit = new Unit(uConfig, classInfo, null); // 적군은 아이템 없음
                newUnit.tileSize = this.renderer.tileSize;
                this.units.push(newUnit);
            });

            // 2. 아군 배치
            const spawnCandidates = [];
            for(let y=1; y<=4; y++) {
                for(let x=1; x<=4; x++) {
                    if (this.gridMap.getTerrain(x, y) === 0 && !this.getUnitAt(x, y)) {
                        spawnCandidates.push({x, y});
                    }
                }
            }
            spawnCandidates.sort(() => Math.random() - 0.5);

            this.selectedRoster.forEach((charId, index) => {
                if (index >= spawnCandidates.length) return;
                
                // 로스터 정보 가져오기
                const charData = this.roster.find(c => c.id === charId);
                const classInfo = this.classes[charData.class];
                const pos = spawnCandidates[index];

                // [핵심] 장착 아이템 정보 찾기
                let itemInfo = null;
                if (charData.equippedItemId) {
                    itemInfo = this.items.find(i => i.id === charData.equippedItemId);
                }

                // 유닛 생성 시 아이템 정보 전달
                const newUnit = new Unit({
                    id: charData.id, name: charData.name, class: charData.class, team: 'blue',
                    x: pos.x, y: pos.y
                }, classInfo, itemInfo);
                
                newUnit.tileSize = this.renderer.tileSize;
                this.units.push(newUnit);
            });

        } catch (e) { console.error(e); }
    }

    // --- 이하 기존 로직 (Input, Loop, Resize 등) ---
    handleResize() {
        const wrapper = document.querySelector('.game-wrapper');
        const w = wrapper.clientWidth; const h = wrapper.clientHeight;
        this.renderer.resize(w, h);
        if(this.gridMap.cols > 0)
            this.renderer.updateCamera(this.renderer.camera.x, this.renderer.camera.y, this.gridMap.cols, this.gridMap.rows);
    }
    handleZoom(delta) {
        const oldSize = this.renderer.tileSize;
        let newSize = oldSize + delta;
        if (newSize < 20) newSize = 20; if (newSize > 80) newSize = 80;
        if (oldSize === newSize) return;
        const viewW = this.renderer.canvas.width; const viewH = this.renderer.canvas.height;
        const centerX = this.renderer.camera.x + viewW / 2; const centerY = this.renderer.camera.y + viewH / 2;
        const ratio = newSize / oldSize;
        const newCenterX = centerX * ratio; const newCenterY = centerY * ratio;
        this.renderer.setTileSize(newSize);
        this.units.forEach(u => {
            u.tileSize = newSize; 
            if (!u.isMoving) { u.pixelX = u.x * newSize; u.pixelY = u.y * newSize; u.targetPixelX = u.x * newSize; u.targetPixelY = u.y * newSize; }
            else { u.pixelX *= ratio; u.pixelY *= ratio; u.targetPixelX *= ratio; u.targetPixelY *= ratio; }
        });
        this.renderer.updateCamera(newCenterX - viewW / 2, newCenterY - viewH / 2, this.gridMap.cols, this.gridMap.rows);
    }
    getInputPos(evt) {
        const canvas = this.renderer.canvas; const rect = canvas.getBoundingClientRect();
        let clientX = evt.clientX; let clientY = evt.clientY;
        if (evt.touches && evt.touches.length > 0) { clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY; }
        else if (evt.changedTouches && evt.changedTouches.length > 0) { clientX = evt.changedTouches[0].clientX; clientY = evt.changedTouches[0].clientY; }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    setupInput() {
        const canvas = this.renderer.canvas;
        canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        canvas.addEventListener('mouseleave', () => { this.isInputDown = false; this.isDragging = false; canvas.style.cursor = 'crosshair'; });
        canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating && !this.gameOver) {
                if (this.gameState === 'TARGETING') this.openActionMenu();
                else if (this.gameState === 'SELECTED') this.resetSelection();
            }
        });
    }
    handleStart(e) {
        if (e.cancelable) e.preventDefault();
        if (this.gameState === 'DIALOGUE') { this.advanceDialogue(); return; }
        if (this.gameOver) { location.reload(); return; }
        if (this.gameState === 'ACTION_SELECT') return;
        this.renderer.canvas.style.cursor = 'grabbing';
        this.isInputDown = true; this.isDragging = false;
        const pos = this.getInputPos(e);
        this.dragStartX = pos.x; this.dragStartY = pos.y;
        this.cameraStartX = this.renderer.camera.x; this.cameraStartY = this.renderer.camera.y;
    }
    handleMove(e) {
        if (e.cancelable) e.preventDefault();
        if (this.gameOver || this.gameState === 'DIALOGUE') return;
        const pos = this.getInputPos(e);
        if (this.isInputDown) {
            const dx = pos.x - this.dragStartX; const dy = pos.y - this.dragStartY;
            if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) this.isDragging = true;
            if (this.isDragging) {
                const newCamX = this.cameraStartX - dx; const newCamY = this.cameraStartY - dy;
                this.renderer.updateCamera(newCamX, newCamY, this.gridMap.cols, this.gridMap.rows);
                return; 
            }
        }
        if (!this.isDragging && !('ontouchstart' in window)) {
            const worldX = pos.x + this.renderer.camera.x; const worldY = pos.y + this.renderer.camera.y;
            const tx = Math.floor(worldX / this.renderer.tileSize); const ty = Math.floor(worldY / this.renderer.tileSize);
            if (tx === this.lastHoverX && ty === this.lastHoverY) return;
            this.lastHoverX = tx; this.lastHoverY = ty;
            const hoverUnit = this.getUnitAt(tx, ty);
            this.uiManager.updateUnit(hoverUnit);
            const terrainType = this.gridMap.getTerrain(tx, ty);
            if (terrainType !== null) this.uiManager.updateTerrain(terrainType);
        }
    }
    async handleEnd(e) {
        if (e.cancelable) e.preventDefault();
        this.isInputDown = false; this.renderer.canvas.style.cursor = 'crosshair';
        if (this.gameState === 'DIALOGUE') return;
        if (this.gameOver || this.gameState === 'ACTION_SELECT') return;
        if (this.isDragging) { this.isDragging = false; return; }
        if (this.turn === 'ENEMY' || this.isAnimating) return;
        const pos = this.getInputPos(e);
        const worldX = pos.x + this.renderer.camera.x; const worldY = pos.y + this.renderer.camera.y;
        const tx = Math.floor(worldX / this.renderer.tileSize); const ty = Math.floor(worldY / this.renderer.tileSize);
        await this.handleClick(tx, ty);
    }
    async handleClick(x, y) {
        if (this.gameState === 'IDLE') {
            const clickedUnit = this.getUnitAt(x, y);
            if (clickedUnit && clickedUnit.team === 'blue' && !clickedUnit.isActionDone) {
                this.selectedUnit = clickedUnit;
                this.movableTiles = this.pathFinder.getMovableTiles(clickedUnit, this.gridMap, this.units);
                this.gameState = 'SELECTED';
            }
            return;
        }
        if (this.gameState === 'SELECTED') {
            if (this.movableTiles.some(t => t.x === x && t.y === y)) {
                if (x === this.selectedUnit.x && y === this.selectedUnit.y) { this.movableTiles = []; this.onMoveFinished(); return; }
                const path = this.pathFinder.findPath(this.selectedUnit, x, y, this.gridMap, this.units);
                if (path && path.length > 0) { this.selectedUnit.moveAlong(path); this.movableTiles = []; this.isAnimating = true; this.gameState = 'MOVING'; }
                else { this.resetSelection(); }
            } else { this.resetSelection(); }
            return;
        }
        if (this.gameState === 'TARGETING') {
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                this.isAnimating = true;
                if (this.selectedAction.type === 'attack') {
                    const targetUnit = this.getUnitAt(x, y);
                    if (targetUnit && targetUnit.team === 'red') {
                        await this.battleSystem.executeAttack(this.selectedUnit, targetUnit, this.effectManager);
                        this.finishTurnSequence(targetUnit);
                    } else { this.isAnimating = false; }
                } else if (this.selectedAction.type === 'skill') {
                    await this.battleSystem.executeSkill(this.selectedUnit, x, y, this.selectedAction.id, this.units, this.effectManager);
                    this.finishTurnSequence();
                }
            }
        }
    }
    onMoveFinished() { this.isAnimating = false; this.openActionMenu(); }
    openActionMenu() { this.gameState = 'ACTION_SELECT'; this.attackableTiles = []; this.uiManager.showActionMenu(this.selectedUnit, () => this.selectAttack(), () => this.openSkillMenu(), () => this.wait()); }
    openSkillMenu() { this.uiManager.showSkillMenu(this.selectedUnit, (skillId) => this.selectSkill(skillId)); }
    selectAttack() { this.selectedAction = { type: 'attack' }; this.calculateRange(this.selectedUnit.attackRange); this.gameState = 'TARGETING'; }
    selectSkill(skillId) { this.selectedAction = { type: 'skill', id: skillId }; const skill = SKILLS[skillId]; this.calculateRange(skill.range); this.gameState = 'TARGETING'; }
    wait() { this.endAction(); }
    calculateRange(range) {
        this.attackableTiles = [];
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    const nx = this.selectedUnit.x + dx; const ny = this.selectedUnit.y + dy;
                    if (this.gridMap.isValid(nx, ny)) { this.attackableTiles.push({x: nx, y: ny}); }
                }
            }
        }
    }
    finishTurnSequence(targetUnit) { this.isAnimating = false; this.checkDeadUnits(); this.endAction(); if(targetUnit) this.uiManager.updateUnit(targetUnit); }
    endAction() {
        if (this.selectedUnit) { this.selectedUnit.endAction(); }
        this.resetSelection(); this.uiManager.hideMenus();
        if (this.checkWinCondition()) return;
        const activeBlues = this.units.filter(u => u.team === 'blue' && !u.isActionDone && !u.isDead());
        if (activeBlues.length === 0) { this.startEnemyTurn(); }
    }
    startEnemyTurn() { this.turn = 'ENEMY'; this.turnIndicator.innerText = `TURN: ${this.turn}`; this.turnIndicator.style.color = '#ff6666'; this.ai.runTurn(this); }
    startPlayerTurn() {
        this.turn = 'PLAYER'; this.turnIndicator.innerText = `TURN: ${this.turn}`; this.turnIndicator.style.color = '#ffffff';
        this.units.forEach(u => u.resetTurn());
        const mainChar = this.units.find(u => u.name === '조조' && !u.isDead());
        if(mainChar) {
            const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
            const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
            this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
        }
    }
    resetSelection() { this.selectedUnit = null; this.selectedAction = null; this.movableTiles = []; this.attackableTiles = []; this.gameState = 'IDLE'; this.isAnimating = false; this.uiManager.hideMenus(); }
    checkDeadUnits() { this.units = this.units.filter(u => !u.isDead()); this.checkWinCondition(); }
    checkWinCondition() {
        if (this.gameOver) return true;
        const blueAlive = this.units.some(u => u.team === 'blue' && !u.isDead());
        const redAlive = this.units.some(u => u.team === 'red' && !u.isDead());
        if (!redAlive) { this.gameOver = 'WIN'; return true; }
        else if (!blueAlive) { this.gameOver = 'LOSE'; return true; }
        return false;
    }
    getUnitAt(x, y) { return this.units.find(u => u.x === x && u.y === y && !u.isDead()); }
    loop() {
        this.effectManager.update();
        this.units.forEach(unit => { const arrived = unit.update(); if (arrived && this.turn === 'PLAYER' && unit === this.selectedUnit) this.onMoveFinished(); });
        this.renderer.clear();
        this.renderer.drawMap(this.gridMap);
        if (!this.gameOver) {
            if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
            if (this.gameState === 'TARGETING' && this.attackableTiles.length > 0) this.renderer.drawHighlights(this.attackableTiles, 'attack');
            this.renderer.drawCursor(this.selectedUnit);
        }
        this.renderer.drawUnits(this.units);
        this.renderer.drawEffects(this.effectManager);
        if (this.gameOver) this.renderer.drawGameOver(this.gameOver);
        requestAnimationFrame(() => this.loop());
    }
}