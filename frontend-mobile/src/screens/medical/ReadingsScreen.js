import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getAllReadings, getPatients, deleteReading } from '../../utils/api';
import LevelBadge from '../../components/LevelBadge';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';

export default function ReadingsScreen() {
  const route = useRoute();
  const [readings, setReadings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(
    route.params?.patientId ? String(route.params.patientId) : 'all'
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([getAllReadings(), getPatients()]);
      setReadings(r.data);
      setPatients(p.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (route.params?.patientId) {
      setSelected(String(route.params.patientId));
    }
  }, [route.params?.patientId]);

  const filtered = selected === 'all' ? readings : readings.filter((r) => r.patient_id === parseInt(selected, 10));
  const patientName = (id) => patients.find((p) => p.id === id)?.full_name || `#${id}`;

  const remove = (id) => {
    Alert.alert('Delete Reading', 'Are you sure you want to delete this reading?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteReading(id); load(); } },
    ]);
  };

  if (loading) return <LoadingView />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d5fd0" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Readings</Text>
        <Text style={styles.sub}>{filtered.length} in view</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, selected === 'all' && styles.filterBtnActive]}
          onPress={() => setSelected('all')}
        >
          <Text style={[styles.filterText, selected === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {patients.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.filterBtn, selected === String(p.id) && styles.filterBtnActive]}
            onPress={() => setSelected(String(p.id))}
          >
            <Text style={[styles.filterText, selected === String(p.id) && styles.filterTextActive]}>{p.full_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState message="No readings found for this filter." />
        ) : (
          filtered.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.ppm}>{r.acetone_ppm} ppm</Text>
                  <LevelBadge level={r.diabetes_level} small />
                </View>
                {(r.estimated_glucose_mg_dl ?? r.predicted_bgl) != null && (
                  <Text style={styles.glucose}>
                    Est. glucose: {r.estimated_glucose_mg_dl ?? r.predicted_bgl} mg/dL
                    {r.glucose_level && <Text style={styles.glucoseLevel}> ({r.glucose_level})</Text>}
                  </Text>
                )}
                <Text style={styles.patient}>{patientName(r.patient_id)}</Text>
                <Text style={styles.meta}>
                  {r.temperature}°C · {r.humidity}% · {new Date(r.taken_at).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(r.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 116 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 28, backgroundColor: '#1556ad', borderBottomLeftRadius: 38, borderBottomRightRadius: 22, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 5 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe7ef' },
  filterBtnActive: { backgroundColor: '#1d5fd0', borderColor: '#1d5fd0' },
  filterText: { color: '#65778a', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e1e9f1' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ppm: { color: '#1e293b', fontWeight: '700', fontSize: 16 },
  glucose: { color: '#1d5fd0', fontSize: 12, marginBottom: 4 },
  glucoseLevel: { fontSize: 10, color: '#718196' },
  patient: { color: '#526477', fontSize: 12, marginBottom: 4 },
  meta: { color: '#718196', fontSize: 11 },
  deleteBtn: { padding: 6 },
  deleteIcon: { fontSize: 15 },
});
