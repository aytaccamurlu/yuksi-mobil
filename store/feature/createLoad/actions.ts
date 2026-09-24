import { store } from "@/store/app";
import {
    _addPickedImage,
    _removePickedImage,
    _resetForm,
    _setActiveVehicleIndex,
    _setActiveVehicleIndexFromAI,
    _setAmountValue,
    _setAppointmentDate,
    _setAppointmentTime,
    _setCapacitySelection,
    _setCapacitySelectionFromAI,
    _setCouponValue,
    _setDeliveryType,
    _setFromAddressDetailField,
    _setFromLocation,
    _setFromValue,
    _setInsuredTransport,
    _setNotesValue,
    _setNotesValueFromAI,
    _setToAddressDetailField,
    _setToLocation,
    _setToValue,
    _setTypeSelection,
    _setTypeSelectionFromAI,
    AddressDetailsType,
    LocationData,
    PickedImage
} from "./slice";

export const setDeliveryType = (type: '1' | '2') => store.dispatch(_setDeliveryType(type));
export const setAppointmentDate = (date: string | null) => store.dispatch(_setAppointmentDate(date));
export const setAppointmentTime = (time: string | null) => store.dispatch(_setAppointmentTime(time));
export const setFromValue = (text: string) => store.dispatch(_setFromValue(text));
export const setToValue = (text: string) => store.dispatch(_setToValue(text));
export const setFromLocation = (location: LocationData | null) => store.dispatch(_setFromLocation(location));
export const setFromAddressDetailField = (field: keyof AddressDetailsType, value: string) => store.dispatch(_setFromAddressDetailField({ field, value }));
export const setToLocation = (location: LocationData | null) => store.dispatch(_setToLocation(location));
export const setToAddressDetailField = (field: keyof AddressDetailsType, value: string) => store.dispatch(_setToAddressDetailField({ field, value }));
export const setCapacitySelection = (capacity: any | null) => store.dispatch(_setCapacitySelection(capacity));
export const setCapacitySelectionFromAI = (capacity: any | null) => store.dispatch(_setCapacitySelectionFromAI(capacity));
export const setTypeSelection = (type: any | null) => store.dispatch(_setTypeSelection(type));
export const setTypeSelectionFromAI = (type: any | null) => store.dispatch(_setTypeSelectionFromAI(type));
export const addPickedImage = (imagePayload: PickedImage) => store.dispatch(_addPickedImage(imagePayload));
export const removePickedImage = (index: number) => store.dispatch(_removePickedImage(index));
export const setNotesValue = (notes: string) => store.dispatch(_setNotesValue(notes));
export const setNotesValueFromAI = (notes: string) => store.dispatch(_setNotesValueFromAI(notes));
export const setCouponValue = (coupon: string) => store.dispatch(_setCouponValue(coupon));
export const setInsuredTransport = (value: boolean) => store.dispatch(_setInsuredTransport(value));
export const setActiveVehicleIndex = (index: number) => store.dispatch(_setActiveVehicleIndex(index));
export const setActiveVehicleIndexFromAI = (index: number) => store.dispatch(_setActiveVehicleIndexFromAI(index));
export const setAmountValue = (amount: string) => store.dispatch(_setAmountValue(amount));
export const resetForm = () => store.dispatch(_resetForm());

// Kayıtlı bir rotayı tek dokunuşla uygulamak için — saved-addresses.tsx'in
// handleReuse'daki aynı iki dispatch sırasını izler.
export const applySavedRoute = (route: { from: LocationData; to: LocationData }) => {
    store.dispatch(_setFromLocation(route.from));
    store.dispatch(_setToLocation(route.to));
};
