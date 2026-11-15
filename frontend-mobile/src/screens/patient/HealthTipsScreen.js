import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getMyReadings, getMyLatestReading } from '../../utils/api';
import { computeTrend, getWellnessTips } from '../../utils/monitoring';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingView from '../../components/LoadingView';

const GENERAL_TIPS = [
  { category: 'Nutrition', title: 'Balanced meals', text: 'Include vegetables, lean protein, and whole grains.' },
  { category: 'Activity', title: 'Daily movement', text: 'Aim for at least 30 minutes of moderate activity most days.' },
  { category: 'Hydration', title: 'Water intake', text: 'Stay hydrated throughout the day.' },
];

export default function HealthTipsScreen() {
  const [personalTips, setPersonalTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyReadings().then((r) => r.data).catch(() => []),
      getMyLatestReading().then((r) => r.data).catch(() => null),
    ]).then(([readings, latest]) => {
      const trend = computeTrend(readings);
      const tips = latest
        ? getWellnessTips(latest.diabetes_level, trend.direction)
        : getWellnessTips('Normal', 'stable');
      setPersonalTips(tips);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView color="#1d5fd0" />;

  return (
    <ScrollView style={styles.container}>
      <ScreenHeader title="Health Tips" subtitle="Personalized wellness guidance" accent="#dceaff" showLogout={false} />

      <Text style={styles.section}>Recommended for you</Text>
      {personalTips.map((t) => (
        <View key={t.title} style={styles.card}>
          <Text style={styles.cardTitle}>{t.title}</Text>
          <Text style={styles.cardText}>{t.text}</Text>
        </View>
      ))}

      <Text style={[styles.section, { marginTop: 16 }]}>General wellness</Text>
      {GENERAL_TIPS.map((t) => (
        <View key={t.title} style={styles.card}>
          <Text style={styles.category}>{t.category}</Text>
          <Text style={styles.cardTitle}>{t.title}</Text>
          <Text style={styles.cardText}>{t.text}</Text>
        </View>
      ))}
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  section: { fontSize: 14, fontWeight: '700', color: '#1d5fd0', marginBottom: 10, paddingHorizontal: 16 },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e9f1',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  category: { fontSize: 10, color: '#5e7da6', textTransform: 'uppercase', fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#263b50', marginTop: 4 },
  cardText: { fontSize: 12, color: '#65778a', marginTop: 6, lineHeight: 18 },
});
