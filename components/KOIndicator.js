import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export default function KOIndicator({ knockedOut = false, onToggle, compact = false }) {
  const fade = useRef(new Animated.Value(knockedOut ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(knockedOut ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: knockedOut ? 1 : 0, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: knockedOut ? 1 : 0.6, friction: 6, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [knockedOut, fade, scale]);

  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    {knockedOut && <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: fade, transform: [{ scale }] }]}><View style={styles.xCircle}><Text style={styles.x}>×</Text></View></Animated.View>}
    {onToggle && <Pressable onPress={onToggle} hitSlop={8} style={[styles.button, compact && styles.compactButton]}><Text style={styles.buttonText}>{knockedOut ? 'UNDO KO' : 'KO'}</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(45,52,50,.48)',borderRadius:12},
  xCircle:{width:42,height:42,borderRadius:21,backgroundColor:'rgba(12,20,18,.72)',borderWidth:2,borderColor:'#e6f2ed',alignItems:'center',justifyContent:'center'},
  x:{fontSize:39,lineHeight:40,fontWeight:'900',color:'#eef8f4'},
  button:{position:'absolute',right:5,top:5,backgroundColor:'#294b40',borderWidth:1,borderColor:'#71d3b0',borderRadius:7,paddingHorizontal:7,paddingVertical:4},
  compactButton:{right:2,top:2,paddingHorizontal:5,paddingVertical:3},
  buttonText:{fontSize:7.5,fontWeight:'900',letterSpacing:.5,color:'#eafff5'},
});
