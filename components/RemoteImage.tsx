import Skeleton from '@/components/Skeleton';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export default function RemoteImage({
  uri,
  style,
  iconSize = 22,
  resizeMode = 'cover',
  onLoadSize,
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
  resizeMode?: 'cover' | 'contain';
  onLoadSize?: (size: { width: number; height: number }) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) {
    return (
      <View style={[styles.fallback, style as StyleProp<ViewStyle>]}>
        <Feather name="image" size={iconSize} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style as StyleProp<ViewStyle>]}>
      {!loaded && <Skeleton style={StyleSheet.absoluteFill} />}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        fadeDuration={220}
        onLoad={(e) => {
          setLoaded(true);
          const { width, height } = e.nativeEvent.source;
          if (width && height) onLoadSize?.({ width, height });
        }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#D6D9DE' },
  fallback: { backgroundColor: '#D6D9DE', alignItems: 'center', justifyContent: 'center' },
});
