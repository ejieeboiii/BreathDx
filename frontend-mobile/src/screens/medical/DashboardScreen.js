import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RECENT_PREVIEW = 5;
import { getPatients, getAllReadings } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getProviderAlerts } from '../../utils/monitoring';
import ScreenHeader from '../../components/ScreenHeader';
import StatCard from '../../components/StatCard';
import LevelBadge from '../../components/LevelBadge';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const load = async () => {
    try {
      const [p, r] = await Promise.all([getPatients(), getAllReadings()]);
      setPatients(p.data);
      setReadings(r.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingView />;

  const stats = {
    total: patients.length,
    normal: readings.filter((r) => r.diabetes_level === 'Normal').length,
    preDiabetic: readings.filter((r) => r.diabetes_level === 'Pre-Diabetic').length,
    diabetic: readings.filter((r) => r.diabetes_level === 'Diabetic').length,
  };

  const alerts = getProviderAlerts(patients, readings);
  const displayedRecent = showAllRecent ? readings : readings.slice(0, RECENT_PREVIEW);
  const hasMoreRecent = readings.length > RECENT_PREVIEW;
  const patientName = (id) => patients.find((p) => p.id === id)?.full_name || `Patient #${id}`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d5fd0" />
      }
    >
      <ScreenHeader
        title={`Good day, ${user?.full_name?.split(' ')[0] || 'Provider'} 👋`}
        subtitle="Healthcare provider monitoring overview"
        showLogout
      />

      <View style={styles.statsRow}>
        <StatCard label="Total patients" value={stats.total} preset="blue" />
        <StatCard label="Normal band" value={stats.normal} preset="green" />
        <StatCard label="Elevated band" value={stats.preDiabetic} preset="yellow" />
        <StatCard label="High band" value={stats.diabetic} preset="red" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patients needing review</Text>
        <Text style={styles.sectionSub}>Trends, missed scans, and latest bands</Text>
        {alerts.length === 0 ? (
          <EmptyState message="No alerts right now. All patients look stable." icon="✓" />
        ) : (
          alerts.map((alert, i) => (
            <View key={`${alert.patientId}-${i}`} style={styles.alertCard}>
              <Text style={styles.alertName}>{alert.patientName}</Text>
              <Text style={styles.alertMsg}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent readings</Text>
          {readings.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Readings')}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          )}
        </View>
        {readings.length === 0 ? (
          <EmptyState message="No readings yet. Start a live scan!" icon="⚡" />
        ) : (
          <>
            {displayedRecent.map((r) => (
              <View key={r.id} style={styles.readingCard}>
                <View style={styles.readingLeft}>
                  <Text style={styles.readingPpm}>{r.acetone_ppm} ppm</Text>
                  {(r.estimated_glucose_mg_dl ?? r.predicted_bgl) != null && (
                    <Text style={styles.readingGlucose}>
                      Est. glucose: {r.estimated_glucose_mg_dl ?? r.predicted_bgl} mg/dL
                      {r.glucose_level && <Text style={styles.readingGlucoseLevel}> ({r.glucose_level})</Text>}
                    </Text>
                  )}
                  <Text style={styles.readingMeta}>
                    {patientName(r.patient_id)} · {r.temperature}°C · {r.humidity}%
                  </Text>
                  <Text style={styles.readingDate}>{new Date(r.taken_at).toLocaleString()}</Text>
                </View>
                <LevelBadge level={r.diabetes_level} small />
              </View>
            ))}
            {hasMoreRecent && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllRecent((v) => !v)}
              >
                <Text style={styles.seeMoreText}>
                  {showAllRecent
                    ? 'Show less'
                    : `See more (${readings.length - RECENT_PREVIEW} more)`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  greetingWrap: { paddingHorizontal: 20, marginBottom: 8 },
  greeting: { fontSize: 18, fontWeight: '700', color: '#fff' },
  greetingSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  viewAllLink: { color: '#1d5fd0', fontSize: 12, fontWeight: '600' },
  seeMoreBtn: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#eef4fc',
    borderWidth: 1,
    borderColor: '#dce8f6',
  },
  seeMoreText: { color: '#1d5fd0', fontSize: 13, fontWeight: '600' },
  sectionSub: { fontSize: 11, color: '#718196', marginTop: 2, marginBottom: 12 },
  alertCard: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#f2dfad',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  alertName: { color: '#3e4651', fontWeight: '600', fontSize: 14 },
  alertMsg: { color: '#776b4d', fontSize: 12, marginTop: 4 },
  readingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e9f1',
  },
  readingLeft: { flex: 1, paddingRight: 12 },
  readingPpm: { color: '#1e293b', fontWeight: '700', fontSize: 16 },
  readingGlucose: { color: '#1d5fd0', fontSize: 12, marginTop: 4 },
  readingGlucoseLevel: { fontSize: 10, color: '#718196' },
  readingMeta: { color: '#64768a', fontSize: 11, marginTop: 4 },
  readingDate: { color: '#8190a0', fontSize: 10, marginTop: 2 },
});
