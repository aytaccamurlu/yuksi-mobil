import RemoteImage from '@/components/RemoteImage';
import Skeleton from '@/components/Skeleton';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

// Ekranda ~2.5 kart görünecek şekilde genişlik hesaplanıyor (Home'daki
// listRow paddingHorizontal'ı ve ItemSeparator boşluğuyla eşleşiyor).
const { width: SCREEN_W } = Dimensions.get('window');
const VISIBLE_CARDS = 2.15;
const H_PADDING = 20;
const CARD_GAP = 12;
const CARD_W = Math.round((SCREEN_W - H_PADDING - CARD_GAP * Math.floor(VISIBLE_CARDS)) / VISIBLE_CARDS);
const IMAGE_H = Math.round(CARD_W * 0.78);

export type HomeListing = {
  id: string;
  title: string;
  price: number;
  location: string;
  photoUri?: string;
  fallbackImage: ImageSourcePropType;
};

const formatPrice = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export default React.memo(function ListingCard({
  listing,
  onPress,
}: {
  listing: HomeListing;
  onPress?: () => void;
}) {
  return (
    <Tappable style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.imageWrap}>
        {listing.photoUri ? (
          <RemoteImage uri={listing.photoUri} style={s.image} resizeMode="cover" />
        ) : (
          <Image source={listing.fallbackImage} style={s.imageContain} resizeMode="contain" />
        )}
      </View>
      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={s.locationRow}>
          <Feather name="map-pin" size={11} color="#FF5B04" />
          <Text style={s.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>
        <Text style={s.price}>{formatPrice(listing.price)}</Text>
      </View>
    </Tappable>
  );
});

export function ListingCardSkeleton() {
  return (
    <View style={s.card}>
      <Skeleton style={s.imageWrap} />
      <View style={s.content}>
        <Skeleton style={s.skeletonTitle} />
        <Skeleton style={s.skeletonLocation} />
        <Skeleton style={s.skeletonPrice} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: IMAGE_H,
    backgroundColor: '#F5F6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imageContain: { width: '82%', height: '82%' },
  content: { padding: 14 },
  title: { fontSize: 13, fontWeight: '800', color: '#111827', lineHeight: 17, minHeight: 34 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  location: { fontSize: 10.5, color: '#6B7280', fontWeight: '600', flexShrink: 1 },
  price: { fontSize: 14.5, fontWeight: '800', color: '#16A34A', marginTop: 6 },

  skeletonTitle: { height: 16, borderRadius: 4, width: '85%' },
  skeletonLocation: { height: 12, borderRadius: 4, width: '60%', marginTop: 8 },
  skeletonPrice: { height: 14, borderRadius: 4, width: 64, marginTop: 6 },
});
