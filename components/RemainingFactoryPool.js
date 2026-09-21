import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getFactorySets } from '../data/setIdentity';

const norm = (v) => String(v || '').trim().toLowerCase();

export default function RemainingFactoryPool({ rankedSets = [], onAddPossible }) {
  const [expanded, setExpanded] = useState(null);
  const species = useMemo(() => {
    const groups = {};
    rankedSets.forEach((entry) => {
      const set = entry?.set;
      if (!set?.species) return;
      const key = norm(set.species);
      if (!groups[key]) groups[key] = { species: set.species, sets: [], weight: 0 };
      groups[key].sets.push({ id: set.id ?? set.setId ?? set.sourceId, weight: Number(entry.frequency) || 0 });
      groups[key].weight += Number(entry.frequency) || 0;
    });
    const rows = Object.values(groups).sort((a,b) => b.weight-a.weight || a.species.localeCompare(b.species));
    const total = rows.reduce((n,r)=>n+r.weight,0);
    return rows.map(r=>({ ...r, probability: total ? r.weight/total*100 : 0 }));
  }, [rankedSets]);
  const top = species.slice(0,3);
  return <View style={styles.card}>
    <View style={styles.head}><View style={{flex:1}}><Text style={styles.kicker}>REMAINING FACTORY POOL</Text><Text style={styles.title}>What is still in the pool?</Text><Text style={styles.sub}>Species probability is based on the surviving candidate pool. Set probabilities are conditional within each species.</Text></View><Text style={styles.count}>{species.length}</Text></View>
    {top.length ? <View style={styles.topRow}>{top.map((r,i)=><View key={r.species} style={styles.topItem}><Text style={styles.topName}>{r.species}</Text><Text style={styles.topPct}>{r.probability.toFixed(1)}%</Text></View>)}{species.length>3&&<Text style={styles.moreTop}>+{species.length-3}</Text>}</View> : <Text style={styles.empty}>⚠ NO POSSIBLE POKÉMON — CHECK INFORMATION</Text>}
    {!!species.length && <ScrollView style={styles.list} nestedScrollEnabled>{species.map((r)=>{const open=expanded===norm(r.species);const setTotal=r.sets.reduce((n,s)=>n+s.weight,0);return <View key={r.species} style={styles.row}><Pressable onPress={()=>setExpanded(open?null:norm(r.species))} style={styles.rowButton}><View style={{flex:1}}><Text style={styles.name}>{r.species}</Text><Text style={styles.meta}>{r.probability.toFixed(1)}% overall · {r.sets.length} possible set{r.sets.length===1?'':'s'} · Sets {r.sets.map(s=>s.id).join(', ')}</Text></View><Text style={styles.chev}>{open?'▲':'▼'}</Text></Pressable>{open&&<View style={styles.details}>{r.sets.sort((a,b)=>Number(a.id)-Number(b.id)).map(s=><View key={s.id} style={styles.setLine}><Text style={styles.setName}>SET {s.id}</Text><Text style={styles.setPct}>{setTotal?(s.weight/setTotal*100).toFixed(1):'0.0'}%</Text></View>)}<Pressable onPress={()=>onAddPossible?.(r.species)} style={styles.add}><Text style={styles.addText}>ADD POSSIBLE</Text><Text style={styles.ball}>●</Text></Pressable></View>}</View>})}</ScrollView>}
  </View>;
}

const styles=StyleSheet.create({card:{backgroundColor:'#101c20',borderWidth:1,borderColor:'#29403c',borderRadius:17,padding:13,marginBottom:11},head:{flexDirection:'row',alignItems:'flex-start'},kicker:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.3},title:{color:'#f3faf7',fontSize:17,fontWeight:'900',marginTop:3},sub:{color:'#78928b',fontSize:10,lineHeight:15,marginTop:4},count:{color:'#78aa9c',fontSize:16,fontWeight:'900'},topRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:10,flexWrap:'wrap'},topItem:{backgroundColor:'#0b1513',borderWidth:1,borderColor:'#29403a',borderRadius:9,paddingHorizontal:9,paddingVertical:7},topName:{color:'#dcece6',fontSize:9,fontWeight:'900'},topPct:{color:'#70d4af',fontSize:10,fontWeight:'900',marginTop:2},moreTop:{color:'#688078',fontSize:9,fontWeight:'900'},list:{maxHeight:310,marginTop:9},row:{borderTopWidth:1,borderTopColor:'#213632'},rowButton:{flexDirection:'row',alignItems:'center',paddingVertical:10},name:{color:'#e7f4ef',fontSize:11,fontWeight:'900'},meta:{color:'#687f77',fontSize:8,marginTop:2,lineHeight:12},chev:{color:'#6f8f86',fontSize:9,paddingLeft:8},details:{backgroundColor:'#0b1513',borderRadius:10,padding:9,marginBottom:8},setLine:{flexDirection:'row',justifyContent:'space-between',paddingVertical:4},setName:{color:'#9db8af',fontSize:9,fontWeight:'900'},setPct:{color:'#70d4af',fontSize:9,fontWeight:'900'},add:{marginTop:7,borderWidth:1,borderColor:'#49665c',borderRadius:9,padding:7,alignItems:'center',backgroundColor:'#12221d'},addText:{color:'#dff8ee',fontSize:8,fontWeight:'900',letterSpacing:1},ball:{color:'#b64b4f',fontSize:17,marginTop:1},empty:{color:'#c4d5ce',fontSize:10,fontWeight:'900',paddingVertical:12}});