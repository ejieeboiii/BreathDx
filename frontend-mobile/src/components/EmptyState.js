import { View, Text, StyleSheet } from 'react-native';

export default function EmptyState({ message, icon = '📭', variant = 'light' }) {
  const isLight = variant === 'light';
  return (
    <View style={[styles.box, isLight && styles.lightBox]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.text, isLight && styles.lightText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  lightBox: { backgroundColor: '#f5f8fc', borderColor: '#e1e9f1' },
  icon: { fontSize: 28, marginBottom: 8 },
  text: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  lightText: { color: '#617489' },
});
