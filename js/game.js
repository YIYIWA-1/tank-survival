const MAP_SIZE = 4000;
const COLORS = ['#FFFFFF', '#95a5a6', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#f1c40f', '#000000'];
const COLOR_NAMES = ['白', '灰', '绿', '蓝', '紫', '橙', '红', '金', '黑'];
const ENEMY_TYPES = { BASIC: 0, KAMIKAZE: 1, ENERGY: 2, HEAVY: 3 }; 

const RARITIES = {
    WHITE: { n: '白色', color: '#FFFFFF', cost: 1, max: 1, next: 'GRAY', forgeCost: 1 },
    GRAY: { n: '灰色', color: '#bdc3c7', cost: 3, max: 2, next: 'GREEN', forgeCost: 2 },
    GREEN: { n: '绿色', color: '#2ecc71', cost: 10, max: 3, next: 'BLUE', forgeCost: 4 },
    BLUE: { n: '蓝色', color: '#3498db', cost: 25, max: 4, next: 'PURPLE', forgeCost: 8 },
    PURPLE: { n: '紫色', color: '#9b59b6', cost: 60, max: 5, next: 'ORANGE', forgeCost: 16 },
    ORANGE: { n: '橙色', color: '#e67e22', cost: 150, max: 6, next: 'RED', forgeCost: 32 },
    RED: { n: '红色', color: '#e74c3c', cost: 350, max: 7, next: 'GOLD', forgeCost: 64 },
    GOLD: { n: '金色', color: '#f1c40f', cost: 800, max: 8, next: 'BLACK', forgeCost: 128 },
    BLACK: { n: '黑色', color: '#000000', cost: 2000, max: 10, next: null }
};

function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); } 
    else if (hex.length === 7) { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
    return `rgba(${r},${g},${b},${alpha})`;
}

const ITEM_DB = {
    'act_overcharge': { type:'ACTIVE', name:'过载充能', desc:'大幅提升移速、攻速，并降低受到伤害。', cd:25, dur:6, effect:0.2, forge:['cd','dur','effect'], aim:false },
    'act_nitro': { type:'ACTIVE', name:'氮气加速', desc:'提供移速加成，期间无视任何碰撞伤害。', cd:20, dur:6, effect:0.4, forge:['cd','dur','effect'], aim:false },
    'act_repair': { type:'ACTIVE', name:'自我修复', desc:'在短时间内快速且持续地恢复生命值。', cd:20, dur:1.5, effect:0.02, forge:['cd','dur','effect'], aim:false },
    'act_fortify': { type:'ACTIVE', name:'加固防御', desc:'大幅降低受到的伤害，但移速会明显降低。', cd:30, dur:6, effect:0.6, forge:['cd','dur','effect'], aim:false },
    'act_radar': { type:'ACTIVE', name:'雷达屏蔽', desc:'进入无敌状态并无视碰撞，使所有敌人丢失目标。', cd:25, dur:4, effect:0, forge:['cd','dur'], aim:false },
    'act_wormhole': { type:'ACTIVE', name:'虫洞穿梭', desc:'拖动瞄准，延迟0.5秒后传送到指定区域。', cd:20, dur:0, effect:240, forge:['cd','effect'], aim:true },
    'act_orbital': { type:'ACTIVE', name:'轨道打击', desc:'拖动瞄准，延迟后对该区域进行毁灭性轰炸。', cd:50, dur:6, effect:1.0, speed:5, forge:['cd','dur','effect','speed'], aim:true },
    'act_shield': { type:'ACTIVE', name:'能量护盾', desc:'获得基于最大生命的护盾持续衰减，破裂时造成击退和反伤。', cd:40, dur:20, effect:0.5, forge:['cd','dur','effect'], aim:false },
    'pas_manual': { type:'PASSIVE', name:'驾驶手册', desc:'提升战场中的经验获得倍率。', stat:'xpMult', effect:0.05, forge:['effect'] },
    'pas_oil': { type:'PASSIVE', name:'机油', desc:'提升战车的移动速度。', stat:'speed', effect:0.05, forge:['effect'] },
    'pas_sight': { type:'PASSIVE', name:'瞄具', desc:'提升所有武器的射程。', stat:'range', effect:0.05, forge:['effect'] },
    'pas_powder': { type:'PASSIVE', name:'高爆火药', desc:'提升所有爆炸伤害的波及范围。', stat:'splash', effect:0.05, forge:['effect'] },
    'pas_plate': { type:'PASSIVE', name:'钢板', desc:'提升战车的最大生命值。', stat:'hp', effect:0.05, forge:['effect'] },
    'pas_ap': { type:'PASSIVE', name:'穿甲弹', desc:'提升所有武器的基础攻击力。', stat:'atk', effect:0.05, forge:['effect'] },
    'pas_spring': { type:'PASSIVE', name:'弹簧', desc:'提升武器的基础攻击速度。', stat:'atkSpd', effect:0.05, forge:['effect'] },
    'pas_magnet': { type:'PASSIVE', name:'吸铁石', desc:'大幅提升各种掉落物的拾取范围。', stat:'pickup', effect:0.10, forge:['effect'] },
    'pas_cone': { type:'PASSIVE', name:'圆锥桶', desc:'按百分比降低受到的碰撞伤害。', stat:'colDmg', effect:0.10, forge:['effect'] },
    'pas_charger': { type:'PASSIVE', name:'充电器', desc:'提升技能的能量上限。', stat:'energy', effect:0.10, forge:['effect'] },
    'pas_photo': { type:'PASSIVE', name:'光合模组', desc:'全面提升能量上限与能量恢复速度。', stat:'energyAll', effect:0.06, forge:['effect'] },
    'pas_atkmod': { type:'PASSIVE', name:'攻击模组', desc:'全面提升基础攻击力与攻击速度。', stat:'atkAll', effect:0.03, forge:['effect'] },
    'pas_defmod': { type:'PASSIVE', name:'防御模组', desc:'全面提升最大生命值并提供全伤减免。', stat:'defAll', effect:0.03, forge:['effect'] },
    'pas_calib': { type:'PASSIVE', name:'校准模组', desc:'全面提升武器射程与爆炸范围。', stat:'rangeAll', effect:0.03, forge:['effect'] },
    'pas_agile': { type:'PASSIVE', name:'灵巧模组', desc:'全面提升移动速度与子弹飞行速度。', stat:'spdAll', effect:0.03, forge:['effect'] },
    'pas_defiance': { type:'PASSIVE', name:'名刀', desc:'濒死时保留1点生命并获得无敌效果。', cd:60, dur:2.5, stat:'special', forge:['cd','dur'] },
    'pas_trinity': { type:'PASSIVE', name:'三项', desc:'施放技能后的短暂时间内提升全部伤害。', dur:3, effect:0.33, stat:'special', forge:['dur','effect'] },
    'pas_clover': { type:'PASSIVE', name:'三叶草', desc:'提升稀有掉落物(道具/补给)出现的概率。', stat:'luck', effect:0.05, forge:['effect'] },
    'pas_grit': { type:'PASSIVE', name:'气概', desc:'生命值越低，造成的伤害越高。', stat:'special', effect:0.4, forge:['effect'] }
};

