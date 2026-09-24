import Avatar from '@/components/Avatar';
import ComplaintStatusBadge from '@/components/ComplaintStatus';
import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';
import { useGetComplaintsQuery } from '@/service/complaints.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');

export default function ComplaintsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetComplaintsQuery(undefined, { pollingInterval: FOREGROUND_POLL_INTERVAL_MS });

  const complaints: any[] = data?.data || data || [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Tappable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={26} color="#FF5B04" />
        </Tappable>
        <Text style={s.headerTitle}>Şikayetlerim</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color="#FF5B04" />
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Tappable
              style={s.row}
              activeOpacity={0.7}
              onPress={() => router.push(`/complaint/${item.id}`)}
            >
              <Avatar name={item.targetName} uri={item.targetAvatar} size={44} ring="#FF5B04" />
              <View style={s.body}>
                <View style={s.topLine}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.targetName}
                  </Text>
                  <Text style={s.date}>{shortDate(item.createdAt)}</Text>
                </View>
                <Text style={s.reason} numberOfLines={1}>
                  {item.reason}
                </Text>
                <View style={s.bottomLine}>
                  <ComplaintStatusBadge status={item.status} />
                  <Text style={s.lastUpdate} numberOfLines={1}>
                    {item.lastUpdate?.text}
                  </Text>
                </View>
              </View>
            </Tappable>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="flag" size={28} color="#D1D5DB" />
              <Text style={s.emptyText}>Henüz şikayet oluşturmadın.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  body: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  date: { fontSize: 11, color: '#9CA3AF' },
  reason: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  lastUpdate: { fontSize: 11, color: '#9CA3AF', flex: 1 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
});
