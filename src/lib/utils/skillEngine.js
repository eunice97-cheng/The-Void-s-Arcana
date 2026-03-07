// src/lib/utils/skillEngine.js
// Lightweight, non-mutating skill engine helpers (return deltas for callers to apply)
import fs from 'fs';

const skillsDb = JSON.parse(
	fs.readFileSync(new URL('../data/skills.json', import.meta.url), 'utf8')
);

export function isSkillOnCooldown(character, skillId, now = Date.now()) {
	if (!character || !skillId) return false;
	const cooldowns = (character && character.skillCooldowns) || {};
	const last = cooldowns[skillId] || 0;
	const meta = (Array.isArray(skillsDb) && skillsDb.find((s) => s.id === skillId)) || null;
	if (!meta || typeof meta.cooldownSeconds !== 'number') return false;
	return now - last < meta.cooldownSeconds * 1000;
}

export function makeSetCooldownDelta(skillId, ts = Date.now()) {
	return { skillCooldowns: { [skillId]: ts } };
}

export function attemptAcolyteHeal(character, playerData, opts = {}) {
	const skillId = 'acolyte_heal';
	const meta = (Array.isArray(skillsDb) && skillsDb.find((s) => s.id === skillId)) || null;
	if (!meta) return { used: false, reason: 'no-skill-meta' };

	const spCost = typeof meta.spCost === 'number' ? meta.spCost : 0;
	const effects = meta.effects || {};

	if (!character || !playerData) return { used: false, reason: 'missing-data' };
	const now = typeof opts.now === 'number' ? opts.now : Date.now();
	if (isSkillOnCooldown(character, skillId, now)) return { used: false, reason: 'on-cooldown' };
	if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

	const healAmount = typeof effects.healAmount === 'number' ? effects.healAmount : 0;
	const undeadDamage = typeof effects.undeadDamage === 'number' ? effects.undeadDamage : 0;
	const healTrigger = typeof opts.healTrigger === 'number' ? opts.healTrigger : 150;
	const target = opts.target || null;
	const deficit = (playerData.maxHp || 0) - (playerData.hp || 0);

	if (deficit >= healTrigger) {
		const hpDelta = Math.min(healAmount, (playerData.maxHp || 0) - (playerData.hp || 0));
		const spDelta = -spCost;
		const cooldown = makeSetCooldownDelta(skillId, now);
		return { used: true, type: 'self', hpDelta, spDelta, cooldown };
	}

	if (target && target.isUndead) {
		const damage = Math.min(undeadDamage, target.hp || 0);
		const spDelta = -spCost;
		const cooldown = makeSetCooldownDelta(skillId, now);
		return { used: true, type: 'offense', targetHpDelta: -damage, spDelta, cooldown, damage };
	}

	return { used: false, reason: 'conditions-not-met' };
}

export function attemptMagicBarrier(character, playerData, opts = {}) {
	const skillId = 'mage_magic_barrier';
	const meta = (Array.isArray(skillsDb) && skillsDb.find((s) => s.id === skillId)) || null;
	if (!meta) return { used: false, reason: 'no-skill-meta' };

	const spCost = typeof meta.spCost === 'number' ? meta.spCost : 0;
	const effects = meta.effects || {};
	const reductionPercent =
		typeof effects.damageReductionPercent === 'number' ? effects.damageReductionPercent : 0;
	const durationSeconds = typeof effects.durationSeconds === 'number' ? effects.durationSeconds : 0;

	if (!character || !playerData) return { used: false, reason: 'missing-data' };
	const now = typeof opts.now === 'number' ? opts.now : Date.now();
	if (
		character &&
		character.activeBuffs &&
		character.activeBuffs.magicBarrier &&
		character.activeBuffs.magicBarrier.expiresAt > now
	) {
		return { used: false, reason: 'already-active' };
	}
	if (isSkillOnCooldown(character, skillId, now)) return { used: false, reason: 'on-cooldown' };
	if ((playerData.sp || 0) < spCost) return { used: false, reason: 'insufficient-sp' };

	const spDelta = -spCost;
	const expiresAt = now + Math.max(0, durationSeconds) * 1000;
	const buff = { id: 'magicBarrier', reductionPercent, expiresAt };
	const cooldown = makeSetCooldownDelta(skillId, now);
	return { used: true, applied: true, spDelta, buff, cooldown, reductionPercent, expiresAt };
}

export function handleIncomingDamage(character, playerData, damage, opts = {}) {
	const dmg = typeof damage === 'number' ? damage : 0;
	const now = typeof opts.now === 'number' ? opts.now : Date.now();
	const autoCast = opts.hasOwnProperty('autoCast') ? !!opts.autoCast : true;

	if (
		character &&
		character.activeBuffs &&
		character.activeBuffs.magicBarrier &&
		character.activeBuffs.magicBarrier.expiresAt > now
	) {
		const red = character.activeBuffs.magicBarrier.reductionPercent || 0;
		const reduced = Math.round(dmg * red);
		const after = Math.max(0, dmg - reduced);
		return { damageAfter: after, reducedBy: reduced, barrierUsed: true };
	}

	if (autoCast) {
		const res = attemptMagicBarrier(character, playerData, { now });
		if (res && res.used && res.applied && res.buff) {
			const red = res.reductionPercent || 0;
			const reduced = Math.round(dmg * red);
			const after = Math.max(0, dmg - reduced);
			return { damageAfter: after, reducedBy: reduced, barrierUsed: true, autoCastResult: res };
		}
		return { damageAfter: dmg, reducedBy: 0, barrierUsed: false, autoCastResult: res };
	}

	return { damageAfter: dmg, reducedBy: 0, barrierUsed: false };
}

export default {
	isSkillOnCooldown,
	makeSetCooldownDelta,
	attemptAcolyteHeal,
	attemptMagicBarrier,
	handleIncomingDamage
};
