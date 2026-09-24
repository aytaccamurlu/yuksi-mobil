import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';
const PAD = 6;
const TOOLTIP_WIDTH = 260;
const ARROW_SIZE = 10;
const GAP = 14;

export type TourTarget = { x: number; y: number; width: number; height: number };

type Step = {
    icon: React.ComponentProps<typeof Feather>['name'] | 'kanguru';
    title: string;
    description: string;
};

const STEPS: Step[] = [
    {
        icon: 'briefcase',
        title: 'Ticarim',
        description: 'Araç alım satım ilanlarını buradan görebilir, kendi ilanını oluşturabilirsin.',
    },
    {
        icon: 'box',
        title: 'Yük Oluştur',
        description: 'Taşıtacağın bir yükün mü var? Buradan yük oluşturup en yakın taşıyıcıyla eşleş.',
    },
    {
        icon: 'kanguru',
        title: 'Kanguru',
        description: 'Sorularını Kanguru asistanına sorabilir, kargo süreçlerinde yardım alabilirsin.',
    },
];

export default function HomeTourModal({
    visible,
    targets,
    onDone,
}: {
    visible: boolean;
    targets: TourTarget[];
    onDone: () => void;
}) {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];
    const target = targets[step];

    const handleNext = () => {
        if (isLast) {
            onDone();
            return;
        }
        setStep((s) => s + 1);
    };

    if (!visible || !target) return null;

    const screen = Dimensions.get('window');
    const hole = {
        x: target.x - PAD,
        y: target.y - PAD,
        width: target.width + PAD * 2,
        height: target.height + PAD * 2,
    };

    const spaceBelow = screen.height - (hole.y + hole.height);
    const showBelow = spaceBelow > 220 || hole.y < 220;

    let tooltipLeft = target.x + target.width / 2 - TOOLTIP_WIDTH / 2;
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, screen.width - TOOLTIP_WIDTH - 16));
    const arrowLeft = target.x + target.width / 2 - ARROW_SIZE - tooltipLeft;

    const tooltipTop = showBelow ? hole.y + hole.height + GAP : undefined;
    const tooltipBottom = showBelow ? undefined : screen.height - hole.y + GAP;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
            <View style={StyleSheet.absoluteFill}>
                <View style={[s.mask, { top: 0, left: 0, right: 0, height: hole.y }]} />
                <View style={[s.mask, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
                <View style={[s.mask, { top: hole.y, left: 0, width: hole.x, height: hole.height }]} />
                <View style={[s.mask, { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height }]} />

                <View
                    pointerEvents="none"
                    style={[
                        s.highlightBorder,
                        { top: hole.y, left: hole.x, width: hole.width, height: hole.height },
                    ]}
                />

                <View
                    style={[
                        s.tooltip,
                        {
                            left: tooltipLeft,
                            top: tooltipTop,
                            bottom: tooltipBottom,
                            width: TOOLTIP_WIDTH,
                        },
                    ]}
                >
                    {showBelow && (
                        <View style={[s.arrowUp, { left: arrowLeft }]} />
                    )}

                    <View style={s.tooltipRow}>
                        <View style={s.iconCircle}>
                            {current.icon === 'kanguru' ? (
                                <Image source={require('@/assets/kanguru.png')} style={s.kangurooIcon} resizeMode="contain" />
                            ) : (
                                <Feather name={current.icon} size={18} color={PRIMARY} />
                            )}
                        </View>
                        <Text style={s.title}>{current.title}</Text>
                    </View>

                    <Text style={s.description}>{current.description}</Text>

                    <View style={s.footerRow}>
                        <View style={s.dotsRow}>
                            {STEPS.map((_, i) => (
                                <View key={i} style={[s.dot, i === step && s.dotActive]} />
                            ))}
                        </View>

                        <Tappable style={s.button} activeOpacity={0.85} onPress={handleNext}>
                            <Text style={s.buttonText}>{isLast ? 'Başla' : 'İleri'}</Text>
                        </Tappable>
                    </View>

                    {!showBelow && (
                        <View style={[s.arrowDown, { left: arrowLeft }]} />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.65)' },
    highlightBorder: {
        position: 'absolute',
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    tooltip: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 10,
    },
    arrowUp: {
        position: 'absolute',
        top: -ARROW_SIZE,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
    },
    arrowDown: {
        position: 'absolute',
        bottom: -ARROW_SIZE,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderTopWidth: ARROW_SIZE,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff',
    },
    tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FFF1EA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    kangurooIcon: { width: 20, height: 20 },
    title: { fontSize: 15.5, fontWeight: '800', color: '#111827' },
    description: {
        fontSize: 12.5,
        color: '#6B7280',
        marginTop: 10,
        lineHeight: 18,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    dotsRow: { flexDirection: 'row', gap: 5 },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#E5E7EB' },
    dotActive: { backgroundColor: PRIMARY, width: 14 },
    button: {
        paddingHorizontal: 18,
        height: 36,
        borderRadius: 12,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
