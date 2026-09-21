import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { calculateDamage, getStats, getEffectiveSpeed, getStatStageMultiplier, MOVE_DATA } from '../data/damageCalc';
import { getFactorySet } from '../data/setIdentity';

const STATUS = ['healthy', 'paralyzed', 'burned', 'poisoned', 'toxic', 'sleep', 'frozen'];
const WEATHER = ['none', 'sun', 'rain', 'sand', 'hail'];
const STATS = [['atk', 'ATTACK'], ['def', 'DEFENSE'], ['spa', 'SP. ATK'], ['spd', 'SP. DEF'], ['spe', 'SPEED']];

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n)));
const emptyScenario = () => ({ hp: {}, status: {}, stages: {}, weather: 'none', focus: 'team:0' });

function readPokemon(pokemon) {
  if (!pokemon?.species || pokemon?.setId == null) return null;
  const set = getFactorySet(pokemon.species, pokemon.setId);
  return set ? { pokemon, set } : null;
}

function key(side, index) { return side + ':' + index; }

function stageFor(scenario, side, index) {
  return scenario?.stages?.[key(side, index)] || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

function statusFor(scenario, side, index) {
  return scenario?.status?.[key(side, index)] || 'healthy';
}

function hpFor(scenario, side, index, maxHP) {
  const raw = scenario?.hp?.[key(side, index)];
  return raw == null ? maxHP : clamp(raw, 1, maxHP);
}

function moveLabel(move) {
  return typeof move === 'string' ? move : move?.name;
}

export default function BattleScenarioPanel({ team = [], opponent = [], scenario = emptyScenario(), onChange }) {
  const focus = scenario?.focus || 'team:0';
  const [side, rawIndex] = focus.split(':');
  const index = Number(rawIndex);
  const sourceList = side === 'opponent' ? opponent : team;
  const targetList = side === 'opponent' ? team : opponent;
  const source = sourceList[index];
  const targetIndex = targetList.findIndex(Boolean);
  const target = targetList[targetIndex >= 0 ? targetIndex : 0];
  const sourceData = readPokemon(source);
  const targetData = readPokemon(target);

  const update = (patch) => onChange({ ...scenario, ...patch });
  const setField = (group, field, value) => update({ [group]: { ...(scenario[group] || {}), [field]: value } });
  const setSourceStatus = (value) => setField('status', key(side, index), value);
  const setStage = (stat, delta) => {
    const current = stageFor(scenario, side, index);
    setField('stages', key(side, index), { ...current, [stat]: clamp((current[stat] || 0) + delta, -6, 6) });
  };

  if (!sourceData) {
    return <View style={styles.card}><Text style={styles.label}>BATTLE INSTRUMENT</Text><Text style={styles.title}>SCENARIO CONTROLS</Text><Text style={styles.muted}>Choose a confirmed set for a Pokémon to activate HP, status, stat stages, weather, speed and damage testing.</Text></View>;
  }

  const level = source.level || 50;
  const sourceStats = getStats(source, sourceData.set, level, source.factoryIV ? Math.max(1, Math.ceil(Number(source.factoryIV) / 3)) : 1);
  const currentHP = hpFor(scenario, side, index, sourceStats.hp);
  const sourceStages = stageFor(scenario, side, index);
  const sourceStatus = statusFor(scenario, side, index);
  const sourceSpeed = Math.floor(sourceStats.spe * getStatStageMultiplier(sourceStages.spe)) * (sourceStatus === 'paralyzed' ? 0.25 : 1);

  const weather = scenario.weather || 'none';
  const damageRows = targetData ? (sourceData.set.moves || []).map(move => {
    const name = moveLabel(move);
    if (!name || !MOVE_DATA[name]) return null;
    const result = calculateDamage({
      attacker: source,
      attackerSet: sourceData.set,
      defender: target,
      defenderSet: targetData.set,
      level,
      round: 1,
      moveName: name,
      weather,
      attackerStatus: sourceStatus,
      defenderStatus: statusFor(scenario, side === 'opponent' ? 'team' : 'opponent', targetIndex),
      attackerHP: currentHP,
      attackerStages: sourceStages,
      defenderStages: stageFor(scenario, side === 'opponent' ? 'team' : 'opponent', targetIndex),
      attackerAbility: sourceData.set.ability,
      defenderAbility: targetData.set.ability
    });
    const effectiveBP = MOVE_DATA[name].type === 'Fire' && weather === 'sun' ? Math.floor(MOVE_DATA[name].power * 1.5)
      : MOVE_DATA[name].type === 'Water' && weather === 'rain' ? Math.floor(MOVE_DATA[name].power * 1.5)
      : MOVE_DATA[name].type === 'Fire' && weather === 'rain' ? Math.floor(MOVE_DATA[name].power * 0.5)
      : MOVE_DATA[name].type === 'Water' && weather === 'sun' ? Math.floor(MOVE_DATA[name].power * 0.5)
      : MOVE_DATA[name].power;
    return { name, result, effectiveBP };
  }).filter(Boolean) : [];

  const sourceHpKey = key(side, index);
  const weatherLabel = weather === 'none' ? 'CLEAR' : weather.toUpperCase();
  const selectButton = (nextSide, nextIndex) => update({ focus: key(nextSide, nextIndex) });

  return <View style={styles.card}>
    <View style={styles.header}><View><Text style={styles.label}>BATTLE INSTRUMENT</Text><Text style={styles.title}>{source.species} • SCENARIO</Text></View><Text style={styles.weather}>{weatherLabel}</Text></View>

    <View style={styles.selectorRow}>
      <Text style={styles.sectionLabel}>VIEW</Text>
      {team.map((p, i) => p && <TouchableOpacity key={'t'+i} onPress={() => selectButton('team', i)} style={[styles.selector, side === 'team' && index === i && styles.selectorOn]}><Text style={styles.selectorText}>YOU {i + 1}</Text></TouchableOpacity>)}
      {opponent.map((p, i) => p && <TouchableOpacity key={'o'+i} onPress={() => selectButton('opponent', i)} style={[styles.selector, side === 'opponent' && index === i && styles.selectorOppOn]}><Text style={styles.selectorText}>FOE {i + 1}</Text></TouchableOpacity>)}
    </View>

    <View style={styles.hpRow}>
      <Text style={styles.sectionLabel}>HP</Text>
      <TextInput value={String(currentHP)} keyboardType="number-pad" onChangeText={v => setField('hp', sourceHpKey, clamp(v.replace(/[^0-9]/g, '') || sourceStats.hp, 1, sourceStats.hp))} style={styles.hpInput}/>
      <Text style={styles.hpMax}>/ {sourceStats.hp}</Text>
    </View>

    <View style={styles.statusRow}>
      <Text style={styles.sectionLabel}>STATUS</Text>
      {STATUS.map(value => <TouchableOpacity key={value} onPress={() => setSourceStatus(value)} style={[styles.statusButton, sourceStatus === value && styles.statusOn]}><Text style={styles.statusText}>{value === 'healthy' ? 'HEALTHY' : value === 'paralyzed' ? 'PAR' : value === 'burned' ? 'BRN' : value === 'poisoned' ? 'PSN' : value === 'toxic' ? 'TOX' : value === 'sleep' ? 'SLP' : 'FRZ'}</Text></TouchableOpacity>)}
    </View>

    <View style={styles.weatherRow}>
      <Text style={styles.sectionLabel}>WEATHER</Text>
      {WEATHER.map(value => <TouchableOpacity key={value} onPress={() => update({ weather: value })} style={[styles.weatherButton, weather === value && styles.weatherOn]}><Text style={styles.weatherText}>{value === 'none' ? 'CLEAR' : value.toUpperCase()}</Text></TouchableOpacity>)}
    </View>

    <View style={styles.stats}>
      <Text style={styles.sectionLabel}>STAT STAGES</Text>
      {STATS.map(([stat, label]) => {
        const stage = sourceStages[stat] || 0;
        const modified = Math.floor(sourceStats[stat] * getStatStageMultiplier(stage));
        return <View key={stat} style={styles.statRow}>
          <Text style={styles.statName}>{label}</Text><Text style={styles.statValue}>{sourceStats[stat]} → {modified}</Text>
          <TouchableOpacity disabled={stage >= 6} onPress={() => setStage(stat, 1)} style={styles.stageButton}><Text>▲</Text></TouchableOpacity>
          <Text style={styles.stage}>{stage > 0 ? '+' + stage : stage}</Text>
          <TouchableOpacity disabled={stage <= -6} onPress={() => setStage(stat, -1)} style={styles.stageButton}><Text>▼</Text></TouchableOpacity>
        </View>;
      })}
      <Text style={styles.muted}>Stat stages are scenario-only; the original stat remains visible.</Text>
    </View>

    <View style={styles.moves}>
      <Text style={styles.sectionLabel}>WHAT THIS POKÉMON DOES TO THE TARGET</Text>
      {!targetData ? <Text style={styles.muted}>No confirmed target set yet.</Text> : damageRows.map(row => <View key={row.name} style={styles.moveRow}>
        <Text style={styles.moveName}>{row.name}</Text>
        <Text style={styles.damage}>{row.result.immune ? '0%' : row.result.percentMin + '–' + row.result.percentMax + '%'}</Text>
        <Text style={[styles.bp, row.effectiveBP !== MOVE_DATA[row.name].power && styles.weatherBP]}>BP {row.effectiveBP}</Text>
      </View>)}
    </View>

    <Text style={styles.speed}>SPEED {Math.floor(sourceSpeed)} {sourceStatus === 'paralyzed' ? '• PAR' : ''}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#0d1916',borderWidth:1,borderColor:'#29403a',borderRadius:14,padding:12,marginBottom:10},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  label:{color:'#6ed0b0',fontSize:8,fontWeight:'900',letterSpacing:1.2},
  title:{color:'#f3faf7',fontSize:15,fontWeight:'900',marginTop:3},
  muted:{color:'#6e8880',fontSize:9,lineHeight:14,marginTop:6},
  weather:{color:'#9dd5c2',fontSize:9,fontWeight:'900'},
  selectorRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:9,marginBottom:8},
  selector:{borderWidth:1,borderColor:'#2a4039',borderRadius:7,paddingHorizontal:8,paddingVertical:6,backgroundColor:'#08110f'},
  selectorOn:{borderColor:'#71d3b0',backgroundColor:'#163229'},
  selectorOppOn:{borderColor:'#d17a7a',backgroundColor:'#321919'},
  selectorText:{color:'#c5d8d2',fontSize:8,fontWeight:'900'},
  sectionLabel:{color:'#587067',fontSize:7,fontWeight:'900',letterSpacing:1,marginRight:5},
  hpRow:{flexDirection:'row',alignItems:'center',marginTop:3},
  hpInput:{minWidth:65,backgroundColor:'#08110f',borderWidth:1,borderColor:'#29403a',borderRadius:8,color:'#f5fbf8',paddingHorizontal:8,paddingVertical:6,fontSize:10,fontWeight:'900'},
  hpMax:{color:'#71867e',fontSize:9,fontWeight:'800',marginLeft:4},
  statusRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,marginTop:8},
  statusButton:{borderWidth:1,borderColor:'#2a4039',borderRadius:6,paddingHorizontal:6,paddingVertical:5},
  statusOn:{backgroundColor:'#315347',borderColor:'#71d3b0'},
  statusText:{color:'#c5d8d2',fontSize:7,fontWeight:'900'},
  weatherRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,marginTop:8},
  weatherButton:{borderWidth:1,borderColor:'#2a4039',borderRadius:6,paddingHorizontal:6,paddingVertical:5},
  weatherOn:{backgroundColor:'#31483f',borderColor:'#9dd5c2'},
  weatherText:{color:'#c5d8d2',fontSize:7,fontWeight:'900'},
  stats:{marginTop:9,borderTopWidth:1,borderTopColor:'#213630',paddingTop:8},
  statRow:{flexDirection:'row',alignItems:'center',marginTop:4},
  statName:{width:70,color:'#a6beb6',fontSize:8,fontWeight:'800'},
  statValue:{width:90,color:'#eef8f4',fontSize:8,fontWeight:'900'},
  stageButton:{width:25,height:25,borderWidth:1,borderColor:'#2d443d',borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:'#0a1512'},
  stage:{width:26,textAlign:'center',color:'#9dd5c2',fontSize:9,fontWeight:'900'},
  moves:{marginTop:9,borderTopWidth:1,borderTopColor:'#213630',paddingTop:8},
  moveRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#1c2e29',paddingVertical:6},
  moveName:{flex:1,color:'#eaf7f2',fontSize:9,fontWeight:'900'},
  damage:{width:75,color:'#e0f5ed',fontSize:9,fontWeight:'900',textAlign:'right'},
  bp:{width:52,color:'#708980',fontSize:8,textAlign:'right',fontWeight:'800'},
  weatherBP:{color:'#e2bf75'},
  speed:{color:'#82a89d',fontSize:9,fontWeight:'900',marginTop:8}
});