import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPokemon } from '../data/factoryData';
import { getFactorySets, getFactorySet } from '../data/setIdentity';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const label = (p) => p ? `${p.species} ${p.setId}` : 'Choose Pokémon';

function SetButton({ p, selected, onPress }) {
  if (!p) return null;
  return <TouchableOpacity onPress={onPress} style={[st.setButton, selected && st.setButtonOn]}><Text style={st.setText}>{label(p)}</Text><Text style={st.setSub}>{p.item || 'No item'} • {p.nature || 'Nature unknown'}</Text></TouchableOpacity>;
}

function setPool(pokemon) {
  if (!pokemon?.species) return [];
  return getFactorySets(pokemon.species).map((set) => ({ ...pokemon, ...set, setId: set.id, species: pokemon.species }));
}

function makeKnownSet(p) {
  if (!p?.species || p?.setId == null) return null;
  const base = getPokemon(p.species);
  const set = getFactorySet(p.species, p.setId);
  return base && set ? { ...base, ...set, setId: set.id, species: p.species, factoryIV: p.factoryIV, isElevated: p.isElevated } : null;
}

function speedSummary(attacker, defender, level, round) {
  if (!attacker?.species || !defender?.species) return null;
  const aSets = setPool(attacker);
  const dSets = setPool(defender);
  const rows = aSets.flatMap((a) => dSets.map((d) => {
    const aSpeed = getStats(a, a, level, round).spe;
    const dSpeed = getStats(d, d, level, round).spe;
    return { a, d, aSpeed, dSpeed, faster: aSpeed > dSpeed, tie: aSpeed === dSpeed };
  }));
  const faster = rows.filter((r) => r.faster).length;
  const ties = rows.filter((r) => r.tie).length;
  const total = rows.length;
  const attackerWinningSets = aSets.filter((a) => dSets.every((d) => getStats(a, a, level, round).spe > getStats(d, d, level, round).spe)).length;
  const defenderWinningSets = dSets.filter((d) => aSets.every((a) => getStats(d, d, level, round).spe > getStats(a, a, level, round).spe)).length;
  return { aSets, dSets, rows, faster, ties, total, attackerWinningSets, defenderWinningSets };
}

function moveRows(attacker, defender, level, round) {
  const a = makeKnownSet(attacker);
  const d = makeKnownSet(defender);
  if (!a || !d) return [];
  return bestDamagingMoves(a).map((moveName) => ({ moveName, result: calculateDamage({ attacker: a, attackerSet: a, defender: d, defenderSet: d, level, round, moveName }) }));
}

