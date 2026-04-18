import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { WebView } from 'react-native-webview';
import type { Stream, ChatMessage } from '@seewhy/core/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function WatchScreen({ route }: { route: { params: { streamId: string } } }) {
  const { streamId } = route.params;
  const [message, setMessage] = useState('');

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/streams/${streamId}`);
      return res.json() as Promise<Stream>;
    },
    refetchInterval: 15000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chat', streamId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/chat/${streamId}/messages?limit=50`);
      return res.json() as Promise<ChatMessage[]>;
    },
    refetchInterval: 3000,
  });

  const room = `seewhy-${streamId.slice(0, 8)}`;
  const vdoUrl = `https://vdo.ninja/?view=${streamId}&room=${room}&autoplay`;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WebView source={{ uri: vdoUrl }} style={styles.player} mediaPlaybackRequiresUserAction={false} />
      <View style={styles.info}>
        <Text style={styles.title}>{stream?.title ?? 'Loading...'}</Text>
        <Text style={styles.viewers}>{stream?.viewerCount ?? 0} watching</Text>
      </View>
      <FlatList
        data={messages ?? []}
        keyExtractor={(m) => m.id}
        style={styles.chat}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text style={styles.username}>{item.user?.displayName ?? item.user?.username ?? 'Aura'} </Text>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Chat..."
          placeholderTextColor="#444"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => { setMessage(''); refetchMessages(); }}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0806' },
  player: { aspectRatio: 16/9 },
  info: { padding: 12 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewers: { color: '#666', fontSize: 12, marginTop: 2 },
  chat: { flex: 1, paddingHorizontal: 12 },
  message: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 2 },
  username: { color: '#C8FF00', fontSize: 13, fontWeight: '700' },
  content: { color: '#ddd', fontSize: 13 },
  inputRow: { flexDirection: 'row', padding: 8, gap: 8 },
  input: { flex: 1, backgroundColor: '#161616', borderRadius: 8, padding: 10, color: '#fff', borderWidth: 1, borderColor: '#242424' },
  sendBtn: { backgroundColor: '#C8FF00', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#0C0806', fontWeight: '700' },
});
