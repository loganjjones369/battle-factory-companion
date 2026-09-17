import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';

function norm(v) { return String(v || '').trim().toLowerCase(); }
function itemKey(v) { return norm(v).replace(/[^a-z0-9]/g, ''); }
function setLabel(set) { return `${set.species || set.name || 'Unknown'} ${set.setId ?? set.sourceId ?? set.id ?? ''}`.trim(); }
function moveNames(set) { return (set.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean); }

function clueMatches(set, observations = []) {
  const observation = observations.find((o) => norm(o?.species) === norm(set?.species));
  if (!observation) return [];
  const matches = ['Species'];
  if (observation.item && itemKey(set.item) === itemKey(observation.item)) matches.push(`Item: ${set.item}`);
  const moves = moveNames(set).map(norm);
  (observation.moves || []).filter(Boolean).forEach((move) => { if (moves.includes(norm(move))) matches.push(`Move: ${move}`); });
  return matches;
}

function knownSet(p) { return p?.species && p?.setId != null ? p : null; }

function threatAgainstTeam(candidate, team = [], levelNumber = 50, round = 1) {
  const attacker = knownSet(candidate);
  if (!attacker || !team.length) return null;
  const details = team.map((defender) => {
    const d = knownSet(defender);
    if (!d) return null;
    const aSpeed = getStats(attacker, attacker, levelNumber, round).spe;
    const dSpeed = getStats(d, d, levelNumber, round).spe;
    let best = null;
    for (const moveName of bestDamagingMoves(attacker)) {
      const result = calculateDamage({ attacker, attackerSet: attacker, defender: d, defenderSet: d, level: levelNumber, round, moveName });
      if (!result || result.percentMax == null) continue;
      if (!best || result.percentMax > best.percentMax) best = { ...result, moveName };
    }
    return { defender: d, aSpeed, dSpeed, best };
  }).filter(Boolean);
  const pressureCount = details.filter((x) => x.best?.percentMax >= 50).length;
  const koCount = details.filter((x) => x.best?.percentMax >= 100).length;
  const fasterCount = details.filter((x) => x.aSpeed > x.dSpeed).length;
  return { details, pressureCount, koCount, fasterCount, teamSize: details.length };
}

function threatLabel(threat) {
  if (!threat) return null;
  if (threat.koCount > 0) return `KO range vs ${threat.koCount}/${threat.teamSize}`;
  if (threat.pressureCount === threat.teamSize && threat.teamSize > 0) return `2HKO+ range vs all ${threat.teamSize}`;
  if (threat.pressureCount > 0) return `2HKO+ range vs ${threat.pressureCount}/${threat.teamSize}`;
  if (threat.fasterCount === threat.teamSize && threat.teamSize > 0) return `Faster than all ${threat.teamSize}`;
  if (threat.fasterCount > 0) return `Faster than ${threat.fasterCount}/${threat.teamSize}`;
  return 'No mapped damage pressure';
}

