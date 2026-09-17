import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, getStats, getEffectiveSpeed, bestDamagingMoves } from '../data/damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const key = (p) => `${norm(p?.species)}#${p?.setId ?? p?.id ?? ''}`;
const empty = (v) => Array.isArray(v) ? v : [];

function speedRelation(ally, foe, level, round) {
  const a = getEffectiveSpeed(getStats(ally, ally, level, round), 'healthy');
  const f = getEffectiveSpeed(getStats(foe, foe, level, round), 'healthy');
  return { allySpeed: a, foeSpeed: f, relation: a > f ? 'faster' : a === f ? 'tie' : 'slower' };
}

function bestHit(attacker, defender, level, round) {
  const moves = bestDamagingMoves(attacker);
  let best = null;
  moves.forEach((moveName) => {
    const result = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level, round, moveName });
    if (result?.unsupported) return;
    if (!best || (result.percentMax || 0) > (best.result.percentMax || 0)) best = { moveName, result };
  });
  return best;
}

function assess(ally, threat, level, round) {
  const outgoing = bestHit(ally, threat, level, round);
  const incoming = bestHit(threat, ally, level, round);
  const speed = speedRelation(ally, threat, level, round);
  const ohko = !!outgoing?.result?.guaranteedOHKO;
  const twoHko = !!outgoing?.result?.guaranteedTwoHKO;
  const incomingMax = incoming?.result?.percentMax || 0;
  const survivesOne = incomingMax < 100;
  const clean = survivesOne && (ohko || (speed.relation === 'faster' && twoHko));
  const risky = !clean && !!outgoing && (ohko || twoHko || incomingMax >= 50 || speed.relation === 'faster');
  return { ally, threat, outgoing, incoming, ...speed, incomingMax, ohko, twoHko, survivesOne, clean, risky };
}

function combinations(items) {
  const out = [];
  for (let i = 0; i < items.length - 2; i += 1) for (let j = i + 1; j < items.length - 1; j += 1) for (let k = j + 1; k < items.length; k += 1) out.push([items[i], items[j], items[k]]);
  return out;
}

function evaluateTeam(team, threats, level, round) {
  const rows = threats.map((entry) => {
    const threat = entry.set;
    const answers = team.map((ally) => assess(ally, threat, level, round));
    const cleanAnswers = answers.filter((x) => x.clean);
    const riskyAnswers = answers.filter((x) => x.risky && !x.clean);
    return { entry, threat, answers, cleanAnswers, riskyAnswers };
  });
  const unanswered = rows.filter((r) => !r.cleanAnswers.length);
  const cleanCount = rows.length - unanswered.length;
  const riskyCount = rows.filter((r) => r.riskyAnswers.length).length;
  const worstIncoming = Math.max(0, ...rows.flatMap((r) => r.answers.map((x) => x.incomingMax)));
  return { team, rows, cleanCount, riskyCount, unanswered, coverage: rows.length ? cleanCount / rows.length : 0, worstIncoming };
}

