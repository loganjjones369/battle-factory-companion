import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PokemonInfoPanel from './PokemonInfoPanel';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

function Sprite({ pokemon, size = 52 }) {
  const id = pokemon?.id || pokemon?.nationalDexId;
  return id ? <Image source={{ uri: `${SPRITES}${id}.png` }} style={{ width: size, height: size }} resizeMode="contain" /> : <Text style={styles.q}>?</Text>;
}

export default function PokemonHistoryDock({ pokemon = [], level = 50, round = 1 }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const items = pokemon.slice(0, 3);
  return <View style={styles.wrap}>
    <TouchableOpacity onPress={() => setOpen((v) => !v)} style={styles.tab}>
      <Text style={styles.tabText}>HISTORY / KNOWN INFO</Text>
      <Text style={styles.tabArrow}>{open ? '‹' : '›'}</Text>
    </TouchableOpacity>
    {open && <View style={styles.panel}>
      <Text style={styles.kicker}>PREVIOUS BATTLE • QUICK REFERENCE</Text>
      <View style={styles.row}>{items.map((p, i) => <TouchableOpacity key={`${p?.species || 'empty'}-${p?.setId || i}`} onPress={() => setSelected(p)} style={styles.item}>
        <View style={styles.spriteWrap}><Sprite pokemon={p} size={76}/>{p?.isElevated && <View style={styles.jade}><Text style={styles.jadeText}>↑</Text></View>}</View>
        <Text numberOfLines={1} style={styles.name}>{p?.species || '???'}</Text>
        <Text style={styles.meta}>{p?.setId != null ? `SET ${p.setId}` : 'SET ???'}</Text>
      </TouchableOpacity>)}</View>
      <Text style={styles.note}>Tap a Pokémon for quick stats, set, and known information.</Text>
    </View>}
    <PokemonInfoPanel visible={!!selected} pokemon={selected} kind="HISTORY" level={level} round={round} history onClose={() => setSelected(null)}/>
  </View>;
}

const styles = StyleSheet.create({
  wrap:{marginHorizontal:8,marginBottom:8},tab:{alignSelf:'flex-start',backgroundColor:'#33244a',borderColor:'#7957a3',borderWidth:1,borderRadius:10,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center'},tabText:{color:'#dfcef0',fontSize:8,fontWeight:'900',letterSpacing:1},tabArrow:{color:'#c99fe8',fontSize:18,marginLeft:7,lineHeight:15},panel:{backgroundColor:'#241936',borderColor:'#7957a3',borderWidth:1,borderRadius:15,padding:11,marginTop:6},kicker:{color:'#c99fe8',fontSize:8,fontWeight:'900',letterSpacing:1.2},row:{flexDirection:'row',justifyContent:'space-between',marginTop:8},item:{width:'31%',alignItems:'center',backgroundColor:'#302145',borderRadius:11,padding:7},spriteWrap:{position:'relative',width:78,height:76,alignItems:'center',justifyContent:'center'},jade:{position:'absolute',left:0,top:0,width:20,height:20,alignItems:'center',justifyContent:'center'},jadeText:{color:'#71e0b7',fontSize:18,fontWeight:'900',textShadowColor:'#71e0b7',textShadowRadius:5},name:{color:'#f2eaf8',fontSize:10,fontWeight:'900',marginTop:2},meta:{color:'#bda5ce',fontSize:8,fontWeight:'800',marginTop:2},note:{color:'#9179a4',fontSize:8,lineHeight:12,marginTop:8},q:{fontSize:28,color:'#c99fe8'}
});
