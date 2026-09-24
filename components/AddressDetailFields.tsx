import { AddressDetailsType } from '@/store/feature/createLoad/slice';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface AddressDetailFieldsProps {
    label: string;
    details: AddressDetailsType | null | undefined;
    onChangeField: (field: keyof AddressDetailsType, value: string) => void;
}

export default function AddressDetailFields({ label, details, onChangeField }: AddressDetailFieldsProps) {
    if (!details) return null;

    const renderInput = (
        icon: any,
        fieldLabel: string,
        fieldKey: keyof AddressDetailsType,
        placeholder: string,
        keyboardType: 'default' | 'numeric' = 'default'
    ) => {
        return (
            <View className="flex-1 mb-3">
                <Text className="text-xs text-gray-500 font-medium mb-1 ml-1">{fieldLabel}</Text>
                <View className="h-12 bg-white border border-gray-200 rounded-xl flex-row items-center px-3 shadow-sm">
                    <Feather name={icon} size={16} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 text-sm text-gray-900"
                        placeholder={placeholder}
                        placeholderTextColor="#D1D5DB"
                        value={details[fieldKey]}
                        onChangeText={(text) => onChangeField(fieldKey, text)}
                        keyboardType={keyboardType}
                    />
                </View>
            </View>
        );
    };

    return (
        <View className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100/50 mt-2">
            <View className="flex-row items-center mb-4">
                <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-2">
                    <Feather name="map-pin" size={12} color="#EA580C" />
                </View>
                <Text className="text-sm font-bold text-gray-800">{label} Adres Detayı</Text>
            </View>

            <View className="flex-row space-x-3">
                {renderInput('map', 'İl', 'city', 'Örn. İstanbul')}
                <View className="w-3" />
                {renderInput('map', 'İlçe', 'district', 'Örn. Kadıköy')}
            </View>

            <View className="flex-row space-x-3">
                {renderInput('home', 'Mahalle', 'neighborhood', 'Örn. Caferağa')}
                <View className="w-3" />
                {renderInput('navigation', 'Cadde/Sokak', 'street', 'Örn. Moda Cd.')}
            </View>

            <View className="flex-row space-x-3">
                {renderInput('hash', 'Bina No', 'buildingNo', 'Örn. 12', 'numeric')}
                <View className="w-3" />
                {renderInput('key', 'Daire No', 'doorNo', 'Örn. 4', 'numeric')}
            </View>
        </View>
    );
}
