import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';
import { getActiveRunContext } from '../data/runProgress';
import AssistantAnalysis from './AssistantAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const itemKey = (v) => norm(v).replace(/[^a-z0-9]/g, '');
const setLabel = (set) => `${set?.species || set?.name || 'Unknown'} ${set?.setId ?? set?.sourceId ?? set?.id ?? ''}`.trim();
const moveNames = (set) => (set?.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean);

function knownSet(p) { return p?.species && p?.setId != null ? p : null; }

function clueMatches(set, observations = []) {
  const observation = observations.find((o) => norm(o?.species) === norm(set?.species));
  if (!observation) return [];
  const matches = ['Species'];
  if (observation.item && itemKey(set.item) === itemKey(observation.item)) matches.push(`Item: ${set.item}`);
  const moves = moveNames(set).map(norm);
  (observation.moves || []).filter(Boolean).forEach((move) => {
    if (moves.includes(norm(move))) matches.push(`Move: ${move}`);
  });
  return matches;
}

function threatAgainstTeam(candidate, team = [], levelNumber = 50, round = 1) {
  const attacker = knownSet(candidate);
  if (!attacker || !team.length) return null;
  const attackerStats = getStats(attacker, attacker, levelNumber, round);
  const details = team.map((defender) => {
    const d = knownSet(defender);
    if (!d) return null;
    const dStats = getStats(d, d, levelNumber, round);
    let best = null;
    for (const moveName of bestDamagingMoves(attacker)) {
      const result = calculateDamage({
        attacker,
        attackerSet: attacker,
        defender: d,
        defenderSet: d,
        level: levelNumber,
        round,
        moveName,
      });
      if (!result || result.percentMax == null) continue;
      if (!best || result.percentMax > best.percentMax) best = { ...result, moveName };
    }
    return { defender: d, aSpeed: attackerStats.spe, dSpeed: dStats.spe, best };
  }).filter(Boolean);
  return {
    details,
    pressureCount: details.filter((x) => x.best?.percentMax >= 50).length,
    koCount: details.filter((x) => x.best?.percentMin >= 100).length,
    fasterCount: details.filter((x) => x.aSpeed > x.dSpeed).length,
    teamSize: details.length,
  };
}

function threatLabel(threat) {
  if (!threat) return null;
  if (threat.koCount > 0) return `Guaranteed KO range vs ${threat.koCount}/${threat.teamSize}`;
  if (threat.pressureCount === threat.teamSize && threat.teamSize > 0) return `50%+ damage range vs all ${threat.teamSize}`;
  if (threat.pressureCount > 0) return `50%+ damage range vs ${threat.pressureCount}/${threat.teamSize}`;
  if (threat.fasterCount === threat.teamSize && threat.teamSize > 0) return `Faster than all ${threat.teamSize}`;
  if (threat.fasterCount > 0) return `Faster than ${threat.fasterCount}/${threat.teamSize}`;
  return 'No mapped damage pressure';
}

