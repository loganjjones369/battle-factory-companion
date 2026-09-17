import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getPokemon } from '../data/factoryData';
import { getFactorySets, getFactorySet } from '../data/setIdentity';
import { analyzeResponse } from '../data/responseAnalysis';
import { classifyResponse, buildSetAssessments } from '../data/decisionEngine';

const resolve = (name) => getPokemon(String(name || '').trim()) || getPokemon(String(name || '').trim().replace(/\s+/g, ' '));
const makeSet = (p, id) => { const set = getFactorySet(p.species, id); return set ? { ...p, ...set, setId: set.id, species: p.species } : null; };
const spriteUrl = (p) => p?.id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png` : null;

function Picker({ title, value, onChange }) {
  const p = resolve(value); const sets = p ? getFactorySets(p.species) : [];
  return <View style={st.field}>
    <Text style={st.small}>{title}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder="Type a Pokémon name" placeholderTextColor="#61766f" style={st.input}/>
    {p && <View style={st.suggestion}>
      <Image source={{ uri: spriteUrl(p) }} style={st.pickerSprite} resizeMode="contain" />
      <View style={st.pickerInfo}>
        <Text style={st.pokeName}>{p.species}</Text>
        <Text style={st.types}>{p.types?.join(' / ')}</Text>
        <Text style={st.small}>FACTORY SETS: {sets.length}</Text>
        <View style={st.setRow}>{sets.map(s => <Text key={s.id} style={st.setChip}>SET {s.id}</Text>)}</View>
      </View>
    </View>}
    {value && !p && <Text style={st.warning}>Pokémon not found in the Factory dataset.</Text>}
  </View>;
}

export default function DraftMatchupLab({ level='Level 50', battle=1 }) {
  const [attackerName,setAttackerName]=useState(''); const [defenderName,setDefenderName]=useState('');
  const [mode,setMode]=useState('attack');
  const attacker=resolve(attackerName); const defender=resolve(defenderName);
  const levelNumber=level==='Open Level'?100:50; const round=Math.max(1,Math.ceil((Number(battle)||1)/7));
  const rows=useMemo(()=>{
    if(!attacker||!defender)return [];
    const aSets=getFactorySets(attacker.species).map(s=>makeSet(attacker,s.id)).filter(Boolean);
    const dSets=getFactorySets(defender.species).map(s=>makeSet(defender,s.id)).filter(Boolean);
    return aSets.map(a=>{
      const checks=dSets.map(d=>analyzeResponse(d,a,levelNumber,round,{opponentSet:d,allySet:a})).filter(Boolean);
      const assessments=buildSetAssessments(checks);
      return {a,summary:classifyResponse(assessments,{switchingIn:mode==='switch'}),assessments};
    });
  },[attacker,defender,levelNumber,round,mode]);

  const overall=useMemo(()=>{
    if(!rows.length)return null;
    const dCount=getFactorySets(defender.species).length;
    const totalPairs=rows.reduce((n,r)=>n+r.assessments.length,0);
    const fasterPairs=rows.reduce((n,r)=>n+r.assessments.filter(a=>a.speed==='faster').length,0);
    const fasterAny=rows.filter(r=>r.assessments.some(a=>a.speed==='faster')).length;
    const fasterAll=rows.filter(r=>r.assessments.length>0&&r.assessments.every(a=>a.speed==='faster')).length;
    const ohkoSets=rows.filter(r=>r.assessments.some(a=>a.guaranteedKo)).length;
    const twoHkoSets=rows.filter(r=>r.assessments.some(a=>a.koInTwo)).length;
    const threatened=rows.filter(r=>r.assessments.some(a=>a.canThreatenKo)).length;
    const maxIncoming=Math.max(0,...rows.flatMap(r=>r.assessments.map(a=>a.incoming?.percentMax||0)));
    return {aCount:rows.length,dCount,totalPairs,fasterPairs,fasterAny,fasterAll,ohkoSets,twoHkoSets,threatened,maxIncoming};
  },[rows,defender]);

  return <View style={st.card}>
    <Text style={st.kicker}>DRAFT SCREEN TOOL</Text>
    <Text style={st.title}>ANY POKÉMON MATCHUP</Text>
    <Text style={st.help}>Check any Factory Pokémon before drafting it. The lab keeps every individual Factory set visible instead of averaging them together.</Text>
    <Picker title="ATTACKER" value={attackerName} onChange={setAttackerName}/>
    <Picker title="DEFENDER / SWITCH-IN TARGET" value={defenderName} onChange={setDefenderName}/>
    {attacker&&defender&&<View style={st.result}>
      <View style={st.battleCards}>
        <View style={st.pokemonCard}>
          <Image source={{ uri: spriteUrl(attacker) }} style={st.battleSprite} resizeMode="contain" />
          <Text style={st.cardRole}>ATTACKER</Text>
          <Text style={st.cardName}>{attacker.species}</Text>
          <Text style={st.cardTypes}>{attacker.types?.join(' / ')}</Text>
          <Text style={st.cardSets}>{overall.aCount} Factory sets</Text>
        </View>
        <Text style={st.arrow}>→</Text>
        <View style={st.pokemonCard}>
          <Image source={{ uri: spriteUrl(defender) }} style={st.battleSprite} resizeMode="contain" />
          <Text style={st.cardRole}>TARGET</Text>
          <Text style={st.cardName}>{defender.species}</Text>
          <Text style={st.cardTypes}>{defender.types?.join(' / ')}</Text>
          <Text style={st.cardSets}>{overall.dCount} Factory sets</Text>
        </View>
      </View>
      <View style={st.modeRow}>
        <TouchableOpacity onPress={()=>setMode('attack')} style={[st.modeButton,mode==='attack'&&st.modeOn]}><Text style={st.modeText}>ATTACK</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setMode('switch')} style={[st.modeButton,mode==='switch'&&st.modeOn]}><Text style={st.modeText}>SWITCH-IN</Text></TouchableOpacity>
      </View>
      <Text style={st.resultTitle}>{attacker.species} → {defender.species}</Text>
      <Text style={st.headline}>{overall.aCount} {attacker.species} sets × {overall.dCount} {defender.species} sets = {overall.totalPairs} exact set matchups</Text>

      <View style={st.summaryBox}>
        <Text style={st.summaryHeader}>WHAT DO I ACTUALLY HAVE?</Text>
        <Text style={st.summaryLine}>SPEED: {overall.fasterAny}/{overall.aCount} {attacker.species} sets outspeed at least one {defender.species} set.</Text>
        <Text style={st.summaryLine}>CONSISTENT SPEED: {overall.fasterAll}/{overall.aCount} {attacker.species} sets outspeed every {defender.species} set.</Text>
        <Text style={st.summaryLine}>SPEED PAIRS: {overall.fasterPairs}/{overall.totalPairs} individual set matchups favor {attacker.species} on speed.</Text>
        <Text style={st.summaryLine}>OHKO: {overall.ohkoSets}/{overall.aCount} {attacker.species} sets have a guaranteed OHKO against at least one defender set.</Text>
        <Text style={st.summaryLine}>2HKO: {overall.twoHkoSets}/{overall.aCount} {attacker.species} sets have a guaranteed 2HKO against at least one defender set.</Text>
        <Text style={st.summaryLine}>RETURN KO RISK: {overall.threatened}/{overall.aCount} {attacker.species} sets can be OHKOed by at least one {defender.species} set.</Text>
        {mode==='switch'&&<Text style={st.switchLine}>SWITCH-IN: Worst mapped incoming hit is {overall.maxIncoming.toFixed(1)}% HP.</Text>}
      </View>

      <Text style={st.allSets}>SEE ALL SETS</Text>
      {rows.map((r,i)=>{
        const fasterCount=r.assessments.filter(a=>a.speed==='faster').length;
        const bestOut=Math.max(0,...r.assessments.map(a=>a.hitBack?.percentMax||0));
        const worstIn=Math.max(0,...r.assessments.map(a=>a.incoming?.percentMax||0));
        return <View key={`${r.a.id}-${i}`} style={st.row}>
          <View style={st.rowHead}><View style={st.setTitleRow}><Text style={st.setName}>{attacker.species} Set {r.a.id}</Text><Text style={st.classify}>{r.summary.label}</Text></View><Text style={st.setSpeed}>{fasterCount}/{r.assessments.length} defender sets slower</Text></View>
          <Text style={st.reason}>{r.summary.reason}</Text>
          <View style={st.statPills}>
            <Text style={st.statPill}>SPEED {fasterCount}/{r.assessments.length}</Text>
            <Text style={st.statPill}>BEST HIT {bestOut.toFixed(1)}%</Text>
            <Text style={st.statPill}>WORST IN {worstIn.toFixed(1)}%</Text>
          </View>
          <Text style={st.counts}>{r.summary.guaranteedOhkos}/{r.summary.assessedSets} guaranteed OHKO • {r.summary.guaranteedTwoHkos}/{r.summary.assessedSets} guaranteed 2HKO • {r.summary.threatenedSets}/{r.summary.assessedSets} can threaten KO</Text>
          {r.assessments.map((a,j)=><Text key={`${a.setId}-${j}`} style={st.detail}>• {defender.species} Set {a.setId}: {a.speed} • {a.hitBack ? `${a.hitBack.percentMin.toFixed(1)}–${a.hitBack.percentMax.toFixed(1)}% dealt` : 'no mapped outgoing damage'} • {a.incoming ? `${a.incoming.percentMin.toFixed(1)}–${a.incoming.percentMax.toFixed(1)}% taken` : 'no mapped incoming damage'}</Text>)}
        </View>;
      })}
    </View>}
    {attacker&&defender&&<Text style={st.note}>{mode==='switch'?'Switch-in mode emphasizes the damage the incoming Pokémon can take immediately from the attacker.':'Attack mode answers the direct matchup question.'} The set-by-set view is intentionally conservative: one favorable set does not make the whole matchup favorable.</Text>}
  </View>;
}

const st=StyleSheet.create({card:{backgroundColor:'#10231f',borderRadius:15,padding:11,marginBottom:10,borderWidth:1,borderColor:'#315047'},kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:'#82a79b'},title:{fontSize:16,fontWeight:'900',color:'#eef6f2',marginTop:3},help:{fontSize:10,color:'#9eb8af',lineHeight:15,marginTop:5},field:{marginTop:9},small:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:'#77958b',marginBottom:4},input:{backgroundColor:'#0a1714',borderWidth:1,borderColor:'#2b4940',borderRadius:8,paddingHorizontal:9,paddingVertical:8,color:'#e6f1ed',fontSize:11},suggestion:{marginTop:5,backgroundColor:'#1a332c',borderRadius:8,padding:7,flexDirection:'row',alignItems:'center'},pickerSprite:{width:58,height:58},pickerInfo:{flex:1},pokeName:{fontSize:12,fontWeight:'900',color:'#eef7f3'},types:{fontSize:9,color:'#94b0a6',marginTop:2},setRow:{flexDirection:'row',flexWrap:'wrap',gap:5},setChip:{fontSize:8,fontWeight:'900',color:'#bfe4d7',backgroundColor:'#29463d',borderRadius:6,paddingHorizontal:6,paddingVertical:4},warning:{fontSize:9,color:'#e2a996',marginTop:4},result:{marginTop:11,borderTopWidth:1,borderTopColor:'#315047',paddingTop:9},battleCards:{flexDirection:'row',alignItems:'center',gap:6},pokemonCard:{flex:1,backgroundColor:'#172f29',borderRadius:10,borderWidth:1,borderColor:'#315047',padding:7,alignItems:'center'},battleSprite:{width:82,height:82},cardRole:{fontSize:7,fontWeight:'900',letterSpacing:1,color:'#77958b'},cardName:{fontSize:12,fontWeight:'900',color:'#eef7f3',marginTop:2,textAlign:'center'},cardTypes:{fontSize:8,color:'#94b0a6',marginTop:2,textAlign:'center'},cardSets:{fontSize:8,color:'#82a79b',marginTop:3},arrow:{fontSize:22,fontWeight:'900',color:'#9fe2c8'},modeRow:{flexDirection:'row',gap:6,marginBottom:9,marginTop:9},modeButton:{borderWidth:1,borderColor:'#29463d',borderRadius:7,paddingHorizontal:9,paddingVertical:6,backgroundColor:'#0a1714'},modeOn:{borderColor:'#70d4af',backgroundColor:'#17382f'},modeText:{fontSize:8,fontWeight:'900',color:'#a9c6bd'},resultTitle:{fontSize:14,fontWeight:'900',color:'#f1f8f5'},headline:{fontSize:10,fontWeight:'900',color:'#9fe2c8',marginTop:3},summaryBox:{marginTop:8,padding:9,borderRadius:9,backgroundColor:'#0a1714',borderWidth:1,borderColor:'#29443b'},summaryHeader:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#82a79b',marginBottom:4},summaryLine:{fontSize:9.5,color:'#c0d4cc',lineHeight:15},switchLine:{fontSize:9.5,color:'#9fe2c8',fontWeight:'900',lineHeight:15},allSets:{fontSize:8,fontWeight:'900',letterSpacing:1,color:'#82a79b',marginTop:10},row:{marginTop:9,paddingTop:8,borderTopWidth:1,borderTopColor:'#29443b'},rowHead:{},setTitleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},setName:{fontSize:11,fontWeight:'900',color:'#e6f2ed'},classify:{fontSize:9,fontWeight:'900',color:'#9fe2c8'},setSpeed:{fontSize:9,color:'#9ab4ab',marginTop:2},reason:{fontSize:9.5,color:'#c0d4cc',lineHeight:14,marginTop:3},statPills:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:5},statPill:{fontSize:8,fontWeight:'900',color:'#bfe4d7',backgroundColor:'#1b352e',borderRadius:6,paddingHorizontal:6,paddingVertical:4},counts:{fontSize:9,color:'#9ab4ab',lineHeight:14,marginTop:4},detail:{fontSize:8.5,color:'#78958c',lineHeight:13,marginTop:2},note:{fontSize:9,color:'#78958c',lineHeight:14,marginTop:10}});
