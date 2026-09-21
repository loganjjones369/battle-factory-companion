import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const shortName = (pokemon) => String(pokemon?.species || pokemon?.name || '?').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || '?';

export default function Sprite({ p, pokemon, size = 48 }) {
  p = p || pokemon;
  const radius = Math.max(8, Math.round(size * 0.2));
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }]} accessibilityLabel={String(p?.species || p?.name || 'Pokemon')}>
      <Text style={[styles.text, { fontSize: Math.max(9, Math.round(size * 0.22)) }]}>{shortName(p)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#142a24', borderWidth: 1, borderColor: '#355148' },
  text: { color: '#dcefe8', fontWeight: '900', letterSpacing: 0.5 },
});
