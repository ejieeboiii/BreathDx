import { View, Text, StyleSheet } from 'react-native';
import { statPresets } from '../theme/colors';

export default function StatCard({ label, value, preset = 'blue', variant = 'light' }) {
  const s = statPresets[preset] || statPresets.blue;
  const isLight = variant === 'light';
  const valueColor = s.color;
  return (
    <View style={[styles.card, isLight && styles.lightCard, { backgroundColor: isLight ? '#fff' : s.bg }]}>
      <Text style={[styles.label, isLight && styles.lightLabel]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '47%', borderRadius: 16, padding: 16, marginBottom: 10 },
  lightCard: {
    borderWidth: 1,
    borderColor: '#e1e9f1',
    borderRadius: 20,
    shadowColor: '#18334e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  lightLabel: { fontSize: 12, color: '#64768a', textTransform: 'none', letterSpacing: 0 },
  value: { fontSize: 28, fontWeight: 'bold', marginTop: 6 },
});
