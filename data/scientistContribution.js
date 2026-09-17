import { calculateTeamStyle, calculateTeamType, getScientistStyleLabel } from './scientistAnalysis';

const norm = (value) => String(value || '').trim().toLowerCase();

function markersFor(set = {}) {
  return Array.isArray(set.style) ? set.style.map(Number).filter(Number.isInteger) : [];
}

function countMarkers(sets = []) {
  const counts = {};
  sets.flatMap(markersFor).forEach((marker) => { counts[marker] = (counts[marker] || 0) + 1; });
  return counts;
}

const requirements = {
  1: 3,
  2: 3,
  3: 3,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
};

export function getStyleContribution(set = {}, scientistStyle = null) {
  const target = Number(scientistStyle);
  const markers = markersFor(set);
  const contribution = {};
  for (let style = 1; style <= 7; style += 1) {
    const count = markers.filter((marker) => marker === style).length;
    contribution[style] = {
      count,
      required: requirements[style],
      suppliesEnoughAlone: count >= requirements[style],
      target: style === target,
    };
  }
  const targetInfo = contribution[target] || null;
  return {
    markers,
    target: targetInfo,
    targetStyle: target,
    targetLabel: target >= 0 && target <= 8 ? getScientistStyleLabel(target) : 'unknown',
  };
}

function canCompleteTargetWithPartners(set, targetStyle, allSets) {
  if (targetStyle < 1 || targetStyle > 7) return { possible: true, needed: 0, partnerCount: allSets.length };
  const own = markersFor(set).filter((marker) => marker === targetStyle).length;
  const needed = Math.max(0, requirements[targetStyle] - own);
  if (needed === 0) return { possible: true, needed: 0, partnerCount: 0 };
  const partners = allSets.filter((candidate) => candidate !== set && markersFor(candidate).includes(targetStyle));
  return { possible: partners.length >= needed, needed, partnerCount: partners.length };
}

export function explainSetAgainstScientist(set, scientist = {}, candidatePool = []) {
  const style = Number(scientist.style);
  const contribution = getStyleContribution(set, style);
  const partner = canCompleteTargetWithPartners(set, style, candidatePool);
  const type = scientist.type;
  const typeMatch = !type || norm(calculateTeamType([set])) === norm(type) || (set.types || []).some((candidateType) => norm(candidateType) === norm(type));
  let status = 'neutral';
  let text = 'This set does not independently provide enough of the Scientist style clue.';
  if (style >= 1 && style <= 7 && contribution.target?.suppliesEnoughAlone) {
    status = 'contributor';
    text = `This set supplies ${contribution.target.count}/${contribution.target.required} moves for “${getScientistStyleLabel(style)}” by itself. It is not automatically eliminated; the final phrase is determined from the complete three-set team.`;
  } else if (style >= 1 && style <= 7 && partner.possible) {
    status = 'needs-partners';
    text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”. At least ${partner.needed} compatible partner set${partner.needed === 1 ? '' : 's'} can supply the rest.`;
  } else if (style >= 1 && style <= 7) {
    status = 'unlikely';
    text = `This set supplies ${contribution.target?.count || 0}/${contribution.target?.required || 0} moves for “${getScientistStyleLabel(style)}”, and the remaining candidate pool does not contain enough partners to complete that category.`;
  }
  if (!typeMatch && type) text += ` Its typing does not independently match the Scientist’s ${type} type clue.`;
  return { status, text, contribution, partner, typeMatch };
}

export function buildScientistContributionSummary(sets = [], scientist = {}, candidatePool = []) {
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
    perSet: sets.map((set) => ({ set, explanation: explainSetAgainstScientist(set, scientist, candidatePool) })),
  };
}
