let pData = { inv: [], frag: 0, eq: { active: null, passive1: null, passive2: null } };
function loadData() { 
    const d = localStorage.getItem('ts2d_data'); 
    if(d) {
        pData = JSON.parse(d); 
        if(!pData.inv) pData.inv = [];
        pData.inv.forEach(i => { if(!i.forge) i.forge = {}; });
    }
}
function saveData() { localStorage.setItem('ts2d_data', JSON.stringify(pData)); }
loadData();

let canvas, ctx, lastTime = 0, gameState = 'MENU';
let difficulty = 1, isGodMode = false, currentWeapon = 'CANNON'; 
let waveConfig = { wave: 1, timer: 0, spawnTimer: 0, interval: 8, difficultyStep: 5 }; 
let gameStats = { time: 0, kills: 0, score: 0 };
let camera = { x: 0, y: 0 }; 
let skill = { active: false, cd: 0, maxCd: 15, ready: true, level: 0, upgrades: {}, cost: 15 };
let ultSkill = { active: false, cd: 0, maxCd: 50, ready: true, cost: 40 };
let sessionLoot = [];
let entities = { player: null, enemies: [], bullets: [], particles: [], drops: [], texts: [], visuals: [], minions: [], shockwaves: [], turrets: [], orbitals: [] };

let invPage = 0;
const ITEMS_PER_PAGE = 20; 
let invFilter = 'ALL'; 
let rarityFilter = 'ALL';
let selectedInvId = null;
let isBatchMode = false;
let batchSet = new Set();


