import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import RemoteImage from '@/components/RemoteImage';
import Tappable from '@/components/Tappable';
import { useGetListingByIdQuery } from '@/service/ticarim.service';

export type NotificationItem = {
    id: string;
    title: string;
    body?: string;
    hasImage?: boolean;
    createdAt: string;
    type?: string;
    related_id?: string | null;
    image_url?: string | null;
    unseen?: boolean;
};

const LISTING_NOTIFICATION_TYPES = ['ticarim_listing_approved'];

const formatRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'şimdi';
    if (min < 60) return `${min} dk`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} sa`;
    const day = Math.floor(hr / 24);
    return `${day} gün`;
};

export default React.memo(function NotificationCard({ item }: { item: NotificationItem }) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const hasBody = !!item.body;

    const listingId = item.related_id && LISTING_NOTIFICATION_TYPES.includes(item.type || '') ? item.related_id : null;
    const { data: listingData } = useGetListingByIdQuery(listingId as string, { skip: !listingId });
    const address = listingData?.location || [listingData?.district, listingData?.city].filter(Boolean).join('/');
    const photoUri = item.image_url || listingData?.photos?.[0];
    const showListingLink = !!listingId && (!!address || !!photoUri);

    const openListing = () => {
        if (!listingId) return;
        router.push({ pathname: '/ticarim/[id]', params: { id: listingId } });
    };

    const Wrapper = hasBody ? Tappable : View;
    const wrapperProps = hasBody
        ? { activeOpacity: 0.7, onPress: () => setExpanded((v) => !v) }
        : {};
    const cardStyle = item.unseen ? 'bg-orange-50' : 'bg-white border border-orange-200';

    return (
        <Wrapper className={`${cardStyle} rounded-3xl px-4 py-3.5 mb-3`} {...wrapperProps}>
            <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full overflow-hidden mr-1.5">
                    <Image source={require('@/assets/appicon.jpg')} className="w-full h-full" resizeMode="cover" />
                </View>
                <Text className="text-primary font-bold text-[13px]">Yüksi</Text>
                <Text className="text-gray-400 text-[13px] ml-1.5">{formatRelativeTime(item.createdAt)}</Text>
                <View className="flex-1" />
                {hasBody && (
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                )}
            </View>

            <Text className="text-gray-900 font-bold text-[15px] mt-1.5">{item.title}</Text>

            {hasBody && (
                <View className="flex-row items-end mt-1">
                    <Text
                        className="flex-1 text-gray-500 text-[13px] leading-5"
                        numberOfLines={expanded ? undefined : 1}
                    >
                        {item.body}
                    </Text>
                    {item.hasImage && !expanded && !showListingLink && (
                        <View className="w-11 h-11 rounded-xl bg-primary items-center justify-center ml-2 overflow-hidden">
                            <Image
                                source={require('@/assets/images/yüksi-white.png')}
                                className="w-8 h-8"
                                resizeMode="contain"
                            />
                        </View>
                    )}
                </View>
            )}

            {showListingLink && (
                <View className="flex-row items-center mt-3 pt-3 border-t border-orange-100">
                    <Tappable
                        haptic="light"
                        activeOpacity={0.7}
                        onPress={openListing}
                        className="w-11 h-11 rounded-xl overflow-hidden bg-white mr-2.5"
                    >
                        {photoUri ? (
                            <RemoteImage uri={photoUri} style={{ width: '100%', height: '100%' }} iconSize={16} />
                        ) : (
                            <View className="w-full h-full items-center justify-center">
                                <Feather name="image" size={16} color="#FF5B04" />
                            </View>
                        )}
                    </Tappable>
                    <Tappable
                        haptic="light"
                        activeOpacity={0.7}
                        onPress={openListing}
                        className="flex-1 flex-row items-center"
                    >
                        <Feather name="map-pin" size={13} color="#FF5B04" style={{ marginRight: 4 }} />
                        <Text className="flex-1 text-[13px] font-semibold text-gray-700" numberOfLines={1}>
                            {address || 'İlanı görüntüle'}
                        </Text>
                        <Feather name="chevron-right" size={16} color="#D1D5DB" />
                    </Tappable>
                </View>
            )}
        </Wrapper>
    );
});
