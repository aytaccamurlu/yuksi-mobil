import { store } from '@/store/app';
import { TicarimDraft, _patchTicarimDraft, _resetTicarimDraft } from './slice';

export const patchTicarimDraft = (patch: Partial<TicarimDraft>) => store.dispatch(_patchTicarimDraft(patch));
export const resetTicarimDraft = () => store.dispatch(_resetTicarimDraft());

export const startTicarimListing = () => {
    store.dispatch(_resetTicarimDraft());
    store.dispatch(_patchTicarimDraft({ autoChainArmed: true }));
};

export const disarmTicarimAutoChain = () => {
    if (store.getState().ticarim.autoChainArmed) {
        store.dispatch(_patchTicarimDraft({ autoChainArmed: false }));
    }
};

// utils/ticarim.ts'teki fromApiListing şeklinden taslağı doldurur — fotoğraflar
// bu akışa dahil değil, onlar ayrı "Fotoğrafları Yönet" ekranından yönetiliyor.
export const startEditTicarimListing = (listing: any) => {
    store.dispatch(_resetTicarimDraft());
    store.dispatch(
        _patchTicarimDraft({
            editingId: listing.id,
            category: listing.category ?? null,
            categoryId: listing.categoryId || '',
            brand: listing.brand || '',
            brandId: listing.brandId || '',
            model: listing.model || '',
            modelId: listing.modelId || '',
            vehicleType: listing.vehicleType || '',
            vehicleTypeId: listing.vehicleTypeId || '',
            fuelType: listing.fuel || '',
            condition: listing.condition || '',
            conditionScore: listing.conditionScore || '',
            location: listing.location || '',
            title: listing.title || '',
            description: listing.description || '',
            price: listing.price != null ? String(listing.price) : '',
            type: listing.type || '',
            year: listing.year != null ? String(listing.year) : '',
            km: listing.km != null ? String(listing.km) : '',
            engineCc: listing.engineCc || '',
            transmissionType: listing.transmissionType || '',
        }),
    );
};
