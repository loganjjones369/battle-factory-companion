import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getPokemon, POKEMON } from '../data/factoryData';
import { getFactorySets, getFactorySet } from '../data/setIdentity';
import { calculateDamage, getStats, getEffectiveSpeed, MOVE_DATA } from '../data/damageCalc';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const STATUS = ['HEALTHY', 'PAR', 'BRN', 'PSN', 'TOX', 'SLP', 'FRZ'];

function Sprite({ pokemon, size = 72 }) {
  const id = pokemon?.id || pokemon?.nationalDexId;
  return id ? <Image source={{ uri: `${SPRITES}${id}.png` }} style={{ width: size, height: size }} resizeMode="contain" /> : <Text style={styles.unknownSprite}>?</Text>;
}

function PokeBall({ size = 48 }) {
  return <View style={[styles.pokeBall, { width: size, height: size * 0.72, borderRadius: size }]}>
    <View style={styles.ballTop} /><View style={styles.ballBottom} /><View style={styles.ballLine} /><View style={[styles.ballButton, { width: size * .24, height: size * .24, borderRadius: size * .12, left: size * .38, top: size * .24 }]} />
  </View>;
}

function Slot({ pokemon, side, index, active, knockedOut, onPress, scenario, onScenarioChange }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={.85} style={[styles.slot, side === 'you' ? styles.youSlot : styles.foeSlot, active && styles.activeSlot, knockedOut && styles.koSlot]}>
    {pokemon ? <Sprite pokemon={pokemon} size={active ? 82 : 68} /> : <PokeBall />}
    <Text style={styles.slotName}>{pokemon?.species || '???'}</Text>
    <Text style={styles.slotMeta}>{pokemon ? `SET ${pokemon.setId ?? '?'}` : side === 'foe' ? 'UNREVEALED' : 'EMPTY'}</Text>
    {active && <View style={styles.arenaLight} />}{pokemon && <View style={styles.hpMini}><View style={[styles.hpFill,{width:'100%'}]} /></View>}
    {knockedOut && <Text style={styles.koMark}>◌</Text>}
    <Text style={styles.slotNumber}>{index + 1}</Text>
  </TouchableOpacity>;
}

function ConsoleButton({ children, onPress, disabled }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.consoleButton, disabled && styles.disabled]}>
    <Text style={styles.consoleText}>{children}</Text>
  </TouchableOpacity>;
}

function SetStrip({ species, selected, onSelect }) {
  const sets = useMemo(() => getFactorySets(species || '').map(s => s.id), [species]);
  if (!species) return null;
  return <View style={styles.setStrip}>{sets.slice(0, 12).map(id =>
    <TouchableOpacity key={id} onPress={() => onSelect(id)} style={[styles.setButton, selected === id && styles.setButtonOn]}>
      <Text style={[styles.setText, selected === id && styles.setTextOn]}>{id}</Text>
    </TouchableOpacity>
  )}</View>;
}

