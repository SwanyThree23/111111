import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function DashboardScreen() {
  const { data: dash, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/analytics/dashboard`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/analytics/earnings?period=month`, { credentials: 'include' });
      return res.json();
    },
  });

  const STATS = [
    { label: 'Total Streams', value: dash?.totalStreams ?? 0, color: '#C8FF00' },
    { label: 'Live Now', value: dash?.liveStreams ?? 0, color: '#FF3B3B' },
    { label: 'Earnings (90%)', value: `$${(dash?.totalEarnings ?? 0).toFixed(2)}`, color: '#D4AF37' },
    { label: 'Messages', value: (dash?.totalMessages ?? 0).toLocaleString(), color: '#A855F7' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#C8FF00" />}>
      <Text style={styles.title}>DASHBOARD</Text>
      <View style={styles.statsGrid}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EARNINGS THIS MONTH</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Gross</Text>
            <Text style={styles.earningsValue}>${(earnings?.totals?.gross ?? 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.earningsItem, styles.earningsHighlight]}>
            <Text style={[styles.earningsLabel, { color: '#C8FF00' }]}>Yours (90%)</Text>
            <Text style={[styles.earningsValue, { color: '#C8FF00' }]}>${(earnings?.totals?.creator ?? 0).toFixed(2)}</Text>
          </View>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Platform (10%)</Text>
            <Text style={styles.earningsValue}>${(earnings?.totals?.platform ?? 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0806', padding: 16 },
  title: { fontSize: 32, color: '#fff', fontWeight: '900', letterSpacing: 2, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
  statLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '900' },
  section: { backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  earningsRow: { flexDirection: 'row', gap: 8 },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsHighlight: { backgroundColor: '#C8FF00/10' },
  earningsLabel: { color: '#666', fontSize: 10, marginBottom: 4 },
  earningsValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
