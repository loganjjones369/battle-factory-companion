import { getDraftSetPools } from './factoryPools';
import { calculateDamage, getStats, getEffectiveSpeed, bestDamagingMoves } from './damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const setKey = (set) => `${norm(set?.species)}#${set?.id ?? set?.setId ?? ''}`;
const swapCountForElevation = (elevation) => [0, 15, 22, 29, 36, 43][Math.max(0, Math.min(5, Number(elevation) || 0))];

function setWithDraftStats(set, draftEntry, levelNumber, round) {
  return { ...set, species: set.species || draftEntry?.species, setId: set.id ?? set.setId, factoryIV: draftEntry?.factoryIV, isElevated: draftEntry?.isElevated, level: levelNumber, round };
}

function bestAgainst(attacker, defender, levelNumber, round, weather = 'none') {
  const moves = bestDamagingMoves(attacker); let best = null;
  moves.forEach((moveName) => {
    const result = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level: levelNumber, round, moveName, weather });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  });
  return best;
}

function speedOf(pokemon, levelNumber, round) { return getEffectiveSpeed(getStats(pokemon, pokemon, levelNumber, round), 'healthy'); }

export function buildDraftSetSpread({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null, weather = 'none' } = {}) {
  const levelNumber = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const inferredElevation = draft.filter((p) => p?.isElevated).length;
  const effectiveSwaps = swaps == null ? swapCountForElevation(inferredElevation) : Math.max(0, Number(swaps) || 0);
  const pool = getDraftSetPools({ levelMode, battle, swaps: effectiveSwaps });

  if (!pool.supported) return { supported: false, reason: pool.reason, rows: [] };

  const rows = draft.filter(Boolean).map((draftEntry, index) => {
    const bucket = index < pool.elevation ? pool.upgradeBucket : pool.baseBucket;
    const possibleSets = [...(index < pool.elevation ? pool.upgradedPool : pool.regularPool)].filter((set) => norm(set.species) === norm(draftEntry.species));
    const targets = draft.filter((target, targetIndex) => target && targetIndex !== index).map((target) => {
      const targetSet = setWithDraftStats(target, target, levelNumber, round);
      const setResults = possibleSets.map((candidate) => {
        const attacker = setWithDraftStats(candidate, draftEntry, levelNumber, round);
        const best = bestAgainst(attacker, targetSet, levelNumber, round, weather);
        const attackerSpeed = speedOf(attacker, levelNumber, round); const defenderSpeed = speedOf(targetSet, levelNumber, round);
        return { set: attacker, best, faster: attackerSpeed > defenderSpeed, speed: attackerSpeed, targetSpeed: defenderSpeed };
      });
      const meaningful = setResults.filter((x) => x.best || x.faster);
      const twoHit = setResults.filter((x) => x.best?.ko && x.best.ko <= 2);
      const fiftyPlus = setResults.filter((x) => x.best?.percentMax >= 50);
      const faster = setResults.filter((x) => x.faster);
      return { target, total: setResults.length, meaningful: meaningful.length, twoHit: twoHit.length, fiftyPlus: fiftyPlus.length, faster: faster.length, sets: setResults };
    });
    const pressureTargets = targets.filter((target) => target.twoHit || target.fiftyPlus || target.faster);
    const pressureScore = targets.reduce((sum, target) => sum + target.twoHit * 3 + target.fiftyPlus + target.faster, 0);
    return { draftEntry, slotIndex: index, bucket, elevated: index < pool.elevation, possibleSets, setCount: possibleSets.length, targets, pressureTargets, pressureScore };
  });

  return { supported: true, levelMode, battle: Number(battle) || 1, swaps: effectiveSwaps, elevation: pool.elevation, baseBucket: pool.baseBucket, upgradeBucket: pool.upgradeBucket, rows };
}

export function summarizeDraftSetRow(row) {
  if (!row) return '';
  const target = row.targets.find((x) => x.twoHit || x.fiftyPlus || x.faster);
  if (!target) return `${row.setCount} possible ${row.draftEntry.species} sets screened; no mapped pressure found against the other draft Pokémon.`;
  return `${row.setCount} possible ${row.draftEntry.species} sets; ${target.twoHit}/${target.total} can reach a 2HKO against ${target.target.species}, ${target.fiftyPlus}/${target.total} reach 50%+ damage, and ${target.faster}/${target.total} are faster.`;
}

export { setKey };
