import {
    BottomSheetBackdrop,
    BottomSheetModal as BottomSheetModalLib,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

export type AppBottomSheetHandle = {
    present: () => void;
    dismiss: () => void;
};

type AppBottomSheetProps = {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    snapPoints?: (string | number)[];
    maxDynamicContentSize?: number;
    backgroundStyle?: ViewStyle;
    topInset?: number;
};

const AppBottomSheet = forwardRef<AppBottomSheetHandle, AppBottomSheetProps>(function AppBottomSheet(
    { visible, onClose, children, snapPoints, maxDynamicContentSize, backgroundStyle, topInset },
    forwardedRef,
) {
    const sheetRef = useRef<React.ElementRef<typeof BottomSheetModalLib>>(null);

    useImperativeHandle(forwardedRef, () => ({
        present: () => sheetRef.current?.present(),
        dismiss: () => sheetRef.current?.dismiss(),
    }));

    useEffect(() => {
        if (visible) sheetRef.current?.present();
        else sheetRef.current?.dismiss();
    }, [visible]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
        ),
        [],
    );

    return (
        <BottomSheetModalLib
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enableDynamicSizing={!snapPoints}
            maxDynamicContentSize={maxDynamicContentSize}
            topInset={topInset}
            enablePanDownToClose
            onDismiss={onClose}
            backdropComponent={renderBackdrop}
            backgroundStyle={[s.background, backgroundStyle]}
            handleStyle={s.handleRow}
            handleIndicatorStyle={s.handleIndicator}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            style={s.shadow}
        >
            <BottomSheetView style={snapPoints ? s.fillBody : undefined}>{children}</BottomSheetView>
        </BottomSheetModalLib>
    );
});

export default AppBottomSheet;

const s = StyleSheet.create({
    background: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    handleRow: { paddingTop: 10, paddingBottom: 6 },
    handleIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
    fillBody: { flex: 1 },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 20,
    },
});
