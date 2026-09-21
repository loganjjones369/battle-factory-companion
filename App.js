import React from 'react';
import { StyleSheet, View } from 'react-native';
import RunFlowV3 from './RunFlowV3';

export default function App() {
  return <View style={styles.app}>
    <RunFlowV3 />
  </View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#071018' },
});
