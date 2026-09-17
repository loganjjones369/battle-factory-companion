import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { scenarioMatchup } from '../data/scenarioDamage';

const norm = (v) => String(v || '').trim().toLowerCase();
const key = (p) => `${norm(p?.species)}#${p?.setId ?? p?.id ?? p?.sourceId ?? ''}`;

function inspectOpponentTeam(playerTeam, opponentTeam, level, round, scenario) {
  const rows = opponentTeam.map((foe) => {
    const answers = playerTeam.map((ally) => {
      const matchup = scenarioMatchup(foe, ally, level, round, scenario);
      return { ally, matchup };
    });
    const dangerous = answers.filter((x) => x.matchup.speed === 'faster' || x.matchup.incoming?.percentMax >= 50 || x.matchup.incoming?.ko <= 2);
    return { foe, answers, dangerous };
  });
  const hardThreats = rows.filter((r) => r.dangerous.some((x) => x.matchup.incoming?.ko <= 2));
  const speedThreats = rows.filter((r) => r.dangerous.some((x) => x.matchup.speed === 'faster'));
  return { rows, hardThreats, speedThreats };
}

export function analyzeOpponentDraft({ draft = [], scientist = {}, levelMode = 'Open Level', battle = 1, blockedSpecies = [], revealed = {}, currentTeam = [], previousOpponent = [], noland = false, scenario = {} } = {}) {
  const team = draft.filter(Boolean);
  if (team.length < 3) return { supported: false, reason: 'Enter at least three draft Pokémon first.', rows: [] };
  const level = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const candidate = analyzeFactoryCandidates({ draft: team, blockedSpecies, scientist, levelMode, battle, revealed, currentTeam, previousOpponent, noland });
  if (!candidate.supported) return { supported: false, reason: candidate.reason, rows: [], candidate };
  const screened = candidate.matchingTeams.slice(0, 180);
  const rows = [];
  for (let a = 0; a < team.length; a += 1) for (let b = a + 1; b < team.length; b += 1) for (let c = b + 1; c < team.length; c += 1) {
    const playerTeam = [team[a], team[b], team[c]]; let dangerousTeams = 0; let cleanTeams = 0; let hardTeams = 0; let speedTeams = 0; const examples = [];
    screened.forEach((opponentTeam) => {
      const inspected = inspectOpponentTeam(playerTeam, opponentTeam, level, round, scenario);
      const dangerous = inspected.rows.some((r) => r.dangerous.length);
      if (dangerous) dangerousTeams += 1; else cleanTeams += 1;
      if (inspected.hardThreats.length) hardTeams += 1;
      if (inspected.speedThreats.length) speedTeams += 1;
      if (examples.length < 4 && dangerous) {
        const row = inspected.rows.find((r) => r.dangerous.length); const hit = row?.dangerous[0];
        if (row && hit) examples.push({ foe: row.foe, ally: hit.ally, matchup: hit.matchup });
      }
    });
    rows.push({ combo: playerTeam, screenedTeams: screened.length, dangerousTeams, cleanTeams, hardTeams, speedTeams, dangerousShare: screened.length ? dangerousTeams / screened.length : 0, hardShare: screened.length ? hardTeams / screened.length : 0, speedShare: screened.length ? speedTeams / screened.length : 0, examples });
  }
  return { supported: true, candidate, screenedTeams: screened.length, rows: rows.sort((x, y) => x.dangerousShare - y.dangerousShare || x.hardShare - y.hardShare || x.speedShare - y.speedShare) };
}

