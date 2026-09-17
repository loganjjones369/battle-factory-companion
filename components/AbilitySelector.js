import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function optionsFor(pokemon) {
  const raw = String(pokemon?.ability || '').split('/').map((x) => x.trim()).filter(Boolean);
  return [...new Set(raw)];
}

export default function AbilitySelector({ pokemon, value, onChange }) {
  const options = optionsFor(pokemon);
  if (options.length < 2) return null;
  const selected = value || options[0];
  return <View style={st.wrap}>
    <Text style={st.label}>ABILITY</Text>
    <View style={st.row}>
      {options.map((ability) => <TouchableOpacity key={ability} onPress={() => onChange?.(ability)} style={[st.button, selected === ability && st.buttonOn]}>
        <Text style={[st.text, selected === ability && st.textOn]}>{ability}</Text>
      </TouchableOpacity>)}
    </View>
    <Text style={st.help}>Pick the ability this scenario should assume.</Text>
  </View>;
}

export { optionsFor };

const st = StyleSheet.create({
  wrap:{marginTop:5,marginBottom:3},label:{color:'#688078',fontSize:7,fontWeight:'900',letterSpacing:1},row:{flexDirection:'row',gap:5,marginTop:4},button:{flex:1,borderWidth:1,borderColor:'#304943',borderRadius:7,paddingVertical:6,paddingHorizontal:5,alignItems:'center',backgroundColor:'#0b1714'},buttonOn:{borderColor:'#70d4af',backgroundColor:'#17382f'},text:{color:'#819891',fontSize:7,fontWeight:'900',textAlign:'center'},textOn:{color:'#dff8ee'},help:{color:'#536b64',fontSize:6.5,lineHeight:9,marginTop:3},
});
