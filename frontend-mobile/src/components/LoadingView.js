import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingView({ color = '#1d5fd0', variant = 'light' }) {
  const isLight = variant === 'light';
  return (
    <View style={[styles.wrap, isLight && styles.lightWrap]}>
      <ActivityIndicator size="large" color={color} />
      <Text style={[styles.text, isLight && styles.lightText]}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  lightWrap: { backgroundColor: '#f3f6fb' },
  text: { color: 'rgba(255,255,255,0.35)', marginTop: 12, fontSize: 14 },
  lightText: { color: '#667789' },
});
