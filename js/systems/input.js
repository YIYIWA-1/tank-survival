let joystick = { active: false, dx: 0, dy: 0, originX: 0, originY: 0, touchId: null };
let itemSkill = { dbId: null, active: false, cd: 0, maxCd: 0, ready: false, aim: false, aimX:0, aimY:0 };

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
