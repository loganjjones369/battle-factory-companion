import { analyzeFactoryCandidates } from './candidateEngine';
import { rankResponses } from './responseAnalysis';
import { buildBattleSequence } from './battleSequence';
import { getStats as requireStats } from './damageCalc';
import { getPokemon } from './factoryData';
import { getFactorySet } from './setIdentity';

const norm = (value) => String(value || '').trim().toLowerCase();
const setKey = (set) => `${norm(set?.species)}#${set?.id ?? set?.setId ?? set?.sourceId ?? ''}`;

function withoutKO(items = [], knockedOut = []) {
  const ko = new Set((knockedOut || []).map(Number));
  return items.filter((item, index) => !ko.has(index) && item);
}

function uniqueSets(entries = []) {
  const map = new Map();
  entries.forEach((entry) => {
    const set = entry?.set || entry;
    if (set) map.set(setKey(set), set);
  });
  return [...map.values()];
}

function scoreResponse(response) {
  if (!response) return -Infinity;
  const outgoing = Number(response.hitBack?.percentMax || 0);
  const incoming = Number(response.incoming?.percentMax || 999);
  const speedBonus = response.relation === 'outspeeds' ? 12 : response.relation === 'speed ties' ? 5 : 0;
  const safeBonus = response.safeSwitch ? 18 : 0;
  return outgoing * 1.2 - incoming * 0.9 + speedBonus + safeBonus;
}

/**
 * Turns the Factory candidate pool + the current KO/active state into a
 * battle-time decision snapshot. This intentionally reports evidence and
 * response ranges rather than pretending candidate frequency is an exact
 * in-game probability.
 */
