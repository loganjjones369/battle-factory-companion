import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

function DizzyEye({ flip = false }) {
  return (
    <View style={[styles.eye, flip && styles.eyeFlip]}>
      <View style={styles.ringOuter}>
        <View style={styles.ringMiddle}>
          <View style={styles.ringInner}>
            <View style={styles.eyeDot} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function KOIndicator({ knockedOut = false, onToggle, compact = false }) {
  const fade = useRef(new Animated.Value(knockedOut ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(knockedOut ? 1 : 0.72)).current;
  const drop = useRef(new Animated.Value(knockedOut ? 0 : -8)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: knockedOut ? 1 : 0, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: knockedOut ? 1 : 0.72, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.spring(drop, { toValue: knockedOut ? 0 : -8, friction: 7, tension: 110, useNativeDriver: true }),
      Animated.spring(wobble, { toValue: knockedOut ? 1 : 0, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [knockedOut, fade, scale, drop, wobble]);

  const rotate = wobble.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-4deg', '0deg'] });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {knockedOut && (
        <Animated.View pointerEvents="none" style={[styles.overlay, compact && styles.compactOverlay, { opacity: fade, transform: [{ translateY: drop }, { scale }] }]}>
          <Animated.View style={[styles.dizzyEyes, { transform: [{ rotate }] }]}>
            <DizzyEye />
            <DizzyEye flip />
          </Animated.View>
        </Animated.View>
      )}
      {onToggle && (
        <Pressable onPress={onToggle} hitSlop={8} style={[styles.button, compact && styles.compactButton]}>
          <Text style={styles.buttonText}>{knockedOut ? 'UNDO KO' : 'KO'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingLeft: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(42, 48, 47, .34)',
    borderRadius: 12,
  },
  compactOverlay: {
    paddingLeft: 9,
    paddingTop: 8,
    backgroundColor: 'rgba(42, 48, 47, .38)',
  },
  dizzyEyes: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  eye: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(232, 239, 236, .9)',
    borderWidth: 1.5,
    borderColor: '#26322e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeFlip: { transform: [{ rotate: '9deg' }] },
  ringOuter: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2, borderColor: '#26322e', alignItems: 'center', justifyContent: 'center' },
  ringMiddle: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#26322e', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  ringInner: { width: 4, height: 4, borderRadius: 2, borderWidth: 1, borderColor: '#26322e', alignItems: 'center', justifyContent: 'center' },
  eyeDot: { width: 1.5, height: 1.5, borderRadius: 0.75, backgroundColor: '#26322e' },
  button: { position: 'absolute', right: 5, top: 5, backgroundColor: '#294b40', borderWidth: 1, borderColor: '#71d3b0', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  compactButton: { right: 2, top: 2, paddingHorizontal: 5, paddingVertical: 3 },
  buttonText: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5, color: '#eafff5' },
});
