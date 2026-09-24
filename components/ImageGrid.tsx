import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import RemoteImage from '@/components/RemoteImage';
import { useGuardedPress } from '@/hooks/useGuardedPress';

const { width: SCREEN_W } = Dimensions.get('window');
export const GRID_W = Math.min(262, SCREEN_W * 0.66);
export const GRID_GAP = 3;

function Cell({
  uri,
  w,
  h,
  onPress,
}: {
  uri: string;
  w: number;
  h: number;
  onPress: () => void;
}) {
  const guardedPress = useGuardedPress(onPress);
  return (
    <Pressable onPress={guardedPress}>
      <RemoteImage uri={uri} style={{ width: w, height: h }} resizeMode="cover" />
    </Pressable>
  );
}

const MIN_RATIO = 0.6; // çok yatay (panoramik) resimlerde aşırı kısalmayı önler
const MAX_RATIO = 1.6; // çok dikey resimlerde aşırı uzamayı önler
const DEFAULT_RATIO = 0.7;

function SingleCell({ uri, w, onPress }: { uri: string; w: number; onPress: () => void }) {
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const guardedPress = useGuardedPress(onPress);
  return (
    <Pressable onPress={guardedPress}>
      <RemoteImage
        uri={uri}
        style={{ width: w, height: Math.round(w * ratio) }}
        resizeMode="cover"
        onLoadSize={({ width, height }) => {
          if (width > 0 && height > 0) {
            setRatio(Math.min(Math.max(height / width, MIN_RATIO), MAX_RATIO));
          }
        }}
      />
    </Pressable>
  );
}

export default function ImageGrid({
  images,
  onOpen,
  width = GRID_W,
}: {
  images: string[];
  onOpen: (i: number) => void;
  width?: number;
}) {
  const imgs = images.slice(0, 6);
  const n = imgs.length;
  const g = GRID_GAP;
  const W = width;
  const half = Math.floor((W - g) / 2);
  const third = Math.floor((W - 2 * g) / 3);
  const cell = (uri: string, w: number, h: number, i: number) => (
    <Cell key={i} uri={uri} w={w} h={h} onPress={() => onOpen(i)} />
  );

  if (n === 1) {
    return (
      <View style={[s.gridWrap, { width: W }]}>
        <SingleCell uri={imgs[0]} w={W} onPress={() => onOpen(0)} />
      </View>
    );
  }

  if (n === 2) {
    const h = Math.round(W * 0.56);
    return (
      <View style={[s.gridWrap, s.gridRow, { width: W }]}>
        {cell(imgs[0], half, h, 0)}
        {cell(imgs[1], W - g - half, h, 1)}
      </View>
    );
  }

  if (n === 3) {
    const bigW = Math.round(W * 0.58);
    const rightW = W - g - bigW;
    const H = Math.round(W * 0.66);
    const rh = Math.floor((H - g) / 2);
    return (
      <View style={[s.gridWrap, s.gridRow, { width: W }]}>
        {cell(imgs[0], bigW, H, 0)}
        <View style={s.gridCol}>
          {cell(imgs[1], rightW, rh, 1)}
          {cell(imgs[2], rightW, H - g - rh, 2)}
        </View>
      </View>
    );
  }

  if (n === 4) {
    const topH = Math.round(W * 0.46);
    const botH = Math.round(W * 0.3);
    return (
      <View style={[s.gridWrap, { width: W }]}>
        {cell(imgs[0], W, topH, 0)}
        <View style={[s.gridRow, s.rowGap]}>
          {cell(imgs[1], third, botH, 1)}
          {cell(imgs[2], third, botH, 2)}
          {cell(imgs[3], W - 2 * g - 2 * third, botH, 3)}
        </View>
      </View>
    );
  }

  if (n === 5) {
    const topH = Math.round(W * 0.4);
    const botH = Math.round(W * 0.33);
    return (
      <View style={[s.gridWrap, { width: W }]}>
        <View style={s.gridRow}>
          {cell(imgs[0], half, topH, 0)}
          {cell(imgs[1], W - g - half, topH, 1)}
        </View>
        <View style={[s.gridRow, s.rowGap]}>
          {cell(imgs[2], third, botH, 2)}
          {cell(imgs[3], third, botH, 3)}
          {cell(imgs[4], W - 2 * g - 2 * third, botH, 4)}
        </View>
      </View>
    );
  }

  const ch = Math.round(third * 0.92);
  return (
    <View style={[s.gridWrap, { width: W }]}>
      {[0, 3].map((start) => (
        <View key={start} style={[s.gridRow, start === 3 && s.rowGap]}>
          {cell(imgs[start], third, ch, start)}
          {cell(imgs[start + 1], third, ch, start + 1)}
          {cell(imgs[start + 2], W - 2 * g - 2 * third, ch, start + 2)}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  gridWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  gridRow: { flexDirection: 'row', gap: GRID_GAP },
  gridCol: { gap: GRID_GAP },
  rowGap: { marginTop: GRID_GAP },
});
