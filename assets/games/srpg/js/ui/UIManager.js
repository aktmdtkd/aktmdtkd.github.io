export class UIManager {
    constructor() {
        // DOM 요소 캐싱
        this.nameEl = document.getElementById('ui-name');
        this.classEl = document.getElementById('ui-class');
        this.hpBarEl = document.getElementById('ui-hp-bar');
        this.hpTextEl = document.getElementById('ui-hp-text');
        
        this.atkEl = document.getElementById('ui-atk');
        this.defEl = document.getElementById('ui-def');
        this.moveEl = document.getElementById('ui-move');

        this.terrainEl = document.getElementById('ui-terrain');
        this.terrainEffectEl = document.getElementById('ui-terrain-effect');

        this.unitPanel = document.getElementById('ui-unit-panel');
        this.statsPanel = document.getElementById('ui-stats-panel');
        
        // 지형 이름 매핑
        this.terrainNames = {
            0: "평지",
            1: "산악",
            2: "강 (물)"
        };
        
        // 지형 효과 설명
        this.terrainEffects = {
            0: "이동 비용 1",
            1: "방어 +10% / 이동 비용 2",
            2: "방어 -10% / 이동 불가(보병)"
        };
    }

    // 유닛 정보 업데이트
    updateUnit(unit) {
        if (!unit) {
            // 유닛이 없으면 패널 내용을 숨기거나 비움
            this.unitPanel.style.opacity = '0';
            this.statsPanel.style.opacity = '0';
            return;
        }

        // 패널 보이기
        this.unitPanel.style.opacity = '1';
        this.statsPanel.style.opacity = '1';

        // 텍스트 정보
        this.nameEl.innerText = unit.name;
        this.classEl.innerText = `${unit.team === 'blue' ? '[아군]' : '[적군]'} ${unit.className}`;
        
        this.atkEl.innerText = unit.atk;
        this.defEl.innerText = unit.def;
        this.moveEl.innerText = unit.moveRange;

        // HP 바
        const hpPercent = (unit.currentHp / unit.maxHp) * 100;
        this.hpBarEl.style.width = `${hpPercent}%`;
        this.hpTextEl.innerText = `${unit.currentHp} / ${unit.maxHp}`;

        // HP 색상 변경
        if (hpPercent > 50) this.hpBarEl.style.backgroundColor = '#00ff00';
        else if (hpPercent > 25) this.hpBarEl.style.backgroundColor = '#ffff00';
        else this.hpBarEl.style.backgroundColor = '#ff0000';
    }

    // 지형 정보 업데이트
    updateTerrain(type) {
        const name = this.terrainNames[type] || "알 수 없음";
        const effect = this.terrainEffects[type] || "-";

        this.terrainEl.innerText = name;
        this.terrainEffectEl.innerText = effect;
    }
}