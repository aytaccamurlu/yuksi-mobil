import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export default function TicarimStepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
    const nodeStyle = (n: number) => {
        if (n < step) return { bg: '#FF5B04', border: '#FF5B04', textColor: '#fff' };
        if (n === step) return { bg: '#fff', border: '#FF5B04', textColor: '#FF5B04' };
        return { bg: '#fff', border: '#E5E7EB', textColor: '#9CA3AF' };
    };

    return (
        <View className="flex-row items-center justify-center px-10 py-5">
            {[1, 2, 3].map((n, i) => {
                const style = nodeStyle(n);
                return (
                    <React.Fragment key={n}>
                        <View
                            className="w-9 h-9 rounded-full items-center justify-center"
                            style={{ backgroundColor: style.bg, borderWidth: 2, borderColor: style.border }}
                        >
                            {n < step ? (
                                <Feather name="check" size={16} color="#fff" />
                            ) : (
                                <Text style={{ color: style.textColor, fontWeight: '700', fontSize: 13 }}>0{n}</Text>
                            )}
                        </View>
                        {i < 2 && (
                            <View
                                className="flex-1 mx-1.5"
                                style={{
                                    height: 1,
                                    borderStyle: 'dotted',
                                    borderWidth: 1,
                                    borderColor: n < step ? '#FF5B04' : '#E5E7EB',
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}
