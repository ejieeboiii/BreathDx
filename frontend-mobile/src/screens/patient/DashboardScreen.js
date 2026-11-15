import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RECENT_PREVIEW = 5;
import { getMyReadings, getMyLatestReading } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { computeSevenDayAvg, computeTrend, getWellnessTips } from '../../utils/monitoring';
import ScreenHeader from '../../components/ScreenHeader';
import LevelBadge from '../../components/LevelBadge';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';

export default function PatientDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const load = async () => {
    try {
      const [all, last] = await Promise.all([
        getMyReadings().then((r) => r.data).catch(() => []),
        getMyLatestReading().then((r) => r.data).catch(() => null),
      ]);
      setReadings(all);
      setLatest(last);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const trend = computeTrend(readings);
  const weekAvg = computeSevenDayAvg(readings);
  const tips = latest ? getWellnessTips(latest.diabetes_level, trend.direction) : [];
  const displayedRecent = showAllRecent ? readings : readings.slice(0, RECENT_PREVIEW);
  const hasMoreRecent = readings.length > RECENT_PREVIEW;

  if (loading) return <LoadingView color="#1d5fd0" variant="light" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d5fd0" />}
    >
      <ScreenHeader
        title={`Good day, ${user?.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Your personal health monitoring overview"
        accent="#dceaff"
        headerStyle={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        userStyle={styles.headerUser}
        logoutStyle={styles.headerLogout}
        logoutTextStyle={styles.headerLogoutText}
        logoutColor="#fff"
      />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Latest reading</Text>
        {latest ? (
          <>
            <View style={styles.monitoringRow}>
              <View style={styles.statusIcon}><Text style={styles.statusIconText}>•</Text></View>
              <View style={styles.monitoringCopy}>
                <Text style={styles.monitoringLabel}>Monitoring status</Text>
                <LevelBadge level={latest.diabetes_level} small />
              </View>
            </View>

            <View style={styles.glucosePanel}>
              <Text style={styles.glucoseLabel}>Experimental glucose estimate</Text>
              <Text style={styles.glucoseValue}>
                {(latest.estimated_glucose_mg_dl ?? latest.predicted_bgl) != null
                  ? `${latest.estimated_glucose_mg_dl ?? latest.predicted_bgl} mg/dL`
                  : 'Unavailable'}
              </Text>
              {latest.glucose_level && (latest.estimated_glucose_mg_dl ?? latest.predicted_bgl) != null ? (
                <Text style={styles.glucoseText}>{latest.glucose_level}</Text>
              ) : null}
              <Text style={styles.glucoseDisclaimer}>For monitoring only; not a diagnosis.</Text>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <View style={[styles.metricIcon, styles.acetoneIcon]}><Text style={styles.acetoneIconText}>◌</Text></View>
                <View style={styles.metricCopy}>
                  <Text style={styles.metricLabel}>Acetone-related concentration</Text>
                  <Text style={styles.metricValue}>{latest.acetone_ppm} ppm</Text>
                </View>
              </View>
              <View style={styles.metric}>
                <View style={[styles.metricIcon, styles.temperatureIcon]}><Text style={styles.temperatureIconText}>°</Text></View>
                <View style={styles.metricCopy}>
                  <Text style={styles.metricLabel}>Temperature</Text>
                  <Text style={styles.metricValue}>{latest.temperature ?? 'Unavailable'}{latest.temperature != null ? '°C' : ''}</Text>
                </View>
              </View>
              <View style={styles.metric}>
                <View style={[styles.metricIcon, styles.humidityIcon]}><Text style={styles.humidityIconText}>⌁</Text></View>
                <View style={styles.metricCopy}>
                  <Text style={styles.metricLabel}>Humidity</Text>
                  <Text style={styles.metricValue}>{latest.humidity ?? 'Unavailable'}{latest.humidity != null ? '%' : ''}</Text>
                </View>
              </View>
            </View>

            <View style={styles.dateFooter}>
              <Text style={styles.dateLabel}>Last checked</Text>
              <Text style={styles.heroDate}>{new Date(latest.taken_at).toLocaleString()}</Text>
            </View>
          </>
        ) : (
          <EmptyState message="No readings yet. Ask your provider to run a breath scan." icon="🫁" variant="light" />
        )}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="7-day avg" value={weekAvg ?? '—'} preset="green" variant="light" />
        <StatCard label="Total scans" value={readings.length} preset="blue" variant="light" />
      </View>

      <View style={styles.trendCard}>
        <Text style={styles.cardLabel}>Trend</Text>
        <Text style={styles.trendText}>{trend.label}</Text>
      </View>

      {tips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wellness suggestions</Text>
          {tips.map((t) => (
            <View key={t.title} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipText}>{t.text}</Text>
            </View>
          ))}
        </View>
      )}

      {readings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent scans</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Results')}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {displayedRecent.map((r) => (
            <View key={r.id} style={styles.row}>
              <View>
                <Text style={styles.rowPpm}>{r.acetone_ppm} ppm</Text>
                <Text style={styles.rowDate}>{new Date(r.taken_at).toLocaleDateString()}</Text>
              </View>
              <LevelBadge level={r.diabetes_level} small />
            </View>
          ))}
          {hasMoreRecent && (
            <TouchableOpacity style={styles.seeMoreBtn} onPress={() => setShowAllRecent((v) => !v)}>
              <Text style={styles.seeMoreText}>
                {showAllRecent
                  ? 'Show less'
                  : `See more (${readings.length - RECENT_PREVIEW} more)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  header: {
    backgroundColor: '#1556ad',
    paddingTop: 56,
    paddingBottom: 28,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 22,
  },
  headerTitle: { fontSize: 22, color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 8 },
  headerUser: { fontSize: 12, color: '#dceaff', marginTop: 10 },
  headerLogout: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 88,
    marginTop: 6,
  },
  headerLogoutText: { color: '#fff', fontSize: 13 },
  hero: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e1e9f1',
    marginTop: 16,
    marginBottom: 14,
    shadowColor: '#18334e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  heroLabel: { fontSize: 18, color: '#1e293b', fontWeight: '700' },
  monitoringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  statusIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#eff4f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statusIconText: { fontSize: 24, lineHeight: 28, color: '#60758a' },
  monitoringCopy: { flex: 1 },
  monitoringLabel: { fontSize: 13, color: '#667789', fontWeight: '600', marginBottom: 5 },
  glucosePanel: { backgroundColor: '#f1f5fb', borderRadius: 20, padding: 18, marginTop: 18 },
  glucoseLabel: { fontSize: 13, color: '#607184', fontWeight: '600' },
  glucoseValue: { fontSize: 29, fontWeight: '700', color: '#17283a', marginTop: 8 },
  glucoseText: { fontSize: 12, color: '#425c76', marginTop: 4 },
  glucoseDisclaimer: { fontSize: 12, color: '#68798a', marginTop: 8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e5ebf1', paddingBottom: 8, marginTop: 18 },
  metric: { width: '48%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metricIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  acetoneIcon: { backgroundColor: '#eef8fb' },
  temperatureIcon: { backgroundColor: '#fff9e8' },
  humidityIcon: { backgroundColor: '#eff5fd' },
  acetoneIconText: { color: '#4c91a5', fontSize: 20 },
  temperatureIconText: { color: '#a27a23', fontSize: 20, fontWeight: '700' },
  humidityIconText: { color: '#3376ad', fontSize: 21, fontWeight: '700' },
  metricCopy: { flex: 1 },
  metricLabel: { fontSize: 10, color: '#758496', lineHeight: 14 },
  metricValue: { fontSize: 14, color: '#17283a', fontWeight: '700', marginTop: 3 },
  dateFooter: { borderTopWidth: 1, borderTopColor: '#e5ebf1', marginTop: 8, paddingTop: 14 },
  dateLabel: { fontSize: 11, fontWeight: '600', color: '#758496' },
  heroDate: { fontSize: 12, color: '#526477', marginTop: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  trendCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e9f1',
  },
  cardLabel: { fontSize: 12, color: '#697b8e', fontWeight: '600' },
  trendText: { fontSize: 18, fontWeight: '700', color: '#1d5fd0', marginTop: 6 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  viewAllLink: { color: '#1d5fd0', fontSize: 12, fontWeight: '600' },
  seeMoreBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#eef4fc',
    borderWidth: 1,
    borderColor: '#dce8f6',
  },
  seeMoreText: { color: '#1d5fd0', fontSize: 13, fontWeight: '600' },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e9f1',
  },
  tipTitle: { color: '#1d5fd0', fontWeight: '600', fontSize: 13 },
  tipText: { color: '#65778a', fontSize: 12, marginTop: 4, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5',
  },
  rowPpm: { color: '#1e293b', fontWeight: '600', fontSize: 15 },
  rowDate: { color: '#738296', fontSize: 11, marginTop: 2 },
});