let canvas, ctx, lastTime = 0, gameState = 'MENU';
let difficulty = 1, isGodMode = false, currentWeapon = 'CANNON'; 
let waveConfig = { wave: 1, timer: 0, spawnTimer: 0, interval: 8, difficultyStep: 5 }; 
let gameStats = { time: 0, kills: 0, score: 0 };
let camera = { x: 0, y: 0 }; 
let joystick = { active: false, dx: 0, dy: 0, originX: 0, originY: 0, touchId: null };
let skill = { active: false, cd: 0, maxCd: 15, ready: true, level: 0, upgrades: {}, cost: 15 };
let ultSkill = { active: false, cd: 0, maxCd: 50, ready: true, cost: 40 }; 
let itemSkill = { dbId: null, active: false, cd: 0, maxCd: 0, ready: false, aim: false, aimX:0, aimY:0 };
let sessionLoot = [];
let entities = { player: null, enemies: [], bullets: [], particles: [], drops: [], texts: [], visuals: [], minions: [], shockwaves: [], turrets: [], orbitals: [] };
const BASE_PLAYER = { hp: 100, maxHp: 100, size: 18, speed: 120, atk: 10, atkSpd: 1, range: 300, splash: 30, projSpd: 400, regen: 0, def: 0, level: 1, xp: 0, nextLevelXp: 25, energy: 100, maxEnergy: 100, energyRegen: 1.0 };

