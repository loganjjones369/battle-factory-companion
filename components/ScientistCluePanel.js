import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getScientistStyleLabel } from '../data/scientistAnalysis';

const TYPES = ['None', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel'];
const STYLES = Array.from({ length: 9 }, (_, i) => i);

export default function ScientistCluePanel({ scientist = {}, onChange }) {
  const type = scientist.type || 'None';
  const style = scientist.style == null ? null : Number(scientist.style);
  const set = (patch) => onChange?.({ ...scientist, ...patch });
  return <View style={styles.card}>
    <Text style={styles.kicker}>SCIENTIST INTELLIGENCE</Text>
    <Text style={styles.title}>What did the Scientist tell you?</Text>
    <Text style={styles.help}>Enter the clues you actually received. The app stores them with this run and uses them to filter legal Factory teams. Unknown clues stay unknown — nothing is guessed for you.</Text>
    <Text style={styles.label}>TRAINER TYPE</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {TYPES.map((x) => <TouchableOpacity key={x} onPress={() => set({ type: x === 'None' ? '' : x })} style={[styles.chip, type === x && styles.chipOn]}><Text style={[styles.chipText, type === x && styles.chipTextOn]}>{x}</Text></TouchableOpacity>)}
    </ScrollView>
    <Text style={[styles.label, { marginTop: 9 }]}>BATTLE STYLE</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => set({ style: null })} style={[styles.styleChip, style == null && styles.chipOn]}><Text style={[styles.chipText, style == null && styles.chipTextOn]}>UNKNOWN</Text></TouchableOpacity>
      {STYLES.map((x) => <TouchableOpacity key={x} onPress={() => set({ style: x })} style={[styles.styleChip, style === x && styles.chipOn]}><Text style={[styles.chipText, style === x && styles.chipTextOn]}>{x}: {getScientistStyleLabel(x)}</Text></TouchableOpacity>)}
    </ScrollView>
    <View style={styles.status}><Text style={styles.statusTitle}>SAVED CLUES</Text><Text style={styles.statusText}>Type: {type === 'None' ? 'unknown' : type} • Style: {style == null ? 'unknown' : `${style} — ${getScientistStyleLabel(style)}`}</Text></View>
  </View>;
}

const styles = StyleSheet.create({ card:{backgroundColor:'#101c20',borderWidth:1,borderColor:'#5a4b36',borderRadius:17,padding:13,marginBottom:11}, kicker:{color:'#d9b979',fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:6}, title:{color:'#f3faf7',fontSize:17,fontWeight:'900',marginBottom:7}, help:{color:'#8d9d97',fontSize:10,lineHeight:15,marginBottom:9}, label:{color:'#927d59',fontSize:8,fontWeight:'900',letterSpacing:1}, scroll:{gap:5,paddingVertical:5}, chip:{borderWidth:1,borderColor:'#3b4a45',backgroundColor:'#0b1513',borderRadius:9,paddingHorizontal:9,paddingVertical:7}, styleChip:{borderWidth:1,borderColor:'#3b4a45',backgroundColor:'#0b1513',borderRadius:9,paddingHorizontal:9,paddingVertical:7,maxWidth:220}, chipOn:{borderColor:'#d9b979',backgroundColor:'#3a3021'}, chipText:{color:'#7e918a',fontSize:9,fontWeight:'800'}, chipTextOn:{color:'#f6e4bb'}, status:{marginTop:7,borderTopWidth:1,borderTopColor:'#332f27',paddingTop:7}, statusTitle:{color:'#8d7854',fontSize:7,fontWeight:'900',letterSpacing:1}, statusText:{color:'#c7b99f',fontSize:10,fontWeight:'800',marginTop:2} });