export default function CandidateAnalysisPanel({ draft = [], team = [], currentTeam = [], previousOpponent = [], blockedSpecies = [], scientist = {}, levelMode = 'Open Level', battle = 1, revealed = {}, noland = false, maxResults = 20 }) {
  const [result, setResult] = useState(null);
  const [expandedSet, setExpandedSet] = useState(null);
  const [showEliminated, setShowEliminated] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = getActiveRunContext();
  const analysisTeam = currentTeam.length ? currentTeam : team.length ? team : (active.currentTeam || []);
  const analysisPreviousOpponent = previousOpponent.length ? previousOpponent : (active.previousOpponent || []);
  const draftNames = useMemo(() => draft.map((p) => p?.species || p?.name).filter(Boolean), [draft]);
  const observations = revealed?.observations || [];
  const levelNumber = levelMode === 'Open Level' ? 100 : 50;
  const battleRound = Math.max(1, Math.ceil((Number(battle) || 1) / 7));

  const runAnalysis = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        setResult(analyzeFactoryCandidates({
          draft,
          blockedSpecies,
          scientist,
          levelMode,
          battle,
          revealed,
          noland,
          currentTeam: analysisTeam,
          previousOpponent: analysisPreviousOpponent,
        }));
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
      const set = entry.set;
      const key = `${norm(set.species)}#${set.id ?? set.sourceId ?? set.setId ?? ''}`;
      map[key] = threatAgainstTeam(set, analysisTeam, levelNumber, battleRound);
    });
    return map;
  }, [visibleSets, analysisTeam, levelNumber, battleRound]);
  const teamNames = analysisTeam.map((p) => setLabel(p)).filter(Boolean);

  return <View style={styles.card}>
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>FACTORY INTELLIGENCE</Text>
        <Text style={styles.title}>What can I see next?</Text>
        <Text style={styles.subtitle}>Surviving sets are filtered first. Then the app checks which candidates can pressure your exact current team.</Text>
      </View>
      <View style={styles.roundBadge}><Text style={styles.roundText}>B{Number(battle) || 1}</Text></View>
    </View>

    {!!teamNames.length && <View style={styles.liveBox}><Text style={styles.liveTitle}>LIVE RUN CONTEXT</Text><Text style={styles.liveText}>Your team: {teamNames.join(' • ')}</Text>{!!analysisPreviousOpponent.length && <Text style={styles.liveText}>Previous opponent: {analysisPreviousOpponent.map(setLabel).join(' • ')}</Text>}</View>}

    <Pressable style={styles.analyzeButton} onPress={runAnalysis} disabled={busy}><Text style={styles.analyzeText}>{busy ? 'ANALYZING…' : 'ANALYZE REMAINING SETS'}</Text></Pressable>
    <Text style={styles.contextText}>Draft: {draftNames.length ? draftNames.join(' • ') : 'not entered'}</Text>
    {observations.length > 0 && <View style={styles.observationBox}><Text style={styles.observationTitle}>KNOWN OPPONENT CLUES</Text>{observations.map((o, i) => <Text key={`${o.species}-${i}`} style={styles.observationText}>{o.species}{o.item ? ` • ${o.item}` : ''}{o.moves?.length ? ` • ${o.moves.join(', ')}` : ''}</Text>)}</View>}

    {result && result.supported && rankedSets.length > 0 && <Pressable style={styles.assistantButton} onPress={() => setAssistantOpen(true)}><View style={styles.scientistMini}><Text style={styles.scientistEmoji}>🤓</Text></View><View style={{ flex: 1 }}><Text style={styles.assistantKicker}>YOUR LAB ASSISTANT</Text><Text style={styles.assistantTitle}>ASK THE SCIENTIST</Text><Text style={styles.assistantSub}>Let me explain what worries me and why.</Text></View><Text style={styles.assistantArrow}>›</Text></Pressable>}

    {result && <View style={styles.resultBox}>{!result.supported ? <Text style={styles.warning}>{result.reason || 'This Factory pool is not supported by the current dataset.'}</Text> : <>
      <View style={styles.summaryBox}><Text style={styles.summaryTitle}>WHAT TO WORRY ABOUT NEXT</Text><Text style={styles.summaryText}>The ranking shows surviving candidate frequency, not an in-game probability. Threat labels use exact-set stats and supported Gen III moves.</Text></View>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {visibleSets.map((entry, index) => {
          const set = entry.set;
          const key = `${setLabel(set)}-${index}`;
          const open = expandedSet === key;
          const percent = Math.max(0, Number(entry.frequency || 0) * 100);
          const matches = clueMatches(set, observations);
          const threatKey = `${norm(set.species)}#${set.id ?? set.sourceId ?? set.setId ?? ''}`;
          const threat = threatMap[threatKey];
          return <View key={key} style={styles.setBlock}><Pressable style={styles.setRow} onPress={() => setExpandedSet(open ? null : key)}><View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.setName}>{setLabel(set)}</Text><Text style={styles.frequency}>{percent.toFixed(1)}% of surviving candidate teams</Text>{!!threatLabel(threat) && <Text style={styles.threatLine}>⚠ {threatLabel(threat)}</Text>}{!!matches.length && <Text style={styles.matchLine}>✓ {matches.join('  •  ')}</Text>}</View><Text style={styles.chevron}>{open ? '▲' : '▼'}</Text></Pressable>
            {open && <View style={styles.detailCard}>{!!matches.length && <><Text style={styles.reasonTitle}>WHY THIS SET SURVIVED</Text><Text style={styles.reasonText}>{matches.join(' • ')}</Text></>}{!!threat && analysisTeam.length > 0 && <><Text style={styles.reasonTitle}>WHY THIS SET MATTERS</Text>{threat.details.map((detail, i) => <Text key={`${detail.defender.species}-${i}`} style={styles.detail}>{setLabel(detail.defender)}: {detail.aSpeed > detail.dSpeed ? `faster (${detail.aSpeed} vs ${detail.dSpeed})` : detail.aSpeed === detail.dSpeed ? `speed tie (${detail.aSpeed})` : `slower (${detail.aSpeed} vs ${detail.dSpeed})`)}{detail.best ? ` • ${detail.best.moveName}: ${detail.best.percentMin.toFixed(1)}%–${detail.best.percentMax.toFixed(1)}%` : ' • no mapped damaging move'}</Text>)}</>}{!!set.item && <Text style={styles.detail}>Item: {set.item}</Text>}{!!set.nature && <Text style={styles.detail}>Nature: {set.nature}</Text>}{!!set.ability && <Text style={styles.detail}>Ability: {set.ability}</Text>}{!!moveNames(set).length && <Text style={styles.detail}>Moves: {moveNames(set).join(' • ')}</Text>}</View>}
          </View>;
        })}
        {!visibleSets.length && <Text style={styles.empty}>No surviving candidate sets match the current information.</Text>}
        {!!remainingCount && <Text style={styles.more}>+ {remainingCount} lower-frequency possibilities hidden</Text>}
      </ScrollView>
      {!!eliminated.length && <Pressable style={styles.eliminationToggle} onPress={() => setShowEliminated(!showEliminated)}><View style={{ flex: 1 }}><Text style={styles.eliminationTitle}>WHY DID SETS DISAPPEAR?</Text><Text style={styles.eliminationSummary}>{eliminated.length} set candidates were eliminated by the current evidence and Factory rules.</Text></View><Text style={styles.chevron}>{showEliminated ? '▲' : '▼'}</Text></Pressable>}
      {showEliminated && <View style={styles.eliminationBox}>{eliminationGroups.map(([reason, count]) => <Text key={reason} style={styles.eliminationRow}>• {reason}: {count}</Text>)}<Text style={styles.eliminationHint}>A set may fail more than one constraint; this groups it by the first clear reason.</Text></View>}
      {!!result.rankingNote && <Text style={styles.note}>{result.rankingNote}</Text>}
      <Text style={styles.eliminationNote}>Sets disappear when they fail the Factory pool, blocked-species/team rules, Scientist clue, held-item clue, or recorded move clue.</Text>
    </>}</View>}
    {!!blockedSpecies.length && <Text style={styles.blocked}>Blocked by Factory rules: {blockedSpecies.join(' • ')}</Text>}
    <AssistantAnalysis visible={assistantOpen} onClose={() => setAssistantOpen(false)} rankedSets={rankedSets} threatMap={threatMap} analysisTeam={analysisTeam} observations={observations} scientist={scientist} eliminatedCount={eliminated.length} />
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#e9e9e1',borderWidth:3,borderColor:'#39423a',borderRadius:16,padding:12,marginTop:12},
  headerRow:{flexDirection:'row',alignItems:'center'},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:'#536453'},title:{fontSize:21,fontWeight:'900',color:'#263027',marginTop:2},subtitle:{fontSize:12,color:'#4b554c',marginTop:3,lineHeight:17},roundBadge:{width:44,height:44,borderRadius:22,borderWidth:2,borderColor:'#39423a',alignItems:'center',justifyContent:'center',backgroundColor:'#cbd7c6'},roundText:{fontWeight:'900',color:'#263027'},
  liveBox:{backgroundColor:'#cfdacb',borderWidth:2,borderColor:'#596957',borderRadius:10,padding:9,marginTop:10},liveTitle:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#536453'},liveText:{fontSize:10,fontWeight:'800',color:'#3f4b42',marginTop:3},
  analyzeButton:{backgroundColor:'#314b38',borderRadius:10,paddingVertical:12,alignItems:'center',marginTop:12},analyzeText:{color:'#fff',fontWeight:'900',fontSize:12,letterSpacing:.7},contextText:{color:'#5b625c',fontSize:11,marginTop:8},observationBox:{backgroundColor:'#dbe3d7',borderRadius:9,padding:9,marginTop:8},observationTitle:{color:'#536453',fontSize:9,fontWeight:'900',letterSpacing:1},observationText:{color:'#3f4b42',fontSize:10,fontWeight:'800',marginTop:3},
  assistantButton:{flexDirection:'row',alignItems:'center',backgroundColor:'#d2dfcf',borderWidth:2,borderColor:'#425344',borderRadius:12,padding:8,marginTop:10},scientistMini:{width:48,height:48,borderRadius:9,backgroundColor:'#f2ecd5',borderWidth:2,borderColor:'#425344',alignItems:'center',justifyContent:'center',marginRight:9},scientistEmoji:{fontSize:30},assistantKicker:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:'#5a6b5b'},assistantTitle:{fontSize:15,fontWeight:'900',color:'#263027',marginTop:1},assistantSub:{fontSize:10,color:'#536056',marginTop:2},assistantArrow:{fontSize:30,fontWeight:'300',color:'#4b5b4d',paddingHorizontal:4},
  resultBox:{marginTop:10},warning:{color:'#7d3f31',fontWeight:'900',padding:10,backgroundColor:'#f2d8cf',borderRadius:8},summaryBox:{backgroundColor:'#dce5d9',borderRadius:9,padding:9},summaryTitle:{fontSize:9,fontWeight:'900',color:'#536453',letterSpacing:1},summaryText:{fontSize:10,lineHeight:15,color:'#455048',marginTop:3},list:{maxHeight:430,marginTop:8},setBlock:{borderWidth:1,borderColor:'#b5c0b4',borderRadius:9,marginBottom:6,overflow:'hidden'},setRow:{flexDirection:'row',alignItems:'center',padding:8,backgroundColor:'#f2f1e9'},rankBadge:{width:28,height:28,borderRadius:14,backgroundColor:'#314b38',alignItems:'center',justifyContent:'center',marginRight:8},rankText:{color:'#fff',fontWeight:'900'},setName:{fontSize:13,fontWeight:'900',color:'#28332a'},frequency:{fontSize:9,color:'#657066',marginTop:2},threatLine:{fontSize:10,color:'#7d4a34',fontWeight:'900',marginTop:2},matchLine:{fontSize:9,color:'#47634c',fontWeight:'800',marginTop:2},chevron:{fontSize:12,color:'#536453',paddingLeft:6},detailCard:{backgroundColor:'#e3e9df',padding:9},reasonTitle:{fontSize:9,fontWeight:'900',color:'#536453',letterSpacing:1,marginTop:2},reasonText:{fontSize:10,color:'#3e4940',marginTop:3},detail:{fontSize:10,lineHeight:15,color:'#465047',marginTop:4},empty:{padding:12,textAlign:'center',color:'#5b625c'},more:{textAlign:'center',padding:9,color:'#536453',fontWeight:'900'},
  eliminationToggle:{flexDirection:'row',alignItems:'center',backgroundColor:'#e0e3d9',borderRadius:10,padding:9,marginTop:8},eliminationTitle:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#536453'},eliminationSummary:{fontSize:10,color:'#59645a',marginTop:3},eliminationBox:{backgroundColor:'#eef0e8',borderWidth:1,borderColor:'#b6c0b4',borderRadius:9,padding:9,marginTop:5},eliminationRow:{fontSize:10,color:'#4b554c',marginTop:3},eliminationHint:{fontSize:9,color:'#747b73',marginTop:7,lineHeight:13},note:{fontSize:9,color:'#657066',lineHeight:13,marginTop:8},eliminationNote:{fontSize:9,color:'#737a72',lineHeight:13,marginTop:8},blocked:{fontSize:9,color:'#7b4b3d',fontWeight:'800',marginTop:8}
});
