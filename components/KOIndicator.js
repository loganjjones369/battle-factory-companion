import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export default function KOIndicator({ knockedOut = false, onToggle, compact = false }) {
  const fade = useRef(new Animated.Value(knockedOut ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(knockedOut ? 1 : 0.75)).current;
  const drop = useRef(new Animated.Value(knockedOut ? 0 : -8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: knockedOut ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: knockedOut ? 1 : 0.75,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(drop, {
        toValue: knockedOut ? 0 : -8,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }, [knockedOut, fade, scale, drop]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {knockedOut && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            compact && styles.compactOverlay,
            { opacity: fade, transform: [{ translateY: drop }, { scale }] },
          ]}
        >
          <View style={styles.dizzyEyes}>
            <View style={styles.eye}>
              <Text style={styles.spiral}>@</Text>
            </View>
            <View style={styles.eye}>
              <Text style={[styles.spiral, styles.spiralFlipped]}>@</Text>
            </View>
          </View>
        </Animated.View>
      )}
      {onToggle && (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          style={[styles.button, compact && styles.compactButton]}
        >
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
  dizzyEyes: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  eye: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(232, 239, 236, .82)',
    borderWidth: 1.5,
    borderColor: '#26322e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spiral: {
    color: '#26322e',
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    transform: [{ rotate: '-12deg' }],
  },
  spiralFlipped: {
    transform: [{ rotate: '12deg' }],
  },
  button: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: '#294b40',
    borderWidth: 1,
    borderColor: '#71d3b0',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  compactButton: {
    right: 2,
    top: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  buttonText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#eafff5',
  },
});
