import { CAPACITY_OPTIONS, TYPE_OPTIONS } from '@/components/SelectionModal';
import { useUploadCargoImageMutation } from '@/service/createLoad.service';
import * as actions from '@/store/feature/createLoad/actions';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

// cargo-scan'in döndürdüğü araç anahtarları, create-load'daki VEHICLES
// dizisinin sırasına eşlenir.
const VEHICLE_KEY_TO_INDEX: Record<string, number> = {
    MOTORCYCLE: 0,
    MINIVAN: 1,
    FULL_VAN: 2,
    PANELVAN: 2,
    PICKUP_TRUCK: 3,
    TRUCK: 4,
};

const MIN_LOADING_MS = 3800;

export const useCargoScan = () => {
    const [uploadImage] = useUploadCargoImageMutation();
    const [scanning, setScanning] = useState(false);

    const runScan = useCallback(async (uris: string[]) => {
        if (!uris.length) return;
        setScanning(true);
        const startedAt = Date.now();

        try {
            let lastData: any = null;
            for (const uri of uris) {
                const formData = new FormData();
                const filename = uri.split('/').pop() || `cargo_${Date.now()}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('file', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    name: filename,
                    type,
                } as any);

                const response = await uploadImage(formData).unwrap();
                lastData = response?.data || response;
            }

            const elapsed = Date.now() - startedAt;
            if (elapsed < MIN_LOADING_MS) {
                await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
            }

            if (lastData?.original_vehicle) {
                const vehicleIndex = VEHICLE_KEY_TO_INDEX[lastData.original_vehicle];
                if (vehicleIndex != null) actions.setActiveVehicleIndexFromAI(vehicleIndex);

                const capacityOption = CAPACITY_OPTIONS.find((o) => o.id === lastData.suggested_capacity_id);
                if (capacityOption) actions.setCapacitySelectionFromAI(capacityOption);

                const typeOption = TYPE_OPTIONS.find((o) => o.id === lastData.suggested_type_id);
                if (typeOption) actions.setTypeSelectionFromAI(typeOption);

                if (lastData.suggested_notes) actions.setNotesValueFromAI(lastData.suggested_notes);
            }

            uris.forEach((uri, i) => {
                actions.addPickedImage({ image: { uri }, name: `cargo_scan_${i + 1}.jpg` });
            });

            setScanning(false);
        } catch (e: any) {
            setScanning(false);
            Alert.alert('Yük Tarama', e?.data?.message || 'Yük taraması sırasında bir hata oluştu.');
        }
    }, [uploadImage]);

    return { scanning, runScan };
};
