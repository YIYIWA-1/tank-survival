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

let invPage = 0;
const ITEMS_PER_PAGE = 20; 
let invFilter = 'ALL'; 
let rarityFilter = 'ALL';
let selectedInvId = null;
let isBatchMode = false;
let batchSet = new Set();

function openInventory() { audio.click(); document.getElementById('start-menu').classList.add('hidden'); document.getElementById('inventory-menu').classList.remove('hidden'); renderInventory(); }
function closeInventory() { audio.click(); isBatchMode = false; batchSet.clear(); document.getElementById('inventory-menu').classList.add('hidden'); document.getElementById('start-menu').classList.remove('hidden'); saveData(); }
function setInvFilter(f) { audio.click(); invFilter = f; invPage = 0; document.querySelectorAll('.inv-filters .filter-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); renderInventory(); }
function setRarityFilter(r) { audio.click(); rarityFilter = r; invPage = 0; renderInventory(); }
function genId() { return Math.random().toString(36).substr(2,9); }
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
