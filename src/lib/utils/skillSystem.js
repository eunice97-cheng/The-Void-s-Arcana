import { serverNow } from '$lib/stores/questStore';

let skillsDb = [];

export function setSkillsDb(db) {
    skillsDb = db;
}

// Helper: Get skill metadata
export function getSkillMeta(skillId) {
    if (!skillId) return null;
    return skillsDb.find(s => s.id === skillId) || null;
}

// Helper: Check cooldown
export function isSkillOnCooldown(character, skillId, now = null, cooldownsOverride = null) {
    if (!now) now = (typeof serverNow === 'function' ? serverNow() : Date.now());
    if (!character || !skillId) return false;
    const cooldowns = cooldownsOverride || (character && character.skillCooldowns) || {};
    const last = cooldowns[skillId] || 0;
    const meta = getSkillMeta(skillId);
    if (!meta || typeof meta.cooldownSeconds !== 'number') return false;
    return now - last < meta.cooldownSeconds * 1000;
}

// Helper: Create cooldown delta
export function makeSetCooldownDelta(skillId, ts = null) {
    if (!ts) ts = (typeof serverNow === 'function' ? serverNow() : Date.now());
    return { skillCooldowns: { [skillId]: ts } };
}

// Skill Implementations Registry
const skillImplementations = {
    'acolyte_heal': {
        tryUse: (caster, target, context) => {
            const { now = (typeof serverNow === 'function' ? serverNow() : Date.now()), playerData, skillCooldowns } = context;
            const skillId = 'acolyte_heal';
            const meta = getSkillMeta(skillId);
            if (!meta) return { used: false, reason: 'no-skill-meta' };

            const spCost = meta.spCost || 0;
            const effects = meta.effects || {};

            if (isSkillOnCooldown(caster, skillId, now, skillCooldowns)) return { used: false, reason: 'on-cooldown' };
            if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

            const healAmount = resolveValue(effects.healAmount, caster.stats);
            const healTrigger = context.healTrigger || 150;
            const deficit = (playerData.maxHp || 0) - (playerData.hp || 0);
            const isCritical = (playerData.hp || 0) < (playerData.maxHp || 0) * 0.5;

            // Auto-cast condition: Significant health deficit or critical state
            if (deficit >= healTrigger || (isCritical && deficit > 0)) {
                const hpDelta = Math.min(healAmount, (playerData.maxHp || 0) - (playerData.hp || 0));
                const spDelta = -spCost;
                const cooldown = makeSetCooldownDelta(skillId, now);
                return { used: true, type: 'self', hpDelta, spDelta, cooldown };
            }
            
            // Offensive usage against Undead
            if (target && target.type && String(target.type).toLowerCase().includes('undead')) {
                const damage = resolveValue(effects.undeadDamage, caster.stats) || healAmount;
                const spDelta = -spCost;
                const cooldown = makeSetCooldownDelta(skillId, now);
                return { used: true, type: 'offensive', damage, spDelta, cooldown };
            }
            
            return { used: false, reason: 'conditions-not-met' };
        }
    },
    'mage_magic_barrier': {
        tryUse: (caster, target, context) => {
            const { now = (typeof serverNow === 'function' ? serverNow() : Date.now()), playerData, skillCooldowns } = context;
            const skillId = 'mage_magic_barrier';
            const meta = getSkillMeta(skillId);
            if (!meta) return { used: false, reason: 'no-skill-meta' };

            const spCost = meta.spCost || 0;
            const effects = meta.effects || {};
            const durationSeconds = effects.durationSeconds || 0;
            const reductionPercent = resolveValue(effects.damageReductionPercent, caster.stats);

            // Check if already active
            if (caster.activeBuffs && caster.activeBuffs.magicBarrier && caster.activeBuffs.magicBarrier.expiresAt > now) {
                return { used: false, reason: 'already-active' };
            }

            if (isSkillOnCooldown(caster, skillId, now, skillCooldowns)) return { used: false, reason: 'on-cooldown' };
            if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

            // Logic: Usually cast in response to damage (handled separately) or pre-emptively?
            // For now, let's assume this is called when we WANT to cast it (e.g. auto-cast check).
            // But wait, the original logic had `attemptBarrier` which was called by `handleIncomingDamage`.
            // If we want to support "active" casting (e.g. at start of turn), we can do it here.
            // But for reaction, we might need a separate entry point.
            
            // For this implementation, let's support direct casting.
            const spDelta = -spCost;
            const expiresAt = now + Math.max(0, durationSeconds) * 1000;
            const buff = { id: 'magicBarrier', reductionPercent, expiresAt };
            const cooldown = makeSetCooldownDelta(skillId, now);
            
            return { used: true, applied: true, spDelta, buff, cooldown, reductionPercent, expiresAt };
        }
    },
    // Warrior Skills
    'warrior_berserker': { tryUse: tryUseWarriorBuff },
    'warrior_berserker_adv': { tryUse: tryUseWarriorBuff },
    'warrior_fortress': { tryUse: tryUseWarriorBuff },
    'warrior_fortress_adv': { tryUse: tryUseWarriorBuff },
    'warrior_analysis': { tryUse: tryUseWarriorBuff },
    'warrior_analysis_adv': { tryUse: tryUseWarriorBuff },
    'warrior_mirror': { tryUse: tryUseWarriorBuff },
    'warrior_mirror_adv': { tryUse: tryUseWarriorBuff }
};

