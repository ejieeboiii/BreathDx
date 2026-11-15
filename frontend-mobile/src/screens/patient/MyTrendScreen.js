import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { getMyReadings } from '../../utils/api';
import { computeTrend, filterByDays, toChartData } from '../../utils/monitoring';
import ScreenHeader from '../../components/ScreenHeader';
import MiniBarChart from '../../components/MiniBarChart';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';

export default function MyTrendScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = () => getMyReadings()
    .then((r) => setReadings(r.data))
    .catch(() => setReadings([]))
    .finally(() => { setLoading(false); setRefreshing(false); });

  useEffect(() => { load(); }, []);

  const trend = computeTrend(readings);
  const ranged = filterByDays(readings, 30);
  const chartData = toChartData(ranged, 14);
  const sorted = [...readings].sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));

  if (loading) return <LoadingView color="#1d5fd0" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d5fd0" />}
    >
      <ScreenHeader title="My Trend" subtitle="Track how your acetone readings change" accent="#dceaff" showLogout={false} />

      <View style={styles.card}>
        <Text style={styles.label}>Trend summary</Text>
        <Text style={styles.trend}>{trend.label}</Text>
        <Text style={styles.meta}>{readings.length} total readings</Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 30 days</Text>
        <MiniBarChart data={chartData} height={150} />
      </View>

      {sorted.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState message="No trend data yet." />
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.listTitle}>History</Text>
          {sorted.slice(0, 20).map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.date}>{new Date(r.taken_at).toLocaleString()}</Text>
              <Text style={styles.ppm}>{r.acetone_ppm} ppm</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e9f1',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 11, color: '#718196', textTransform: 'uppercase', fontWeight: '600' },
  trend: { fontSize: 20, fontWeight: 'bold', color: '#1d5fd0', marginTop: 8 },
  meta: { fontSize: 12, color: '#718196', marginTop: 6 },
  chartCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e9f1',
    marginBottom: 16,
  },
  chartTitle: { color: '#263b50', fontWeight: '600', fontSize: 13, marginBottom: 12 },
  pad: { paddingHorizontal: 16 },
  list: { paddingHorizontal: 16 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#263b50', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e9f1',
  },
  date: { color: '#718196', fontSize: 12, flex: 1 },
  ppm: { color: '#263b50', fontWeight: '600', fontSize: 13 },
});
