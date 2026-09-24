import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Meta = { label: string; color: string; bg: string };

export const COMPLAINT_STATUS: Record<string, Meta> = {
  received: { label: 'Alındı', color: '#6B7280', bg: '#F3F4F6' },
  in_review: { label: 'İnceleniyor', color: '#B45309', bg: '#FEF3C7' },
  responded: { label: 'Yanıtlandı', color: '#1D4ED8', bg: '#DBEAFE' },
  resolved: { label: 'Çözüldü', color: '#15803D', bg: '#DCFCE7' },
};

// Backend durumu Türkçe etiketle dönüyor (örn. "İnceleniyor"), mock ise iç
// anahtarla ("in_review") — ikisini de kabul ediyoruz.
const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(COMPLAINT_STATUS).map(([key, meta]) => [meta.label.toLocaleLowerCase('tr'), key]),
);

export const statusMeta = (status: string): Meta => {
  if (COMPLAINT_STATUS[status]) return COMPLAINT_STATUS[status];
  const key = LABEL_TO_KEY[String(status || '').toLocaleLowerCase('tr')];
  return (key && COMPLAINT_STATUS[key]) || COMPLAINT_STATUS.received;
};

export default function ComplaintStatusBadge({
  status,
  large,
}: {
  status: string;
  large?: boolean;
}) {
  const m = statusMeta(status);
  return (
    <View style={[s.pill, { backgroundColor: m.bg }, large && s.pillLarge]}>
      <View style={[s.dot, { backgroundColor: m.color }]} />
      <Text style={[s.text, { color: m.color }, large && s.textLarge]}>{m.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pillLarge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700' },
  textLarge: { fontSize: 14 },
});
