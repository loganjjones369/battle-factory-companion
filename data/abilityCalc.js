// Generation III ability effects used by the calculator UI.
// This intentionally covers battle-relevant effects that change damage, immunity, or Speed.

export function abilityOptions(pokemon) {
  return [...new Set(String(pokemon?.ability || '').split('/').map((x) => x.trim()).filter(Boolean))];
}

export function normalizeAbility(value) {
  return String(value || '').trim().toLowerCase();
}

export function abilitySpeedMultiplier(ability, weather = 'none') {
  const a = normalizeAbility(ability);
  if (weather === 'rain' && a === 'swift swim') return 2;
  if (weather === 'sun' && a === 'chlorophyll') return 2;
  return 1;
}

export function abilityDamageEffect({ moveType, effectiveness, category, attackerAbility, defenderAbility }) {
  const atk = normalizeAbility(attackerAbility);
  const def = normalizeAbility(defenderAbility);

  if (def === 'levitate' && moveType === 'Ground') return { immune: true, multiplier: 0, reason: 'Levitate' };
  if (def === 'flash fire' && moveType === 'Fire') return { immune: true, multiplier: 0, reason: 'Flash Fire' };
  if (def === 'water absorb' && moveType === 'Water') return { immune: true, multiplier: 0, reason: 'Water Absorb' };
  if (def === 'volt absorb' && moveType === 'Electric') return { immune: true, multiplier: 0, reason: 'Volt Absorb' };
  if (def === 'wonder guard' && effectiveness <= 1) return { immune: true, multiplier: 0, reason: 'Wonder Guard' };

  let multiplier = 1;
  const reasons = [];
  if (def === 'thick fat' && (moveType === 'Fire' || moveType === 'Ice')) { multiplier *= 0.5; reasons.push('Thick Fat'); }
  if (category === 'physical' && (atk === 'huge power' || atk === 'pure power')) { multiplier *= 2; reasons.push('Huge/Pure Power'); }
  return { immune: false, multiplier, reason: reasons.join(' • ') };
}

export function abilitySummary(ability) {
  const a = normalizeAbility(ability);
  const summaries = {
    'levitate': 'Ground moves are immune.',
    'flash fire': 'Fire moves are immune.',
    'water absorb': 'Water moves are immune.',
    'volt absorb': 'Electric moves are immune.',
    'swift swim': 'Speed doubles in rain.',
    'chlorophyll': 'Speed doubles in sun.',
    'thick fat': 'Fire and Ice damage is halved.',
    'guts': 'Physical damage is boosted while statused.',
    'huge power': 'Physical Attack is doubled.',
    'pure power': 'Physical Attack is doubled.',
    'intimidate': 'On switch-in, the opposing Attack stage drops by 1.',
    'natural cure': 'Status is cured when switching out.',
  };
  return summaries[a] || '';
}
