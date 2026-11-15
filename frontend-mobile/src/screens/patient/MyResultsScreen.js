import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { getMyReadings } from '../../utils/api';
import ScreenHeader from '../../components/ScreenHeader';
import LevelBadge from '../../components/LevelBadge';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';

export default function MyResultsScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => getMyReadings()
    .then((r) => setReadings(r.data))
    .catch(() => setReadings([]))
    .finally(() => { setLoading(false); setRefreshing(false); });

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingView color="#1d5fd0" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d5fd0" />}
    >
      <ScreenHeader title="My Results" subtitle={`${readings.length} recorded scans`} accent="#dceaff" showLogout={false} />

      {readings.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState message="No results yet. Your provider will record scans during visits." />
        </View>
      ) : (
        readings.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.ppm}>{r.acetone_ppm} ppm</Text>
              <LevelBadge level={r.diabetes_level} small />
            </View>
            {(r.estimated_glucose_mg_dl ?? r.predicted_bgl) != null && (
              <Text style={styles.glucose}>
                Est. glucose: {r.estimated_glucose_mg_dl ?? r.predicted_bgl} mg/dL
                {r.glucose_level && <Text style={styles.glucoseLevel}> ({r.glucose_level})</Text>}
              </Text>
            )}
            <Text style={styles.meta}>{r.temperature}°C · {r.humidity}% · {new Date(r.taken_at).toLocaleString()}</Text>
            {(r.suggestion || r.advice) ? (
              <Text style={styles.suggestion}>{r.suggestion || r.advice}</Text>
            ) : null}
          </View>
        ))
      )}
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  pad: { paddingHorizontal: 16 },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e9f1',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#18334e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ppm: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  glucose: { fontSize: 13, color: '#1d5fd0', marginTop: 6 },
  glucoseLevel: { fontSize: 11, color: '#718196' },
  meta: { fontSize: 11, color: '#718196', marginTop: 8 },
  suggestion: { fontSize: 12, color: '#526477', marginTop: 10, lineHeight: 18 },
});
