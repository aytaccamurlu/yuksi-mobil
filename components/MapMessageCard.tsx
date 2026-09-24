import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

export type MsgLocation = { label?: string; lat?: number; lng?: number; url: string };

const MAPS_RE =
  /(https?:\/\/\S*(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)\S*)/i;

export function parseMapsLink(text?: string): MsgLocation | null {
  if (!text) return null;
  const m = text.match(MAPS_RE);
  if (!m) return null;
  const url = m[1].replace(/[).,]+$/, '');
  const c =
    url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    url.match(/[?&](?:q|ll|center|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  return c ? { url, lat: parseFloat(c[1]), lng: parseFloat(c[2]) } : { url };
}

export function stripMapsLink(text?: string): string {
  if (!text) return '';
  return text.replace(MAPS_RE, '').replace(/\s{2,}/g, ' ').trim();
}

const staticMap = (lat: number, lng: number) =>
  `https://maps.wikimedia.org/img/osm-intl,15,${lat},${lng},600x260.png`;

export default function MapMessageCard({
  location,
  width,
}: {
  location: MsgLocation;
  width: number;
}) {
  const [failed, setFailed] = useState(false);
  const hasCoords = typeof location.lat === 'number' && typeof location.lng === 'number';

  const open = () => {
    Linking.openURL(location.url).catch(() => {
      if (hasCoords) {
        Linking.openURL(`geo:${location.lat},${location.lng}?q=${location.lat},${location.lng}`).catch(
          () => {},
        );
      }
    });
  };

  return (
    <Tappable onPress={open} style={[s.card, { width }]}>
      <View style={s.mapWrap}>
        {hasCoords && !failed ? (
          <Image
            source={{ uri: staticMap(location.lat!, location.lng!) }}
            style={s.map}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[s.map, s.mapFallback]}>
            <Feather name="map" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={s.pin} pointerEvents="none">
          <Feather name="map-pin" size={26} color="#FF5B04" />
        </View>
      </View>
      <View style={s.foot}>
        <Feather name="navigation" size={14} color="#FF5B04" />
        <Text style={s.label} numberOfLines={1}>
          {location.label || 'Paylaşılan konum'}
        </Text>
        <Feather name="chevron-right" size={16} color="#9CA3AF" />
      </View>
    </Tappable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  mapWrap: { height: 118, backgroundColor: '#E5E7EB' },
  map: { width: '100%', height: '100%' },
  mapFallback: { alignItems: 'center', justifyContent: 'center' },
  pin: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 22,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
});
