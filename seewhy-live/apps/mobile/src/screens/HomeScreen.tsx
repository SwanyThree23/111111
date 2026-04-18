import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { Stream } from '@seewhy/core/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchStreams(): Promise<{ streams: Stream[] }> {
  const res = await fetch(`${API_URL}/api/streams?status=live&limit=20`);
  return res.json();
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['streams'],
    queryFn: fetchStreams,
    refetchInterval: 30000,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SEEWHY LIVE</Text>
      <FlatList
        data={data?.streams ?? []}
        keyExtractor={(s) => s.id}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#C8FF00" />}
        renderItem={({ item: stream }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('Watch', { streamId: stream.id })}
          >
            <View style={styles.thumbnail}>
              <Text style={styles.liveBadge}>● LIVE</Text>
            </View>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
            <Text style={styles.creatorName}>{stream.creator.displayName ?? stream.creator.username}</Text>
            <Text style={styles.viewers}>{stream.viewerCount.toLocaleString()} watching</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No live streams right now</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0806', padding: 8 },
  title: { fontSize: 28, color: '#C8FF00', fontWeight: '900', marginBottom: 12, letterSpacing: 2 },
  card: { flex: 1, margin: 4, backgroundColor: '#161616', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1E1E1E' },
  thumbnail: { aspectRatio: 16/9, backgroundColor: '#0f0f0f', justifyContent: 'flex-end', padding: 6 },
  liveBadge: { backgroundColor: '#FF3B3B', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  streamTitle: { color: '#fff', fontSize: 12, fontWeight: '600', padding: 8, paddingBottom: 2 },
  creatorName: { color: '#666', fontSize: 11, paddingHorizontal: 8 },
  viewers: { color: '#444', fontSize: 10, padding: 8, paddingTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#444', fontSize: 14 },
});