function tryUseWarriorBuff(caster, target, context) {
    const { now = (typeof serverNow === 'function' ? serverNow() : Date.now()), playerData } = context;
    // Identify which skill triggered this (caller needs to pass skillId if we use a shared function, 
    // but tryUseSkill calls impl.tryUse(caster, target, context). 
    // We need to know the skillId. 
    // The current architecture doesn't pass skillId to the handler easily unless we wrap it or look it up.
    // Let's change the architecture slightly in tryUseSkill or just use a closure/wrapper.
    // For now, we can infer it from context if we passed it, but we didn't.
    // Let's assume we can't easily know WHICH skill it is without a wrapper.
    // I will refactor the registration above to use a factory or wrapper.
    return { used: false, reason: 'implementation-error' }; 
}

// Helper factory for generic buffs (usable by any class)
function createBuffSkillHandler(skillId) {
    return (caster, target, context) => {
        const { now = (typeof serverNow === 'function' ? serverNow() : Date.now()), playerData, skillCooldowns } = context;
        const meta = getSkillMeta(skillId);
        if (!meta) return { used: false, reason: 'no-skill-meta' };

        const spCost = meta.spCost || 0;
        const effects = meta.effects || {};
        const durationSeconds = effects.durationSeconds || 30;

        // Check cooldown
        if (isSkillOnCooldown(caster, skillId, now, skillCooldowns)) return { used: false, reason: 'on-cooldown' };
        
        // Check SP
        if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

        // Check if already active to prevent spamming
        if (caster.activeBuffs && caster.activeBuffs[skillId] && caster.activeBuffs[skillId].expiresAt > now) {
            return { used: false, reason: 'already-active' };
        }

        const spDelta = -spCost;
        const expiresAt = now + durationSeconds * 1000;
        
        // Construct the buff object with all relevant effects
        const buff = { 
            id: skillId, 
            name: meta.name, // Ensure name is present for logs
            expiresAt,
            effects: { ...effects } 
        };
        
        const cooldown = makeSetCooldownDelta(skillId, now);
        
        return { used: true, applied: true, spDelta, buff, cooldown };
    };
}

// Re-register with generic factory
skillImplementations['warrior_berserker'] = { tryUse: createBuffSkillHandler('warrior_berserker') };
skillImplementations['warrior_berserker_adv'] = { tryUse: createBuffSkillHandler('warrior_berserker_adv') };
skillImplementations['warrior_fortress'] = { tryUse: createBuffSkillHandler('warrior_fortress') };
skillImplementations['warrior_fortress_adv'] = { tryUse: createBuffSkillHandler('warrior_fortress_adv') };
skillImplementations['warrior_analysis'] = { tryUse: createBuffSkillHandler('warrior_analysis') };
skillImplementations['warrior_analysis_adv'] = { tryUse: createBuffSkillHandler('warrior_analysis_adv') };
skillImplementations['warrior_mirror'] = { tryUse: createBuffSkillHandler('warrior_mirror') };
skillImplementations['warrior_mirror_adv'] = { tryUse: createBuffSkillHandler('warrior_mirror_adv') };
// Also use for Magic Barrier to ensure consistency
skillImplementations['mage_magic_barrier'] = { tryUse: createBuffSkillHandler('mage_magic_barrier') };


