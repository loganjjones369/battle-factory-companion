import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { analyzeSwitchIn } from '../data/responseAnalysis';
import { getPokemon } from '../data/factoryData';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const spriteId = (species) => getPokemon(species)?.id || getPokemon(species)?.nationalDexId || 0;
function range(hit) { return hit ? `${hit.percentMin.toFixed(1)}–${hit.percentMax.toFixed(1)}%` : 'no mapped attack'; }

export default function SwitchInAnalysis({ candidate, team = [], level = 100, round = 1 }) {
  const rows = useMemo(() => analyzeSwitchIn(candidate, team, level, round), [candidate, team, level, round]);
  if (!candidate || !rows.length) return null;
  return <View style={styles.card}>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.kicker}>SWITCH-IN CHECK</Text><Text style={styles.title}>What this set does to your team</Text></View><Image source={{ uri: `${SPRITES}${spriteId(candidate.species)}.png` }} style={styles.sprite} /></View>
    {rows.map((row) => <View key={`${candidate.species}-${candidate.id}-${row.ally.species}`} style={styles.row}>
      <View style={{ flex: 1 }}><Text style={styles.name}>{row.ally.species}</Text><Text style={styles.detail}>{row.incomingMove || 'Unknown move'} into this Pokémon • {range(row.incoming)}</Text><Text style={styles.detail}>Return: {row.returnMove || 'Unknown move'} • {range(row.hitBack)}</Text></View>
      <View style={styles.badgeBox}><Text style={styles.badge}>{row.relation === 'outspeeds' ? 'OUTSPEEDS' : row.relation === 'speed ties' ? 'TIE' : 'SLOWER'}</Text><Text style={styles.badgeSub}>{row.safeSwitch ? 'under 50%' : '50%+'}</Text></View>
    </View>)}
    <Text style={styles.note}>Damage uses the loaded Factory set and the current Gen III damage model.</Text>
  </View>;
}

const styles = StyleSheet.create({card:{backgroundColor:'#142923',borderRadius:10,padding:8,marginTop:8,borderWidth:1,borderColor:'#3d5d51'},header:{flexDirection:'row',alignItems:'center'},kicker:{fontSize:8,fontWeight:'900',letterSpacing:.9,color:'#9fcbbc'},title:{fontSize:13,fontWeight:'900',color:'#edf7f3',marginTop:2},sprite:{width:48,height:48},row:{flexDirection:'row',alignItems:'center',paddingVertical:7,borderTopWidth:1,borderTopColor:'#29483e'},name:{fontSize:11,fontWeight:'900',color:'#eef7f3'},detail:{fontSize:8.5,color:'#a9c0b9',lineHeight:13},badgeBox:{width:68,alignItems:'flex-end'},badge:{fontSize:8,fontWeight:'900',color:'#bfe4d7'},badgeSub:{fontSize:8,color:'#7f9c94',marginTop:2},note:{fontSize:8,color:'#78958d',lineHeight:12,marginTop:4}});
