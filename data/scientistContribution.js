import { calculateTeamStyle, calculateTeamType, getScientistStyleLabel } from './scientistAnalysis';

const norm = (value) => String(value || '').trim().toLowerCase();
const setKey = (set = {}) => `${norm(set.species)}#${set.id ?? set.setId ?? set.sourceId ?? ''}`;

function markersFor(set = {}) {
  return Array.isArray(set.style) ? set.style.map(Number).filter(Number.isInteger) : [];
}

function countMarkers(sets = []) {
  const counts = {};
  sets.flatMap(markersFor).forEach((marker) => { counts[marker] = (counts[marker] || 0) + 1; });
  return counts;
}

const requirements = { 1: 3, 2: 3, 3: 3, 4: 2, 5: 2, 6: 2, 7: 2 };

export function getStyleContribution(set = {}, scientistStyle = null) {
  const target = Number(scientistStyle);
  const markers = markersFor(set);
  const contribution = {};
  for (let style = 1; style <= 7; style += 1) {
    const count = markers.filter((marker) => marker === style).length;
    contribution[style] = { count, required: requirements[style], suppliesEnoughAlone: count >= requirements[style], target: style === target };
  }
  const targetInfo = contribution[target] || null;
  return { markers, target: targetInfo, targetStyle: target, targetLabel: target >= 0 && target <= 8 ? getScientistStyleLabel(target) : 'unknown' };
}

function legalTeamWithSet(set, team) {
  if (!Array.isArray(team) || team.length !== 3) return false;
  if (!team.some((candidate) => setKey(candidate) === setKey(set))) return false;
  if (new Set(team.map((x) => norm(x?.species))).size !== 3) return false;
  const items = team.map((x) => norm(x?.item).replace(/[^a-z0-9]/g, '')).filter(Boolean);
  return new Set(items).size === items.length;
}

function teamContribution(team, targetStyle, scientist) {
  const targetCount = team.flatMap(markersFor).filter((marker) => marker === targetStyle).length;
  const finalStyle = calculateTeamStyle(team);
  const finalType = calculateTeamType(team);
  const styleFits = finalStyle === targetStyle;
  const typeFits = !scientist.type || norm(finalType) === norm(scientist.type);
  return { targetCount, finalStyle, finalType, styleFits, typeFits, fitsScientist: styleFits && typeFits };
}

function compatibleTeamEvidence(set, scientist = {}, candidateTeams = []) {
  const teams = candidateTeams.filter((team) => legalTeamWithSet(set, team));
  const fittingTeams = teams.filter((team) => teamContribution(team, Number(scientist.style), scientist).fitsScientist);
  const partnerSignatures = new Set(fittingTeams.map((team) => team.filter((x) => setKey(x) !== setKey(set)).map(setKey).sort().join('|')));
  return { candidateTeamCount: teams.length, fittingTeamCount: fittingTeams.length, partnerPairCount: partnerSignatures.size, fittingTeams };
}

export function explainSetAgainstScientist(set, scientist = {}, candidatePool = [], candidateTeams = []) {
  const style = Number(scientist.style);
  const contribution = getStyleContribution(set, style);
  const teamEvidence = compatibleTeamEvidence(set, scientist, candidateTeams);
  const survivedCandidatePool = candidatePool.some((candidate) => setKey(candidate?.set || candidate) === setKey(set));
  const type = scientist.type;
  const typeMatch = !type || (set.types || []).some((candidateType) => norm(candidateType) === norm(type));
  let status = 'neutral';
  let text = 'This set does not independently provide enough of the Scientist style clue.';

  if (style >= 1 && style <= 7) {
    if (contribution.target?.suppliesEnoughAlone) {
      status = 'contributor';
      text = `This set supplies ${contribution.target.count}/${contribution.target.required} moves for “${getScientistStyleLabel(style)}” by itself. It is not automatically eliminated; the final phrase comes from the complete three-set team.`;
    } else if (teamEvidence.fittingTeamCount > 0) {
      status = 'needs-partners';
      text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”. ${teamEvidence.partnerPairCount} compatible partner pair${teamEvidence.partnerPairCount === 1 ? '' : 's'} produce a complete team that fits the Scientist clue.`;
    } else if (survivedCandidatePool) {
      status = 'surviving-team';
      text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”. It survives the current complete-team Scientist filter, so other members of its legal team(s) must supply the remaining contribution or otherwise produce the required final phrase.`;
    } else if (candidateTeams.length > 0) {
      status = 'incompatible';
      text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”, but none of the surviving legal teams containing this set produce the requested Scientist clue.`;
    } else {
      status = 'unknown';
      text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”. Team-level evidence is not available yet.`;
    }
  }

  if (!typeMatch && type) text += ` Its typing does not independently match the Scientist’s ${type} type clue.`;
  if (teamEvidence.fittingTeamCount > 0) text += ` It survives in ${teamEvidence.fittingTeamCount} complete Scientist-compatible team${teamEvidence.fittingTeamCount === 1 ? '' : 's'}.`;
  return { status, text, contribution, teamEvidence, typeMatch };
}

export function buildScientistContributionSummary(sets = [], scientist = {}, candidatePool = [], candidateTeams = []) {
  const style = Number(scientist.style);
  const counts = countMarkers(sets);
  const finalStyle = calculateTeamStyle(sets);
  const finalType = calculateTeamType(sets);
  return {
    finalStyle,
    finalStyleLabel: getScientistStyleLabel(finalStyle),
    finalType,
    targetStyle: style,
    targetStyleLabel: getScientistStyleLabel(style),
    targetCount: counts[style] || 0,
    targetRequired: requirements[style] || null,
    perSet: sets.map((set) => ({ set, explanation: explainSetAgainstScientist(set, scientist, candidatePool, candidateTeams) })),
  };
}