// Helper to resolve values that might be static numbers or scaling objects
export function resolveValue(val, stats) {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object') {
        // Format: { base: 10, scaling: 0.5, stat: 'dps' }
        const base = val.base || 0;
        const scaling = val.scaling || 0;
        const statKey = val.stat;
        const statVal = (stats && statKey && typeof stats[statKey] === 'number') ? stats[statKey] : 0;
        return base + (scaling * statVal);
    }
    return 0;
}

// Generic Skill Handler (The "Universal" System)
function genericSkillHandler(skillId, caster, target, context) {
    const { now = (typeof serverNow === 'function' ? serverNow() : Date.now()), playerData, skillCooldowns } = context;
    const meta = getSkillMeta(skillId);
    if (!meta) return { used: false, reason: 'no-skill-meta' };

    // 1. Check Costs & Cooldowns
    const spCost = meta.spCost || 0;
    if (isSkillOnCooldown(caster, skillId, now, skillCooldowns)) return { used: false, reason: 'on-cooldown' };
    if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

    const effects = meta.effects || {};
    let used = false;
    let applied = false;
    let hpDelta = 0;
    let spDelta = -spCost;
    let buff = null;
    let damage = 0;

    // Resolve stats for scaling
    // 'caster' usually has 'stats' property in combat context. 
    // If not, fallback to empty object.
    const casterStats = caster.stats || {};

    // 2. Handle Healing
    if (effects.healAmount) {
        const healAmt = resolveValue(effects.healAmount, casterStats);
        const maxHp = playerData.maxHp || 0;
        const currentHp = playerData.hp || 0;
        const deficit = maxHp - currentHp;
        
        // Auto-cast logic: Only heal if needed (e.g. < 90% HP or deficit > healAmount)
        // If this is a manual cast (context.manual), we always do it.
        // If auto-cast, we check thresholds.
        const isAuto = context.autoCast === true;
        const shouldHeal = !isAuto || (deficit > 0 && (deficit >= healAmt || currentHp < maxHp * 0.5));

        if (shouldHeal) {
            hpDelta = Math.min(healAmt, deficit);
            used = true;
            applied = true;
        } else if (isAuto) {
            return { used: false, reason: 'hp-full-or-high' };
        }
    }

    // 3. Handle Buffs
    if (effects.durationSeconds) {
        // Check if already active
        if (caster.activeBuffs && caster.activeBuffs[skillId] && caster.activeBuffs[skillId].expiresAt > now) {
            // If it's a buff-only skill and we already have it, don't recast
            if (!effects.healAmount && !effects.damage) {
                return { used: false, reason: 'already-active' };
            }
        } else {
            // Apply buff
            // We need to resolve scaling effects inside the buff too?
            // Usually buffs have static effects (e.g. +10% Str), but maybe "Shield = 100% Int"?
            // For now, let's copy effects as-is. If we want dynamic buffs, we'd resolve them here 
            // and bake the resolved value into the buff object.
            // Let's resolve known dynamic keys: damageOverTime, healOverTime, damageReductionFlat?
            // For simplicity, we'll just copy for now. Advanced scaling for buffs can be added if requested.
            
            const resolvedEffects = { ...effects };
            if (effects.damageOverTime) resolvedEffects.damageOverTime = resolveValue(effects.damageOverTime, casterStats);
            if (effects.healOverTime) resolvedEffects.healOverTime = resolveValue(effects.healOverTime, casterStats);

            buff = {
                id: skillId,
                name: meta.name,
                expiresAt: now + effects.durationSeconds * 1000,
                effects: resolvedEffects
            };
            used = true;
            applied = true;
        }
    }

    // 4. Handle Damage (Simple direct damage)
    if (effects.damage) {
        damage = resolveValue(effects.damage, casterStats);
        used = true;
        applied = true;
    }

    // 5. Handle Conditional Damage (e.g. Undead)
    if (effects.undeadDamage && target && target.type && String(target.type).toLowerCase().includes('undead')) {
        const undeadDmg = resolveValue(effects.undeadDamage, casterStats);
        damage = Math.max(damage, undeadDmg);
        used = true;
        applied = true;
        // If it was a heal skill used as damage, cancel the self-heal? 
        // Usually games allow both or switch. For Acolyte Heal, it's usually one or the other.
        // Let's assume if we have a valid target that matches the condition, we prioritize offense.
        if (effects.healAmount) hpDelta = 0; 
    }

    if (!used) {
        // Maybe it's a utility skill or passive that shouldn't be cast?
        return { used: false, reason: 'no-valid-effect' };
    }

    const cooldown = makeSetCooldownDelta(skillId, now);

    return { 
        used: true, 
        applied, 
        hpDelta, 
        spDelta, 
        buff, 
        damage, 
        cooldown,
        type: damage > 0 ? 'offensive' : (hpDelta > 0 ? 'healing' : 'buff')
    };
}