function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function selectWeapon(wpn) { audio.click(); currentWeapon = wpn; document.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('selected')); document.getElementById('wpn-'+wpn.toLowerCase()).classList.add('selected'); }
function toggleCheatBtn() { document.getElementById('cheat-inv-btn').style.display = document.getElementById('god-mode-check').checked ? 'block' : 'none'; }

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
        const currentHp = Math.ceil(p.maxHp); const currentAtk = (p.getDmg()).toFixed(1); const atkPerSec = (1 / (p.atkSpd * p.multipliers.atkSpd)).toFixed(2); const moveSpd = Math.floor(p.speed * p.multipliers.speed); const regen = (p.maxHp * p.regen).toFixed(1); const maxEnergy = Math.floor(p.maxEnergy * p.multipliers.energy); const energyRegen = (p.energyRegen * p.multipliers.energyRegen).toFixed(1);
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
function openInventory() { audio.click(); document.getElementById('start-menu').classList.add('hidden'); document.getElementById('inventory-menu').classList.remove('hidden'); renderInventory(); }
function closeInventory() { audio.click(); isBatchMode = false; batchSet.clear(); document.getElementById('inventory-menu').classList.add('hidden'); document.getElementById('start-menu').classList.remove('hidden'); saveData(); }
function setInvFilter(f) { audio.click(); invFilter = f; invPage = 0; document.querySelectorAll('.inv-filters .filter-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); renderInventory(); }
function setRarityFilter(r) { audio.click(); rarityFilter = r; invPage = 0; renderInventory(); }
function cheatGiveItems() { audio.click(); for(let k in ITEM_DB) { pData.inv.push({ id:genId(), dbId:k, rarity:'WHITE', forge:{}, fragSpent:0 }); } saveData(); renderInventory(); }
function changePage(delta) {
    audio.click(); 
    let filtered = pData.inv.filter(i => 
        (invFilter==='ALL' || ITEM_DB[i.dbId].type===invFilter) && 
        (rarityFilter==='ALL' || i.rarity === rarityFilter)
    );
    const maxPage = Math.max(0, Math.ceil(filtered.length / ITEMS_PER_PAGE) - 1);
    invPage += delta; if(invPage < 0) invPage = 0; if(invPage > maxPage) invPage = maxPage;
    renderInventory();
}
function toggleBatchMode() { audio.click(); isBatchMode = !isBatchMode; batchSet.clear(); selectedInvId = null; renderInventory(); }
function toggleBatchSelect(id) {
    audio.click(); if(Object.values(pData.eq).includes(id)) return;
    if(batchSet.has(id)) batchSet.delete(id); else batchSet.add(id);
    renderInventory();
}
function selectAllCurrentPage() {
    audio.click();
    let filtered = pData.inv.filter(i => 
        (invFilter==='ALL' || ITEM_DB[i.dbId].type===invFilter) && 
        (rarityFilter==='ALL' || i.rarity === rarityFilter)
    );
    filtered.sort((a,b) => { const rA=Object.keys(RARITIES).indexOf(a.rarity); const rB=Object.keys(RARITIES).indexOf(b.rarity); return rB-rA || a.dbId.localeCompare(b.dbId); });
    const pageItems = filtered.slice(invPage * ITEMS_PER_PAGE, (invPage + 1) * ITEMS_PER_PAGE);
    
    let changed = false;
    pageItems.forEach(i => {
        if(!Object.values(pData.eq).includes(i.id)) {
            if(!batchSet.has(i.id)) { batchSet.add(i.id); changed = true; }
        }
    });
    if(changed) renderInventory();
}

function calcStatSpent(item) {
    if (!item.forge) return 0;
    return Object.values(item.forge).reduce((sum, lvl) => sum + 5 * lvl * (lvl + 1), 0);
}

function getTotalForgeLevel(item) {
    if (!item.forge) return 0;
    return Object.values(item.forge).reduce((a, b) => a + b, 0);
}

function autoForgeAll() {
    audio.click();
    if (isBatchMode) return;
    
    let consumedIds = new Set();
    let forgedCount = 0;

    for (let i = 0; i < pData.inv.length; i++) {
        let mainItem = pData.inv[i];
        
        if (Object.values(pData.eq).includes(mainItem.id)) continue;
        if (consumedIds.has(mainItem.id)) continue;
        if (getTotalForgeLevel(mainItem) > 0) continue;
        
        let rInfo = RARITIES[mainItem.rarity];
        if (!rInfo.next) continue;
        
        let cost = rInfo.forgeCost;
        if (pData.frag < cost) continue; 
        
        let matIdx = pData.inv.findIndex((mat, idx) => 
            idx !== i &&
            mat.dbId === mainItem.dbId &&
            mat.rarity === mainItem.rarity && 
            !Object.values(pData.eq).includes(mat.id) &&
            !consumedIds.has(mat.id) &&
            getTotalForgeLevel(mat) === 0
        );

        if (matIdx !== -1) {
            let matItem = pData.inv[matIdx];
            pData.frag -= cost;
            mainItem.rarity = rInfo.next;
            mainItem.fragSpent = (mainItem.fragSpent || 0) + cost + (matItem.fragSpent || 0);
            consumedIds.add(matItem.id);
            forgedCount++;
        }
    }

    const btn = document.getElementById('auto-forge-btn');
    if (forgedCount > 0) {
        if(selectedInvId && consumedIds.has(selectedInvId)) {
            selectedInvId = null;
        }
        pData.inv = pData.inv.filter(item => !consumedIds.has(item.id));
        saveData();
        renderInventory();
        
        btn.innerText = `成功锻造 x${forgedCount}`;
        btn.style.background = '#2ecc71';
        setTimeout(() => {
            btn.innerText = '一键锻造';
            btn.style.background = '#9b59b6';
        }, 1500);
    } else {
        btn.innerText = `无可用锻造`;
        btn.style.background = '#e74c3c';
        setTimeout(() => {
            btn.innerText = '一键锻造';
            btn.style.background = '#9b59b6';
        }, 1000);
    }
}

function confirmBatchSell() {
    if(batchSet.size === 0) return; audio.click(); let fragGain = 0;
    batchSet.forEach(id => { 
        const it = pData.inv.find(i=>i.id===id); 
        if(it) fragGain += (RARITIES[it.rarity].cost + calcStatSpent(it) + (it.fragSpent || 0)); 
    });
    pData.inv = pData.inv.filter(i => !batchSet.has(i.id)); 
    pData.frag += fragGain;
    batchSet.clear(); isBatchMode = false; renderInventory();
}

function selectEquipSlot(slot) {
    audio.click();
    const eid = pData.eq[slot];
    if(eid) {
        if(isBatchMode) { isBatchMode = false; batchSet.clear(); }
        selectedInvId = eid;
        renderInventory();
    }
}

function calcStatVal(dbId, stat, level) {
    const db = ITEM_DB[dbId]; 
    const base = db[stat]; 
    if(base === undefined) return 0;
    const MAX_LEVEL = 10;
    const clvl = Math.min(MAX_LEVEL, level);
    
    if (stat === 'cd') {
        return base * (1 - (clvl / MAX_LEVEL) * (2/3));
    } else {
        return base * (1 + (clvl / MAX_LEVEL) * 2);
    }
}

function getForgedVal(dbId, stat, itemArg=null) {
    let item = itemArg; 
    if(!item) item = pData.inv.find(i => i.id === pData.eq.active) || pData.inv.find(i => i.dbId === dbId && [pData.eq.passive1, pData.eq.passive2].includes(i.id));
    if(!item) return ITEM_DB[dbId][stat] || 0; 
    return calcStatVal(dbId, stat, item.forge[stat] || 0);
}

function formatStat(stat, val, dbId) {
    if (stat === 'cd' || stat === 'dur') return val.toFixed(1) + '秒';
    if (stat === 'speed') return val.toFixed(1);
    if (stat === 'effect') {
        if (dbId === 'act_wormhole') return val.toFixed(0) + '像素';
        if (dbId === 'act_orbital') return val.toFixed(2) + '倍';
        return '+' + (val * 100).toFixed(1) + '%';
    }
    return val.toFixed(2);
}

function formatStatDiff(stat, diff, dbId) {
    let sign = diff > 0 ? '+' : '';
    if (stat === 'cd' || stat === 'dur') return sign + diff.toFixed(1) + '秒';
    if (stat === 'speed') return sign + diff.toFixed(1);
    if (stat === 'effect') {
        if (dbId === 'act_wormhole') return sign + diff.toFixed(0) + '像素';
        if (dbId === 'act_orbital') return sign + diff.toFixed(2) + '倍';
        return sign + (diff * 100).toFixed(1) + '%';
    }
    return sign + diff.toFixed(2);
}

function statMap(s) { const m = {cd:'冷却',dur:'持续',effect:'效果',speed:'速度'}; return m[s]||s; }
function unequipItem(id) { audio.click(); for(let k in pData.eq) { if(pData.eq[k]===id) pData.eq[k]=null; } renderInventory(); }
function equipItem(id) {
    audio.click(); const it = pData.inv.find(i=>i.id===id); if(!it) return; unequipItem(id);
    if(ITEM_DB[it.dbId].type==='ACTIVE') { pData.eq.active = id; }
    else { if(!pData.eq.passive1) pData.eq.passive1 = id; else if(!pData.eq.passive2) pData.eq.passive2 = id; else { pData.eq.passive2 = pData.eq.passive1; pData.eq.passive1 = id; } }
    renderInventory();
}
function dismantleItem(id, baseCost) { 
    audio.click(); 
    unequipItem(id); 
    const it = pData.inv.find(i=>i.id===id);
    if(it) pData.frag += (baseCost + calcStatSpent(it) + (it.fragSpent || 0)); 
    pData.inv = pData.inv.filter(i=>i.id!==id); 
    selectedInvId=null; 
    renderInventory(); 
}
function resetItemStats(id) {
    audio.click();
    const it = pData.inv.find(i=>i.id===id);
    if(!it) return;
    let refund = Math.floor(calcStatSpent(it) / 2);
    pData.frag += refund;
    it.forge = {}; 
    renderInventory();
}
function upgradeStat(id, stat, cost) { 
    audio.click(); 
    if(pData.frag<cost) return; 
    const it = pData.inv.find(i=>i.id===id); 
    if(!it) return; 
    pData.frag-=cost; 
    it.forge[stat]=(it.forge[stat]||0)+1; 
    renderInventory(); 
}
function forgeRarity(id, dupId, cost) { 
    audio.click(); 
    if(!dupId || pData.frag<cost) return; 
    pData.frag-=cost; 
    const it = pData.inv.find(i=>i.id===id); 
    const dup = pData.inv.find(i=>i.id===dupId);
    
    pData.frag += (dup.fragSpent || 0);

    it.rarity = RARITIES[it.rarity].next; 
    it.fragSpent = (it.fragSpent || 0) + cost;
    
    pData.inv = pData.inv.filter(i=>i.id!==dupId); 
    renderInventory(); 
}

function renderInventory() {
    document.getElementById('frag-count').innerText = `碎片: ${pData.frag}`;
    const batchBtn = document.getElementById('batch-mode-btn');
    batchBtn.innerText = isBatchMode ? "取消批量" : "批量分解";
    batchBtn.style.background = isBatchMode ? "#7f8c8d" : "#e74c3c";
    
    ['act', 'p1', 'p2'].forEach((k,i) => {
        const eid = pData.eq[['active','passive1','passive2'][i]]; 
        const el = document.getElementById('eq-'+k);
        if(!eid) { 
            el.innerHTML = `${['主动','被动1','被动2'][i]}<br>暂无`; 
            el.classList.remove('equipped'); 
            el.style.borderColor='#7f8c8d'; 
            el.style.color='#95a5a6'; 
            el.style.background='rgba(0,0,0,0.4)';
            el.style.boxShadow='none';
        } else { 
            const it = pData.inv.find(x=>x.id===eid); 
            if(it) { 
                const color = RARITIES[it.rarity].color;
                el.innerHTML=ITEM_DB[it.dbId].name; 
                el.classList.add('equipped'); 
                el.style.borderColor=color; 
                el.style.color='#fff';
                el.style.background = `linear-gradient(135deg, #1a252f, ${hexToRgba(color, 0.4)})`;
                el.style.boxShadow = `inset 0 0 12px ${hexToRgba(color, 0.3)}`;
                if(it.rarity === 'BLACK') {
                    el.style.background = 'linear-gradient(135deg, #333, #000)';
                    el.style.borderColor = '#555';
                }
            } 
        }
    });

    const grid = document.getElementById('inv-grid'); grid.innerHTML = '';
    let filtered = pData.inv.filter(i => 
        (invFilter==='ALL' || ITEM_DB[i.dbId].type===invFilter) && 
        (rarityFilter==='ALL' || i.rarity === rarityFilter)
    );
    filtered.sort((a,b) => { const rA=Object.keys(RARITIES).indexOf(a.rarity); const rB=Object.keys(RARITIES).indexOf(b.rarity); return rB-rA || a.dbId.localeCompare(b.dbId); });
    const maxPage = Math.max(0, Math.ceil(filtered.length / ITEMS_PER_PAGE) - 1);
    if(invPage > maxPage) invPage = maxPage;
    document.getElementById('page-indicator').innerText = `${invPage + 1} / ${maxPage + 1}`;
    const pageItems = filtered.slice(invPage * ITEMS_PER_PAGE, (invPage + 1) * ITEMS_PER_PAGE);
    
    pageItems.forEach(i => {
        const box = document.createElement('div'); 
        box.className = 'item-box'; 
        const rColor = RARITIES[i.rarity].color;
        box.style.borderColor = rColor;
        
        box.style.background = `linear-gradient(135deg, #1a252f, ${hexToRgba(rColor, 0.4)})`;
        if (i.rarity === 'RED' || i.rarity === 'GOLD') {
            box.style.boxShadow = `0 0 8px ${hexToRgba(rColor, 0.6)}, inset 0 0 12px ${hexToRgba(rColor, 0.4)}`;
        } else if (i.rarity === 'BLACK') {
            box.style.background = 'linear-gradient(135deg, #333, #000)';
            box.style.borderColor = '#555';
            box.style.boxShadow = `0 0 10px #555, inset 0 0 15px #000`;
        } else {
            box.style.boxShadow = `inset 0 0 10px ${hexToRgba(rColor, 0.3)}`;
        }

        const isEq = Object.values(pData.eq).includes(i.id);
        if(isEq) box.classList.add('equipped');
        
        if(isBatchMode) {
            if(isEq) box.style.opacity = '0.3'; 
            else if(batchSet.has(i.id)) box.classList.add('batch-selected');
            box.onclick = () => { if(!isEq) toggleBatchSelect(i.id); };
        } else {
            if(i.id === selectedInvId) {
                box.classList.add('selected'); 
                box.style.boxShadow = `0 0 15px white, ${box.style.boxShadow}`;
            }
            box.onclick = () => { audio.click(); selectedInvId=i.id; renderInventory(); }; 
        }
        box.innerHTML = ITEM_DB[i.dbId].name; 
        grid.appendChild(box);
    });
    
    const emptySlots = ITEMS_PER_PAGE - pageItems.length;
    for(let i = 0; i < emptySlots; i++) {
        const box = document.createElement('div');
        box.className = 'item-box empty';
        grid.appendChild(box);
    }
    renderDetails();
}

function renderDetails() {
    const empty = document.getElementById('inv-details-empty');
    const cont = document.getElementById('inv-details-content');
    const batch = document.getElementById('inv-batch-actions');
    if(isBatchMode) {
        empty.style.display = 'none'; cont.style.display = 'none'; batch.style.display = 'flex';
        let fragGain = 0; batchSet.forEach(id => { const it = pData.inv.find(i=>i.id===id); if(it) fragGain += (RARITIES[it.rarity].cost + calcStatSpent(it) + (it.fragSpent || 0)); });
        document.getElementById('batch-selected-info').innerText = `已选择 ${batchSet.size} 个，预计获得 ${fragGain} 碎片`;
        return;
    }
    batch.style.display = 'none';
    if(!selectedInvId) { empty.style.display='block'; cont.style.display='none'; return; }
    const it = pData.inv.find(i=>i.id===selectedInvId); if(!it) { selectedInvId=null; empty.style.display='block'; cont.style.display='none'; return; }
    empty.style.display='none'; cont.style.display='flex'; const db = ITEM_DB[it.dbId]; const r = RARITIES[it.rarity];
    
    document.getElementById('det-name').innerText = db.name; document.getElementById('det-name').style.color = r.color;
    document.getElementById('det-rarity').innerText = `${r.n} (${db.type==='ACTIVE'?'主动':'被动'})`; document.getElementById('det-rarity').style.background = r.color; document.getElementById('det-rarity').style.color = it.rarity==='WHITE'?'#000':'#fff';
    
    let currentStatsHtml = `<div style="margin-top:8px; background:rgba(0,0,0,0.4); padding:6px; border-radius:6px; border:1px solid #7f8c8d; font-size:12px;">`;
    currentStatsHtml += `<div style="color:#f1c40f; margin-bottom:4px; font-weight:bold;">当前属性精确数值:</div>`;
    ['cd', 'dur', 'effect', 'speed'].forEach(stat => {
        if(db[stat] !== undefined) {
            const val = calcStatVal(it.dbId, stat, it.forge[stat]||0);
            currentStatsHtml += `<div style="margin-bottom:2px;"><span style="color:#bdc3c7;">${statMap(stat)}:</span> <span style="color:#fff; font-weight:bold;">${formatStat(stat, val, it.dbId)}</span></div>`;
        }
    });
    currentStatsHtml += `</div>`;
    
    document.getElementById('det-desc').innerHTML = `${db.desc}${currentStatsHtml}`;
    
    let totalLvl = getTotalForgeLevel(it);
    let isRarityLimit = totalLvl >= r.max;
    
    let fHtml = `<div style="font-size:12px; margin-bottom:5px; margin-top:5px; color:#f1c40f; font-weight:bold;">已分配属性点: ${totalLvl} / ${r.max}</div>`;
    
    if(db.forge && db.forge.length > 0) {
        fHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">`;
        db.forge.forEach(stat => {
            const curLvl = it.forge[stat]||0; 
            const isGlobalMax = curLvl >= 10;
            
            const cost = (curLvl + 1) * 10; 
            const canAfford = pData.frag >= cost;
            const curVal = calcStatVal(it.dbId, stat, curLvl);
            
            fHtml += `<div style="background:rgba(0,0,0,0.3); padding:4px; border-radius:4px; font-size:11px; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">`;
            fHtml += `<div style="margin-bottom:2px; color:#bdc3c7; font-weight:bold;">${statMap(stat)} Lv${curLvl}${isGlobalMax?'<span style="color:#f1c40f">(极)</span>':''}</div>`;
            
            if(!isGlobalMax) {
                if(!isRarityLimit) {
                    const nextVal = calcStatVal(it.dbId, stat, curLvl + 1);
                    let diff = nextVal - curVal;
                    let diffStr = formatStatDiff(stat, diff, it.dbId);
                    fHtml += `<div style="color:#2ecc71; margin-bottom:4px; font-weight:bold;">下一级: ${diffStr}</div>`;
                    fHtml += `<button style="padding:4px 5px; font-size:11px; border:none; border-radius:3px; background:${canAfford?'#27ae60':'#7f8c8d'}; color:white; width:100%; cursor:pointer;" ${!canAfford?'disabled':''} onclick="upgradeStat('${it.id}','${stat}',${cost})">升级(-${cost})</button>`;
                } else {
                    fHtml += `<div style="color:#e67e22; margin-top:auto; font-size:10px;">需锻造升品<br>获取更多点数</div>`;
                }
            } else {
                fHtml += `<div style="color:#f1c40f; margin-bottom:4px; font-weight:bold;">(属性登峰造极)</div>`;
            }
            fHtml += `</div>`;
        });
        fHtml += `</div>`;
    }
    document.getElementById('det-forge').innerHTML = fHtml;
    
    let aHtml = ''; const isEq = Object.values(pData.eq).includes(it.id);
    if(isEq) aHtml += `<button class="inv-btn btn-unequip" onclick="unequipItem('${it.id}')">卸下</button>`;
    else aHtml += `<button class="inv-btn btn-equip" onclick="equipItem('${it.id}')">装备</button>`;
    
    if(totalLvl > 0) {
        let refund = Math.floor(calcStatSpent(it) / 2);
        aHtml += `<button class="inv-btn btn-reset" onclick="resetItemStats('${it.id}')">属性还原(+${refund})</button>`;
    }

    if(r.next) {
        const dup = pData.inv.find(x => 
            x.dbId===it.dbId && 
            x.rarity===it.rarity && 
            x.id!==it.id && 
            !Object.values(pData.eq).includes(x.id) &&
            getTotalForgeLevel(x) === 0
        );
        const forgeCost = r.forgeCost; const canForge = dup && pData.frag>=forgeCost;
        aHtml += `<button class="inv-btn btn-upgrade" style="opacity:${canForge?1:0.5}" onclick="forgeRarity('${it.id}','${dup?dup.id:''}',${forgeCost})">锻造升品 (-${forgeCost})</button>`;
    }
    
    aHtml += `<button class="inv-btn btn-dismantle" onclick="dismantleItem('${it.id}',${r.cost})">分解</button>`;
    document.getElementById('det-actions').innerHTML = aHtml;
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
    else if(itemSkill.dbId === 'act_orbital') { entities.orbitals.push(new OrbitalController(itemSkill.aimX, itemSkill.aimY, dur, p.getDmg()*eff, getForgedVal('act_orbital','speed'))); showFloatingText("TARGET LOCKED!", itemSkill.aimX, itemSkill.aimY, '#e74c3c', 20); }
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
        if (currentWeapon === 'CANNON') { skillPool = [ { id: 'area', title: '爆破范围', desc: '技能爆炸范围 +25%', type: 'area' }, { id: 'dmg', title: '高爆装药', desc: '技能伤害 +25%', type: 'dmg' }, { id: 'cd', title: '快速装填', desc: '技能冷却 -20% (乘法)', type: 'cd' }, { id: 'healHit', title: '吸血爆破', desc: '特殊技能每命中一个敌人回复 1 HP', type: 'healHit' }, { id: 'slow', title: '震荡冲击', desc: '技能命中减速敌人 50% 持续 6秒', type: 'slow' }, { id: 'burn', title: '燃烧弹', desc: '技能命中点燃敌人 3秒 (50%攻击力/秒)', type: 'burn' } ]; } else if (currentWeapon === 'LASER') { skillPool = [ { id: 'dmg', title: '聚焦透镜', desc: '技能伤害 +25%', type: 'dmg' }, { id: 'cd', title: '快速充能', desc: '技能冷却 -20% (乘法)', type: 'cd' }, { id: 'refract', title: '多重折射', desc: '特殊技能每束光束折射次数 +2 (强制)', type: 'refract' }, { id: 'width', title: '高能光束', desc: 'IMBA技能光束宽度 +20%', type: 'width' }, { id: 'vulnMax', title: '深度易伤', desc: '技能可施加的易伤层数上限 +1', type: 'vulnMax' }, { id: 'vulnEff', title: '易伤增强', desc: '技能施加的易伤效果提升 33%', type: 'vulnEff' }, { id: 'vulnDur', title: '易伤持久', desc: '技能施加的易伤持续时间提升 50%', type: 'vulnDur' } ]; } else if (currentWeapon === 'SWARM') { skillPool = [ { id: 'minionAtk', title: '群体狂怒', desc: '寄生物伤害 +25%', type: 'minionAtk' }, { id: 'minionHp', title: '甲壳强化', desc: '寄生物生命值 +25%', type: 'minionHp' }, { id: 'minionSpd', title: '代谢加速', desc: '寄生物移动速度 +25%', type: 'minionSpd' }, { id: 'cd', title: '孵化加速', desc: '技能冷却时间 -20% (乘法)', type: 'cd' }, { id: 'extraRanged', title: '额外孵化', desc: '特殊技能召唤的远程寄生物数量 +1', type: 'extraRanged' } ]; } else if (currentWeapon === 'SHOTGUN') { skillPool = [ { id: 'shotgun_size', title: '巨型弹头', desc: '特殊技能子弹体积增加 25%', type: 'shotgun_size' }, { id: 'shotgun_ult', title: '毁灭冲击', desc: 'IMBA技能伤害与爆炸范围提升 20%', type: 'shotgun_ult' }, { id: 'shotgun_dmg', title: '强装火药', desc: '技能伤害提升 25%', type: 'shotgun_dmg' }, { id: 'cd', title: '战术换弹', desc: '技能冷却时间 -20% (乘法)', type: 'cd' } ]; } else if (currentWeapon === 'SHOCKWAVE') { skillPool = [ { id: 'rootDur', title: '深度禁锢', desc: '特殊技能禁锢时间提升 20%', type: 'rootDur' }, { id: 'turretDur', title: '持久炮台', desc: '炮台持续时间 +15%', type: 'turretDur' }, { id: 'shockArea', title: '范围扩大', desc: '冲击波范围 +20%', type: 'shockArea' }, { id: 'cd', title: '快速蓄力', desc: '技能冷却 -20% (乘法)', type: 'cd' } ]; }
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
        ctx.beginPath(); if (e.type === ENEMY_TYPES.BASIC) ctx.rect(-e.size/2, -e.size/2, e.size, e.size); else if (e.type === ENEMY_TYPES.HEAVY) { const sides = 5; const radius = e.size * 0.6; for (let i = 0; i < sides; i++) { const theta = (i * 2 * Math.PI / sides) - Math.PI / 2; const px = Math.cos(theta) * radius; const py = Math.sin(theta) * radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); } else if (e.type === ENEMY_TYPES.KAMIKAZE) { ctx.moveTo(e.size, 0); ctx.lineTo(-e.size/2, e.size/2); ctx.lineTo(-e.size/2, -e.size/2); ctx.closePath(); } else if (e.type === ENEMY_TYPES.ENERGY) { ctx.arc(0, 0, e.size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.size/4, 0, e.size/6, 0, Math.PI*2); } if (e.type !== ENEMY_TYPES.ENERGY) { ctx.fill(); ctx.stroke(); }
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
        ctx.fillStyle = '#34495e'; if (p.level >= 20) ctx.fillStyle = '#2980b9'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.fillRect(-p.size*0.6, -p.size*0.4, p.size*1.2, p.size*0.8); ctx.strokeRect(-p.size*0.6, -p.size*0.4, p.size*1.2, p.size*0.8);
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
    if (currentWeapon === 'SHOTGUN') { const ammoDisp = document.getElementById('ammo-val'); if (p.isReloading) { ammoDisp.innerText = "RELOADING"; ammoDisp.className = "reloading-text"; } else { if (p.shotgunUltActive) ammoDisp.innerText = "∞"; else ammoDisp.innerText = `${p.ammo}/${p.maxAmmo}`; ammoDisp.className = ""; } }
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