import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AddressDetailsType {
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    buildingNo?: string;
    doorNo?: string;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    address: string;
    addressDetails: AddressDetailsType;
    name?: string;
}

export interface PickedImage {
    image: any;
    name: string;
}

export const INSURED_TRANSPORT_FEE = 30;
export const MAX_PICKED_IMAGES = 10;

export interface CreateLoadState {
    deliveryType: '1' | '2'; // '1' = immediate, '2' = scheduled
    appointmentDate: string | null;
    appointmentTime: string | null;
    fromValue: string;
    toValue: string;
    fromLocation: LocationData | null;
    toLocation: LocationData | null;
    capacitySelection: any | null;
    typeSelection: any | null;
    pickedImages: PickedImage[];
    notesValue: string;
    notesFromAI: boolean;
    couponValue: string;
    insuredTransport: boolean;
    activeVehicleIndex: number;
    amountValue: string;
    // Yük tarama sonucu doldurulan alanlar; kullanıcı elle değiştirince sıfırlanır.
    vehicleFromAI: boolean;
    capacityFromAI: boolean;
    typeFromAI: boolean;
}

const initialState: CreateLoadState = {
    deliveryType: '1',
    appointmentDate: null,
    appointmentTime: null,
    fromValue: '',
    toValue: '',
    fromLocation: null,
    toLocation: null,
    capacitySelection: null,
    typeSelection: null,
    pickedImages: [],
    notesValue: '',
    notesFromAI: false,
    couponValue: '',
    insuredTransport: false,
    activeVehicleIndex: 0,
    amountValue: '',
    vehicleFromAI: false,
    capacityFromAI: false,
    typeFromAI: false,
};

const createLoadSlice = createSlice({
    name: 'createLoad',
    initialState,
    reducers: {
        _setDeliveryType: (state, action: PayloadAction<'1' | '2'>) => {
            state.deliveryType = action.payload;
        },
        _setAppointmentDate: (state, action: PayloadAction<string | null>) => {
            state.appointmentDate = action.payload;
        },
        _setAppointmentTime: (state, action: PayloadAction<string | null>) => {
            state.appointmentTime = action.payload;
        },
        _setFromValue: (state, action: PayloadAction<string>) => {
            state.fromValue = action.payload;
            state.fromLocation = null;
        },
        _setToValue: (state, action: PayloadAction<string>) => {
            state.toValue = action.payload;
            state.toLocation = null;
        },
        _setFromLocation: (state, action: PayloadAction<LocationData | null>) => {
            state.fromLocation = action.payload;
            if (action.payload) {
                state.fromValue = action.payload.address;
            }
        },
        _setFromAddressDetailField: (state, action: PayloadAction<{ field: keyof AddressDetailsType; value: string }>) => {
            if (state.fromLocation) {
                state.fromLocation.addressDetails[action.payload.field] = action.payload.value;
            }
        },
        _setToLocation: (state, action: PayloadAction<LocationData | null>) => {
            state.toLocation = action.payload;
            if (action.payload) {
                state.toValue = action.payload.address;
            }
        },
        _setToAddressDetailField: (state, action: PayloadAction<{ field: keyof AddressDetailsType; value: string }>) => {
            if (state.toLocation) {
                state.toLocation.addressDetails[action.payload.field] = action.payload.value;
            }
        },
        _setCapacitySelection: (state, action: PayloadAction<any | null>) => {
            state.capacitySelection = action.payload;
            state.capacityFromAI = false;
        },
        _setCapacitySelectionFromAI: (state, action: PayloadAction<any | null>) => {
            state.capacitySelection = action.payload;
            state.capacityFromAI = true;
        },
        _setTypeSelection: (state, action: PayloadAction<any | null>) => {
            state.typeSelection = action.payload;
            state.typeFromAI = false;
        },
        _setTypeSelectionFromAI: (state, action: PayloadAction<any | null>) => {
            state.typeSelection = action.payload;
            state.typeFromAI = true;
        },
        _addPickedImage: (state, action: PayloadAction<PickedImage>) => {
            if (state.pickedImages.length >= MAX_PICKED_IMAGES) return;
            state.pickedImages.push(action.payload);
        },
        _removePickedImage: (state, action: PayloadAction<number>) => {
            state.pickedImages.splice(action.payload, 1);
        },
        _setNotesValue: (state, action: PayloadAction<string>) => {
            state.notesValue = action.payload;
            state.notesFromAI = false;
        },
        _setNotesValueFromAI: (state, action: PayloadAction<string>) => {
            state.notesValue = action.payload;
            state.notesFromAI = true;
        },
        _setCouponValue: (state, action: PayloadAction<string>) => {
            state.couponValue = action.payload;
        },
        _setInsuredTransport: (state, action: PayloadAction<boolean>) => {
            state.insuredTransport = action.payload;
        },
        _setActiveVehicleIndex: (state, action: PayloadAction<number>) => {
            if (state.activeVehicleIndex !== action.payload) {
                state.vehicleFromAI = false;
                state.capacitySelection = null;
                state.capacityFromAI = false;
            }
            state.activeVehicleIndex = action.payload;
        },
        _setActiveVehicleIndexFromAI: (state, action: PayloadAction<number>) => {
            state.activeVehicleIndex = action.payload;
            state.vehicleFromAI = true;
        },
        _setAmountValue: (state, action: PayloadAction<string>) => {
            state.amountValue = action.payload;
        },
        _resetForm: () => initialState,
    },
});

export const {
    _setDeliveryType,
    _setAppointmentDate,
    _setAppointmentTime,
    _setFromValue,
    _setToValue,
    _setFromLocation,
    _setFromAddressDetailField,
    _setToLocation,
    _setToAddressDetailField,
    _setCapacitySelection,
    _setCapacitySelectionFromAI,
    _setTypeSelection,
    _setTypeSelectionFromAI,
    _addPickedImage,
    _removePickedImage,
    _setNotesValue,
    _setNotesValueFromAI,
    _setCouponValue,
    _setInsuredTransport,
    _setActiveVehicleIndex,
    _setActiveVehicleIndexFromAI,
    _setAmountValue,
    _resetForm,
} = createLoadSlice.actions;

export default createLoadSlice.reducer;