function QuickReference({ source, target, side, setId, onSet, scenario, onScenarioChange }) {
  const [rolls, setRolls] = useState(null);
  const [ppMenu, setPpMenu] = useState(null);
  const set = source && setId != null ? getFactorySet(source.species, setId) : null;
  if (!source || !set) return <View style={styles.quick}><Text style={styles.quickTitle}>QUICK REFERENCE</Text><Text style={styles.quickHint}>Select a confirmed set to calculate the matchup.</Text></View>;
  const level = source.level || 50;
  const stats = getStats(source, set, level, 1);
  const status = scenario?.status?.[`${side}:${source._index ?? 0}`] || 'healthy';
  const hp = scenario?.hp?.[`${side}:${source._index ?? 0}`] ?? stats.hp;
  const targetSet = target && target.setId != null ? getFactorySet(target.species, target.setId) : null;
  const ppKey = `${side}:${source._index ?? 0}`;
  const pp = scenario?.pp?.[ppKey] || {};
  const setStage = scenario?.stages?.[ppKey] || {};
  const rows = target && targetSet ? (set.moves || []).map(move => {
    if (!MOVE_DATA[move]) return null;
    const result = calculateDamage({attacker:source,attackerSet:set,defender:target,defenderSet:targetSet,level,round:1,moveName:move,weather:scenario?.weather||'none',attackerStatus:status,defenderStatus:scenario?.status?.[`${side==='team'?'opponent':'team'}:${target._index ?? 0}`]||'healthy',attackerHP:hp,attackerStages:setStage,defenderStages:scenario?.stages?.[`${side==='team'?'opponent':'team'}:${target._index ?? 0}`]||{}}); 
    const baseBP=MOVE_DATA[move].power;
    const w=scenario?.weather||'none';
    const effectiveBP=(MOVE_DATA[move].type==='Fire'&&w==='sun')||(MOVE_DATA[move].type==='Water'&&w==='rain')?Math.floor(baseBP*1.5):(MOVE_DATA[move].type==='Fire'&&w==='rain')||(MOVE_DATA[move].type==='Water'&&w==='sun')?Math.floor(baseBP*.5):baseBP;
    return {move,result,effectiveBP};
  }).filter(Boolean) : [];
  const setList = getFactorySets(source.species).map(s=>s.id);
  const currentIndex=Math.max(0,setList.indexOf(setId));
  const changeSet=(dir)=>{ const next=setList[Math.max(0,Math.min(setList.length-1,currentIndex+dir))]; if(next!=null) onSet?.(next); };
  const changePP=(move, delta)=>onScenarioChange?.({...scenario,pp:{...(scenario.pp||{}),[ppKey]:{...pp,[move]:Math.max(0,(pp[move] ?? 4)+delta)}}});
  return <View style={styles.quick}>
    <View style={styles.quickHeader}><Text style={styles.quickTitle}>{side==='team'?'YOUR':'OPPONENT'} QUICK REFERENCE</Text><Text style={styles.quickSet}>SET {setId} · {side==='opponent'?'POSSIBLE':'CONFIRMED'}</Text></View>
    <View style={styles.quickNav}><TouchableOpacity disabled={currentIndex<=0} onPress={()=>changeSet(-1)}><Text style={styles.navArrow}>‹</Text></TouchableOpacity><Text style={styles.quickLead}>{source.species} → {target?.species || 'OPPONENT'}</Text><TouchableOpacity disabled={currentIndex>=setList.length-1} onPress={()=>changeSet(1)}><Text style={styles.navArrow}>›</Text></TouchableOpacity></View>
    <View style={styles.quickStats}><Text>HP {hp}/{stats.hp}</Text><Text>SPD {Math.floor(getEffectiveSpeed(stats,status))}</Text><Text>ITEM {set.item || '—'}</Text><Text>ABILITY {set.ability || '—'}</Text></View>
    <View style={styles.quickMoves}>{rows.length ? rows.map(({move,result,effectiveBP})=><TouchableOpacity key={move} onPress={()=>changePP(move,-1)} onLongPress={()=>setPpMenu(move)} style={styles.quickMove}>
      <Text style={styles.quickMoveName}>{move}</Text><Text style={styles.quickDamage}>{result.immune?'0%':`${result.percentMin}–${result.percentMax}%`}</Text><Text style={styles.quickPP}>PP {pp[move] ?? 4}</Text><Text style={styles.quickBP}>BP {effectiveBP}</Text>
    </TouchableOpacity>) : <Text style={styles.quickHint}>No confirmed target set yet.</Text>}</View>
    {ppMenu && <View style={styles.ppMenu}><Text style={styles.ppTitle}>{ppMenu}</Text><TouchableOpacity onPress={()=>{setRolls(ppMenu);setPpMenu(null)}}><Text style={styles.ppOption}>SEE ROLLS</Text></TouchableOpacity><TouchableOpacity onPress={()=>changePP(ppMenu,1)}><Text style={styles.ppOption}>EDIT PP +1</Text></TouchableOpacity><TouchableOpacity onPress={()=>{onScenarioChange?.({...scenario,pp:{...(scenario.pp||{}),[ppKey]:{...pp,[ppMenu]:0}}});setPpMenu(null)}}><Text style={styles.ppOption}>SET PP 0</Text></TouchableOpacity></View>}
    {rolls && <View style={styles.rollPanel}><Text style={styles.rollTitle}>{rolls} · DAMAGE ROLLS</Text><Text style={styles.rollRange}>{rows.find(r=>r.move===rolls)?.result?.percentMin ?? 0}–{rows.find(r=>r.move===rolls)?.result?.percentMax ?? 0}%</Text><Text style={styles.rollHint}>39 possible Gen III damage rolls, with the minimum and maximum rolls shown above.</Text><TouchableOpacity onPress={()=>setRolls(null)}><Text style={styles.rollClose}>× CLOSE</Text></TouchableOpacity></View>}
  </View>;
}
export default function BattleRoom({
  team = [],
  opponent = [],
  knockedOut = { team: [], opponent: [] },
  activeTeamIndex = 0,
  activeOpponentIndex = 0,
  onSelectTeam,
  onSelectOpponent,
  onMarkKO,
  onOpponentSearch,
  onOpponentSet,
  opponentText = [],
  opponentSets = [],
  onEndBattle,
  onOpenSummary,
  onScenarioChange,
  scenario = {},
  round = 1,
  battle = 1,
  swaps = 0,
  history = [],
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [search, setSearch] = useState(opponentText[activeOpponentIndex] || '');
  const [selectedResult, setSelectedResult] = useState(null);
  const [viewedSide, setViewedSide] = useState('team');

  const activeYou = team[activeTeamIndex] ? {...team[activeTeamIndex], _index:activeTeamIndex} : null;
  const activeFoe = opponent[activeOpponentIndex] ? {...opponent[activeOpponentIndex], _index:activeOpponentIndex} : null;
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const all = [];
    for (const name of Object.keys(POKEMON || {})) {
      if (name.toLowerCase().startsWith(q)) all.push(name);
      if (all.length >= 8) break;
    }
    return all;
  }, [search]);

  const status = scenario?.status?.[`team:${activeTeamIndex}`] || 'healthy';
  const activeHP = scenario?.hp?.[`team:${activeTeamIndex}`];
  const setId = opponentSets[activeOpponentIndex];
  const statusLabel = String(status).toUpperCase();

  const chooseSpecies = (species) => {
    setSelectedResult(species);
    setSearch(species);
    onOpponentSearch?.(activeOpponentIndex, species);
  };

  const chooseSet = (id) => onOpponentSet?.(activeOpponentIndex, id);

  return <View style={styles.room}>
    <View style={styles.topBar}>
      <View><Text style={styles.eyebrow}>BATTLE FACTORY</Text><Text style={styles.round}>BATTLE {battle} · ROUND {round}</Text></View>
      <Text style={styles.counter}>SWAPS {swaps}</Text>
    </View>

    <View style={styles.arena}>
      <View style={styles.catwalk} />
      <View style={styles.pipes}><View /><View /><View /></View>
      <View style={styles.foeRail}>
        {[0,1,2].map(i => <Slot key={i} pokemon={opponent[i]} side="foe" index={i} active={activeOpponentIndex === i && !!opponent[i]} knockedOut={knockedOut.opponent.includes(i)} onPress={() => { if (opponent[i]) { setViewedSide('opponent'); onSelectOpponent?.(i); } }} scenario={scenario} onScenarioChange={onScenarioChange} />)}
      </View>

      <View style={styles.center}>
        <Text style={styles.arenaLabel}>FACTORY BATTLE PLATFORM</Text>
        <View style={styles.centerFloor}><View style={styles.floorLine} /><View style={styles.floorLine} /></View>
        {!activeFoe && <View style={styles.entryPanel}>
          <Text style={styles.entryTitle}>WHAT POKÉMON CAME OUT?</Text>
          <TextInput value={search} onChangeText={(v) => { setSearch(v); setSelectedResult(null); }} placeholder="Type a Pokémon name" placeholderTextColor="#58736b" style={styles.searchInput} autoFocus />
          {results.length > 0 && <View style={styles.results}>{results.map(name => <TouchableOpacity key={name} onPress={() => chooseSpecies(name)} style={styles.result}><Sprite pokemon={getPokemon(name)} size={34}/><Text style={styles.resultText}>{name}</Text></TouchableOpacity>)}</View>}
          {selectedResult && <><Text style={styles.possible}>{selectedResult.toUpperCase()} · POSSIBLE</Text><SetStrip species={selectedResult} selected={setId} onSelect={chooseSet}/></>}
        </View>}
      </View>

      <View style={styles.youRail}>
        {[0,1,2].map(i => <Slot key={i} pokemon={team[i]} side="you" index={i} active={activeTeamIndex === i && !!team[i]} knockedOut={knockedOut.team.includes(i)} onPress={() => { if (team[i]) { setViewedSide('team'); onSelectTeam?.(i); } }} scenario={scenario} onScenarioChange={onScenarioChange} />)}
      </View>

      <QuickReference source={viewedSide === 'team' ? activeYou : activeFoe} target={viewedSide === 'team' ? activeFoe : activeYou} side={viewedSide} setId={viewedSide === 'team' ? activeYou?.setId : setId} onSet={(id)=>viewedSide === 'team' ? onSelectTeam?.(activeTeamIndex, id) : onOpponentSet?.(activeOpponentIndex, id)} scenario={scenario} onScenarioChange={onScenarioChange}/>


      <View style={styles.statusArea}>
        <Text style={styles.hpText}>HP {scenario?.hp?.[`team:${activeTeamIndex}`] ?? '—'} / —</Text>
        <TouchableOpacity onPress={() => setStatusOpen(v => !v)} style={styles.statusButton}><Text style={styles.statusText}>[{statusLabel}]</Text></TouchableOpacity>
        {statusOpen && <View style={styles.statusMenu}>{STATUS.map(s => <TouchableOpacity key={s} onPress={() => { onScenarioChange?.({ ...scenario, status: { ...(scenario.status || {}), [`team:${activeTeamIndex}`]: s.toLowerCase() } }); setStatusOpen(false); }} style={styles.statusOption}><Text style={styles.statusOptionText}>{s}</Text></TouchableOpacity>)}</View>}
      </View>
    </View>

    <View style={styles.console}>
      <View style={styles.consoleScreen}><Text style={styles.screenText}>READY · ACTIVE {activeYou?.species || 'NONE'} · FOE {activeFoe?.species || 'WAITING'}</Text></View>
      <View style={styles.consoleButtons}>
        <ConsoleButton onPress={() => onSelectTeam?.((activeTeamIndex + 1) % 3)} disabled={team.filter(Boolean).length < 2}>CHANGE ACTIVE</ConsoleButton>
        <ConsoleButton onPress={() => onMarkKO?.('opponent', activeOpponentIndex)} disabled={!activeFoe}>MARK KO</ConsoleButton>
        <ConsoleButton onPress={() => setEndOpen(true)}>END BATTLE</ConsoleButton>
      </View>
      {endOpen && <View style={styles.endMenu}>
        <Text style={styles.endTitle}>END BATTLE</Text>
        <View style={styles.endButtons}>
          <TouchableOpacity onPress={() => { setEndOpen(false); onEndBattle?.('win'); }} style={styles.endButton}><Text style={styles.endButtonText}>WIN</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setEndOpen(false); onEndBattle?.('loss'); }} style={styles.endButton}><Text style={styles.endButtonText}>LOSS</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEndOpen(false)} style={styles.endCancel}><Text style={styles.endCancelText}>CANCEL</Text></TouchableOpacity>
        </View>
      </View>}
    </View>

    <View style={styles.history}><Text style={styles.historyTitle}>HISTORY</Text>{history.slice(0,3).map((p,i)=><View key={`${p?.species || 'x'}-${i}`} style={styles.historyItem}><Sprite pokemon={p} size={38}/></View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  room:{backgroundColor:'#11191b',borderWidth:1,borderColor:'#34484a',borderRadius:18,overflow:'hidden',marginHorizontal:6,marginBottom:10},
  topBar:{padding:10,backgroundColor:'#172629',borderBottomWidth:1,borderBottomColor:'#33484a',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  eyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.6,color:'#6fd0b0'},round:{fontSize:16,fontWeight:'900',color:'#edf8f3',marginTop:2},counter:{fontSize:8,fontWeight:'900',color:'#7faaa0'},
  arena:{minHeight:500,backgroundColor:'#172124',position:'relative',padding:12,overflow:'hidden'},
  catwalk:{position:'absolute',top:115,left:0,right:0,height:1,backgroundColor:'#3c5153'},pipes:{position:'absolute',right:12,top:60,width:70,gap:8},
  foeRail:{position:'absolute',right:8,top:12,width:105,gap:7},youRail:{position:'absolute',left:8,bottom:94,width:105,gap:7},
  slot:{height:104,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative',backgroundColor:'rgba(6,12,13,.78)'},youSlot:{borderColor:'#386f9d'},foeSlot:{borderColor:'#91484f'},activeSlot:{borderColor:'#7ee0bd',backgroundColor:'#1d302c',transform:[{scale:1.04}]},koSlot:{opacity:.45},slotName:{fontSize:9,fontWeight:'900',color:'#edf7f3',maxWidth:94},slotMeta:{fontSize:7,fontWeight:'900',color:'#78928b',marginTop:2},hpMini:{position:'absolute',left:12,right:12,bottom:12,height:4,borderRadius:4,backgroundColor:'#293735',overflow:'hidden'},hpFill:{height:4,backgroundColor:'#65c39f'},slotNumber:{position:'absolute',left:5,top:4,fontSize:7,fontWeight:'900',color:'#58716b'},arenaLight:{position:'absolute',bottom:0,left:'18%',right:'18%',height:4,backgroundColor:'#79d8b6',borderRadius:4},koMark:{position:'absolute',right:5,top:3,fontSize:17,color:'#d9e5df'},
  pokeBall:{overflow:'hidden',borderWidth:1,borderColor:'#2a3536'},ballTop:{position:'absolute',left:0,right:0,top:0,height:'50%',backgroundColor:'#b64b4f'},ballBottom:{position:'absolute',left:0,right:0,bottom:0,height:'50%',backgroundColor:'#d9ded8'},ballLine:{position:'absolute',left:0,right:0,top:'46%',height:'8%',backgroundColor:'#222a2b'},ballButton:{position:'absolute',backgroundColor:'#edf2ec',borderWidth:2,borderColor:'#27302f'},
  center:{position:'absolute',left:115,right:115,top:18,bottom:104,alignItems:'center',justifyContent:'center'},arenaLabel:{fontSize:7,fontWeight:'900',letterSpacing:1.2,color:'#5e7771'},centerFloor:{position:'absolute',left:10,right:10,bottom:28,height:95,borderWidth:1,borderColor:'#3a4c4e',borderRadius:50,justifyContent:'space-around',paddingVertical:20},floorLine:{height:1,backgroundColor:'#354749',marginHorizontal:20},
  entryPanel:{width:'100%',backgroundColor:'#0b1514',borderWidth:1,borderColor:'#4b7065',borderRadius:14,padding:12,zIndex:10},entryTitle:{fontSize:12,fontWeight:'900',color:'#eafff5',letterSpacing:.5},searchInput:{marginTop:8,backgroundColor:'#08100f',borderWidth:1,borderColor:'#2f4944',borderRadius:9,padding:9,color:'#effff9',fontSize:11},results:{marginTop:5,borderWidth:1,borderColor:'#29413d',borderRadius:9,overflow:'hidden'},result:{flexDirection:'row',alignItems:'center',padding:6,borderBottomWidth:1,borderBottomColor:'#1f302d'},resultText:{color:'#edf7f3',fontSize:10,fontWeight:'900'},possible:{color:'#71d2b0',fontSize:9,fontWeight:'900',marginTop:7},setStrip:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:5},setButton:{paddingHorizontal:7,paddingVertical:5,borderRadius:6,borderWidth:1,borderColor:'#304840'},setButtonOn:{backgroundColor:'#365846',borderColor:'#72d3b2'},setText:{fontSize:8,fontWeight:'900',color:'#6f8881'},setTextOn:{color:'#fff'},
  quick:{position:'absolute',left:115,right:115,bottom:10,backgroundColor:'#10201d',borderWidth:1,borderColor:'#3e6057',borderRadius:12,padding:8},quickHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},quickNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:3},navArrow:{fontSize:22,color:'#79d8b6',paddingHorizontal:5},quickStats:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:4,color:'#9eb9b1',fontSize:7},quickMoves:{marginTop:4},quickMove:{flexDirection:'row',alignItems:'center',paddingVertical:4,borderTopWidth:1,borderTopColor:'#20332f'},quickMoveName:{flex:1,color:'#eaf7f2',fontSize:8,fontWeight:'900'},quickDamage:{width:58,textAlign:'right',color:'#e0f5ed',fontSize:8,fontWeight:'900'},quickPP:{width:42,textAlign:'right',color:'#78928b',fontSize:7},quickBP:{width:36,textAlign:'right',color:'#78928b',fontSize:7},ppMenu:{position:'absolute',right:6,top:42,backgroundColor:'#0b1514',borderWidth:1,borderColor:'#4b7065',borderRadius:8,padding:6,zIndex:30},ppTitle:{color:'#cfeee2',fontSize:8,fontWeight:'900'},ppOption:{color:'#9fe0c9',fontSize:8,fontWeight:'900',paddingVertical:5},rollPanel:{position:'absolute',left:8,right:8,top:35,backgroundColor:'#101d1a',borderWidth:1,borderColor:'#638a7c',borderRadius:8,padding:8,zIndex:40},rollTitle:{color:'#a9e3cf',fontSize:8,fontWeight:'900'},rollRange:{color:'#fff',fontSize:15,fontWeight:'900',marginTop:3},rollHint:{color:'#78928b',fontSize:7,marginTop:3},rollClose:{color:'#9fe0c9',fontSize:7,fontWeight:'900',marginTop:5},quickSet:{fontSize:7,fontWeight:'900',color:'#7fa69a'},quickTitle:{fontSize:7,fontWeight:'900',letterSpacing:1.2,color:'#69c7aa'},quickLead:{fontSize:11,fontWeight:'900',color:'#eef8f4',marginTop:2},quickHint:{fontSize:8,color:'#78928b',marginTop:2},quickActions:{flexDirection:'row',gap:5,marginTop:5},quickButton:{flex:1,padding:6,borderRadius:7,borderWidth:1,borderColor:'#36534c',alignItems:'center'},quickButtonText:{fontSize:7,fontWeight:'900',color:'#dff7ee'},
  statusArea:{position:'absolute',left:12,bottom:10,flexDirection:'row',alignItems:'center',gap:5},hpText:{fontSize:8,fontWeight:'900',color:'#9eb9b1'},statusButton:{paddingHorizontal:6,paddingVertical:4,borderRadius:6,borderWidth:1,borderColor:'#3e5a54',backgroundColor:'#0c1715'},statusText:{fontSize:8,fontWeight:'900',color:'#dff8ee'},statusMenu:{position:'absolute',left:0,bottom:30,flexDirection:'row',flexWrap:'wrap',width:220,backgroundColor:'#0b1514',borderWidth:1,borderColor:'#4b7065',borderRadius:9,padding:4},statusOption:{paddingHorizontal:7,paddingVertical:6},statusOptionText:{fontSize:8,fontWeight:'900',color:'#e6f7f1'},
  console:{backgroundColor:'#0b1213',borderTopWidth:2,borderTopColor:'#38504e',padding:9},consoleScreen:{backgroundColor:'#18332b',borderWidth:1,borderColor:'#4e796c',padding:7,borderRadius:7},screenText:{fontFamily:'monospace',fontSize:8,fontWeight:'900',color:'#a6e6d1'},consoleButtons:{flexDirection:'row',gap:6,marginTop:7},consoleButton:{flex:1,minHeight:42,borderRadius:8,borderWidth:1,borderColor:'#49645e',backgroundColor:'#253532',alignItems:'center',justifyContent:'center'},consoleText:{fontSize:8,fontWeight:'900',color:'#ecfaf5',textAlign:'center'},disabled:{opacity:.35},endMenu:{marginTop:7,borderWidth:1,borderColor:'#58756d',borderRadius:9,backgroundColor:'#111d1b',padding:8},endTitle:{fontSize:9,fontWeight:'900',color:'#bfeadf'},endButtons:{flexDirection:'row',gap:5,marginTop:5},endButton:{flex:1,padding:8,borderRadius:6,backgroundColor:'#284c40',alignItems:'center'},endButtonText:{fontSize:8,fontWeight:'900',color:'#fff'},endCancel:{flex:1,padding:8,borderRadius:6,borderWidth:1,borderColor:'#40534f',alignItems:'center'},endCancelText:{fontSize:8,fontWeight:'900',color:'#b4c8c1'},
  history:{height:58,backgroundColor:'#281b39',borderTopWidth:1,borderTopColor:'#5b4076',flexDirection:'row',alignItems:'center',paddingHorizontal:8,gap:10},historyTitle:{fontSize:7,fontWeight:'900',color:'#c5a8df',letterSpacing:1},historyItem:{width:48,height:48,alignItems:'center',justifyContent:'center'},unknownSprite:{fontSize:28,color:'#6f8881'}
});