export default function CandidateAnalysisPanel({
  draft = [], team = [], currentTeam = [], previousOpponent = [], blockedSpecies = [], scientist = {}, levelMode = 'Open Level', battle = 1,
  revealed = {}, noland = false, maxResults = 20,
}) {
  const [result, setResult] = useState(null);
  const [expandedSet, setExpandedSet] = useState(null);
  const [showEliminated, setShowEliminated] = useState(false);
  const [busy, setBusy] = useState(false);
  const analysisTeam = currentTeam.length ? currentTeam : team;
  const draftNames = useMemo(() => draft.map((p) => p?.species || p?.name).filter(Boolean), [draft]);
  const observations = revealed?.observations || [];
  const levelNumber = levelMode === 'Open Level' ? 100 : 50;
  const battleRound = Math.max(1, Math.ceil((Number(battle) || 1) / 7));

  const runAnalysis = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        setResult(analyzeFactoryCandidates({ draft, blockedSpecies, scientist, levelMode, battle, revealed, noland, currentTeam: analysisTeam, previousOpponent }));
        setExpandedSet(null);
        setShowEliminated(false);
      } finally { setBusy(false); }
    }, 0);
  };

  const rankedSets = result?.rankedSets || [];
  const visibleSets = rankedSets.slice(0, maxResults);
  const remainingCount = Math.max(0, rankedSets.length - visibleSets.length);
  const eliminated = result?.eliminatedSets || [];
  const eliminationGroups = useMemo(() => {
    const groups = {};
    eliminated.forEach((entry) => { groups[entry.reason] = (groups[entry.reason] || 0) + 1; });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [eliminated]);
  const threatMap = useMemo(() => {
    const map = {};
    visibleSets.forEach((entry) => {
      const key = `${norm(entry.set.species)}#${entry.set.id ?? entry.set.sourceId ?? entry.set.setId ?? ''}`;
      map[key] = threatAgainstTeam(entry.set, analysisTeam, levelNumber, battleRound);
    });
    return map;
  }, [visibleSets, analysisTeam, levelNumber, battleRound]);

  const teamNames = analysisTeam.map((p) => `${p.species} ${p.setId}`).filter(Boolean);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>FACTORY INTELLIGENCE</Text>
          <Text style={styles.title}>What can I see next?</Text>
          <Text style={styles.subtitle}>Surviving sets are filtered first. Then the app checks which candidates can pressure your exact current team.</Text>
        </View>
        <View style={styles.roundBadge}><Text style={styles.roundText}>B{Number(battle) || 1}</Text></View>
      </View>

      <Pressable style={styles.analyzeButton} onPress={runAnalysis} disabled={busy}>
        <Text style={styles.analyzeText}>{busy ? 'ANALYZING…' : 'ANALYZE REMAINING SETS'}</Text>
      </Pressable>
      <Text style={styles.contextText}>Draft: {draftNames.length ? draftNames.join(' • ') : 'not entered'}</Text>
      {!!teamNames.length && <Text style={styles.teamContext}>Current team: {teamNames.join(' • ')}</Text>}
      {!!previousOpponent.length && <Text style={styles.teamContext}>Previous opponent: {previousOpponent.map((p) => `${p.species} ${p.setId}`).join(' • ')}</Text>}

      {observations.length > 0 && (
        <View style={styles.observationBox}>
          <Text style={styles.observationTitle}>KNOWN OPPONENT CLUES</Text>
          {observations.map((o, i) => <Text key={`${o.species}-${i}`} style={styles.observationText}>{o.species}{o.item ? ` • ${o.item}` : ''}{o.moves?.length ? ` • ${o.moves.join(', ')}` : ''}</Text>)}
        </View>
      )}

      {result && (
        <View style={styles.resultBox}>
          {!result.supported ? <Text style={styles.warning}>{result.reason || 'This Factory pool is not supported by the current dataset.'}</Text> : (
            <>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>WHAT TO WORRY ABOUT NEXT</Text>
                <Text style={styles.summaryText}>The candidate list is still a frequency ranking, not an in-game probability. Threat labels use the exact current team when it is known, and only moves currently supported by the damage calculator.</Text>
              </View>

              <ScrollView style={styles.list} nestedScrollEnabled>
                {visibleSets.map((entry, index) => {
                  const set = entry.set;
                  const key = `${setLabel(set)}-${index}`;
                  const open = expandedSet === key;
                  const percent = Math.max(0, entry.frequency * 100);
                  const matches = clueMatches(set, observations);
                  const threatKey = `${norm(set.species)}#${set.id ?? set.sourceId ?? set.setId ?? ''}`;
                  const threat = threatMap[threatKey];
                  const threatText = threatLabel(threat);
                  return (
                    <View key={key} style={styles.setBlock}>
                      <Pressable style={styles.setRow} onPress={() => setExpandedSet(open ? null : key)}>
                        <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.setName}>{setLabel(set)}</Text>
                          <Text style={styles.frequency}>{percent.toFixed(1)}% of surviving candidate teams</Text>
                          {!!threatText && <Text style={styles.threatLine}>⚠ {threatText}</Text>}
                          {!!matches.length && <Text style={styles.matchLine}>✓ {matches.join('  •  ')}</Text>}
                        </View>
                        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                      </Pressable>
                      {open && (
                        <View style={styles.detailCard}>
                          {!!matches.length && <><Text style={styles.reasonTitle}>WHY THIS SET SURVIVED</Text><Text style={styles.reasonText}>{matches.join(' • ')}</Text></>}
                          {!!threat && analysisTeam.length > 0 && <>
                            <Text style={styles.reasonTitle}>WHY THIS SET MATTERS</Text>
                            {threat.details.map((detail, i) => <Text key={`${detail.defender.species}-${i}`} style={styles.detail}>
                              {setLabel(detail.defender)}: {detail.aSpeed > detail.dSpeed ? `faster (${detail.aSpeed} vs ${detail.dSpeed})` : detail.aSpeed === detail.dSpeed ? `speed tie (${detail.aSpeed})` : `slower (${detail.aSpeed} vs ${detail.dSpeed})`}
                              {detail.best ? ` • best mapped move ${detail.best.moveName}: ${detail.best.percentMin.toFixed(1)}%–${detail.best.percentMax.toFixed(1)}%` : ' • no mapped damaging move'}
                            </Text>)}
                          </>}
                          {!!set.item && <Text style={styles.detail}>Item: {set.item}</Text>}
                          {!!set.nature && <Text style={styles.detail}>Nature: {set.nature}</Text>}
                          {!!set.ability && <Text style={styles.detail}>Ability: {set.ability}</Text>}
                          {!!moveNames(set).length && <Text style={styles.detail}>Moves: {moveNames(set).join(' • ')}</Text>}
                        </View>
                      )}
                    </View>
                  );
                })}
                {!visibleSets.length && <Text style={styles.empty}>No surviving candidate sets match the current information.</Text>}
                {!!remainingCount && <Text style={styles.more}>+ {remainingCount} lower-frequency possibilities hidden</Text>}
              </ScrollView>

              {!!eliminated.length && <Pressable style={styles.eliminationToggle} onPress={() => setShowEliminated(!showEliminated)}>
                <View style={{ flex: 1 }}><Text style={styles.eliminationTitle}>WHY DID SETS DISAPPEAR?</Text><Text style={styles.eliminationSummary}>{eliminated.length} set candidates were eliminated by the current evidence and Factory rules.</Text></View>
                <Text style={styles.chevron}>{showEliminated ? '▲' : '▼'}</Text>
              </Pressable>}
              {showEliminated && <View style={styles.eliminationBox}>
                {eliminationGroups.map(([reason, count]) => <Text key={reason} style={styles.eliminationRow}>• {reason}: {count}</Text>)}
                <Text style={styles.eliminationHint}>This groups eliminations by the first clear rule that explains why the set cannot survive. Some sets can fail multiple constraints.</Text>
              </View>}

              {!!result.rankingNote && <Text style={styles.note}>{result.rankingNote}</Text>}
              <Text style={styles.eliminationNote}>Sets disappear when they fail the current Factory pool, blocked-species/team rules, Scientist clue, held-item clue, or any move you've recorded. Threat analysis is advisory and only uses exact-set stats plus moves supported by the current Gen III damage database.</Text>
            </>
          )}
        </View>
      )}

      {!!blockedSpecies.length && <Text style={styles.blocked}>Blocked by Factory rules: {blockedSpecies.join(' • ')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#e9e9e1', borderWidth: 3, borderColor: '#39423a', borderRadius: 16, padding: 12, marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#536453' },
  title: { fontSize: 21, fontWeight: '900', color: '#263027', marginTop: 2 },
  subtitle: { fontSize: 12, color: '#4b554c', marginTop: 3, lineHeight: 17 },
  roundBadge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#39423a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#cbd7c6' },
  roundText: { fontWeight: '900', color: '#263027' },
  analyzeButton: { backgroundColor: '#314b38', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  analyzeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.7 },
  contextText: { color: '#5b625c', fontSize: 11, marginTop: 8 },
  teamContext: { color: '#465149', fontSize: 10, fontWeight: '800', marginTop: 4 },
  observationBox: { backgroundColor: '#dbe3d7', borderRadius: 9, padding: 9, marginTop: 8 },
  observationTitle: { color: '#536453', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  observationText: { color: '#3f4b42', fontSize: 10, fontWeight: '800', marginTop: 3 },
  resultBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#aeb5ad', paddingTop: 10 },
  warning: { backgroundColor: '#fff2cc', borderRadius: 9, padding: 10, color: '#5c4b1e', fontSize: 12, lineHeight: 17 },
  summaryBox: { backgroundColor: '#d5ddd1', borderRadius: 10, padding: 10, marginBottom: 8 },
  summaryTitle: { fontSize: 11, fontWeight: '900', color: '#344137', letterSpacing: 1 },
  summaryText: { fontSize: 11, color: '#566158', marginTop: 3, lineHeight: 15 },
  list: { maxHeight: 470 },
  setBlock: { borderBottomWidth: 1, borderBottomColor: '#c0c6bf' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#cbd7c6', borderWidth: 1, borderColor: '#71826f', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { fontSize: 11, fontWeight: '900', color: '#334036' },
  setName: { fontSize: 14, fontWeight: '900', color: '#2c362e' },
  frequency: { fontSize: 10, color: '#657066', marginTop: 2 },
  threatLine: { fontSize: 9, color: '#8a5b2b', fontWeight: '900', marginTop: 3 },
  matchLine: { fontSize: 9, color: '#4d6a53', fontWeight: '800', marginTop: 3 },
  chevron: { fontSize: 11, color: '#526153', paddingHorizontal: 5 },
  detailCard: { backgroundColor: '#f5f5ef', borderRadius: 9, padding: 9, marginBottom: 7, marginLeft: 37, borderLeftWidth: 3, borderLeftColor: '#71826f' },
  reasonTitle: { fontSize: 9, fontWeight: '900', color: '#536453', letterSpacing: 0.8, marginTop: 3 },
  reasonText: { fontSize: 10, color: '#4e5a50', marginTop: 3, marginBottom: 5, lineHeight: 14 },
  detail: { fontSize: 11, color: '#555e57', marginTop: 3, lineHeight: 15 },
  eliminationToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dfe4dc', borderRadius: 10, padding: 10, marginTop: 9 },
  eliminationTitle: { fontSize: 10, fontWeight: '900', color: '#435045', letterSpacing: 0.7 },
  eliminationSummary: { fontSize: 9, color: '#697269', marginTop: 2 },
  eliminationBox: { backgroundColor: '#f5f5ef', borderRadius: 9, padding: 9, marginTop: 5, borderLeftWidth: 3, borderLeftColor: '#8a967f' },
  eliminationRow: { fontSize: 10, color: '#4f5b51', marginTop: 3, lineHeight: 14 },
  eliminationHint: { fontSize: 9, color: '#737a72', marginTop: 7, lineHeight: 13 },
  empty: { color: '#626a63', fontSize: 12, paddingVertical: 12 },
  more: { color: '#526153', fontSize: 11, fontWeight: '800', paddingVertical: 10 },
  note: { color: '#697169', fontSize: 9, lineHeight: 13, marginTop: 8 },
  eliminationNote: { color: '#5d675f', fontSize: 9, lineHeight: 13, marginTop: 6 },
  blocked: { color: '#667067', fontSize: 10, marginTop: 8, lineHeight: 14 },
});