export default function DraftSurvivalAnalysis({ draft = [], scientist = {}, blockedSpecies = [], levelMode = 'Open Level', battle = 1, revealed = {}, noland = false }) {
  const [open, setOpen] = useState(null);
  const level = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const candidates = useMemo(() => analyzeFactoryCandidates({ draft, scientist, blockedSpecies, levelMode, battle, revealed, noland }), [draft, scientist, blockedSpecies, levelMode, battle, revealed, noland]);
  const results = useMemo(() => {
    if (!candidates?.supported) return [];
    const threats = empty(candidates.rankedSets).slice(0, 80);
    return combinations(draft.filter(Boolean)).map((team) => evaluateTeam(team, threats, level, round)).sort((a, b) => b.coverage - a.coverage || a.unanswered.length - b.unanswered.length || a.worstIncoming - b.worstIncoming).slice(0, 12);
  }, [candidates, draft, level, round]);

  if (draft.filter(Boolean).length < 3) return null;
  return <View style={styles.card}>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.label}>EXACT-SET SURVIVAL</Text><Text style={styles.title}>Which three survive the remaining pool?</Text></View><Text style={styles.count}>{results.length} OPTIONS</Text></View>
    <Text style={styles.help}>Each team is tested against the surviving legal Factory sets after your Scientist clues, blocked species, and revealed evidence. A clean answer must survive the threat's best mapped hit and either guarantee an OHKO or outspeed for a guaranteed 2HKO.</Text>
    {!candidates?.supported ? <Text style={styles.empty}>{candidates?.reason || 'Exact candidate data is not available for this round.'}</Text> : results.map((r, index) => {
      const id = r.team.map(key).join('|'); const expanded = open === id; const label = r.unanswered.length ? `${r.unanswered.length} threat${r.unanswered.length === 1 ? '' : 's'} without a clean answer` : 'Every screened threat has a clean answer';
      return <View key={id} style={styles.teamCard}>
        <TouchableOpacity onPress={() => setOpen(expanded ? null : id)} style={styles.teamHeader}>
          <View style={{ flex: 1 }}><Text style={styles.teamTitle}>TEAM OPTION {index + 1}</Text><Text style={styles.teamNames}>{r.team.map((p) => `${p.species} ${p.setId}`).join('  •  ')}</Text><Text style={r.unanswered.length ? styles.warning : styles.good}>{label}</Text></View><Text style={styles.coverage}>{Math.round(r.coverage * 100)}%</Text>
        </TouchableOpacity>
        {expanded && <View style={styles.details}>
          <Text style={styles.meta}>CLEAN ANSWERS {r.cleanCount}/{r.rows.length}  •  RISKY THREATS {r.riskyCount}/{r.rows.length}  •  WORST MAPPED HIT {r.worstIncoming.toFixed(1)}%</Text>
          {r.rows.map((row) => <View key={key(row.threat)} style={styles.threat}>
            <Text style={styles.threatTitle}>{row.threat.species} {row.threat.setId} <Text style={styles.freq}>• {row.entry.count || 0} surviving teams</Text></Text>
            {row.answers.map((a) => <View key={key(a.ally)} style={styles.answer}><View style={{ flex: 1 }}><Text style={styles.answerName}>{a.ally.species} {a.ally.setId} {a.clean ? '• CLEAN' : a.risky ? '• RISKY' : '• NO ANSWER'}</Text><Text style={styles.answerMeta}>{a.relation.toUpperCase()} ({a.allySpeed} vs {a.foeSpeed}) • {a.outgoing ? `${a.outgoing.moveName} ${a.outgoing.result.percentMin.toFixed(1)}–${a.outgoing.result.percentMax.toFixed(1)}% out` : 'no mapped move'} • {a.incoming ? `${a.incoming.moveName} ${a.incoming.result.percentMin.toFixed(1)}–${a.incoming.result.percentMax.toFixed(1)}% in` : 'no mapped incoming move'}</Text></View></View>)}
          </View>)}
          <Text style={styles.note}>“Surviving teams” means legal Factory team combinations remaining under the known constraints; it is not a prediction of which team the game will choose.</Text>
        </View>}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#20313d', backgroundColor: '#0b1720' },
  header: { flexDirection: 'row', alignItems: 'center' }, label: { color: '#73d2ff', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 2 }, count: { color: '#8fa5af', fontSize: 9, fontWeight: '900' }, help: { color: '#879ba5', fontSize: 10, lineHeight: 15, marginTop: 7 }, teamCard: { marginTop: 8, borderWidth: 1, borderColor: '#263b47', borderRadius: 10, overflow: 'hidden' }, teamHeader: { flexDirection: 'row', alignItems: 'center', padding: 9, backgroundColor: '#101f29' }, teamTitle: { color: '#73d2ff', fontSize: 9, fontWeight: '900' }, teamNames: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 3 }, good: { color: '#8bd49a', fontSize: 9, fontWeight: '800', marginTop: 4 }, warning: { color: '#e5bd69', fontSize: 9, fontWeight: '800', marginTop: 4 }, coverage: { color: '#fff', fontSize: 16, fontWeight: '900', marginLeft: 8 }, details: { padding: 9 }, meta: { color: '#81959f', fontSize: 9, fontWeight: '800' }, threat: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#0e1b24', borderWidth: 1, borderColor: '#20343f' }, threatTitle: { color: '#f0c674', fontSize: 10, fontWeight: '900' }, freq: { color: '#71858f', fontWeight: '700' }, answer: { marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#1b2c35' }, answerName: { color: '#d6e2e7', fontSize: 9, fontWeight: '800' }, answerMeta: { color: '#899da7', fontSize: 8, lineHeight: 12, marginTop: 2 }, note: { color: '#667b86', fontSize: 8, lineHeight: 12, marginTop: 9 }, empty: { color: '#7e939e', fontSize: 10, marginTop: 8 }
});