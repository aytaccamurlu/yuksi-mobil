import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

function ViewerImage({ uri, onZoom }: { uri: string; onZoom: (z: boolean) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const zoomed = useRef(false);
  const lastTap = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      zoomed.current = !zoomed.current;
      onZoom(zoomed.current);
      Animated.spring(scale, {
        toValue: zoomed.current ? 2.4 : 1,
        friction: 7,
        useNativeDriver: true,
      }).start();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Pressable style={s.page} onPress={handleTap}>
      <Animated.Image
        source={{ uri }}
        style={[s.image, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </Pressable>
  );
}

export default function ChatImageViewer({
  images,
  startIndex = 0,
  visible,
  name,
  onClose,
  onReply,
}: {
  images: string[];
  startIndex?: number;
  visible: boolean;
  name?: string;
  onClose: () => void;
  onReply?: (uri: string) => void;
}) {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setZoomed(false);
    }
  }, [visible, startIndex]);

  const current = images[index];

  const share = async () => {
    try {
      await Share.share({ message: current, url: current });
    } catch {
      // yoksay
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        {visible && (
          <FlatList
            ref={listRef}
            data={images}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_d, i) => ({ length: W, offset: W * i, index: i })}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
            renderItem={({ item }) => <ViewerImage uri={item} onZoom={setZoomed} />}
          />
        )}

        <SafeAreaView style={s.topBar} edges={['top']} pointerEvents="box-none">
          <Tappable onPress={onClose} hitSlop={10} style={s.iconBtn}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </Tappable>
          <Text style={s.counter}>
            {name ? `${name} · ` : ''}
            {images.length > 1 ? `${index + 1} / ${images.length}` : ''}
          </Text>
          <View style={s.iconBtn} />
        </SafeAreaView>

        <SafeAreaView style={s.bottomBar} edges={['bottom']} pointerEvents="box-none">
          <Tappable style={s.action} onPress={share} activeOpacity={0.8}>
            <Feather name="share-2" size={20} color="#FFFFFF" />
            <Text style={s.actionText}>Paylaş</Text>
          </Tappable>
          {onReply && (
            <Tappable
              style={s.action}
              onPress={() => {
                onReply(current);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Feather name="corner-up-left" size={20} color="#FFFFFF" />
              <Text style={s.actionText}>Yanıtla</Text>
            </Tappable>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000' },
  page: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  image: { width: W, height: H * 0.78 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  counter: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  action: { alignItems: 'center', gap: 4, paddingHorizontal: 24, paddingVertical: 6 },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
