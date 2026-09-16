import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getScientistStyleMoveHints, getScientistStyleLabel } from '../data/scientistAnalysis';

const PHRASES = [
  [1, 'Total preparation'],
  [2, 'Slow and steady'],
  [3, 'One of endurance'],
  [4, 'High risk, high return'],
  [5, 'Weakening the foe to start'],
  [6, 'Impossible to predict'],
  [7, "Depend on the battle's flow"],
  [8, 'Flexibly adaptable to the situation'],
];

export default function ScientistClueReference({ value, onChange }) {
  const [showMoves, setShowMoves] = useState(false);
  const style = Number(value) || 0;
  const moves = getScientistStyleMoveHints(style);

  return (
    <View>
      <Text style={{ color: '#9eabb9', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>SCIENTIST BATTLE STYLE</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PHRASES.map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => { onChange?.(id); setShowMoves(false); }}
            activeOpacity={0.8}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: style === id ? '#8dd3ff' : '#2a3542',
              backgroundColor: style === id ? '#203746' : '#111821',
            }}
          >
            <Text style={{ color: style === id ? '#f7fafc' : '#aab7c5', fontSize: 13, fontWeight: '700' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {style > 0 && (
        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#2a3542', backgroundColor: '#111821', padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: '#f7fafc', fontSize: 14, fontWeight: '800' }}>{getScientistStyleLabel(style)}</Text>
              <Text style={{ color: '#7f8c9b', fontSize: 12, marginTop: 3 }}>Style {style} • used by the Factory clue logic</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowMoves((open) => !open)}
              activeOpacity={0.8}
              style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#8dd3ff', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#8dd3ff', fontSize: 16, fontWeight: '900' }}>!</Text>
            </TouchableOpacity>
          </View>

          {showMoves && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#273240' }}>
              <Text style={{ color: '#8dd3ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 }}>MOVE REFERENCE</Text>
              <Text style={{ color: '#d8e0e8', fontSize: 13, lineHeight: 19 }}>
                {moves.length ? moves.join(' • ') : 'No move markers are associated with this clue.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
