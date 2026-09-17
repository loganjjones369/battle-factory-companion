export function classifyResponse(assessments = [], options = {}) {
  const assessedSets = assessments.length;
  if (!assessedSets) return { label: 'NEUTRAL', reason: 'No compatible Factory sets have been assessed yet.', assessedSets: 0, fasterSets: 0, guaranteedOhkos: 0, guaranteedTwoHkos: 0, threatenedSets: 0, assessments };
  const fasterSets = assessments.filter((a) => a.speed === 'faster').length;
  const guaranteedOhkos = assessments.filter((a) => a.guaranteedKo).length;
  const guaranteedTwoHkos = assessments.filter((a) => a.koInTwo).length;
  const threatenedSets = assessments.filter((a) => a.canThreatenKo).length;
  const fullyKnownSpeed = assessments.filter((a) => a.speed !== 'unknown').length;
  const allKnownAndFaster = fullyKnownSpeed === assessedSets && fasterSets === assessedSets;
  const allKnownAndNotFaster = fullyKnownSpeed === assessedSets && fasterSets === 0;
  const base = { assessedSets, fasterSets, guaranteedOhkos, guaranteedTwoHkos, threatenedSets, assessments };
  if (options.switchingIn && threatenedSets === 0) return { label: 'SAFE SWITCH', reason: `No assessed set can immediately threaten the incoming Pokémon (${assessedSets}/${assessedSets}).`, ...base };
  if (options.opponentJustEntered && allKnownAndFaster && guaranteedOhkos === assessedSets) return { label: 'REVENGE KILL', reason: `All ${assessedSets} assessed sets are slower, and every set is a guaranteed OHKO before it can move.`, ...base };
  if (guaranteedOhkos === assessedSets && allKnownAndFaster) return { label: 'OHKO', reason: `A KO is guaranteed against all ${assessedSets} assessed sets before they can move.`, ...base };
  if (guaranteedTwoHkos === assessedSets && allKnownAndFaster && threatenedSets === 0) return { label: '2HKO', reason: `Every assessed set is guaranteed to fall within two hits, and none can immediately KO the response.`, ...base };
  if (threatenedSets === assessedSets && allKnownAndNotFaster) return { label: 'BAD MATCHUP', reason: `All ${assessedSets} assessed sets can threaten this Pokémon before it moves.`, ...base };
  if (threatenedSets > 0) return { label: 'RISKY', reason: `${threatenedSets}/${assessedSets} assessed sets can threaten this response.`, ...base };
  return { label: 'NEUTRAL', reason: `${guaranteedOhkos}/${assessedSets} sets are guaranteed OHKOs, ${guaranteedTwoHkos}/${assessedSets} are guaranteed 2HKOs, and ${threatenedSets}/${assessedSets} can threaten the response.`, ...base };
}

export function buildSetAssessments(checks = []) {
  return checks.map((check, index) => ({
    setId: String(check.opponentSet?.id ?? check.opponentSet?.setId ?? check.opponentSet?.sourceId ?? `set-${index + 1}`),
    set: check.opponentSet || null,
    speed: check.relation === 'outspeeds' ? 'faster' : check.relation === 'slower than' ? 'slower' : check.relation === 'speed ties' ? 'tie' : 'unknown',
    damagePercent: check.hitBack?.percentMax ?? null,
    damageMin: check.hitBack?.percentMin ?? null,
    incomingDamageMin: check.incoming?.percentMin ?? null,
    incomingDamageMax: check.incoming?.percentMax ?? null,
    guaranteedKo: !!check.guaranteedOHKO,
    koInTwo: !!check.guaranteedTwoHKO,
    canBeKoed: (check.incoming?.percentMax ?? 0) >= 100,
    canThreatenKo: (check.incoming?.percentMax ?? 0) >= 100,
    hitBack: check.hitBack || null,
    incoming: check.incoming || null,
  }));
}