// Main entry point to try using a specific skill
export function tryUseSkill(skillId, caster, target, context) {
    const impl = skillImplementations[skillId];
    if (impl && impl.tryUse) {
        return impl.tryUse(caster, target, context);
    }
    
    // Fallback to Universal System
    return genericSkillHandler(skillId, caster, target, context);
}

// Entry point to auto-cast any available skill (simple AI)
export function autoCastSkills(caster, target, context) {
    if (!caster || !caster.skills) return null;
    
    for (const skill of caster.skills) {
        const skillId = typeof skill === 'string' ? skill : skill.id;

        // Check if skill is disabled in config
        if (caster.skillConfig && caster.skillConfig[skillId] === false) {
            continue;
        }

        const result = tryUseSkill(skillId, caster, target, context);
        if (result.used) {
            return { skillId, result };
        }
    }
    return null;
}

// Handle incoming damage (Reactive skills like Barrier)
export function handleIncomingDamage(caster, playerData, damage, context = {}) {
    const { now = Date.now() } = context;
    const dmg = typeof damage === 'number' ? damage : 0;
    
    let totalReductionPercent = 0;
    let barrierUsed = false;
    let autoCastResult = null;

    // 1. Check active buffs for damage reduction
    if (caster.activeBuffs) {
        Object.values(caster.activeBuffs).forEach(buff => {
            if (buff.expiresAt > now) {
                // Support both legacy 'reductionPercent' and generic 'effects.damageReductionPercent'
                const red = (buff.effects && buff.effects.damageReductionPercent) || buff.reductionPercent || 0;
                if (red > 0) {
                    totalReductionPercent += red;
                    barrierUsed = true;
                }
            }
        });
    }

    // 1.5 Check Passives for damage reduction
    if (caster.skills) {
        caster.skills.forEach(skill => {
            const skillId = typeof skill === 'string' ? skill : skill.id;
            const meta = getSkillMeta(skillId);
            if (meta && meta.type === 'passive' && meta.effects && meta.effects.damageReductionPercent) {
                totalReductionPercent += meta.effects.damageReductionPercent;
                // Passives don't count as "barrierUsed" for visual effects usually, but they reduce damage.
                // We can flag it if we want a visual indicator.
            }
        });
    }

    // 2. Check auto-cast reactions (Universal)
    // If we haven't fully mitigated damage (or even if we have, maybe we want to stack?), 
    // look for available skills that provide damage reduction.
    if (context.autoCast !== false && totalReductionPercent < 100) {
        const skills = caster.skills || [];
        for (const s of skills) {
            const skillId = typeof s === 'string' ? s : s.id;
            
            // Don't cast if already active
            if (caster.activeBuffs && caster.activeBuffs[skillId] && caster.activeBuffs[skillId].expiresAt > now) continue;

            const meta = getSkillMeta(skillId);
            if (!meta || !meta.effects || !meta.effects.damageReductionPercent) continue;

            // It's a defensive skill we don't have active. Try to cast it.
            const result = tryUseSkill(skillId, caster, null, { ...context, playerData });
            if (result.used && result.applied) {
                const red = (result.buff && result.buff.effects && result.buff.effects.damageReductionPercent) || 0;
                if (red > 0) {
                    totalReductionPercent += red;
                    barrierUsed = true;
                    autoCastResult = result;
                    // Stop after one successful defensive reaction to prevent dumping all SP at once?
                    // Or keep going? Let's stop for now to be safe.
                    break; 
                }
            }
        }
    }

    // Cap reduction at 100%
    totalReductionPercent = Math.min(100, totalReductionPercent);

    if (totalReductionPercent > 0) {
        const reduced = Math.round(dmg * (totalReductionPercent / 100));
        const after = Math.max(0, dmg - reduced);
        return { damageAfter: after, reducedBy: reduced, barrierUsed, autoCastResult };
    }

    return { damageAfter: dmg, reducedBy: 0, barrierUsed: false };
}

function hasSkill(caster, skillId) {
    if (!caster || !caster.skills) return false;
    return caster.skills.some(s => (typeof s === 'string' ? s === skillId : s.id === skillId));
}
