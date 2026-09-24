import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const COLORS = ['#FF5B04', '#2F6BFF', '#16A34A', '#7C3AED', '#DB2777', '#0891B2', '#CA8A04'];

const colorFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

export default function Avatar({
  name,
  uri,
  size = 46,
  ring,
  online,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  ring?: string;
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = uri && !failed;

  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(ring ? { borderWidth: 2, borderColor: ring } : null),
  };

  const dotSize = Math.max(10, Math.round(size * 0.28));
  const onlineDot = online ? (
    <View
      style={[
        styles.dot,
        { width: dotSize, height: dotSize, borderRadius: dotSize / 2, right: -1, bottom: -1 },
      ]}
    />
  ) : null;

  if (showImage) {
    return (
      <View>
        <Image source={{ uri: uri! }} style={[base, styles.img]} onError={() => setFailed(true)} />
        {onlineDot}
      </View>
    );
  }

  return (
    <View>
      <View style={[base, styles.fallback, { backgroundColor: colorFor(name) }]}>
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initialOf(name)}</Text>
      </View>
      {onlineDot}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: '#E5E7EB' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontWeight: '800' },
  dot: {
    position: 'absolute',
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
