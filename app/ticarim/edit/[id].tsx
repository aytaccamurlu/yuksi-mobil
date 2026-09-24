import { useGetListingByIdQuery } from '@/service/ticarim.service';
import { startEditTicarimListing } from '@/store/feature/ticarim/actions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicarimEditLoaderScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data, isLoading, isError } = useGetListingByIdQuery(String(id));
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current || !data) return;
        startedRef.current = true;
        startEditTicarimListing(data?.data || data);
        router.replace('/ticarim/create/details');
    }, [data, router]);

    useEffect(() => {
        if (!isError) return;
        Alert.alert('Hata', 'İlan yüklenemedi, lütfen tekrar dene.');
        router.back();
    }, [isError, router]);

    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
            {isLoading && (
                <View>
                    <ActivityIndicator size="large" color="#FF5B04" />
                </View>
            )}
        </SafeAreaView>
    );
}
