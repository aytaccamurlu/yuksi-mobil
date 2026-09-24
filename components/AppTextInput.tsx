import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

const PRIMARY = '#FF5B04';
const DANGER = '#DC2626';

interface AppTextInputProps extends TextInputProps {
    label?: string;
    className?: string;
    error?: string | null;
}

const AppTextInput = forwardRef<TextInput, AppTextInputProps>(({ label, style, error, ...props }, ref) => {
    return (
        <View style={s.wrapper}>
            {label && <Text style={s.label}>{label}</Text>}
            <TextInput
                ref={ref}
                style={[s.input, props.multiline && s.inputMultiline, !!error && s.inputError, style]}
                placeholderTextColor="#9CA3AF"
                {...props}
            />
            {!!error && <Text style={s.errorText}>{error}</Text>}
        </View>
    );
});
AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;

const s = StyleSheet.create({
    wrapper: { marginBottom: 6 },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: PRIMARY,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 6,
        marginLeft: 2,
    },
    input: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        fontSize: 14,
        color: '#111827',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputError: { borderColor: DANGER, borderWidth: 1.5 },
    inputMultiline: {
        height: 88,
        paddingTop: 14,
        textAlignVertical: 'top',
    },
    errorText: {
        color: DANGER,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
        marginLeft: 2,
    },
});
