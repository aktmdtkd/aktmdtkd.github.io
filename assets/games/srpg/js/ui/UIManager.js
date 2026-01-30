import { SKILLS } from '../battle/BattleSystem.js';

export class UIManager {
    constructor() {
        this.nameEl = document.getElementById('ui-name');
        this.classEl = document.getElementById('ui-class');
        
        this.hpBarEl = document.getElementById('ui-hp-bar');
        this.hpTextEl = document.getElementById('ui-hp-text');
        this.mpBarEl = document.getElementById('ui-mp-bar'); // 신규
        this.mpTextEl = document.getElementById('ui-mp-text'); // 신규
        
        this.atkEl = document.getElementById('ui-atk');
        this.defEl = document.getElementById('ui-def');
        this.intEl = document.getElementById('ui-int'); // 신규

        this.terrainEl = document.getElementById('ui-terrain');
        this.terrainEffectEl = document.getElementById('ui-terrain-effect');

        this.unitPanel = document.getElementById('ui-unit-panel');
        this.statsPanel = document.getElementById('ui-stats-panel');

        // 메뉴 엘리먼트
        this.actionMenu = document.getElementById('action-menu');
        this.skillMenu = document.getElementById('skill-menu');
        this.btnAttack = document.getElementById('btn-attack');
        this.btnMagic = document.getElementById('btn-magic');
        this.btnWait = document.getElementById('btn-wait');
        
        this.terrainNames = { 0: "평지", 1: "산악", 2: "강" };
    }

    updateUnit(unit) {
        if (!unit) {
            this.unitPanel.style.opacity = '0';
            this.statsPanel.style.opacity = '0';
            return;
        }

        this.unitPanel.style.opacity = '1';
        this.statsPanel.style.opacity = '1';

        this.nameEl.innerText = unit.name;
        this.classEl.innerText = `${unit.team==='blue'?'[아군]':'[적군]'} ${unit.className}`;
        
        this.atkEl.innerText = unit.atk;
        this.defEl.innerText = unit.def;
        this.intEl.innerText = unit.int;

        // HP
        const hpPct = (unit.currentHp / unit.maxHp) * 100;
        this.hpBarEl.style.width = `${hpPct}%`;
        this.hpTextEl.innerText = `HP ${unit.currentHp}/${unit.maxHp}`;
        this.hpBarEl.style.backgroundColor = hpPct > 50 ? '#00ff00' : (hpPct > 25 ? '#ffff00' : '#ff0000');

        // MP
        const mpPct = unit.maxMp > 0 ? (unit.currentMp / unit.maxMp) * 100 : 0;
        this.mpBarEl.style.width = `${mpPct}%`;
        this.mpTextEl.innerText = `MP ${unit.currentMp}/${unit.maxMp}`;
    }

    updateTerrain(type) {
        this.terrainEl.innerText = this.terrainNames[type] || "알 수 없음";
        this.terrainEffectEl.innerText = type === 1 ? "방어 +10%" : (type === 2 ? "회피 -10%" : "-");
    }

    // 행동 메뉴 보이기
    showActionMenu(unit, onAttack, onMagic, onWait) {
        this.actionMenu.style.display = 'flex';
        this.skillMenu.style.display = 'none'; // 스킬메뉴는 닫음

        // 버튼 이벤트 연결 (일회성)
        this.btnAttack.onclick = () => {
            this.hideMenus();
            onAttack();
        };
        this.btnMagic.onclick = () => {
            this.hideMenus();
            onMagic(); // 스킬 메뉴 호출
        };
        this.btnWait.onclick = () => {
            this.hideMenus();
            onWait();
        };

        // MP 없으면 책략 버튼 비활성화
        this.btnMagic.disabled = (unit.currentMp < 5); 
    }

    // 스킬 메뉴 보이기
    showSkillMenu(unit, onSkillSelect) {
        this.skillMenu.style.display = 'flex';
        this.actionMenu.style.display = 'none';

        // 기존 버튼(취소 제외) 초기화
        // 취소 버튼은 HTML에 하드코딩 되어있으므로, 그 앞부분에 추가
        // 여기서는 간단하게 innerHTML로 덮어쓰기 (취소 버튼 포함 재작성)
        let html = `<div class="menu-title">책략 선택 (MP ${unit.currentMp})</div>`;
        
        // 간단한 예시: 책사는 화계, 나머지는 구원만 있다고 가정
        // 실제로는 유닛별 스킬 리스트가 있어야 함
        const availableSkills = unit.className === '책사' ? ['fire', 'heal'] : ['heal'];

        availableSkills.forEach(skillId => {
            const skill = SKILLS[skillId];
            const disabled = unit.currentMp < skill.cost ? 'disabled' : '';
            html += `<button class="menu-btn" ${disabled} id="skill-${skillId}">
                        ${skill.name} (MP ${skill.cost})
                     </button>`;
        });

        html += `<button class="menu-btn" onclick="cancelSkill()">뒤로가기</button>`;
        this.skillMenu.innerHTML = html;

        // 이벤트 연결
        availableSkills.forEach(skillId => {
            const btn = document.getElementById(`skill-${skillId}`);
            if (btn && !btn.disabled) {
                btn.onclick = () => {
                    this.hideMenus();
                    onSkillSelect(skillId);
                };
            }
        });
    }

    hideMenus() {
        this.actionMenu.style.display = 'none';
        this.skillMenu.style.display = 'none';
    }
}