import { PasswordContext, passwordRules } from '@/utils/validation';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PasswordChecklist({
  value,
  context,
  style,
}: {
  value: string;
  context?: PasswordContext;
  style?: object;
}) {
  if (!value) return null;
  const rules = passwordRules(value, context);

  return (
    <View style={[s.wrap, style]}>
      {rules.map((r) => (
        <View key={r.key} style={s.row}>
          <Feather
            name={r.ok ? 'check-circle' : 'circle'}
            size={13}
            color={r.ok ? '#16A34A' : '#B6BAC3'}
          />
          <Text style={[s.text, r.ok && s.textOk]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 8,
    gap: 5,
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    padding: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  text: { fontSize: 12, color: '#6B7280' },
  textOk: { color: '#16A34A' },
});
