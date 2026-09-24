import { isConnectivityError } from '@/components/LoadErrorState';
import { INSURED_TRANSPORT_FEE } from '@/store/feature/createLoad/slice';
import { useGetVehiclesQuery, usePriceEstimateMutation, useUploadMediaMutation } from '@/service/createLoad.service';
import { useCreateOrderMutation, type OrderAddress } from '@/service/orders.service';
import * as actions from '@/store/feature/createLoad/actions';
import { useCreateLoadState } from '@/store/feature/createLoad/hooks';
import { useUserSession } from '@/store/feature/user/hooks';
import { DEFAULT_REAL_VEHICLE_PRODUCT_ID, REAL_VEHICLE_PRODUCT_ID } from '@/utils/vehicleCatalog';
import { useCallback, useState } from 'react';

export const useCreateLoadForm = () => {
    const state = useCreateLoadState();
    const userSession = useUserSession();

    // API Hooks
    const { data: vehiclesData, isLoading: vehiclesLoading, error: vehiclesError } = useGetVehiclesQuery();
    const [createOrderApi, { isLoading: submitting }] = useCreateOrderMutation();
    const [uploadMediaApi, { isLoading: isUploadingImage }] = useUploadMediaMutation();
    const [priceEstimateApi] = usePriceEstimateMutation();

    // Local State
    const [couponApplying, setCouponApplying] = useState(false);
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    // Derived state
    const vehicles = vehiclesData?.data || vehiclesData || [];
    const amountNumber = Number((state.amountValue || '').replace(',', '.').trim());
    const amountValid = amountNumber > 0;
    const canSubmit =
        !!state.fromValue.trim() &&
        !!state.toValue.trim() &&
        !!state.capacitySelection &&
        !!state.typeSelection &&
        state.pickedImages.length > 0;

    const buildCombinedNotes = useCallback(() => {
        const capacityStr = state.capacitySelection?.label ? `Ağırlık: ${state.capacitySelection.label}` : '';
        const typeStr = state.typeSelection?.label ? `Tür: ${state.typeSelection.label}` : '';
        const existingNotes = state.notesValue?.trim() || '';

        let scheduleStr = '';
        if (state.deliveryType === '2' && state.appointmentDate) {
            const d = new Date(state.appointmentDate);
            const dateOnly = d.toLocaleDateString('tr-TR');

            if (state.appointmentTime) {
                const t = new Date(state.appointmentTime);
                const timeOnly = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                scheduleStr = `Randevu: ${dateOnly} ${timeOnly}`;
            } else {
                scheduleStr = `Randevu: ${dateOnly}`;
            }
        }

        return [capacityStr, typeStr, scheduleStr, existingNotes].filter(Boolean).join(' | ');
    }, [state]);

    const resolveVehicleProductId = useCallback(() => {
        const selectedVehicle = vehicles[state.activeVehicleIndex];
        const vehicleKey = selectedVehicle?.template || selectedVehicle?.type;
        return REAL_VEHICLE_PRODUCT_ID[vehicleKey] || DEFAULT_REAL_VEHICLE_PRODUCT_ID;
    }, [vehicles, state.activeVehicleIndex]);

    const fetchPriceEstimate = useCallback(async (): Promise<number | null> => {
        if (!state.fromLocation || !state.toLocation) return null;
        try {
            const res = await priceEstimateApi({
                pickup_address: state.fromValue.trim(),
                dropoff_address: state.toValue.trim(),
                pickup_coordinates: [state.fromLocation.latitude, state.fromLocation.longitude],
                dropoff_coordinates: [state.toLocation.latitude, state.toLocation.longitude],
                vehicle_product_id: resolveVehicleProductId(),
            }).unwrap();
            const price = res?.total_price ?? res?.data?.total_price;
            return typeof price === 'number' ? price : null;
        } catch {
            return null;
        }
    }, [state.fromLocation, state.toLocation, state.fromValue, state.toValue, priceEstimateApi, resolveVehicleProductId]);

    const handleSubmit = useCallback(async () => {
        const errors: string[] = [];
        if (!state.fromValue.trim()) errors.push('Çıkış Konumu gerekli');
        if (!state.toValue.trim()) errors.push('Varış Konumu gerekli');
        if (!state.capacitySelection) errors.push('Kapasite seçin');
        if (!state.typeSelection) errors.push('Tür seçin');
        if (state.pickedImages.length === 0) errors.push('En az bir fotoğraf ekleyin');

        if (errors.length) {
            return { success: false, error: errors[0] };
        }

        try {
            let uploadedPhotoUrls: string[] = [];
            if (state.pickedImages.length) {
                try {
                    const formData = new FormData();
                    state.pickedImages.forEach((pic, i) => {
                        formData.append('files', {
                            uri: pic.image.uri,
                            type: pic.image.mimeType || 'image/jpeg',
                            name: pic.image.fileName || pic.name || `cargo_${Date.now()}_${i}.jpg`,
                        } as any);
                    });

                    const uploadRes = await uploadMediaApi(formData).unwrap();
                    const images = uploadRes?.images || uploadRes?.data?.images || [];
                    uploadedPhotoUrls = images.map((img: any) => img.url).filter(Boolean);
                } catch (uploadError: any) {
                    return {
                        success: false,
                        error: isConnectivityError(uploadError)
                            ? 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
                            : 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.',
                    };
                }
            }

            const selectedVehicle = vehicles[state.activeVehicleIndex];
            const vehicleName = selectedVehicle?.name || selectedVehicle?.template || 'Araç';
            const total = amountValid ? amountNumber + (state.insuredTransport ? INSURED_TRANSPORT_FEE : 0) : 0;

            const toAddress = (location: typeof state.fromLocation, fallbackText: string): OrderAddress => ({
                city: location?.addressDetails?.city || '',
                district: location?.addressDetails?.district || '',
                neighborhood: location?.addressDetails?.neighborhood || '',
                addressText: location?.addressDetails?.street || location?.address || fallbackText,
                buildingNo: location?.addressDetails?.buildingNo || null,
            });

            const notes = [`Araç: ${vehicleName}`, buildCombinedNotes()].filter(Boolean).join(' | ');

            const response = await createOrderApi({
                userId: userSession?.userId || '',
                orderNumber: `YUK-${Date.now()}`,
                serviceType: state.deliveryType === '1' ? 'Hemen' : 'Randevulu',
                carrierType: 'courier', // Backend'de tek kabul edilen literal
                pickupLatitude: state.fromLocation?.latitude || 0,
                pickupLongitude: state.fromLocation?.longitude || 0,
                pickupLocation: toAddress(state.fromLocation, state.fromValue.trim()),
                dropoffLocation: toAddress(state.toLocation, state.toValue.trim()),
                cargoDetails: {
                    weightCategory: state.capacitySelection?.label || '',
                    isThermal: false,
                    note: notes || null,
                    photos: uploadedPhotoUrls,
                },
                pricing: {
                    basePrice: amountValid ? amountNumber : 0,
                    discount: 0,
                    total,
                    currency: 'TRY',
                },
            }).unwrap();

            return { success: true, data: { id: response.id, orderNumber: response.orderNumber } };

        } catch (e: any) {
            const errorMessage = isConnectivityError(e)
                ? 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
                : e?.data?.message || e?.data?.detail?.[0]?.msg || e?.message || 'Yük oluşturulamadı. Lütfen tekrar deneyin.';

            return { success: false, error: errorMessage };
        }
    }, [state, amountNumber, amountValid, createOrderApi, userSession, vehicles, uploadMediaApi, buildCombinedNotes]);

    const handleApplyCoupon = useCallback(async () => {
        if (!state.couponValue?.trim()) return;
        setCouponError(null);
        setCouponApplying(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            const valid = /^YUK[A-Z0-9]{2,}$/i.test(state.couponValue.trim());
            if (valid) {
                setCouponApplied(true);
            } else {
                setCouponApplied(false);
                setCouponError('Geçersiz kupon kodu');
            }
        } finally {
            setCouponApplying(false);
        }
    }, [state.couponValue]);

    return {
        state,
        actions,
        vehicles,
        vehiclesLoading,
        vehiclesError,
        amountValid,
        canSubmit,
        handleSubmit,
        fetchPriceEstimate,
        submitting,
        isUploadingImage,
        couponApplying,
        couponApplied,
        couponError,
        handleApplyCoupon,
        setCouponApplied,
        setCouponError
    };
};