window.onload = () => { canvas = document.getElementById('gameCanvas'); ctx = canvas.getContext('2d'); resize(); window.addEventListener('resize', resize); setupInputs(); requestAnimationFrame(gameLoop); };
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function selectWeapon(wpn) { audio.click(); currentWeapon = wpn; document.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('selected')); document.getElementById('wpn-'+wpn.toLowerCase()).classList.add('selected'); }
function toggleCheatBtn() { document.getElementById('cheat-inv-btn').style.display = document.getElementById('god-mode-check').checked ? 'block' : 'none'; }
function setupInputs() {
    const zone = document.getElementById('joystick-zone'); const skillBtn = document.getElementById('skill-btn'); const ultBtn = document.getElementById('ult-btn'); const itemBtn = document.getElementById('item-btn');
    resetJoystickVisual();
    zone.addEventListener('touchstart', e => {
        e.preventDefault(); const touch = e.changedTouches[0]; joystick.active = true; joystick.touchId = touch.identifier;
        joystick.originX = touch.clientX; joystick.originY = touch.clientY; joystick.dx = 0; joystick.dy = 0; drawJoystickVisual(touch.clientX, touch.clientY, touch.clientX, touch.clientY);
    }, {passive: false});
    zone.addEventListener('touchmove', e => {
        e.preventDefault(); if (!joystick.active) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystick.touchId) {
                const touch = e.changedTouches[i]; const dx = touch.clientX - joystick.originX; const dy = touch.clientY - joystick.originY;
                const dist = Math.hypot(dx, dy); const maxDist = 40; const angle = Math.atan2(dy, dx); const clampDist = Math.min(dist, maxDist);
                joystick.dx = Math.cos(angle); joystick.dy = Math.sin(angle); drawJoystickVisual(joystick.originX, joystick.originY, joystick.originX + Math.cos(angle) * clampDist, joystick.originY + Math.sin(angle) * clampDist); break;
            }
        }
    }, {passive: false});
    const endJoystick = (e) => { for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === joystick.touchId) { joystick.active = false; joystick.dx = 0; joystick.dy = 0; resetJoystickVisual(); break; } } };
    zone.addEventListener('touchend', endJoystick); zone.addEventListener('touchcancel', endJoystick);
    skillBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'PLAYING' && skill.ready) activateSkill(); });
    ultBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'PLAYING' && ultSkill.ready) activateUltSkill(); });
    itemBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); if (gameState !== 'PLAYING' || !itemSkill.ready || !itemSkill.dbId) return;
        if(itemSkill.aim) { 
            itemSkill.aiming = true; 
            const touch = e.changedTouches[0]; 
            itemSkill.touchId = touch.identifier; 
            const rect = itemBtn.getBoundingClientRect();
            itemSkill.originX = rect.left + rect.width / 2;
            itemSkill.originY = rect.top + rect.height / 2;
            calcAim(touch); 
        } else { activateItemSkill(); }
    }, {passive: false});
    itemBtn.addEventListener('touchmove', (e) => { if (!itemSkill.aiming) return; for (let i=0; i<e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === itemSkill.touchId) calcAim(e.changedTouches[i]); } }, {passive: true});
    const endItem = (e) => { for (let i=0; i<e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === itemSkill.touchId && itemSkill.aiming) { itemSkill.aiming = false; activateItemSkill(); break; } } };
    itemBtn.addEventListener('touchend', endItem); itemBtn.addEventListener('touchcancel', endItem);
}
function calcAim(t) {
    if(!entities.player) return; const p = entities.player; 
    const dx = t.clientX - itemSkill.originX; 
    const dy = t.clientY - itemSkill.originY; 
    const angle = Math.atan2(dy, dx);
    let dist = Math.hypot(dx, dy); 
    const maxDrag = 60; 
    let maxGameDist = 300; 
    if(itemSkill.dbId === 'act_wormhole') maxGameDist = getForgedVal('act_wormhole','effect');
    dist = (dist / maxDrag) * maxGameDist; if(dist > maxGameDist) dist = maxGameDist;
    itemSkill.aimX = p.x + Math.cos(angle)*dist; itemSkill.aimY = p.y + Math.sin(angle)*dist;
}
function resetJoystickVisual() { document.getElementById('joystick-zone').innerHTML = `<div style="position:absolute; left:30px; top:30px; width:60px; height:60px; border-radius:50%; background:rgba(0,0,0,0.1); border: 2px solid rgba(0,0,0,0.2); pointer-events:none;"></div><div style="position:absolute; left:45px; top:45px; width:30px; height:30px; border-radius:50%; background:rgba(0,0,0,0.3); pointer-events:none;"></div>`; }
function drawJoystickVisual(ox, oy, cx, cy) { document.getElementById('joystick-zone').innerHTML = `<div style="position:fixed; left:${ox-30}px; top:${oy-30}px; width:60px; height:60px; border-radius:50%; background:rgba(0,0,0,0.2); pointer-events:none;"></div><div style="position:fixed; left:${cx-15}px; top:${cy-15}px; width:30px; height:30px; border-radius:50%; background:rgba(0,0,0,0.5); pointer-events:none;"></div>`; }
function toggleCheatMenu() { audio.click(); const menu = document.getElementById('cheat-menu-items'); menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'; }
function cheatAction(action) {
    audio.click(); if (!entities.player) return; const p = entities.player;
    switch(action) {
        case 'heal': p.hp = p.maxHp; showFloatingText("FULL HEAL", p.x, p.y, '#2ecc71', 24); break;
        case 'speed': p.cheatFlags.speed = !p.cheatFlags.speed; updateCheatButton('btn-cheat-speed', p.cheatFlags.speed, "加速"); break;
        case 'crit': p.cheatFlags.crit = !p.cheatFlags.crit; updateCheatButton('btn-cheat-crit', p.cheatFlags.crit, "暴击"); break;
        case 'cd': p.cheatFlags.noCd = !p.cheatFlags.noCd; updateCheatButton('btn-cheat-cd', p.cheatFlags.noCd, "无CD"); break;
        case 'infmp': p.cheatFlags.infiniteEnergy = !p.cheatFlags.infiniteEnergy; updateCheatButton('btn-cheat-infmp', p.cheatFlags.infiniteEnergy, "无限蓝"); break;
        case 'kill': entities.enemies.forEach(e => e.takeDamage(99999)); showFloatingText("NUKE!", p.x, p.y, '#fff', 30); break;
        case 'spawn': waveConfig.spawnTimer = 0; showFloatingText("NEXT WAVE", p.x, p.y, '#3498db', 24); break;
    }
}
function updateCheatButton(id, isActive, text) { const btn = document.getElementById(id); btn.innerText = `${text} (${isActive ? 'ON' : 'OFF'})`; isActive ? btn.classList.add('cheat-active') : btn.classList.remove('cheat-active'); }
function toggleStatsMenu() {
    audio.click(); const menu = document.getElementById('stats-menu'); const content = document.getElementById('stats-content'); const p = entities.player;
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED'; menu.classList.remove('hidden');
        const currentHp = Math.ceil(p.maxHp); const currentAtk = (p.getDmg()).toFixed(1); const atkPerSec = (1 / (p.atkSpd * p.multipliers.atkSpd)).toFixed(2); const moveSpd = Math.floor(p.speed * p.multipliers.speed); const regen = (p.maxHp * p.regen).toFixed(1); const maxEnergy = Math.floor(p.maxEnergy * p.multipliers.energy); const energyRegen = (p.energyRegen * p.multipliers.energyRegen)).toFixed(1);
        let html = `<div class="stats-section-title">基础属性 (${currentWeapon})</div><div class="stat-row"><span class="stat-label">等级</span> <span class="stat-val">${p.level}</span></div><div class="stat-row"><span class="stat-label">HP</span> <span class="stat-val">${Math.ceil(p.hp)} / <span class="stat-highlight">${currentHp}</span></span></div><div class="stat-row"><span class="stat-label">能量</span> <span class="stat-val">${Math.floor(p.energy)} / <span class="stat-highlight">${maxEnergy}</span></span></div><div class="stat-row"><span class="stat-label">攻击力</span> <span class="stat-val stat-highlight">${currentAtk}</span></div><div class="stat-row"><span class="stat-label">攻速</span> <span class="stat-val stat-highlight">${currentWeapon === 'SHOTGUN' ? '3.0/秒' : atkPerSec + '/秒'}</span></div><div class="stat-row"><span class="stat-label">移速</span> <span class="stat-val">${moveSpd}</span></div><div class="stat-row"><span class="stat-label">生命回复</span> <span class="stat-val">${regen} /秒</span></div><div class="stat-row"><span class="stat-label">能量回复</span> <span class="stat-val">${energyRegen} /秒</span></div>`;
        html += `<div class="stats-section-title">升级记录</div><div style="display: flex; flex-wrap: wrap;">`;
        const keys = Object.keys(p.upgradeHistory); if (keys.length === 0) html += `<div style="color:#7f8c8d; font-style:italic;">暂无</div>`; else keys.forEach(k => { html += `<div class="upgrade-tag">${k} <span class="upgrade-count">x${p.upgradeHistory[k]}</span></div>`; });
        html += `</div>`; content.innerHTML = html;
    } else if (gameState === 'PAUSED' && !menu.classList.contains('hidden')) { menu.classList.add('hidden'); gameState = 'PLAYING'; }
}
function quitGame() {
    audio.click(); gameState = 'MENU'; document.getElementById('stats-menu').classList.add('hidden');
    pData.inv = pData.inv.concat(sessionLoot); saveData(); showMainMenu();
}
function startGame(diff) {
    audio.init(); audio.click(); difficulty = diff; isGodMode = document.getElementById('god-mode-check').checked;
    const steps = [7, 6, 5]; waveConfig = { wave: 1, timer: 0, spawnTimer: 0, interval: 8, difficultyStep: steps[diff], colorIdx: 0 };
    entities.player = new Player(); sessionLoot = [];
    if (currentWeapon === 'LASER') { entities.player.atk = 8; entities.player.atkSpd = 1.0; } else if (currentWeapon === 'SWARM') { entities.player.atk = 15; entities.player.atkSpd = 0.5; } else if (currentWeapon === 'SHOTGUN') { entities.player.atk = 6; entities.player.atkSpd = 4.5; entities.player.range = 150; entities.player.ammo = 3; entities.player.maxAmmo = 3; entities.player.reloadTime = 1.2; entities.player.pelletCount = 4; document.getElementById('ammo-display').style.display = 'block'; } else if (currentWeapon === 'SHOCKWAVE') { entities.player.atk = 10; entities.player.atkSpd = 0.66; entities.player.range = 120; } else { document.getElementById('ammo-display').style.display = 'none'; }
    if (currentWeapon !== 'SHOTGUN') document.getElementById('ammo-display').style.display = 'none';
    if (isGodMode) { entities.player.maxHp = 99999; entities.player.hp = 99999; document.getElementById('cheat-container').style.display = 'block'; } else { document.getElementById('cheat-container').style.display = 'none'; document.getElementById('cheat-menu-items').style.display = 'none'; }
    entities.player.applyPassives();
    const actIt = pData.inv.find(i=>i.id===pData.eq.active);
    if(actIt) { document.getElementById('item-btn').style.display='flex'; itemSkill.dbId=actIt.dbId; itemSkill.maxCd=getForgedVal(actIt.dbId,'cd',actIt); itemSkill.cd=0; itemSkill.ready=true; itemSkill.aim=ITEM_DB[actIt.dbId].aim; } else { document.getElementById('item-btn').style.display='none'; itemSkill.dbId=null; }
    entities.enemies = []; entities.bullets = []; entities.particles = []; entities.drops = []; entities.texts = []; entities.visuals = []; entities.minions = []; entities.shockwaves = []; entities.turrets = []; entities.orbitals = [];
    skill = { active: false, cd: 0, maxCd: 15, ready: true, level: 1, cost: 15, upgrades: { cd: 0, dmg: 0, area: 0, slow: 0, burn: 0, healHit: 0, vulnMax: 0, vulnEff: 0, vulnDur: 0, refract: 0, width: 0, minionAtk: 0, minionHp: 0, minionSpd: 0, extraRanged: 0, shotgun_size: 0, shotgun_ult: 0, shotgun_dmg: 0, rootDur: 0, turretDur: 0, shockArea: 0 } };
    ultSkill = { active: false, cd: 0, maxCd: 50, ready: true, cost: 40 }; updateSkillUI(); gameStats = { time: 0, kills: 0, score: 0 };
    document.getElementById('start-menu').classList.add('hidden'); document.getElementById('gameover-menu').classList.add('hidden'); document.getElementById('stats-menu').classList.add('hidden'); document.getElementById('boss-ui').style.display = 'none'; document.getElementById('damage-overlay').style.opacity = 0;
    gameState = 'PLAYING'; lastTime = performance.now();
}
function showMainMenu() { audio.click(); document.getElementById('start-menu').classList.remove('hidden'); document.getElementById('gameover-menu').classList.add('hidden'); gameState = 'MENU'; }
function restartGame() { audio.click(); startGame(difficulty); }
function gameOver() {
    gameState = 'GAMEOVER'; const menu = document.getElementById('gameover-menu'); const stats = document.getElementById('end-stats');
    const minutes = Math.floor(gameStats.time / 60); const seconds = Math.floor(gameStats.time % 60);
    pData.inv = pData.inv.concat(sessionLoot); saveData();
    let lootHtml = sessionLoot.length>0 ? `<br><span style="color:#8e44ad;">获得道具: ${sessionLoot.length} 个 (已存入仓库)</span>` : '';
    stats.innerHTML = `生存时间: ${minutes}分${seconds}秒<br>生存波次: ${waveConfig.wave}<br>击杀数量: ${gameStats.kills}<br>总得分: ${gameStats.score}${lootHtml}`;
    menu.classList.remove('hidden');
}
function gameLoop(timestamp) {
    if (gameState === 'MENU') { requestAnimationFrame(gameLoop); return; }
    let dt = (timestamp - lastTime) / 1000; if (isNaN(dt) || dt > 1.0 || dt <= 0) dt = 0.016; lastTime = timestamp;
    try { if (gameState === 'PLAYING') update(dt); render(); } catch (e) { console.error("Game Loop Error:", e); }
    requestAnimationFrame(gameLoop);
}
function update(dt) {
    gameStats.time += dt;
    if (!skill.ready) { skill.cd -= dt; if (skill.cd <= 0) { if (!skill.ready) audio.skillReady(); skill.cd = 0; skill.ready = true; } }
    if (!ultSkill.ready) { ultSkill.cd -= dt; if (ultSkill.cd <= 0) { if (!ultSkill.ready) audio.skillReady(); ultSkill.cd = 0; ultSkill.ready = true; } }
    if (!itemSkill.ready && itemSkill.dbId) { itemSkill.cd -= dt; if(itemSkill.cd <= 0) { audio.skillReady(); itemSkill.cd=0; itemSkill.ready=true; } }
    updateSkillUI(); updateWaveLogic(dt);
    if(entities.player) entities.player.update(dt);
    entities.turrets.forEach(t => t.update(dt)); entities.turrets = entities.turrets.filter(t => !t.dead);
    entities.orbitals.forEach(o => o.update(dt)); entities.orbitals = entities.orbitals.filter(o => !o.dead);
    entities.enemies.forEach(e => e.update(dt, entities.player)); entities.enemies = entities.enemies.filter(e => !e.dead);
    entities.minions.forEach(m => m.update(dt)); entities.minions = entities.minions.filter(m => !m.dead);
    entities.bullets.forEach(b => b.update(dt)); entities.bullets = entities.bullets.filter(b => !b.dead);
    entities.shockwaves.forEach(s => s.update(dt)); entities.shockwaves = entities.shockwaves.filter(s => !s.dead);
    entities.drops.forEach(d => d.update(dt, entities.player)); entities.drops = entities.drops.filter(d => !d.dead);
    if (entities.particles.length > 200) entities.particles.splice(0, entities.particles.length - 200);
    entities.particles.forEach(p => p.update(dt)); entities.particles = entities.particles.filter(p => p.life > 0);
    entities.visuals.forEach(v => v.update(dt)); entities.visuals = entities.visuals.filter(v => v.life > 0);
    if (entities.texts.length > 50) entities.texts.splice(0, entities.texts.length - 50);
    entities.texts.forEach(t => t.life -= dt); entities.texts = entities.texts.filter(t => t.life > 0);
    updateHUD();
}
function updateWaveLogic(dt) {
    waveConfig.timer += dt; waveConfig.spawnTimer -= dt;
    if (waveConfig.spawnTimer <= 0) {
        spawnEnemies(); let nextInterval = 8 - (waveConfig.wave * 0.05); if (nextInterval < 5) nextInterval = 5; waveConfig.spawnTimer = nextInterval; waveConfig.wave++;
        const currentDiffLevel = Math.floor((waveConfig.wave - 1) / waveConfig.difficultyStep);
        if (currentDiffLevel > waveConfig.colorIdx && waveConfig.colorIdx < COLORS.length - 1) { waveConfig.colorIdx = currentDiffLevel; showFloatingText(`敌人强度提升: ${COLOR_NAMES[waveConfig.colorIdx]}色警戒!`, entities.player.x, entities.player.y - 50, '#e74c3c', 20); }
        if (waveConfig.wave % 10 === 0) spawnBoss();
    }
}
function createExplosion(x, y, radius, damage, isPlayerSource, isSkill = false, isImba = false) {
    audio.explode(); let waveColor = '#e74c3c'; if (isPlayerSource) { if (isImba) waveColor = '#c0392b'; else if (isSkill) waveColor = '#3498db'; else waveColor = '#f39c12'; }
    entities.visuals.push(new ExplosionWave(x, y, radius, waveColor, isImba)); createParticles(x, y, waveColor, isImba ? 20 : 10);
    if (isPlayerSource) {
        let healCount = 0; 
        entities.enemies.forEach(e => { if (Math.hypot(e.x - x, e.y - y) < radius + e.size) { e.takeDamage(damage); if (isSkill) { if (skill.upgrades.slow) e.slowTimer = 6; if (skill.upgrades.burn) { e.burnTimer = 3; e.burnDmg = entities.player.getDmg() * 0.50; } if (skill.upgrades.healHit && healCount < 10) { healCount++; entities.player.heal(1); } } } });
        if (healCount > 0) showFloatingText(`+${healCount} HP`, x, y-30, '#2ecc71', 16);
    } else { if (!entities.player.hidden && Math.hypot(entities.player.x - x, entities.player.y - y) < radius + entities.player.size) entities.player.takeDamage(damage); }
}
function createParticles(x, y, color, count) { for(let i=0; i<count; i++) entities.particles.push(new Particle(x, y, color)); }
function showFloatingText(text, x, y, color, size=16) { entities.texts.push({ text, x, y, color, size, life: 1.0, startY: y }); }
function spawnEnemies() {
    let theoreticalCount = 5 + Math.floor(waveConfig.wave * 2); const hardLimit = waveConfig.wave * 20; if (entities.enemies.length >= hardLimit) theoreticalCount = 0;
    let finalCount = theoreticalCount; let statMultiplier = 1.0;
    if (waveConfig.wave > 40) { const cap = 4 + Math.floor(40 * 2); if (theoreticalCount > cap) { const diff = theoreticalCount - cap; statMultiplier += (diff * 0.01); finalCount = cap; } }
    if (entities.enemies.length >= 200) { finalCount = Math.floor(finalCount * 0.5); statMultiplier *= 2.0; }
    for(let i=0; i<finalCount; i++) entities.enemies.push(new Enemy(false, statMultiplier));
}
function spawnBoss() { entities.enemies.push(new Enemy(true)); }
function getCooldownMultiplier() { const count = skill.upgrades.cd || 0; return Math.pow(0.8, count); }
function handleSkillCD() {
    const p = entities.player; skill.active = false; if(p.trinityTimer!==undefined) p.trinityTimer=getForgedVal('pas_trinity','dur');
    if (p.cheatFlags.noCd) skill.cd = 0.5; else { skill.cd = skill.maxCd * getCooldownMultiplier(); } skill.ready = false; updateSkillUI();
}
function activateSkill() {
    const p = entities.player; if (p.energy < skill.cost) { showFloatingText("NO ENERGY!", p.x, p.y - 40, '#3498db', 20); return; } if (!p.cheatFlags.infiniteEnergy) { p.energy -= skill.cost; } audio.skillCast();
    if (currentWeapon === 'LASER') { p.laserOverloadActive = true; setTimeout(() => { p.laserOverloadActive = false; }, 6000); showFloatingText("OVERLOAD!", p.x, p.y - 40, '#00ffff', 24); handleSkillCD(); } else if (currentWeapon === 'SWARM') { let spawnCount = 2 + (skill.upgrades.extraRanged || 0); for(let i=0; i<spawnCount; i++) { const angle = Math.random() * Math.PI * 2; const mx = p.x + Math.cos(angle) * 40; const my = p.y + Math.sin(angle) * 40; entities.minions.push(new Minion('RANGED', mx, my, p)); } entities.minions.forEach(m => { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25); createParticles(m.x, m.y, '#2ecc71', 3); }); showFloatingText("INCUBATE & HEAL!", p.x, p.y - 40, '#1abc9c', 24); handleSkillCD(); } else if (currentWeapon === 'SHOTGUN') { p.ammo = p.maxAmmo; p.isReloading = false; p.reloadTimer = 0; p.shotgunSkillActive = true; showFloatingText("REINFORCED CLIP!", p.x, p.y - 40, '#e74c3c', 24); handleSkillCD(); } else if (currentWeapon === 'SHOCKWAVE') { p.shockwaveNextMarking = true; p.turretEmpowerNext = true; showFloatingText("NEXT SHOT EMPOWERED!", p.x, p.y - 40, '#2ecc71', 24); handleSkillCD(); } else { skill.active = true; }
}
function activateUltSkill() {
    const p = entities.player; if (p.energy < ultSkill.cost) { showFloatingText("NO ENERGY!", p.x, p.y - 60, '#e74c3c', 20); return; } if (!p.cheatFlags.infiniteEnergy) { p.energy -= ultSkill.cost; } audio.skillCast(); ultSkill.active = true; ultSkill.ready = false; if(p.trinityTimer!==undefined) p.trinityTimer=getForgedVal('pas_trinity','dur');
    if (p.cheatFlags.noCd) { ultSkill.cd = 0.5; } else { ultSkill.cd = ultSkill.maxCd * getCooldownMultiplier(); }
    if (currentWeapon === 'LASER') { p.laserImbaActive = true; p.laserImbaTimer = 10.0; p.laserImbaMaxTime = 10.0; p.laserImbaTick = 0; showFloatingText("ION CANNON!", p.x, p.y - 60, '#f1c40f', 30); } else if (currentWeapon === 'SWARM') { p.swarmImmunityTimer = 8.0; let bestMelee = null, meleeDist = 9999; let bestRanged = null, rangedDist = 9999; let extraRanged = null, extraDist = 9999; entities.minions.forEach(m => { const d = Math.hypot(m.x - p.x, m.y - p.y); if (m.type === 'MELEE' && d < meleeDist) { meleeDist = d; bestMelee = m; } if (m.type === 'RANGED') { if (d < rangedDist) { extraDist = rangedDist; extraRanged = bestRanged; rangedDist = d; bestRanged = m; } else if (d < extraDist) { extraDist = d; extraRanged = m; } } }); let count = 0; if (bestMelee) { bestMelee.giantify(); count++; } if (bestRanged) { bestRanged.giantify(); count++; } if (extraRanged) { extraRanged.giantify(); count++; } if (count > 0) showFloatingText("GIGANTIFY & IMMUNE!", p.x, p.y - 60, '#8e44ad', 30); else showFloatingText("IMMUNITY ONLY!", p.x, p.y - 60, '#7f8c8d', 20); ultSkill.active = false; } else if (currentWeapon === 'SHOTGUN') { p.shotgunUltActive = true; p.shotgunUltTimer = 8.0; p.ammo = p.maxAmmo; showFloatingText("UNLEASH!", p.x, p.y - 60, '#8e44ad', 30); } else if (currentWeapon === 'SHOCKWAVE') { entities.turrets.push(new Turret(p.x, p.y)); showFloatingText("SHOCKWAVE TOWER!", p.x, p.y - 60, '#f1c40f', 30); ultSkill.active = false; } else { p.cannonImbaActive = true; p.cannonImbaTimer = 8.0; showFloatingText("HEAVY BOMBARDMENT!", p.x, p.y - 60, '#e74c3c', 30); }
    updateSkillUI();
}
function activateItemSkill() {
    const p = entities.player; if (!p || !itemSkill.dbId || !itemSkill.ready) return; audio.skillCast(); itemSkill.ready = false; if(p.trinityTimer!==undefined) p.trinityTimer=getForgedVal('pas_trinity','dur');
    if (p.cheatFlags.noCd) { itemSkill.cd = 0.5; } else { itemSkill.cd = itemSkill.maxCd; }
    const dur = getForgedVal(itemSkill.dbId, 'dur'); const eff = getForgedVal(itemSkill.dbId, 'effect');
    if(itemSkill.dbId === 'act_overcharge') { p.i_overcharge=dur; p.i_overchargeMult=eff; showFloatingText("OVERCHARGE!", p.x, p.y-40, '#f1c40f', 24); }
    else if(itemSkill.dbId === 'act_nitro') { p.i_nitro=dur; p.i_nitroMult=eff; showFloatingText("NITRO!", p.x, p.y-40, '#3498db', 24); }
    else if(itemSkill.dbId === 'act_repair') { p.i_repair=dur; p.i_repairMult=eff; showFloatingText("REPAIRING!", p.x, p.y-40, '#2ecc71', 24); }
    else if(itemSkill.dbId === 'act_fortify') { p.i_fortify=dur; p.i_fortifyMult=eff; showFloatingText("FORTIFY!", p.x, p.y-40, '#95a5a6', 24); }
    else if(itemSkill.dbId === 'act_radar') { p.i_radar=dur; showFloatingText("RADAR JAMMED!", p.x, p.y-40, '#000', 24); }
    else if(itemSkill.dbId === 'act_wormhole') { p.hidden=true; showFloatingText("WARP!", p.x, p.y-40, '#9b59b6', 24); setTimeout(()=>{ p.x=itemSkill.aimX; p.y=itemSkill.aimY; p.hidden=false; camera.x=p.x-canvas.width/2; camera.y=p.y-canvas.height/2; }, 500); }
    else if(itemSkill.dbId === 'act_orbital') { entities.orbitals.push(new OrbitalController(itemSkill.aimX, itemSkill.aimY, dur, p.getDmg()*eff, getForgedVal('act_orbital','speed')); showFloatingText("TARGET LOCKED!", itemSkill.aimX, itemSkill.aimY, '#e74c3c', 20); }
    else if(itemSkill.dbId === 'act_shield') { p.i_shieldTimer=dur; p.maxShield=p.maxHp*eff; p.shield=p.maxShield; showFloatingText("SHIELD UP!", p.x, p.y-40, '#3498db', 24); }
    updateSkillUI();
}
function showLevelUpMenu(isBossReward = false) {
    const container = document.getElementById('upgrade-container'); container.innerHTML = ''; const options = generateUpgradeOptions(isBossReward);
    options.forEach(opt => { const card = document.createElement('div'); card.className = `card ${opt.rarity}`; if (opt.isSkill) card.classList.add('skill-card'); card.innerHTML = `<div class="card-title" style="color:${opt.color}">${opt.title}</div><div class="card-desc">${opt.desc}</div>`; card.onclick = () => { audio.click(); applyUpgrade(opt); document.getElementById('levelup-menu').classList.add('hidden'); gameState = 'PLAYING'; }; container.appendChild(card); });
    document.getElementById('levelup-menu').classList.remove('hidden');
}
function generateUpgradeOptions(isBossReward) {
    const opts = []; const p = entities.player; const isSkillTurn = (p.level % 3 === 0);
    if (isSkillTurn) {
        let skillPool = [];
        if (currentWeapon === 'CANNON') { skillPool = [ { id: 'area', title: '爆破范围', desc: '技能爆炸范围 +25%', type: 'area' }, { id: 'dmg', title: '高爆装药', desc: '技能伤害 +25%', type: 'dmg' }, { id: 'cd', title: '快速装填', desc: '技能冷却 -20% (乘法)', type: 'cd' }, { id: 'healHit', title: '吸血爆破', desc: '特殊技能每命中一个敌人回复 1 HP', type: 'healHit' }, { id: 'slow', title: '震荡冲击', desc: '技能命中减速敌人 50% 持续 6秒', type: 'slow' }, { id: 'burn', title: '燃烧弹', desc: '技能命中点燃敌人 3秒 (50%攻击力/秒)', type: 'burn' } ]; } else if (currentWeapon === 'LASER') { skillPool = [ { id: 'dmg', title: '聚焦透镜', desc: '技能伤害 +25%', type: 'dmg' }, { id: 'cd', title: '快速充能', desc: '技能冷却 -20% (乘法)', type: 'cd' }, { id: 'refract', title: '多重折射', desc: '特殊技能每束光束折射次数 +2 (强制)', type: 'refract' }, { id: 'width', title: '高能光束', desc: 'IMBA技能光束宽度 +20%', type: 'width' }, { id: 'vulnMax', title: '深度易伤', desc: '技能可施加的易伤层数上限 +1', type: 'vulnMax' }, { id: 'vulnEff', title: '易伤增强', desc: '技能施加的易伤效果提升 33%', type: 'vulnEff' }, { id: 'vulnDur', title: '易伤持久', desc: '技能施加的易伤持续时间提升 50%', type: 'vulnDur' } ]; } else if (currentWeapon === 'SWARM') { skillPool = [ { id: 'minionAtk', title: '群体狂怒', desc: '寄生物伤害 +25%', type: 'minionAtk' }, { id: 'minionHp', title: '甲壳强化', desc: '寄生物生命值 +25%', type: 'minionHp' }, { id: 'minionSpd', title: '代谢加速', desc: '寄生物移动速度 +25%', type: 'minionSpd' }, { id: 'cd', title: '孵化加速', desc: '技能冷却时间 -20% (乘法)', type: 'cd' }, { id: 'extraRanged', title: '额外孵化', desc: '特殊技能召唤的远程寄生物数量 +1', type: 'extraRanged' } ]; } else if (currentWeapon === 'SHOTGUN') { skillPool = [ { id: 'shotgun_size', title: '巨型弹头', desc: '特殊技能子弹体积增加 25%', type: 'shotgun_size' }, { id: 'shotgun_ult', title: '毁灭冲击', desc: 'IMBA技能伤害与爆炸范围提升 20%', type: 'shotgun_ult' }, { id: 'shotgun_dmg', title: '强装火药', desc: '技能伤害提升 25%', type: 'shotgun_dmg' }, { id: 'cd', title: '战术换弹', desc: '技能冷却时间 -20% (乘法)', type: 'cd' } ]; } else if (currentWeapon === 'SHOCKWAVE') { skillPool = [ { id: 'rootDur', title: '深度禁锢', desc: '特殊技能禁锢时间提升 20%', type: 'rootDur' }, { id: 'turretDur', title: '炮塔持久', desc: '炮塔持续时间提升 15%', type: 'turretDur' }, { id: 'shockArea', title: '冲击波范围', desc: '冲击波范围提升 20%', type: 'shockArea' }, { id: 'cd', title: '快速蓄力', desc: '技能冷却时间 -20% (乘法)', type: 'cd' } ]; }
        if(skillPool.length > 0) { let shuffled = skillPool.sort(() => 0.5 - Math.random()); let selected = shuffled.slice(0, 3); selected.forEach(s => { opts.push({ id: 'skill_' + s.id, title: s.title, desc: s.desc, rarity: 'rare', color: '#3498db', isSkill: true, skillType: s.type }); }); }
    } else {
        const baseStats = [ { id: 'atk', name: '攻击力', val: 0.25 }, { id: 'hp', name: '最大生命', val: 0.25 }, { id: 'speed', name: '移动速度', val: 0.10 }, { id: 'regen', name: '生命回复', val: 0.005 }, { id: 'energy', name: '能量上限', val: 0.15 }, { id: 'energyRegen', name: '能量回复', val: 0.2 } ];
        if (currentWeapon === 'CANNON') { baseStats.push({ id: 'splash', name: '溅射范围', val: 0.20 }); baseStats.push({ id: 'projSpd', name: '炮弹速度', val: 0.25 }); baseStats.push({ id: 'atkSpd', name: '攻击速度', val: 0.20 }); } else if (currentWeapon === 'SWARM') { baseStats.push({ id: 'atkSpd', name: '攻击速度', val: 0.20 }); } else if (currentWeapon === 'LASER') { baseStats.push({ id: 'atkSpd', name: '攻击速度', val: 0.20 }); } else if (currentWeapon === 'SHOTGUN') { baseStats.push({ id: 'reloadSpd', name: '装填速度', val: 0.15 }); baseStats.push({ id: 'pelletCnt', name: '子弹数量', val: 0.25 }); baseStats.push({ id: 'projSpd', name: '子弹速度', val: 0.15 }); } else if (currentWeapon === 'SHOCKWAVE') { baseStats.push({ id: 'shockArea', name: '冲击波范围', val: 0.20 }); }
        let pool = [...baseStats]; pool.sort(() => Math.random() - 0.5); const selectedStats = pool.slice(0, 3);
        selectedStats.forEach(stat => { let rarity = 'common', mult = 1, color = '#fff'; const r = Math.random(); if (r < 0.1) { rarity = 'legendary'; mult = 2; color = '#f1c40f'; } else if (r < 0.3) { rarity = 'rare'; mult = 1.5; color = '#9b59b6'; } let displayVal = ""; if (stat.id === 'regen') displayVal = `+${(stat.val * mult * 100).toFixed(1)}%`; else if (stat.id === 'energyRegen') displayVal = `+${(stat.val * mult).toFixed(1)}/s`; else if (stat.id === 'pelletCnt') displayVal = `+1`; else displayVal = `+${Math.round(stat.val * mult * 100)}%`; opts.push({ id: stat.id, val: stat.val * mult, title: `${stat.name} ${displayVal}`, desc: rarity === 'common' ? '基础提升' : (rarity === 'rare' ? '稀有提升!' : '传说提升!!'), rarity: rarity, color: color, isSkill: false }); });
    }
    if(opts.length === 0) { opts.push({ id: 'hp', val: 0.2, title: "应急维修", desc: "立刻恢复 20% 生命值", rarity: 'common', color: '#fff', isSkill: false }); }
    return opts;
}
function applyUpgrade(opt) {
    const p = entities.player; if(!p) return; let historyName = opt.title; if (!p.upgradeHistory[historyName]) p.upgradeHistory[historyName] = 0; p.upgradeHistory[historyName]++; let safeVal = isNaN(opt.val) ? 0 : opt.val;
    if (opt.isSkill) { skill.upgrades[opt.skillType] = (skill.upgrades[opt.skillType] || 0) + 1; showFloatingText("技能强化!", entities.player.x, entities.player.y, '#3498db', 30); } 
    else { if (opt.id === 'regen') entities.player.regen += safeVal; else if (opt.id === 'energyRegen') entities.player.energyRegen += safeVal; else if (opt.id === 'minionAtk') skill.upgrades.minionAtk = (skill.upgrades.minionAtk || 0) + safeVal; else if (opt.id === 'minionHp') skill.upgrades.minionHp = (skill.upgrades.minionHp || 0) + safeVal; else if (opt.id === 'shockArea') skill.upgrades.shockArea = (skill.upgrades.shockArea || 0) + safeVal; else if (entities.player.multipliers[opt.id] !== undefined) { entities.player.multipliers[opt.id] *= (1 + safeVal); } if (opt.id === 'hp' && !isGodMode) entities.player.heal(20); if (opt.id === 'energy') entities.player.gainEnergy(20); }
}
function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#dcdcdc'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.beginPath(); for(let x=0; x<=MAP_SIZE; x+=100) { ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE); } for(let y=0; y<=MAP_SIZE; y+=100) { ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y); } ctx.stroke();
    entities.turrets.forEach(t => { ctx.save(); ctx.translate(t.x, t.y); ctx.shadowBlur = 10; ctx.shadowColor = 'black'; ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(0, 0, t.size, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = t.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); for(let i=0; i<5; i++) { const angle = (i * 2 * Math.PI / 5) - Math.PI / 2; const r = t.size * 0.8; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    entities.visuals.forEach(v => v.render(ctx));
    entities.shockwaves.forEach(s => { ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0, s.currentRadius), 0, Math.PI * 2); ctx.strokeStyle = s.color; ctx.lineWidth = s.currentWidth; ctx.globalAlpha = 0.8 * (s.life / s.maxLife); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0, s.currentRadius - s.currentWidth/2), 0, Math.PI * 2); ctx.strokeStyle = 'black'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0, s.currentRadius + s.currentWidth/2), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
    entities.drops.forEach(d => {
        if(d.type==='ITEM') ctx.fillStyle = RARITIES[d.rarity].color; else if (d.type === 'ENERGY') ctx.fillStyle = '#3498db'; else ctx.fillStyle = d.type === 'XP' ? '#f1c40f' : (d.type === 'HEAL' ? '#2ecc71' : '#e74c3c');
        ctx.beginPath(); ctx.arc(d.x, d.y, d.type==='ITEM'?8:5, 0, Math.PI*2); ctx.fill(); if(d.type==='ITEM') { ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke(); }
        if (d.type === 'ENERGY') { ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText('E', d.x-3, d.y+3); } else if (d.type !== 'XP' && d.type!=='ITEM') { ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText('?', d.x-3, d.y+3); }
    });
    entities.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; });
    entities.minions.forEach(m => m.render(ctx));
    entities.enemies.forEach(e => {
        ctx.save(); if (e.isBoss) { ctx.shadowBlur = 60; ctx.shadowColor = e.color; ctx.fillStyle = e.color; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 1.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
        if (e.type === ENEMY_TYPES.ENERGY && e.charging) { ctx.beginPath(); ctx.moveTo(e.x, e.y); const drawX = e.aimLocked ? e.aimTarget.x : e.aimTarget.x || entities.player.x; const drawY = e.aimLocked ? e.aimTarget.y : e.aimTarget.y || entities.player.y; ctx.lineTo(drawX, drawY); ctx.strokeStyle = `rgba(231, 76, 60, ${e.attackTimer < 2 ? 0.8 : 0.3})`; ctx.lineWidth = e.attackTimer < 1 ? 3 : 1; ctx.stroke(); if (e.attackTimer < 2) { ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(drawX, drawY, 20 + (e.colorIdx * 2), 0, Math.PI*2); ctx.stroke(); } }
        const angleToTarget = Math.atan2(e.currentTarget.y - e.y, e.currentTarget.x - e.x); ctx.translate(e.x, e.y); ctx.rotate(angleToTarget);
        if (e.isPriming) { const flash = Math.floor(e.flashTimer * 10) % 2 === 0; ctx.fillStyle = flash ? '#fff' : '#e74c3c'; ctx.strokeStyle = '#e74c3c'; } else { ctx.fillStyle = e.color; ctx.strokeStyle = e.isElite ? '#f1c40f' : '#000'; } ctx.lineWidth = e.isElite ? 3 : 1;
        if (e.vulnStacks > 0) { ctx.shadowBlur = 10; ctx.shadowColor = '#9b59b6'; } if (e.parasiteTime > 0) { ctx.shadowBlur = 10; ctx.shadowColor = '#2ecc71'; } if (e.rootTimer > 0) { ctx.shadowBlur = 10; ctx.shadowColor = '#95a5a6'; } 
        ctx.beginPath(); if (e.type === ENEMY_TYPES.BASIC) ctx.rect(-e.size/2, -e.size/2, e.size, e.size); else if (e.type === ENEMY_TYPES.HEAVY) { const sides = 5; const radius = e.size * 0.6; for (let i = 0; i < sides; i++) { const theta = (i * 2 * Math.PI / 5) - Math.PI / 2; const px = Math.cos(theta) * radius; const py = Math.sin(theta) * radius; if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); } else if (e.type === ENEMY_TYPES.KAMIKAZE) { ctx.moveTo(e.size, 0); ctx.lineTo(-e.size/2, e.size/2); ctx.lineTo(-e.size/2, -e.size/2); ctx.closePath(); } else if (e.type === ENEMY_TYPES.ENERGY) { ctx.arc(0, 0, e.size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.size/4, 0, e.size/6, 0, Math.PI*2); } if (e.type !== ENEMY_TYPES.ENERGY) { ctx.fill(); ctx.stroke(); }
        if (e.rootTimer > 0) { ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-e.size, -e.size); ctx.lineTo(e.size, e.size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.size, -e.size); ctx.lineTo(-e.size, e.size); ctx.stroke(); }
        if (e.echoTimer > 0) { ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, e.size + 5, 0, Math.PI*2); ctx.stroke(); } ctx.restore();
        const hpWidth = e.size * 1.5; const hpHeight = 4; const hpY = e.y - e.size * 0.8; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(e.x - hpWidth/2, hpY, hpWidth, hpHeight); const hpPercent = Math.max(0, e.hp / e.maxHp); ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c'; ctx.fillRect(e.x - hpWidth/2, hpY, hpWidth * hpPercent, hpHeight);
        if (e.vulnStacks > 0) { const dotSize = 3; const startX = e.x - (e.vulnStacks * dotSize * 1.5) / 2; ctx.fillStyle = '#9b59b6'; for (let i = 0; i < e.vulnStacks; i++) { ctx.beginPath(); ctx.arc(startX + i * dotSize * 1.5, hpY - 5, dotSize/2, 0, Math.PI*2); ctx.fill(); } }
    });
    const p = entities.player; 
    if(!p.hidden) {
        ctx.save(); ctx.translate(p.x, p.y); 
        ctx.save(); let hullAngle = joystick.active ? p.moveAngle : p.aimAngle; ctx.rotate(hullAngle);
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(-p.size*0.7, -p.size*0.6, p.size*1.4, p.size*0.3); ctx.fillRect(-p.size*0.7, p.size*0.3, p.size*1.4, p.size*0.3);  
        ctx.fillStyle = '#3498db'; if (p.level >= 20) ctx.fillStyle = '#2980b9'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.fillRect(-p.size*0.6, -p.size*0.4, p.size*1.2, p.size*0.8); ctx.strokeRect(-p.size*0.6, -p.size*0.4, p.size*1.2, p.size*0.8);
        ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-p.size*0.4, -p.size*0.2, p.size*0.3, p.size*0.4); ctx.restore();
        ctx.save(); ctx.rotate(p.aimAngle);
        let turretColor = '#95a5a6'; if (p.cannonImbaActive || p.laserImbaActive || p.shotgunUltActive || p.shotgunSkillActive) turretColor = '#e74c3c'; else if (currentWeapon === 'LASER') turretColor = '#3498db'; else if (currentWeapon === 'SWARM') turretColor = '#8e44ad'; else if (currentWeapon === 'SHOTGUN') turretColor = '#e67e22'; else if (currentWeapon === 'SHOCKWAVE') turretColor = '#16a085'; else if (p.level >= 10) turretColor = '#2980b9';
        ctx.fillStyle = turretColor;
        if (currentWeapon === 'LASER') { ctx.fillRect(0, -3, p.size * 1.0, 6); ctx.beginPath(); ctx.arc(0, 0, p.size*0.4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(0, 0, p.size*0.2, 0, Math.PI*2); ctx.fill(); } else if (currentWeapon === 'SWARM') { ctx.beginPath(); ctx.moveTo(p.size*0.8, 0); ctx.lineTo(-p.size*0.2, p.size*0.4); ctx.lineTo(-p.size*0.2, -p.size*0.4); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, p.size*0.3, 0, Math.PI*2); ctx.fill(); } else if (currentWeapon === 'SHOTGUN') { ctx.fillRect(0, -6, p.size * 0.7, 4); ctx.fillRect(0, 2, p.size * 0.7, 4); ctx.fillRect(0, -2, p.size * 0.8, 4); ctx.beginPath(); ctx.arc(0, 0, p.size*0.4, 0, Math.PI*2); ctx.fillStyle = '#d35400'; ctx.fill(); } else if (currentWeapon === 'SHOCKWAVE') { ctx.beginPath(); for(let i=0; i<5; i++) { const angle = (i * 2 * Math.PI / 5) - Math.PI / 2; const r = p.size * 0.5; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(0, -4, p.size * 0.8, 8); if (p.level >= 10) { ctx.fillRect(0, -8, p.size * 0.6, 4); ctx.fillRect(0, 4, p.size * 0.6, 4); } ctx.beginPath(); ctx.arc(0, 0, p.size*0.4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(0, 0, p.size*0.15, 0, Math.PI*2); ctx.fill(); }
        ctx.restore(); 
        if(p.shield>0) { ctx.beginPath(); ctx.arc(0,0,p.size*1.5,0,Math.PI*2); ctx.fillStyle='rgba(155, 89, 182, 0.3)'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#9b59b6'; ctx.stroke(); }
        ctx.restore();
    }
    if(itemSkill.aiming && itemSkill.aim) {
        let maxGameDist = 300; 
        if(itemSkill.dbId === 'act_wormhole') maxGameDist = getForgedVal('act_wormhole','effect');
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.arc(0, 0, maxGameDist, 0, Math.PI*2);
        ctx.strokeStyle='rgba(255,255,255,0.3)';
        ctx.lineWidth=2;
        ctx.stroke();
        ctx.restore();
        
        const aimSize = itemSkill.dbId==='act_orbital'?200:30;
        ctx.beginPath();
        ctx.arc(itemSkill.aimX, itemSkill.aimY, aimSize, 0, Math.PI*2);
        ctx.strokeStyle='rgba(231,76,60,0.5)';
        ctx.lineWidth=2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(itemSkill.aimX, itemSkill.aimY);
        ctx.setLineDash([5,5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    entities.bullets.forEach(b => {
        ctx.save(); ctx.translate(b.x, b.y);
        if (b.isSwarmShot) { ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillStyle = b.color; ctx.fillRect(-10, -2, 20, 4); } else { if (b.isPlayer) { ctx.shadowBlur = b.isImba ? 20 : (b.isSkill ? 15 : 5); ctx.shadowColor = b.color; } ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(0, 0, b.size, 0, Math.PI*2); ctx.fill(); if (b.isImba) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, b.size * 0.5, 0, Math.PI*2); ctx.fill(); } }
        ctx.restore();
    });
    ctx.textAlign = 'center'; entities.texts.forEach(t => { ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px Arial`; ctx.fillText(t.text, t.x, t.y - (1.0 - t.life) * 30); });
    ctx.restore();
}
function updateHUD() {
    const p = entities.player; const maxHp = Math.ceil(p.maxHp);
    document.getElementById('hp-text').innerText = `${Math.ceil(p.hp)}/${maxHp}`; document.getElementById('hp-bar').style.width = `${(p.hp / maxHp) * 100}%`;
    document.getElementById('shield-bar').style.width = p.maxShield>0 ? `${(p.shield/p.maxShield)*100}%` : '0%';
    const maxEnergy = Math.floor(p.maxEnergy * p.multipliers.energy); document.getElementById('mp-text').innerText = `${Math.floor(p.energy)}`; document.getElementById('energy-bar').style.width = `${(p.energy / maxEnergy) * 100}%`;
    if (currentWeapon === 'SHOTGUN') { const ammoDisp = document.getElementById('ammo-val'); if (p.isReloading) { ammoDisp.innerText = "RELOADING"; ammoDisp.className = "reloading-text"; } else { if (p.shotgunUltActive) ammoDisp.innerText = "∞/∞"; else ammoDisp.innerText = `${p.ammo}/${p.maxAmmo}`; ammoDisp.className = ""; } }
    const hpRatio = p.hp / maxHp; document.getElementById('damage-overlay').style.opacity = hpRatio < 0.5 ? (0.5 - hpRatio) * 2 : 0;
    document.getElementById('lvl-text').innerText = p.level; document.getElementById('xp-bar').style.width = `${(p.xp / p.nextLevelXp) * 100}%`;
    document.getElementById('wave-text').innerText = `WAVE ${waveConfig.wave}`; document.getElementById('score-text').innerText = `SCORE: ${Math.floor(gameStats.score)}`; document.getElementById('enemy-counter').innerText = `ENEMIES: ${entities.enemies.length}`;
    const boss = entities.enemies.find(e => e.isBoss);
    if (boss) { document.getElementById('boss-hp-bar').style.width = `${(boss.hp / boss.maxHp) * 100}%`; const dx = boss.x - p.x; const dy = boss.y - p.y; if (Math.hypot(dx, dy) > Math.min(canvas.width, canvas.height)/2) { const angle = Math.atan2(dy, dx); const cx = canvas.width/2; const cy = canvas.height/2; const r = Math.min(cx, cy) - 20; ctx.save(); ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.arc(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r, 10, 0, Math.PI*2); ctx.fill(); ctx.restore(); } }
    const skillBtn = document.getElementById('skill-btn'); const ultBtn = document.getElementById('ult-btn');
    if (p.energy < skill.cost && !p.cheatFlags.infiniteEnergy) skillBtn.classList.add('disabled'); else skillBtn.classList.remove('disabled');
    if (p.energy < ultSkill.cost && !p.cheatFlags.infiniteEnergy) ultBtn.classList.add('disabled'); else ultBtn.classList.remove('disabled');
}
function updateSkillUI() {
    const sOverlay = document.getElementById('skill-cd-overlay'); const sBtn = document.getElementById('skill-btn'); const sTimer = document.getElementById('skill-timer');
    if (skill.ready) { sOverlay.style.height = '0%'; sBtn.classList.add('ready'); sTimer.innerText = ''; } else { sOverlay.style.height = `${(skill.cd / skill.maxCd) * 100}%`; sBtn.classList.remove('ready'); sTimer.innerText = Math.ceil(skill.cd); }
    const uOverlay = document.getElementById('ult-cd-overlay'); const uBtn = document.getElementById('ult-btn'); const uTimer = document.getElementById('ult-timer');
    if (ultSkill.ready) { uOverlay.style.height = '0%'; uBtn.classList.add('ready'); uTimer.innerText = ''; } else { uOverlay.style.height = `${(ultSkill.cd / ultSkill.maxCd) * 100}%`; uBtn.classList.remove('ready'); uTimer.innerText = Math.ceil(ultSkill.cd); }
    if(itemSkill.dbId) {
        const iOverlay = document.getElementById('item-cd-overlay'); const iBtn = document.getElementById('item-btn'); const iTimer = document.getElementById('item-timer');
        if (itemSkill.ready) { iOverlay.style.height = '0%'; iBtn.classList.add('ready'); iTimer.innerText = ''; } else { iOverlay.style.height = `${(itemSkill.cd / itemSkill.maxCd) * 100}%`; iBtn.classList.remove('ready'); iTimer.innerText = Math.ceil(itemSkill.cd); }
    }
}