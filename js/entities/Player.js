class Player {
    constructor() {
        Object.assign(this, BASE_PLAYER); this.x = MAP_SIZE / 2; this.y = MAP_SIZE / 2; this.shootTimer = 0; this.collisionTimer = 0;
        this.multipliers = { atk: 1, atkSpd: 1, hp: 1, speed: 1, splash: 1, projSpd: 1, energy: 1, energyRegen: 1, reloadSpd: 1, pelletCnt: 1, range: 1, colDmg: 1, pickup: 1, dmgRed: 1, special:1, luck:1 }; 
        this.buffs = { speed: 0, atkSpd: 0, def: 0 }; this.cheatFlags = { speed: false, crit: false, noCd: false, infiniteEnergy: false };
        this.ammo = 0; this.maxAmmo = 0; this.reloadTimer = 0; this.isReloading = false; this.pelletCount = 0; this.shotgunSkillActive = false; this.shotgunUltActive = false; this.shotgunUltTimer = 0;
        this.shockwaveNextMarking = false; this.turretEmpowerNext = false; this.cannonImbaActive = false; this.cannonImbaTimer = 0; this.swarmImmunityTimer = 0;
        this.laserImbaActive = false; this.laserImbaTimer = 0; this.laserImbaTick = 0; this.laserImbaMaxTime = 10.0; this.laserOverloadActive = false; 
        this.aimAngle = 0; this.moveAngle = 0; this.upgradeHistory = {}; 
        this.i_overcharge=0; this.i_nitro=0; this.i_repair=0; this.i_repairMult=0; this.i_fortify=0; this.i_radar=0; this.shield=0; this.maxShield=0; this.i_shieldTimer=0; this.defianceCd=0; this.trinityTimer=0; this.hidden=false;
    }
    applyPassives() {
        [pData.eq.passive1, pData.eq.passive2].forEach(id => {
            if(!id) return; const it = pData.inv.find(x=>x.id===id); if(!it) return; const db = ITEM_DB[it.dbId]; const val = getForgedVal(it.dbId, 'effect', it);
            if(db.stat==='xpMult') this.multipliers.xp = 1+val; else if(db.stat==='speed') this.multipliers.speed += val; else if(db.stat==='range') this.multipliers.range += val;
            else if(db.stat==='splash') this.multipliers.splash += val; else if(db.stat==='hp') this.multipliers.hp += val; else if(db.stat==='atk') this.multipliers.atk += val; else if(db.stat==='atkSpd') this.multipliers.atkSpd += val;
            else if(db.stat==='pickup') this.multipliers.pickup += val; else if(db.stat==='colDmg') this.multipliers.colDmg -= val; else if(db.stat==='energy') this.multipliers.energy += val;
            else if(db.stat==='energyAll') { this.multipliers.energy+=val; this.multipliers.energyRegen+=val; } else if(db.stat==='atkAll') { this.multipliers.atk+=val; this.multipliers.atkSpd+=val; }
            else if(db.stat==='defAll') { this.multipliers.hp+=val; this.multipliers.dmgRed-=val; } else if(db.stat==='rangeAll') { this.multipliers.range+=val; this.multipliers.splash+=val; }
            else if(db.stat==='spdAll') { this.multipliers.speed+=val; this.multipliers.projSpd+=val; } else if(db.stat==='luck') this.multipliers.luck += val;
        });
        this.maxHp *= this.multipliers.hp; this.hp = this.maxHp;
    }
    update(dt) {
        let moveSpd = this.speed * this.multipliers.speed;
        if (this.buffs.speed > 0) { moveSpd *= 1.5; this.buffs.speed -= dt; } if (this.cheatFlags.speed) moveSpd *= 2.0;
        if (this.i_overcharge>0) { moveSpd *= (1+this.i_overchargeMult); this.i_overcharge-=dt; }
        if (this.i_nitro>0) { moveSpd *= (1+this.i_nitroMult); this.i_nitro-=dt; }
        
        if (this.i_fortify>0) { moveSpd *= (1 - ITEM_DB['act_fortify'].effect); this.i_fortify-=dt; }
        
        if (this.i_radar>0) { this.i_radar-=dt; this.hidden=true; } else { this.hidden=false; }
        if (this.i_repair>0) { this.i_repair-=dt; this.heal(this.maxHp * this.i_repairMult); }
        if (this.i_shieldTimer>0) { this.i_shieldTimer-=dt; this.shield -= this.maxShield*0.02*dt; if(this.shield<=0) this.breakShield(); }
        if (this.defianceCd>0) this.defianceCd-=dt; if (this.trinityTimer>0) this.trinityTimer-=dt;
        if (this.buffs.atkSpd > 0) this.buffs.atkSpd -= dt; if (this.buffs.def > 0) this.buffs.def -= dt;
        if (this.cannonImbaActive) { this.cannonImbaTimer -= dt; if (this.cannonImbaTimer <= 0) this.cannonImbaActive = false; }
        if (this.swarmImmunityTimer > 0) this.swarmImmunityTimer -= dt;
        if (this.shotgunUltActive) { this.shotgunUltTimer -= dt; if (this.shotgunUltTimer <= 0) this.shotgunUltActive = false; }
        let target = null;
        if (this.laserImbaActive) {
            if (!joystick.active) { let maxHp = -1; const searchRange = 300; for (let e of entities.enemies) { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d <= searchRange && e.maxHp > maxHp) { maxHp = e.maxHp; target = e; } } }
        } else target = this.findNearestEnemy();
        if (target) this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
        else if (joystick.active) this.aimAngle = Math.atan2(joystick.dy, joystick.dx);
        if (joystick.active) this.moveAngle = Math.atan2(joystick.dy, joystick.dx);
        if (this.laserImbaActive) { this.laserImbaTimer -= dt; this.laserImbaTick -= dt; moveSpd *= 0.2; this.collisionTimer = 0.1; if (this.laserImbaTick <= 0) { this.fireImbaLaser(target); this.laserImbaTick = 0.1; } if (this.laserImbaTimer <= 0) this.laserImbaActive = false; }
        if(!isNaN(moveSpd) && !isNaN(joystick.dx)) { this.x += joystick.dx * moveSpd * dt; this.y += joystick.dy * moveSpd * dt; }
        this.x = Math.max(this.size, Math.min(MAP_SIZE - this.size, this.x)); this.y = Math.max(this.size, Math.min(MAP_SIZE - this.size, this.y));
        camera.x = this.x - canvas.width / 2; camera.y = this.y - canvas.height / 2;
        if (this.regen > 0) this.heal(this.maxHp * this.regen * dt);
        const currentMaxEnergy = this.maxEnergy * this.multipliers.energy;
        if (this.cheatFlags.infiniteEnergy) this.energy = currentMaxEnergy;
        else { const currentEnergyRegen = this.energyRegen * this.multipliers.energyRegen; this.energy = Math.min(currentMaxEnergy, this.energy + currentEnergyRegen * dt); }
        this.shootTimer -= dt; let currentAtkSpd = this.atkSpd * this.multipliers.atkSpd; if (this.buffs.atkSpd > 0) currentAtkSpd *= 1.5; if(this.i_overcharge>0) currentAtkSpd *= (1+this.i_overchargeMult);
        if (currentWeapon === 'SHOTGUN') {
            if (this.isReloading) { this.reloadTimer -= dt; if (this.reloadTimer <= 0) { this.ammo = this.maxAmmo; this.isReloading = false; this.shotgunSkillActive = false; audio.reload(); showFloatingText("RELOADED", this.x, this.y - 30, '#fff', 12); }
            } else if (this.ammo <= 0 && !this.shotgunUltActive) { this.isReloading = true; this.reloadTimer = this.reloadTime / this.multipliers.reloadSpd; }
        }
        if (this.shootTimer <= 0 && !this.laserImbaActive && !this.isReloading && !this.hidden && !itemSkill.aiming) { 
            let fired = false;
            if (currentWeapon === 'SHOCKWAVE') { if (this.findNearestEnemy()) { this.shootShockwave(); fired = true; }
            } else if (target || (currentWeapon === 'SHOTGUN' && (joystick.active || this.shotgunSkillActive)) || (currentWeapon === 'CANNON' && this.cannonImbaActive)) { 
                if (currentWeapon === 'LASER') { this.shootLaser(target); fired = true; } else if (currentWeapon === 'SWARM') { if(target) {this.shootSwarm(target); fired = true;} } else if (currentWeapon === 'SHOTGUN') { if (this.shotgunUltActive || this.ammo > 0) { this.shootShotgun(target); fired = true; if (!this.shotgunUltActive) this.ammo--; } } else { if(target || skill.active || this.cannonImbaActive) { this.shootCannon(target); fired = true; } }
            }
            if(fired) { let delay = 1 / currentAtkSpd; if (currentWeapon === 'CANNON' && this.cannonImbaActive) delay *= 2.0; this.shootTimer = delay; }
        }
        if (this.collisionTimer > 0) this.collisionTimer -= dt;
    }
    breakShield() { this.shield=0; this.i_shieldTimer=0; entities.enemies.forEach(e=>{ if(Math.hypot(e.x-this.x, e.y-this.y)<120) { e.applyKnockback(this.x, this.y, 120); e.takeDamage(this.atk*this.multipliers.atk*2.0); }}); createExplosion(this.x, this.y, 120, 0, true, false, false); audio.explode(); showFloatingText("SHIELD BREAK!", this.x, this.y, '#9b59b6', 20); }
    getDmg() { let d = this.atk * this.multipliers.atk; if(this.trinityTimer>0) d*=1.33; const grit = pData.inv.find(i=>i.dbId==='pas_grit'); if(grit) { const loss = 1-(this.hp/this.maxHp); d *= (1 + loss*100*getForgedVal('pas_grit','effect',grit)); } return d; }
    findNearestEnemy() {
        let nearest = null; let minDist = this.range * this.multipliers.range;
        if (this.shotgunUltActive) minDist *= 1.5; if (currentWeapon === 'SHOCKWAVE') minDist *= (1 + (skill.upgrades.shockArea || 0) * 0.2); 
        if (currentWeapon === 'SWARM') { let foundNonParasite = false; let currentMinDist = minDist; for (let e of entities.enemies) { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < currentMinDist) { if (e.parasiteTime <= 0) { nearest = e; currentMinDist = d; foundNonParasite = true; } else if (!foundNonParasite) { nearest = e; currentMinDist = d; } } }
        } else { for (let e of entities.enemies) { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < minDist) { minDist = d; nearest = e; } } }
        return nearest;
    }
    getMuzzlePos() { const offset = this.size * 0.8; return { x: this.x + Math.cos(this.aimAngle) * offset, y: this.y + Math.sin(this.aimAngle) * offset }; }
    shootShockwave() { audio.shoot('SHOCKWAVE'); const range = this.range * this.multipliers.range * (1 + (skill.upgrades.shockArea || 0) * 0.2); let dmg = this.getDmg(); if (this.cheatFlags.crit) dmg *= 10; let color = '#3498db'; let isMarking = false; if (this.shockwaveNextMarking) { color = '#2ecc71'; isMarking = true; this.shockwaveNextMarking = false; dmg *= 0.5; } entities.shockwaves.push(new Shockwave(this.x, this.y, range, dmg, color, isMarking, false, null)); }
    shootSwarm(target) { audio.shoot('CANNON'); const muzzle = this.getMuzzlePos(); const angle = Math.atan2(target.y - this.y, target.x - this.x); let dmg = this.getDmg(); if (this.cheatFlags.crit) dmg *= 10; const b = new Bullet(muzzle.x, muzzle.y, angle, 600*this.multipliers.projSpd, dmg, 5, true, '#8e44ad', false, false, 0.5); b.isSwarmShot = true; entities.bullets.push(b); }
    shootLaser(target) { audio.shoot('LASER'); let targetsToHit = [target]; if (this.laserOverloadActive) { let potentialExtras = []; entities.enemies.forEach(e => { if (e.id !== target.id) { const distToMain = Math.hypot(e.x - target.x, e.y - target.y); if (distToMain < 400) potentialExtras.push({ enemy: e, dist: distToMain }); } }); potentialExtras.sort((a, b) => a.dist - b.dist); if (potentialExtras.length > 0) targetsToHit.push(potentialExtras[0].enemy); if (potentialExtras.length > 1) targetsToHit.push(potentialExtras[1].enemy); } targetsToHit.forEach(t => this.fireSingleBeam(t)); }
    fireSingleBeam(t) { let dmg = this.getDmg(); if (this.cheatFlags.crit) dmg *= 10; const muzzle = this.getMuzzlePos(); entities.visuals.push(new LaserBeam(muzzle.x, muzzle.y, t.x, t.y, this.laserOverloadActive ? '#00ffff' : '#3498db', 2)); t.takeDamage(dmg); t.applyVulnerability(); let chainCount = 2 + Math.floor(this.level / 3); if (this.laserOverloadActive) chainCount += 2; let forcedRefractCount = 0; if (this.laserOverloadActive && (skill.upgrades.refract || 0) > 0) forcedRefractCount = 2; if (t.vulnStacks >= 2 || forcedRefractCount > 0) this.chainLaser(t, chainCount, dmg * 0.5, [t.id], forcedRefractCount); }
    chainLaser(source, count, dmg, hitIds, forcedRefractCount) { if (count <= 0) return; let bestTarget = null; let potentialTargets = []; entities.enemies.forEach(e => { if (e.dead || hitIds.includes(e.id)) return; const d = Math.hypot(e.x - source.x, e.y - source.y); if (d < 350) potentialTargets.push({ enemy: e, dist: d, stacks: e.vulnStacks }); }); potentialTargets.sort((a, b) => { if (b.stacks !== a.stacks) return b.stacks - a.stacks; return a.dist - b.dist; }); if (potentialTargets.length > 0) bestTarget = potentialTargets[0].enemy; if (bestTarget) { setTimeout(() => { if (gameState !== 'PLAYING' || !source || (source.dead && !source.x) || !bestTarget || bestTarget.dead) return; entities.visuals.push(new LaserBeam(source.x, source.y, bestTarget.x, bestTarget.y, '#e74c3c', 1.5)); bestTarget.takeDamage(dmg); bestTarget.applyVulnerability(); hitIds.push(bestTarget.id); let shouldChain = false; let nextForceCount = forcedRefractCount; if (bestTarget.vulnStacks >= 2) shouldChain = true; else if (forcedRefractCount > 0) { shouldChain = true; nextForceCount--; } if (shouldChain) this.chainLaser(bestTarget, count - 1, dmg, hitIds, nextForceCount); }, 50); } }
    fireImbaLaser(target) { audio.shoot('LASER'); const muzzle = this.getMuzzlePos(); const timeElapsed = this.laserImbaMaxTime - this.laserImbaTimer; let widthMulti = 1 + (skill.upgrades.width || 0) * 0.2; const currentWidth = (5 + (45 * (timeElapsed / this.laserImbaMaxTime))) * widthMulti; const beamLength = 400; let endX, endY; if (target && !joystick.active) { const angle = Math.atan2(target.y - muzzle.y, target.x - muzzle.x); endX = muzzle.x + Math.cos(angle) * beamLength; endY = muzzle.y + Math.sin(angle) * beamLength; } else { endX = muzzle.x + Math.cos(this.aimAngle) * beamLength; endY = muzzle.y + Math.sin(this.aimAngle) * beamLength; } entities.visuals.push(new LaserBeam(muzzle.x, muzzle.y, endX, endY, '#f1c40f', currentWidth, 0.15)); const x1 = muzzle.x, y1 = muzzle.y; const x2 = endX, y2 = endY; const lenSq = beamLength * beamLength; let dmg = this.getDmg() * 0.3; if(skill.upgrades.dmg) dmg *= (1 + skill.upgrades.dmg * 0.25); entities.enemies.forEach(e => { const dot = ((e.x-x1)*(x2-x1) + (e.y-y1)*(y2-y1)) / lenSq; const closestX = x1 + (x2-x1) * Math.max(0, Math.min(1, dot)); const closestY = y1 + (y2-y1) * Math.max(0, Math.min(1, dot)); const dist = Math.hypot(e.x - closestX, e.y - closestY); if (dist < e.size + (currentWidth / 2)) { e.takeDamage(dmg); if (target && e.id === target.id) e.applyVulnerability(20); else e.applyVulnerability(); } }); }
    shootCannon(target) { audio.shoot('CANNON'); let isSkillShot = false; let isImbaShot = false; if (this.cannonImbaActive) isImbaShot = true; else if (skill.active) { isSkillShot = true; handleSkillCD(); } const angle = this.aimAngle; const muzzle = this.getMuzzlePos(); let dmg = this.getDmg(); let spd = this.projSpd * this.multipliers.projSpd; let radius = this.splash * this.multipliers.splash; let color = '#f1c40f'; let bounceCount = 0; let destX = null; let destY = null; if (isImbaShot) { let dmgMult = 1.0; if(skill.upgrades.dmg) dmgMult += skill.upgrades.dmg * 0.25; let areaMult = 1.0; if(skill.upgrades.area) areaMult += skill.upgrades.area * 0.25; dmg *= 1.8 * dmgMult; radius *= 0.5 * areaMult; color = '#e74c3c'; bounceCount = 4; } else if (isSkillShot) { dmg *= (3 + (skill.upgrades.dmg || 0) * 0.25); radius = 90 * this.multipliers.splash * (1 + (skill.upgrades.area || 0)*0.25); color = '#3498db'; let maxNeighbors = -1; let bestPos = null; entities.enemies.forEach(e => { const dToPlayer = Math.hypot(e.x - this.x, e.y - this.y); if (dToPlayer <= this.range) { let count = 0; entities.enemies.forEach(other => { if (Math.hypot(e.x - other.x, e.y - other.y) <= radius) count++; }); if (count > maxNeighbors) { maxNeighbors = count; bestPos = {x: e.x, y: e.y}; } } }); if (bestPos) { destX = bestPos.x; destY = bestPos.y; } else if (target) { destX = target.x; destY = target.y; } else { destX = this.x + Math.cos(angle) * this.range; destY = this.y + Math.sin(angle) * this.range; } } if (this.cheatFlags.crit) dmg *= 10; const bullet = new Bullet(muzzle.x, muzzle.y, angle, spd, dmg, radius, true, color, isSkillShot, isImbaShot, 2.0); if (isSkillShot) { bullet.isTargetedBomb = true; bullet.destX = destX; bullet.destY = destY; bullet.startX = muzzle.x; bullet.startY = muzzle.y; const bombAngle = Math.atan2(destY - muzzle.y, destX - muzzle.x); bullet.vx = Math.cos(bombAngle) * spd; bullet.vy = Math.sin(bombAngle) * spd; } if (isImbaShot) { bullet.maxBounces = bounceCount; bullet.bounceCount = bounceCount; entities.visuals.push(new LaserBeam(muzzle.x, muzzle.y, muzzle.x + Math.cos(angle) * 20, muzzle.y + Math.sin(angle) * 20, '#fff', 3); } entities.bullets.push(bullet); }
    shootShotgun(target) { audio.shoot('SHOTGUN'); const muzzle = this.getMuzzlePos(); const baseSpread = 45 * (Math.PI / 180); let pellets = Math.floor(this.pelletCount * this.multipliers.pelletCnt); let dmg = this.getDmg(); let bulletSize = 3; let isPiercing = false; let bulletLife = 0.4; let color = '#f39c12'; let shootingAngle = this.aimAngle; if (this.shotgunSkillActive) { pellets *= 2; bulletSize *= (1.5 + (skill.upgrades.shotgun_size || 0) * 0.25); isPiercing = true; bulletLife = 2.0; color = '#e74c3c'; dmg *= (1 + (skill.upgrades.shotgun_dmg || 0) * 0.25); let bestClusterCenter = null; let maxNeighbors = -1; const scanRange = 300; const clusterRadius = 100; entities.enemies.forEach(centerEnemy => { const distToPlayer = Math.hypot(centerEnemy.x - this.x, centerEnemy.y - this.y); if (distToPlayer <= scanRange) { let count = 0; entities.enemies.forEach(neighbor => { if (Math.hypot(centerEnemy.x - neighbor.x, centerEnemy.y - neighbor.y) <= clusterRadius) { count++; } }); if (count > maxNeighbors) { maxNeighbors = count; bestClusterCenter = centerEnemy; } } }); if (bestClusterCenter) { shootingAngle = Math.atan2(bestClusterCenter.y - this.y, bestClusterCenter.x - this.x); } } if (this.shotgunUltActive) { bulletLife = 0.6; color = '#8e44ad'; let bonusDmg = 0; if(skill.upgrades.shotgun_dmg) bonusDmg += skill.upgrades.shotgun_dmg * 0.25; if(skill.upgrades.shotgun_ult) bonusDmg += skill.upgrades.shotgun_ult * 0.2; dmg *= (1 + bonusDmg); } if (this.cheatFlags.crit) dmg *= 10; const startAngle = shootingAngle - baseSpread / 2; const angleStep = baseSpread / (pellets - 1); const batchId = Date.now() + Math.random(); for (let i = 0; i < pellets; i++) { const angle = startAngle + (i * angleStep) + (Math.random() * 0.1 - 0.05); const spd = (this.projSpd * 1.2 * this.multipliers.projSpd) * (0.9 + Math.random() * 0.2); const b = new Bullet(muzzle.x, muzzle.y, angle, spd, dmg, 0, true, color, false, false, bulletLife, batchId); b.isShotgun = true; b.size = bulletSize; if (isPiercing) { b.piercing = true; b.knockback = true; } entities.bullets.push(b); } }
    takeDamage(amount) {
        if (this.laserImbaActive || this.hidden || this.i_nitro>0 || this.swarmImmunityTimer>0) return; 
        if (this.buffs.def > 0) amount *= 0.3; 
        if (this.i_overcharge>0) amount*=(1 - Math.min(0.95, this.i_overchargeMult)); 
        if (this.i_fortify>0) amount*=(1 - Math.min(0.95, this.i_fortifyMult)); 
        
        amount*=this.multipliers.dmgRed;
        if (this.shield > 0) { this.shield -= amount; if(this.shield<=0) this.breakShield(); return; }
        this.hp -= amount; showFloatingText(`-${Math.floor(amount)}`, this.x, this.y - 20, '#e74c3c');
        if (this.hp <= 0) { 
            const def = pData.inv.find(i=>i.dbId==='pas_defiance'); if(def && this.defianceCd<=0) { this.hp=1; this.defianceCd=getForgedVal('pas_defiance','cd',def); this.swarmImmunityTimer=getForgedVal('pas_defiance','dur',def); showFloatingText("DEATH DEFIANCE!", this.x, this.y, '#f1c40f', 24); }
            else { this.hp = 0; gameOver(); }
        }
    }
    heal(amount) { this.hp = Math.min(this.hp + amount, this.maxHp); }
    gainEnergy(amount) { this.energy = Math.min(this.energy + amount, this.maxEnergy * this.multipliers.energy); }
    gainXp(amount) { this.xp += (amount * (this.multipliers.xp||1)); if (this.xp >= this.nextLevelXp) { this.xp -= this.nextLevelXp; this.levelUp(); } }
    levelUp() { audio.levelUp(); this.level++; this.nextLevelXp = Math.floor(this.nextLevelXp * 1.3 + 10); if (!isGodMode) this.maxHp += 10; this.atk += 1; this.heal(this.maxHp * 0.15); gameState = 'PAUSED'; showLevelUpMenu(); }
}
