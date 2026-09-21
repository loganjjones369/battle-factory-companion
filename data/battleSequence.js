const clean = (value) => String(value || '').trim();
const speciesOf = (value) => clean(value?.species || value?.name || value);
const PRIORITY_BY_MOVE = {
  HelpingHand: 5,
  FollowMe: 3,
  Protect: 3,
  Detect: 3,
  Endure: 3,
  FakeOut: 3,
  QuickAttack: 1,
  MachPunch: 1,
  ExtremeSpeed: 1,
};

export function getMovePriority(moveName = '') {
  return Number(PRIORITY_BY_MOVE[String(moveName || '').replace(/[^A-Za-z]/g, '')] || 0);
}

export function compareTurnOrder(a = {}, b = {}) {
  const priorityA = getMovePriority(a.moveName);
  const priorityB = getMovePriority(b.moveName);
  if (priorityA !== priorityB) return priorityB - priorityA;
  const speedA = Number(a.speed) || 0;
  const speedB = Number(b.speed) || 0;
  if (speedA !== speedB) return speedB - speedA;
  return 0;
}


export function getActiveIndexes(slots = [], knockedOut = []) {
  const ko = new Set((knockedOut || []).map(Number));
  return slots.map((_, index) => index).filter((index) => !ko.has(index));
}

export function getAvailableBattleSlots(slots = [], knockedOut = []) {
  const ko = new Set((knockedOut || []).map(Number));
  return slots.map((pokemon, index) => ({ pokemon, index, knockedOut: ko.has(index) })).filter((row) => row.pokemon && !row.knockedOut);
}

export function getBattleStatus(team = [], opponent = [], knockedOut = {}) {
  const activeTeam = getActiveIndexes(team, knockedOut.team);
  const activeOpponent = getActiveIndexes(opponent, knockedOut.opponent);
  return {
    teamRemaining: activeTeam.length,
    opponentRemaining: activeOpponent.length,
    teamKO: team.length - activeTeam.length,
    opponentKO: opponent.length - activeOpponent.length,
    teamActiveIndexes: activeTeam,
    opponentActiveIndexes: activeOpponent,
    battleOver: activeTeam.length === 0 || activeOpponent.length === 0,
    playerLost: activeTeam.length === 0,
    playerWon: activeOpponent.length === 0,
  };
}

export function getNextPlayerChoices(team = [], knockedOut = {}, activeTeamIndex = null) {
  return getAvailableBattleSlots(team, knockedOut.team).map(({ pokemon, index }) => ({
    pokemon,
    index,
    species: speciesOf(pokemon),
    setId: pokemon?.setId ?? pokemon?.id ?? null,
    isCurrent: Number(index) === Number(activeTeamIndex),
  }));
}

export function getOpponentEvidenceAfterKO(opponent = [], knockedOut = {}, observations = []) {
  const ko = new Set((knockedOut.opponent || []).map(Number));
  const defeated = opponent.filter((pokemon, index) => ko.has(index) && pokemon);
  const observedSpecies = new Set((observations || []).map((entry) => clean(entry?.species).toLowerCase()).filter(Boolean));
  defeated.forEach((pokemon) => observedSpecies.add(speciesOf(pokemon).toLowerCase()));
  return {
    defeated,
    defeatedSpecies: [...observedSpecies],
    note: 'Defeated opponents remain known evidence. They are not treated as available future choices.',
  };
}

export function buildBattleSequence({ team = [], opponent = [], knockedOut = {}, activeTeamIndex = null, activeOpponentIndex = null, observations = [] } = {}) {
  const status = getBattleStatus(team, opponent, knockedOut);
  const playerChoices = getNextPlayerChoices(team, knockedOut, activeTeamIndex);
  const opponentEvidence = getOpponentEvidenceAfterKO(opponent, knockedOut, observations);
  const activeTeam = Number.isInteger(activeTeamIndex) && !knockedOut.team?.includes(activeTeamIndex) ? team[activeTeamIndex] : null;
  const activeOpponent = Number.isInteger(activeOpponentIndex) && !knockedOut.opponent?.includes(activeOpponentIndex) ? opponent[activeOpponentIndex] : null;
  const availableOpponentSlots = getAvailableBattleSlots(opponent, knockedOut.opponent).map(({ pokemon, index }) => ({
    pokemon,
    index,
    species: speciesOf(pokemon),
    setId: pokemon?.setId ?? pokemon?.id ?? null,
    isCurrent: Number(index) === Number(activeOpponentIndex),
  }));
  return {
    ...status,
    knockedOut,
    activeTeamIndex,
    activeOpponentIndex,
    activeTeam,
    activeOpponent,
    playerChoices,
    availableOpponentSlots,
    opponentEvidence,
    nextDecision: status.battleOver
      ? 'BATTLE OVER'
      : !activeTeam
        ? 'CHOOSE YOUR ACTIVE POKÉMON'
        : !activeOpponent
          ? 'REVEAL OR CHOOSE THE ACTIVE OPPONENT'
          : 'CALCULATE THE NEXT DECISION',
  };
}

export function applyBattleKO(sequence, side, index) {
  if (!sequence || !['team', 'opponent'].includes(side)) return sequence;
  const next = { ...sequence, knockedOut: { ...(sequence.knockedOut || {}) } };
  const values = Array.isArray(next.knockedOut[side]) ? next.knockedOut[side] : [];
  next.knockedOut[side] = [...new Set([...values, Number(index)])].sort((a, b) => a - b);
  if (side === 'team' && Number(next.activeTeamIndex) === Number(index)) next.activeTeamIndex = null;
  if (side === 'opponent' && Number(next.activeOpponentIndex) === Number(index)) next.activeOpponentIndex = null;
  return buildBattleSequence(next);
}

export function undoBattleKO(sequence, side, index) {
  if (!sequence || !['team', 'opponent'].includes(side)) return sequence;
  const next = { ...sequence, knockedOut: { ...(sequence.knockedOut || {}) } };
  next.knockedOut[side] = (next.knockedOut[side] || []).filter((value) => Number(value) !== Number(index));
  return buildBattleSequence(next);
}

export function selectActivePokemon(sequence, side, index) {
  if (!sequence || !['team', 'opponent'].includes(side)) return sequence;
  const numericIndex = Number(index);
  const slots = side === 'team' ? sequence.team || [] : sequence.opponent || [];
  const ko = side === 'team' ? sequence.knockedOut?.team || [] : sequence.knockedOut?.opponent || [];
  if (!slots[numericIndex] || ko.map(Number).includes(numericIndex)) return sequence;
  const next = { ...sequence };
  if (side === 'team') next.activeTeamIndex = numericIndex;
  else next.activeOpponentIndex = numericIndex;
  return buildBattleSequence(next);
}


export function getMoveTurnProfile(moveName = '', weather = 'none') {
  const name = String(moveName || '');
  const chargeMoves = new Set(['Dig', 'Fly', 'Dive', 'Bounce', 'RazorWind', 'SkyAttack']);
  const solarBeamCharge = name === 'SolarBeam' && weather !== 'sun';
  const rechargeMoves = new Set(['HyperBeam']);
  return {
    moveName: name,
    requiresChargeTurn: chargeMoves.has(name) || solarBeamCharge,
    semiInvulnerableDuringCharge: ['Dig', 'Fly', 'Dive', 'Bounce'].includes(name),
    requiresRechargeTurn: rechargeMoves.has(name),
    skipsChargeInWeather: name === 'SolarBeam' && weather === 'sun',
  };
}
