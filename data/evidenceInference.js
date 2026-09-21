import {getStats,getEffectiveSpeed,applyStatStages,calculateDamage} from './damageCalc'; const norm=v=>String(v||'').trim().toLowerCase();
const movesOf=s=>(s?.moves||[]).map(m=>typeof m==='string'?m:m?.name).filter(Boolean);
export function inferSetEvidence({pokemon,sets=[],observation={}}={}){return sets.map(set=>{const reasons=[];let compatible=true;if(observation.item&&norm(set.item)!==norm(observation.item)){compatible=false;reasons.push('held item mismatch');}const moves=movesOf(set).map(norm);for(const move of observation.moves||[])if(!moves.includes(norm(move))){compatible=false;reasons.push('move mismatch: '+move);}if(observation.ability&&!String(set.ability||'').toLowerCase().split('/').map(norm).includes(norm(observation.ability))){compatible=false;reasons.push('ability mismatch');}return {set,compatible,reasons};});}
export function inferSpeedCandidates({pokemon,sets=[],level=50,round=1,observedSpeed,observedRelation,status='healthy',stages={}}={}){if(observedSpeed==null&&!observedRelation)return {possible:sets,eliminated:[]};const possible=[],eliminated=[];for(const set of sets){const base=getStats(pokemon,set,level,round);const effective=getEffectiveSpeed(applyStatStages(base,stages),status);let ok=true;if(observedRelation==='equal')ok=effective===Number(observedSpeed);if(observedRelation==='at least')ok=effective>=Number(observedSpeed);if(observedRelation==='at most')ok=effective<=Number(observedSpeed);(ok?possible:eliminated).push({set,speed:effective});}return {possible,eliminated};}
export function inferDamageCandidates({attacker,defender,attackerSets=[],defenderSets=[],moveName,observedDamage,level=50,round=1,weather='none'}={}){if(observedDamage==null)return {possible:defenderSets,eliminated:[]};const possible=[],eliminated=[];for(const ds of defenderSets){let ok=false;for(const as of attackerSets){const d=calculateDamage({attacker,attackerSet:as,defender,defenderSet:ds,level,round,moveName,weather});if(Number(observedDamage)>=Number(d.min)&&Number(observedDamage)<=Number(d.max))ok=true;}(ok?possible:eliminated).push(ds);}return {possible,eliminated};}

export function inferObservationBranches({ observations = [], sets = [], level = 50, round = 1, currentTeam = [], levelMode = null } = {}) {
  const surviving = sets.filter(Boolean);
  const results = [];
  const eliminated = [];
  const mode = levelMode || (Number(level) === 100 ? 'Open Level' : 'Level 50');
  const bySpecies = new Map(observations.filter(Boolean).map((observation) => [norm(observation.species), observation]));
  for (const set of surviving) {
    const observation = bySpecies.get(norm(set.species));
    if (!observation) {
      results.push({ set, compatible: true, reasons: [], cluesApplied: 0 });
      continue;
    }
    const evidenceRows = inferSetEvidence({ pokemon: { name: set.species }, sets: [set], observation })[0];
    const damageOk = observation.observedDamagePercent == null
      ? true
      : Boolean(observation.observedDamageMove) && currentTeam.length
        ? (() => {
            const attacker = { name: set.species };
            const targetMatches = currentTeam.filter((target) => !observation.targetSpecies || norm(target?.species) === norm(observation.targetSpecies));
            return targetMatches.some((target) => inferDamageCandidates({
              attacker,
              defender: { name: target?.species },
              attackerSets: [set],
              defenderSets: [target?.setId != null ? target : null].filter(Boolean),
              moveName: observation.observedDamageMove,
              observedDamage: Number(observation.observedDamagePercent),
              level,
              round,
              weather: observation.weather || 'none',
            }).possible.length > 0);
          })()
        : true;
    const speedOk = observation.observedSpeed == null
      ? true
      : inferSpeedCandidates({
          pokemon: { name: set.species },
          sets: [set],
          level,
          round,
          observedSpeed: Number(observation.observedSpeed),
          observedRelation: observation.observedSpeedRelation || 'equal',
          status: observation.status || 'healthy',
          stages: observation.stages || {},
        }).possible.length > 0;
    const compatible = Boolean(evidenceRows?.compatible && damageOk && speedOk);
    if (compatible) results.push({ set, compatible: true, reasons: evidenceRows.reasons || [], cluesApplied: Number((observation.moves || []).length) + (observation.item ? 1 : 0) + (observation.ability ? 1 : 0) + (observation.observedSpeed != null ? 1 : 0) + (observation.observedDamagePercent != null ? 1 : 0) });
    else eliminated.push({ set, compatible: false, reasons: [...(evidenceRows?.reasons || []), ...(damageOk ? [] : ['damage clue mismatch']), ...(speedOk ? [] : ['speed clue mismatch'])] });
  }
  return {
    surviving: results,
    eliminated,
    count: results.length,
    eliminatedCount: eliminated.length,
    note: 'Observation branches are evidence filters, not probabilities. Each new clue can remove incompatible set branches.',
  };
}

export function summarizeObservationEvidence(observations = []) {
  return observations.filter(Boolean).map((observation) => ({
    species: observation.species || '',
    clues: [
      observation.item ? 'item' : null,
      observation.ability ? 'ability' : null,
      ...(observation.moves || []).map(() => 'move'),
      observation.observedDamagePercent != null ? 'damage percent' : null,
      observation.observedSpeed != null ? 'speed' : null,
    ].filter(Boolean),
  }));
}