export function analyzeBattleDecision({
  draft = [],
  scientist = {},
  levelMode = 'Open Level',
  battle = 1,
  blockedSpecies = [],
  observations = [],
  currentTeam = [],
  previousOpponent = [],
  opponent = [],
  knockedOut = { team: [], opponent: [] },
  activeTeamIndex = null,
  activeOpponentIndex = null,
  noland = false,
  battleConditions = {},
} = {}) {
  const sequence = buildBattleSequence({
    team: currentTeam,
    opponent,
    knockedOut,
    activeTeamIndex,
    activeOpponentIndex,
    observations,
  });

  const activeTeam = withoutKO(currentTeam, knockedOut.team);
  const activeOpponent = withoutKO(opponent, knockedOut.opponent);
  const defeatedOpponentSpecies = new Set(sequence.opponentEvidence.defeatedSpecies || []);

  const candidateResult = analyzeFactoryCandidates({
    draft,
    blockedSpecies,
    scientist,
    levelMode,
    battle,
    revealed: { observations },
    currentTeam,
    previousOpponent,
    noland,
  });

  const allCandidateSets = uniqueSets(candidateResult.rankedSets || []);
  const knownDefeatedKeys = new Set(
    activeOpponent.length === opponent.length
      ? []
      : opponent
          .map((pokemon, index) => (knockedOut.opponent || []).map(Number).includes(index) ? setKey(pokemon) : null)
          .filter(Boolean),
  );
  const futureCandidateSets = allCandidateSets.filter((set) => {
    if (knownDefeatedKeys.has(setKey(set))) return false;
    if (defeatedOpponentSpecies.has(norm(set.species)) && observations.some((o) => norm(o.species) === norm(set.species))) return true;
    return true;
  });

  const responseByOpponentSet = [];
  futureCandidateSets.forEach((candidate) => {
    const responses = activeTeam.flatMap((ally, allyIndex) => {
      const teamSide = battleConditions.team || {};
      const oppSide = battleConditions.opponent || {};
      const allyHPPercent = teamSide.hpPercent == null ? 100 : teamSide.hpPercent;
      const allySpikes = Math.max(0, Math.min(3, Number(teamSide.spikes) || 0));
      const oppHPPercent = oppSide.hpPercent == null ? 100 : oppSide.hpPercent;
      const candidateStats = candidate ? requireStats(getPokemon(candidate.species), candidate, levelMode === 'Open Level' ? 100 : 50, Math.max(1, Math.ceil(Number(battle) / 7))) : null;
      const allySet = ally?.setId != null ? getFactorySet(ally.species, ally.setId) : ally;
      const allyStats = ally && allySet ? requireStats(ally, allySet, levelMode === 'Open Level' ? 100 : 50, Math.max(1, Math.ceil(Number(battle) / 7))) : null;
      return rankResponses(candidate, [ally], levelMode === 'Open Level' ? 100 : 50, Math.max(1, Math.ceil(Number(battle) / 7)), {
        opponentSet: candidate,
        allyStatus: teamSide.status || 'healthy',
        opponentStatus: oppSide.status || 'healthy',
        allyHP: allyStats ? Math.max(1, Math.floor(allyStats.hp * allyHPPercent / 100)) : undefined,
        opponentHP: candidateStats ? Math.max(1, Math.floor(candidateStats.hp * oppHPPercent / 100)) : undefined,
        allyStages: teamSide.statStages || {},
        opponentStages: oppSide.statStages || {},
        allyScreens: { reflect: Boolean(teamSide.reflect), lightScreen: Boolean(teamSide.lightScreen) },
        opponentScreens: { reflect: Boolean(oppSide.reflect), lightScreen: Boolean(oppSide.lightScreen) },
        defenderSubstitute: Boolean(oppSide.substitute),
      });
    }).flat();
    if (!responses.length) return;
    const best = [...responses].sort((a, b) => scoreResponse(b) - scoreResponse(a))[0];
    responseByOpponentSet.push({
      opponentSet: candidate,
      bestResponse: best,
      responseScore: scoreResponse(best),
    });
  });

  const grouped = new Map();
  responseByOpponentSet.forEach((row) => {
    const species = norm(row.opponentSet.species);
    if (!grouped.has(species)) grouped.set(species, []);
    grouped.get(species).push(row);
  });

  const speciesRecommendations = [...grouped.entries()].map(([species, rows]) => {
    const best = [...rows].sort((a, b) => b.responseScore - a.responseScore)[0];
    const responses = rows.map((row) => row.bestResponse).filter(Boolean);
    const incomingMax = responses.map((r) => Number(r.incoming?.percentMax || 0)).filter(Number.isFinite);
    const outgoingMax = responses.map((r) => Number(r.hitBack?.percentMax || 0)).filter(Number.isFinite);
    const safeCount = responses.filter((r) => r.safeSwitch).length;
    return {
      species,
      setCount: rows.length,
      sets: rows.map((row) => row.opponentSet),
      bestResponse: best.bestResponse,
      responseRange: {
        incomingMin: incomingMax.length ? Math.min(...incomingMax) : null,
        incomingMax: incomingMax.length ? Math.max(...incomingMax) : null,
        outgoingMin: outgoingMax.length ? Math.min(...outgoingMax) : null,
        outgoingMax: outgoingMax.length ? Math.max(...outgoingMax) : null,
      },
      safeSwitchCount: safeCount,
      safeSwitchTotal: responses.length,
      note: `${rows.length} surviving set${rows.length === 1 ? '' : 's'} evaluated against the currently active party.`,
    };
  }).sort((a, b) => scoreResponse(b.bestResponse) - scoreResponse(a.bestResponse));

  const activeOpponentSet = sequence.activeOpponent;
  const activeDecision = activeOpponentSet
    ? speciesRecommendations.find((row) => norm(row.species) === norm(activeOpponentSet.species)) || null
    : null;

  return {
    supported: candidateResult.supported,
    candidateResult,
    sequence,
    activeTeam,
    activeOpponent: activeOpponentSet,
    activeDecision,
    speciesRecommendations,
    nextChoices: sequence.playerChoices,
    futureCandidateSets,
    knownDefeatedSpecies: sequence.opponentEvidence.defeatedSpecies,
    decisionState: sequence.battleOver
      ? (sequence.playerWon ? 'WON' : 'LOST')
      : activeOpponentSet && activeTeam.length
        ? 'DECIDE'
        : sequence.nextDecision,
    note: 'Response scoring is a decision aid based on survivability, return damage, and speed. Candidate-set frequency is not an exact in-game probability.',
  };
}

export function summarizeBattleDecision(result) {
  if (!result) return 'No battle decision data yet.';
  if (result.decisionState === 'WON') return 'All opponent slots are KO’d. Battle won.';
  if (result.decisionState === 'LOST') return 'All of your Pokémon are KO’d. Battle lost.';
  if (result.decisionState === 'CHOOSE YOUR ACTIVE POKÉMON') return 'Choose which surviving Pokémon is active before calculating the response.';
  if (result.decisionState === 'REVEAL OR CHOOSE THE ACTIVE OPPONENT') return 'Reveal the next opponent Pokémon to update the response calculation.';
  const top = result.activeDecision || result.speciesRecommendations?.[0];
  if (!top) return 'The current clues do not produce a response calculation yet.';
  const best = top.bestResponse;
  return best
    ? `${top.species}: ${best.ally?.species || 'best available answer'} ${best.relation || ''}; return damage ${best.hitBack?.percentMin?.toFixed?.(1) ?? '?'}–${best.hitBack?.percentMax?.toFixed?.(1) ?? '?'}%.`
    : `${top.species}: response data is incomplete.`;
}
