import { TicarimCategory } from '@/service/mockData';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TicarimDraft {
    category: TicarimCategory | null;
    categoryId: string;
    photos: string[];
    brand: string;
    brandId: string;
    model: string;
    modelId: string;
    vehicleType: string;
    vehicleTypeId: string;
    fuelType: string;
    condition: string;
    conditionScore: string;
    location: string;
    title: string;
    description: string;
    price: string;
    listingDate: string;
    type: string;
    year: string;
    km: string;
    engineCc: string;
    transmissionType: string;
    cylinderCount: string;
    gear: string;
    cooling: string;
    color: string;
    origin: string;
    plateNationality: string;
    from: string;
    tradeAccepted: string;
    securityInfo: string;
    accessoryInfo: string;
    extraPhoto: string | null;
    ownerName: string;
    phone: string;
    email: string;
    autoChainArmed: boolean;
    editingId: string | null;
}

const initialState: TicarimDraft = {
    category: null,
    categoryId: '',
    photos: [],
    brand: '',
    brandId: '',
    model: '',
    modelId: '',
    vehicleType: '',
    vehicleTypeId: '',
    fuelType: '',
    condition: '',
    conditionScore: '',
    location: '',
    title: '',
    description: '',
    price: '',
    listingDate: '',
    type: '',
    year: '',
    km: '',
    engineCc: '',
    transmissionType: '',
    cylinderCount: '',
    gear: '',
    cooling: '',
    color: '',
    origin: '',
    plateNationality: '',
    from: '',
    tradeAccepted: '',
    securityInfo: '',
    accessoryInfo: '',
    extraPhoto: null,
    ownerName: '',
    phone: '',
    email: '',
    autoChainArmed: false,
    editingId: null,
};

const ticarimSlice = createSlice({
    name: 'ticarim',
    initialState,
    reducers: {
        _patchTicarimDraft: (state, action: PayloadAction<Partial<TicarimDraft>>) => {
            Object.assign(state, action.payload);
        },
        _resetTicarimDraft: () => initialState,
    },
});

export const { _patchTicarimDraft, _resetTicarimDraft } = ticarimSlice.actions;
export default ticarimSlice.reducer;
