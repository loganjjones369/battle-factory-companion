import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABELS = { atk: 'ATK', def: 'DEF', spa: 'SP. ATK', spd: 'SP. DEF', spe: 'SPEED' };

export function clampStage(value) { return Math.max(-6, Math.min(6, Number(value) || 0)); }

export default function StatStageControls({ stages = {}, onChange }) {
  const update = (stat, delta) => {
    const next = clampStage((stages[stat] || 0) + delta);
    onChange?.({ ...stages, [stat]: next });
  };
  return <View style={styles.wrap}>
    <View style={styles.heading}><Text style={styles.title}>STAT STAGES</Text><Text style={styles.range}>−6 to +6</Text></View>
    {STAT_KEYS.map((stat) => {
      const value = clampStage(stages[stat]);
      return <View key={stat} style={styles.row}>
        <Text style={styles.label}>{STAT_LABELS[stat]}</Text>
        <TouchableOpacity disabled={value <= -6} onPress={() => update(stat, -1)} style={[styles.step, value <= -6 && styles.disabled]}><Text style={styles.stepText}>−</Text></TouchableOpacity>
        <View style={[styles.value, value < 0 && styles.negative, value > 0 && styles.positive]}><Text style={styles.valueText}>{value > 0 ? `+${value}` : value}</Text></View>
        <TouchableOpacity disabled={value >= 6} onPress={() => update(stat, 1)} style={[styles.step, value >= 6 && styles.disabled]}><Text style={styles.stepText}>+</Text></TouchableOpacity>
      </View>;
    })}
    <Text style={styles.help}>These stages are applied directly to damage and Speed calculations. They are useful for Intimidate, Curse, Swords Dance, Calm Mind, Agility, and other battle-state tests.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap:{marginTop:8,borderWidth:1,borderColor:'#36504a',backgroundColor:'#0b1714',borderRadius:11,padding:9},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:5},
  title:{color:'#d4e8e1',fontSize:8,fontWeight:'900',letterSpacing:1},range:{color:'#688078',fontSize:7,fontWeight:'900'},
  row:{flexDirection:'row',alignItems:'center',marginTop:4},label:{width:58,color:'#78928b',fontSize:7,fontWeight:'900'},
  step:{width:30,height:28,borderWidth:1,borderColor:'#304943',borderRadius:7,alignItems:'center',justifyContent:'center',backgroundColor:'#101f1b'},
  disabled:{opacity:0.35},stepText:{color:'#a7e5d0',fontSize:16,fontWeight:'900',lineHeight:18},
  value:{width:42,height:28,marginHorizontal:5,borderWidth:1,borderColor:'#29403c',borderRadius:7,alignItems:'center',justifyContent:'center',backgroundColor:'#08110f'},
  positive:{borderColor:'#70d4af',backgroundColor:'#17382f'},negative:{borderColor:'#9b6b64',backgroundColor:'#271916'},valueText:{color:'#e5f2ee',fontSize:10,fontWeight:'900'},
  help:{color:'#536b64',fontSize:6.5,lineHeight:9,marginTop:7},
});