export default function OpponentDraftLab({ draft = [], scientist = {}, levelMode = 'Open Level', battle = 1, blockedSpecies = [], revealed = {}, currentTeam = [], previousOpponent = [], noland = false, scenario = {} }) {
  const [open, setOpen] = useState(null);
  const result = useMemo(() => analyzeOpponentDraft({ draft, scientist, levelMode, battle, blockedSpecies, revealed, currentTeam, previousOpponent, noland, scenario }), [draft, scientist, levelMode, battle, blockedSpecies, revealed, currentTeam, previousOpponent, noland, scenario]);
  if (!result.supported) return <View style={st.card}><Text style={st.label}>OPPONENT SCREEN</Text><Text style={st.empty}>{result.reason}</Text></View>;
  return <View style={st.card}>
    <View style={st.header}><View style={{ flex: 1 }}><Text style={st.label}>OPPONENT SCREEN</Text><Text style={st.title}>How each trio handles the teams still possible</Text></View><Text style={st.badge}>{result.screenedTeams}</Text></View>
    <Text style={st.help}>Same exact-set scenario as the draft lab: {scenario.weather || 'clear'} weather, explicit abilities, statuses, and stat stages. Percentages describe the screened candidate set, not probability.</Text>
    {result.rows.map((row, index) => { const openRow = open === index; const label = row.combo.map((p) => `${p.species} ${p.setId ?? ''}`).join(' • '); return <View key={label} style={st.row}>
      <TouchableOpacity onPress={() => setOpen(openRow ? null : index)} style={st.rowButton}><View style={{ flex: 1 }}><Text style={st.rank}>#{index + 1}  {label}</Text><Text style={st.meta}>{Math.round(row.dangerousShare * 100)}% direct pressure • {Math.round(row.hardShare * 100)}% 2HKO-or-better threat • {Math.round(row.speedShare * 100)}% faster threat</Text></View><Text style={st.chevron}>{openRow ? '▲' : '▼'}</Text></TouchableOpacity>
      {openRow && <View style={st.details}><Text style={st.detailTitle}>WHAT THE SCREEN FOUND</Text><Text style={st.detail}>{row.cleanTeams}/{row.screenedTeams} screened teams produced no high-priority pressure under the current scenario.</Text>{row.examples.map((x, i) => <View key={`${key(x.foe)}-${i}`} style={st.example}><Text style={st.exampleTitle}>{x.foe.species} {x.foe.setId ?? ''} → {x.ally.species} {x.ally.setId ?? ''}</Text><Text style={st.exampleText}>{x.matchup.incoming ? `${x.matchup.incoming.moveName}: ${x.matchup.incoming.percentMin.toFixed(1)}–${x.matchup.incoming.percentMax.toFixed(1)}%` : 'No mapped damage'}{x.matchup.speed === 'faster' ? ' • faster' : ''}</Text></View>)}</View>}
    </View>; })}
  </View>;
}

const st = StyleSheet.create({card:{backgroundColor:'#10231f',borderRadius:18,padding:14,marginTop:12,borderWidth:1,borderColor:'#29443d'},header:{flexDirection:'row',alignItems:'center',marginBottom:8},label:{color:'#83a69d',fontSize:10,fontWeight:'800',letterSpacing:1.2},title:{color:'#f2f7f4',fontSize:17,fontWeight:'900',marginTop:3},badge:{minWidth:32,paddingHorizontal:9,paddingVertical:6,borderRadius:12,backgroundColor:'#1c3831',color:'#d9efe8',textAlign:'center',fontWeight:'900'},help:{color:'#a9c0ba',fontSize:11,lineHeight:17,marginBottom:9},empty:{color:'#d8b98c',fontSize:12,lineHeight:18,marginTop:7},row:{borderTopWidth:1,borderTopColor:'#27423a'},rowButton:{minHeight:66,flexDirection:'row',alignItems:'center',paddingVertical:9},rank:{color:'#edf6f2',fontSize:12.5,fontWeight:'800'},meta:{color:'#87aaa1',fontSize:10.5,lineHeight:15,marginTop:3},chevron:{color:'#8bd3bb',fontSize:13,paddingHorizontal:7},details:{backgroundColor:'#0c1a17',borderRadius:12,padding:10,marginBottom:10},detailTitle:{color:'#9fe2c8',fontSize:10,fontWeight:'900',letterSpacing:.7,marginBottom:5},detail:{color:'#c7d8d3',fontSize:10.5,lineHeight:16},example:{marginTop:8,paddingTop:7,borderTopWidth:1,borderTopColor:'#213a34'},exampleTitle:{color:'#f0f7f4',fontSize:11,fontWeight:'800'},exampleText:{color:'#8bd3bb',fontSize:10.5,marginTop:2}});