export default function DraftCalculator({ draft = [], level = 'Level 50', battle = 1 }) {
  const usable = draft.filter(Boolean);
  const [attackerKey, setAttackerKey] = useState('');
  const [defenderKey, setDefenderKey] = useState('');
  const [openSets, setOpenSets] = useState('');
  const attacker = usable.find((p) => `${norm(p.species)}#${p.setId}` === attackerKey) || null;
  const defender = usable.find((p) => `${norm(p.species)}#${p.setId}` === defenderKey) || null;
  const levelNumber = level === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const speed = useMemo(() => speedSummary(attacker, defender, levelNumber, round), [attacker, defender, levelNumber, round]);
  const moves = useMemo(() => moveRows(attacker, defender, levelNumber, round), [attacker, defender, levelNumber, round]);

  const chooseAttacker = (p) => { setAttackerKey(`${norm(p.species)}#${p.setId}`); setOpenSets(`a:${p.species}`); };
  const chooseDefender = (p) => { setDefenderKey(`${norm(p.species)}#${p.setId}`); setOpenSets(`d:${p.species}`); };

  return <View style={st.card}>
    <View style={st.headerRow}><View><Text style={st.label}>DRAFT ANALYZER</Text><Text style={st.title}>Exact-set matchup lab</Text></View><Text style={st.badge}>SEE ALL SETS</Text></View>
    <Text style={st.help}>Pick any two Pokémon from the six-draft screen. The calculation stays tied to their exact Factory set identities.</Text>

    <Text style={st.small}>ATTACKER</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.horizontal}>{usable.map((p) => <SetButton key={`a-${p.species}-${p.setId}`} p={p} selected={attackerKey === `${norm(p.species)}#${p.setId}`} onPress={() => chooseAttacker(p)} />)}</ScrollView>
    {attacker && <Text style={st.chosen}>Attacking with <Text style={st.strong}>{label(attacker)}</Text> • {attacker.moves?.join(', ')}</Text>}

    <Text style={st.small}>DEFENDER</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.horizontal}>{usable.map((p) => <SetButton key={`d-${p.species}-${p.setId}`} p={p} selected={defenderKey === `${norm(p.species)}#${p.setId}`} onPress={() => chooseDefender(p)} />)}</ScrollView>
    {defender && <Text style={st.chosen}>Defending with <Text style={st.strong}>{label(defender)}</Text> • {defender.moves?.join(', ')}</Text>}

    {attacker && defender && <>
      <View style={st.divider}/>
      <Text style={st.title}>Speed across every set</Text>
      <Text style={st.speedHeadline}>{speed?.aSets.length} {attacker.species} sets vs {speed?.dSets.length} {defender.species} sets</Text>
      <Text style={st.speedCopy}>{speed?.faster} of {speed?.total} exact set matchups have {attacker.species} faster. {speed?.ties ? `${speed.ties} are speed ties. ` : ''}{speed?.attackerWinningSets}/{speed?.aSets.length} {attacker.species} sets are faster than every {defender.species} set.</Text>

      <Text style={st.title}>Damage</Text>
      {moves.length ? moves.map(({ moveName, result }) => <View key={moveName} style={st.moveRow}>
        <View style={{ flex: 1 }}><Text style={st.moveName}>{moveName}</Text><Text style={st.moveMeta}>{result.effectiveness}× effectiveness • {result.ko}-hit minimum-roll KO</Text></View>
        <View style={st.damage}><Text style={st.damageText}>{result.percentMin.toFixed(1)}%–{result.percentMax.toFixed(1)}%</Text><Text style={st.damageSub}>{result.min}–{result.max} HP</Text></View>
      </View>) : <Text style={st.help}>No supported damaging moves are currently mapped for this Factory set. The move database will be expanded as we add the remaining Gen III moves.</Text>}

      <Text style={st.title}>All-set speed table</Text>
      <View style={st.tableHeader}><Text style={st.th}>ATTACKER</Text><Text style={st.th}>SPD</Text><Text style={st.th}>DEFENDER</Text><Text style={st.th}>SPD</Text></View>
      {speed?.rows.map((r, i) => <View key={`${r.a.setId}-${r.d.setId}-${i}`} style={st.tableRow}><Text style={st.td}>{r.a.species} {r.a.setId}</Text><Text style={st.td}>{r.aSpeed}</Text><Text style={st.td}>{r.d.species} {r.d.setId}</Text><Text style={st.td}>{r.dSpeed}{r.tie ? ' TIE' : r.faster ? ' ↑' : ''}</Text></View>)}
    </>}

    {!attacker || !defender ? <Text style={st.empty}>Choose an attacker and defender above to start the exact-set analysis.</Text> : null}
  </View>;
}

const st = StyleSheet.create({
  card:{backgroundColor:'#0d1917',borderWidth:1,borderColor:'#315047',borderRadius:17,padding:13,marginBottom:11},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  label:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:5},
  title:{color:'#f3faf7',fontSize:16,fontWeight:'900',marginTop:10,marginBottom:6},
  badge:{color:'#082018',backgroundColor:'#70d4af',paddingHorizontal:7,paddingVertical:5,borderRadius:7,fontSize:8,fontWeight:'900'},
  help:{color:'#78928b',fontSize:10,lineHeight:15,marginBottom:8},
  small:{color:'#688078',fontSize:8,fontWeight:'900',marginTop:7,marginBottom:5},
  horizontal:{gap:7,paddingBottom:4},
  setButton:{width:126,borderWidth:1,borderColor:'#29403a',backgroundColor:'#08110f',borderRadius:10,padding:8},
  setButtonOn:{borderColor:'#70d4af',backgroundColor:'#14362b'},
  setText:{color:'#dcebe6',fontSize:10,fontWeight:'900'},
  setSub:{color:'#6f8982',fontSize:8,marginTop:3},
  chosen:{color:'#86a39a',fontSize:9,lineHeight:14},
  strong:{color:'#d8ece6',fontWeight:'900'},
  divider:{height:1,backgroundColor:'#29403a',marginTop:12},
  speedHeadline:{color:'#70d4af',fontSize:12,fontWeight:'900'},
  speedCopy:{color:'#a9beb8',fontSize:10,lineHeight:15},
  moveRow:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#20352f',paddingVertical:9},
  moveName:{color:'#edf7f4',fontSize:11,fontWeight:'900'},
  moveMeta:{color:'#69837b',fontSize:8,marginTop:2},
  damage:{alignItems:'flex-end'},
  damageText:{color:'#70d4af',fontSize:11,fontWeight:'900'},
  damageSub:{color:'#6f8982',fontSize:8,marginTop:2},
  tableHeader:{flexDirection:'row',backgroundColor:'#14231f',paddingVertical:6},
  tableRow:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:'#20352f',paddingVertical:6},
  th:{color:'#688078',fontSize:7,fontWeight:'900',flex:1},
  td:{color:'#b9cbc6',fontSize:8,flex:1},
  empty:{color:'#6f8982',fontSize:10,textAlign:'center',paddingVertical:10},
});
