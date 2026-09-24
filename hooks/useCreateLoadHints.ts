import { HintKey } from '@/constants/createLoadHints';
import { CreateLoadState } from '@/store/feature/createLoad/slice';

export const useCreateLoadHintState = (
    state: CreateLoadState,
    touched: Set<HintKey>,
    couponApplied: boolean,
): Record<HintKey, boolean> => ({
    deliveryType: touched.has('deliveryType'),
    appointment: state.deliveryType === '1' || (!!state.appointmentDate && !!state.appointmentTime),
    carrierType: touched.has('carrierType'),
    savedRoute: touched.has('savedRoute') || (!!state.fromLocation && !!state.toLocation),
    from: !!state.fromValue.trim(),
    to: !!state.toValue.trim(),
    capacityType: !!state.capacitySelection && !!state.typeSelection,
    photos: state.pickedImages.length > 0,
    notes: !!state.notesValue.trim(),
    coupon: couponApplied || touched.has('coupon'),
    insuredTransport: touched.has('insuredTransport'),
    amount: Number((state.amountValue || '').replace(',', '.').trim()) > 0,
    submit:
        !!state.fromValue.trim() &&
        !!state.toValue.trim() &&
        !!state.capacitySelection &&
        !!state.typeSelection &&
        state.pickedImages.length > 0,
});
