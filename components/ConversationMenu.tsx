import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const { width: W, height: H } = Dimensions.get('window');

export type ConversationMenuAction =
  | 'location'
  | 'media'
  | 'mute'
  | 'block'
  | 'delete'
  | 'report';

type MenuState = { blocked?: boolean; muted?: boolean };

type Item = {
  action: ConversationMenuAction;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  danger?: boolean;
};

const buildItems = (state: MenuState): Item[] => [
  { action: 'location', label: 'Konum görüntüle', icon: 'map-pin' },
  { action: 'media', label: 'Medya ve bağlantılar', icon: 'image' },
  {
    action: 'mute',
    label: state.muted ? 'Bildirimleri aç' : 'Bildirimleri sessize al',
    icon: state.muted ? 'bell' : 'bell-off',
  },
  {
    action: 'block',
    label: state.blocked ? 'Engeli kaldır' : 'Kişiyi engelle',
    icon: state.blocked ? 'check-circle' : 'slash',
  },
  { action: 'delete', label: 'Sohbeti sil', icon: 'trash-2', danger: true },
  { action: 'report', label: 'Şikayet et', icon: 'flag', danger: true },
];

const CARD_W = 236;
const CARD_H = 312;

export default function ConversationMenu({
  visible,
  anchor,
  state,
  onClose,
  onSelect,
}: {
  visible: boolean;
  anchor?: { x: number; y: number } | null;
  state?: MenuState;
  onClose: () => void;
  onSelect: (action: ConversationMenuAction) => void;
}) {
  const items = buildItems(state || {});

  const x = anchor?.x ?? W - 16;
  const y = anchor?.y ?? 80;

  const left = Math.min(Math.max(x - CARD_W + 24, 8), W - CARD_W - 8);
  const top = Math.min(Math.max(y, 8), H - CARD_H - 8);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={[s.card, { left, top }]}>
          {items.map((item) => (
            <Tappable
              key={item.action}
              style={s.item}
              haptic={item.danger ? 'warning' : 'none'}
              onPress={() => {
                onClose();
                onSelect(item.action);
              }}
            >
              <Feather
                name={item.icon}
                size={16}
                color={item.danger ? '#DC2626' : '#4B5563'}
              />
              <Text style={[s.label, item.danger && s.labelDanger]}>{item.label}</Text>
            </Tappable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  card: {
    position: 'absolute',
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  labelDanger: { color: '#DC2626' },
});
