import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFactorySets, getFactorySet } from '../data/setIdentity';
import { analyzeResponse } from '../data/responseAnalysis';

const spriteUrl = (p) => p?.id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png` : null;

function makeSet(p, id) {
  const set = getFactorySet(p.species, id);
  return set ? { ...p, ...set, setId: set.id, species: p.species } : null;
}

function setsFor(p) {
  if (!p) return [];
  if (p.setId != null) {
    const exact = makeSet(p, p.setId);
    if (exact) return [exact];
  }
  return getFactorySets(p.species).map(s => makeSet(p, s.id)).filter(Boolean);
}

function matchup(attacker, defender, levelNumber, round) {
  const aSets = setsFor(attacker);
  const dSets = setsFor(defender);
  const checks = aSets.flatMap(a => dSets.map(d => analyzeResponse(d, a, levelNumber, round, { opponentSet: d, allySet: a }))).filter(Boolean);
  if (!checks.length) return null;
  const faster = checks.filter(x => x.relation === 'faster').length;
  const ohko = checks.filter(x => x.guaranteedOHKO).length;
  const twoHko = checks.filter(x => x.guaranteedTwoHKO).length;
  const threatened = checks.filter(x => (x.incoming?.percentMax || 0) >= 100).length;
  const maxOut = Math.max(0, ...checks.map(x => x.hitBack?.percentMax || 0));
  const minOut = Math.min(...checks.map(x => x.hitBack?.percentMin ?? 0));
  const maxIn = Math.max(0, ...checks.map(x => x.incoming?.percentMax || 0));
  const allFaster = faster === checks.length;
  const allOhko = ohko === checks.length;
  const allTwo = twoHko === checks.length;
  let label = 'NEUTRAL';
  let reason = `${faster}/${checks.length} set matchups have the speed advantage.`;
  if (allFaster && allOhko) { label = 'OHKO'; reason = `All ${checks.length} mapped set matchups are faster and guarantee an OHKO.`; }
  else if (allFaster && allTwo) { label = '2HKO'; reason = `All ${checks.length} mapped set matchups are faster and guarantee a 2HKO.`; }
  else if (allFaster) { label = 'REVENGE KILL'; reason = `All ${checks.length} mapped set matchups are faster; damage varies by set.`; }
  else if (allOhko) { label = 'OHKO'; reason = `${ohko}/${checks.length} mapped set matchups guarantee an OHKO.`; }
  else if (threatened === checks.length) { label = 'BAD MATCHUP'; reason = `Every mapped set matchup can return an OHKO.`; }
  else if (maxIn < 50 && (ohko > 0 || twoHko > 0)) { label = 'SAFE SWITCH'; reason = `The worst mapped incoming hit is ${maxIn.toFixed(1)}% while this side has strong KO pressure.`; }
  else if (maxIn >= 100) { label = 'RISKY'; reason = `${threatened}/${checks.length} mapped set matchups can return an OHKO.`; }
  return { aSets, dSets, checks, faster, ohko, twoHko, threatened, maxOut, minOut, maxIn, label, reason, allFaster, allOhko, allTwo };
}

export default function DraftMatchupMatrix({ draft = [], level = 'Level 50', battle = 1 }) {
  const usable = draft.filter(Boolean);
  const [open, setOpen] = useState(null);
  const levelNumber = level === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const pairs = useMemo(() => {
    const out = [];
    for (let i = 0; i < usable.length; i++) {
      for (let j = i + 1; j < usable.length; j++) {
        const a = usable[i], d = usable[j];
        const forward = matchup(a, d, levelNumber, round);
        const reverse = matchup(d, a, levelNumber, round);
        if (forward && reverse) out.push({ i, j, a, d, forward, reverse });
      }
    }
    return out;
  }, [usable, levelNumber, round]);

  if (usable.length < 2) return null;

  return <View style={st.card}>
    <Text style={st.kicker}>AUTOMATIC DRAFT MATCHUPS</Text>
    <Text style={st.title}>How do these draft choices fit together?</Text>
    <Text style={st.help}>This updates automatically as you enter the six Pokémon. An exact Factory set is used when you selected one; otherwise the app checks every possible Factory set instead of guessing.</Text>
    {pairs.map((pair, index) => {
      const key = `${pair.a.species}-${pair.d.species}-${index}`;
      const isOpen = open === key;
      return <View key={key} style={st.pair}>
        <TouchableOpacity onPress={() => setOpen(isOpen ? null : key)} style={st.pairHeader}>
          <View style={st.pokeMini}>
            <Image source={{ uri: spriteUrl(pair.a) }} style={st.sprite} resizeMode="contain" />
            <View style={{ flex: 1 }}><Text style={st.name}>{pair.a.species}</Text><Text style={st.set}>{pair.a.setId != null ? `SET ${pair.a.setId}` : `${pair.forward.aSets.length} sets`}</Text></View>
          </View>
          <View style={st.center}><Text style={st.vs}>VS</Text><Text style={st.arrow}>↔</Text></View>
          <View style={[st.pokeMini, { flexDirection: 'row-reverse' }]}>
            <Image source={{ uri: spriteUrl(pair.d) }} style={st.sprite} resizeMode="contain" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={st.name}>{pair.d.species}</Text><Text style={st.set}>{pair.d.setId != null ? `SET ${pair.d.setId}` : `${pair.reverse.aSets.length} sets`}</Text></View>
          </View>
        </TouchableOpacity>
        <View style={st.quickRow}>
          <Text style={st.quick}>{pair.a.species}: {pair.forward.label}</Text>
          <Text style={st.quick}>{pair.d.species}: {pair.reverse.label}</Text>
        </View>
        {isOpen && <View style={st.details}>
          <View style={st.detailSide}>
            <Text style={st.detailTitle}>{pair.a.species} INTO {pair.d.species}</Text>
            <Text style={st.detailText}>{pair.forward.reason}</Text>
            <Text style={st.detailText}>Speed {pair.forward.faster}/{pair.forward.checks.length} • OHKO {pair.forward.ohko}/{pair.forward.checks.length} • 2HKO {pair.forward.twoHko}/{pair.forward.checks.length}</Text>
            <Text style={st.detailText}>Best mapped hit {pair.forward.maxOut.toFixed(1)}% • worst return hit {pair.forward.maxIn.toFixed(1)}%</Text>
          </View>
          <View style={st.detailSide}>
            <Text style={st.detailTitle}>{pair.d.species} INTO {pair.a.species}</Text>
            <Text style={st.detailText}>{pair.reverse.reason}</Text>
            <Text style={st.detailText}>Speed {pair.reverse.faster}/{pair.reverse.checks.length} • OHKO {pair.reverse.ohko}/{pair.reverse.checks.length} • 2HKO {pair.reverse.twoHko}/{pair.reverse.checks.length}</Text>
            <Text style={st.detailText}>Best mapped hit {pair.reverse.maxOut.toFixed(1)}% • worst return hit {pair.reverse.maxIn.toFixed(1)}%</Text>
          </View>
        </View>}
      </View>;
    })}
  </View>;
}

const st = StyleSheet.create({
  card:{backgroundColor:'#10231f',borderRadius:15,padding:11,marginBottom:10,borderWidth:1,borderColor:'#315047'},
  kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:'#82a79b'},
  title:{fontSize:16,fontWeight:'900',color:'#eef6f2',marginTop:3},
  help:{fontSize:10,color:'#9eb8af',lineHeight:15,marginTop:5},
  pair:{marginTop:9,borderTopWidth:1,borderTopColor:'#29443b',paddingTop:8},
  pairHeader:{flexDirection:'row',alignItems:'center'},
  pokeMini:{flex:1,flexDirection:'row',alignItems:'center',gap:5},
  sprite:{width:48,height:48},
  name:{fontSize:10,fontWeight:'900',color:'#eef7f3'},
  set:{fontSize:8,color:'#78958c',marginTop:2},
  center:{width:34,alignItems:'center'},
  vs:{fontSize:7,fontWeight:'900',color:'#77958b'},
  arrow:{fontSize:18,fontWeight:'900',color:'#9fe2c8'},
  quickRow:{flexDirection:'row',gap:6,marginTop:5},
  quick:{flex:1,fontSize:8,fontWeight:'900',color:'#bfe4d7',backgroundColor:'#1b352e',borderRadius:6,padding:6},
  details:{marginTop:6,gap:7},
  detailSide:{backgroundColor:'#0a1714',borderRadius:8,padding:8,borderWidth:1,borderColor:'#29443b'},
  detailTitle:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:'#82a79b'},
  detailText:{fontSize:9,color:'#c0d4cc',lineHeight:14,marginTop:3}
});
