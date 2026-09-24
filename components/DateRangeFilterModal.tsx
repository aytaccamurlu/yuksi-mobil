import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';

const PRIMARY = '#FF5B04';

const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export type MonthYear = { month: number; year: number }; // month: 0-11

export type DateRange = { start: MonthYear | null; end: MonthYear | null };

const toIndex = (m: MonthYear) => m.year * 12 + m.month;

const now = () => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
};

const PRESETS: { key: string; label: string; range: () => DateRange }[] = [
    { key: 'all', label: 'Tüm Zamanlar', range: () => ({ start: null, end: null }) },
    { key: 'this-month', label: 'Bu Ay', range: () => ({ start: now(), end: now() }) },
    {
        key: 'last-3',
        label: 'Son 3 Ay',
        range: () => {
            const n = now();
            const startIdx = toIndex(n) - 2;
            return { start: { month: ((startIdx % 12) + 12) % 12, year: Math.floor(startIdx / 12) }, end: n };
        },
    },
    {
        key: 'this-year',
        label: 'Bu Yıl',
        range: () => ({ start: { month: 0, year: now().year }, end: now() }),
    },
];

export const formatMonthYear = (m: MonthYear) => `${MONTHS_TR[m.month]} ${m.year}`;

export const formatRange = (range: DateRange) => {
    if (!range.start || !range.end) return null;
    if (toIndex(range.start) === toIndex(range.end)) return formatMonthYear(range.start);
    return `${formatMonthYear(range.start)} – ${formatMonthYear(range.end)}`;
};

function MonthStepper({
    label,
    value,
    onChange,
}: {
    label: string;
    value: MonthYear;
    onChange: (v: MonthYear) => void;
}) {
    const step = (dir: 1 | -1) => {
        const idx = toIndex(value) + dir;
        onChange({ month: ((idx % 12) + 12) % 12, year: Math.floor(idx / 12) });
    };

    return (
        <View style={s.stepperBlock}>
            <Text style={s.stepperLabel}>{label}</Text>
            <View style={s.stepperRow}>
                <Tappable onPress={() => step(-1)} style={s.stepperBtn} activeOpacity={0.7} hitSlop={6}>
                    <Feather name="chevron-left" size={18} color="#374151" />
                </Tappable>
                <Text style={s.stepperValue}>{formatMonthYear(value)}</Text>
                <Tappable onPress={() => step(1)} style={s.stepperBtn} activeOpacity={0.7} hitSlop={6}>
                    <Feather name="chevron-right" size={18} color="#374151" />
                </Tappable>
            </View>
        </View>
    );
}

export default function DateRangeFilterModal({
    visible,
    initialRange,
    onClose,
    onApply,
}: {
    visible: boolean;
    initialRange: DateRange;
    onClose: () => void;
    onApply: (range: DateRange) => void;
}) {
    const [start, setStart] = useState<MonthYear>(initialRange.start || now());
    const [end, setEnd] = useState<MonthYear>(initialRange.end || now());

    useEffect(() => {
        if (visible) {
            setStart(initialRange.start || now());
            setEnd(initialRange.end || now());
        }
    }, [visible, initialRange]);

    const handleStartChange = (v: MonthYear) => {
        setStart(v);
        if (toIndex(v) > toIndex(end)) setEnd(v);
    };

    const handleEndChange = (v: MonthYear) => {
        setEnd(v);
        if (toIndex(v) < toIndex(start)) setStart(v);
    };

    const handlePreset = (range: DateRange) => {
        if (!range.start || !range.end) {
            onApply({ start: null, end: null });
            onClose();
            return;
        }
        setStart(range.start);
        setEnd(range.end);
    };

    return (
        <AppBottomSheet visible={visible} onClose={onClose}>
            <View style={s.sheet}>
                <View style={s.header}>
                        <Text style={s.title}>Tarihe Göre Filtrele</Text>
                        <Tappable onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                            <Feather name="x" size={16} color="#6B7280" />
                        </Tappable>
                    </View>

                    <View style={s.presetsRow}>
                        {PRESETS.map((p) => (
                            <Tappable
                                key={p.key}
                                onPress={() => handlePreset(p.range())}
                                style={s.presetChip}
                                activeOpacity={0.7}
                            >
                                <Text style={s.presetChipText}>{p.label}</Text>
                            </Tappable>
                        ))}
                    </View>

                    <View style={s.steppersRow}>
                        <MonthStepper label="Başlangıç Ayı" value={start} onChange={handleStartChange} />
                        <MonthStepper label="Bitiş Ayı" value={end} onChange={handleEndChange} />
                    </View>

                    <View style={s.preview}>
                        <Feather name="calendar" size={14} color={PRIMARY} />
                        <Text style={s.previewText}>
                            {formatRange({ start, end }) || formatMonthYear(start)}
                        </Text>
                    </View>

                    <View style={s.actions}>
                        <Tappable
                            style={s.clearBtn}
                            onPress={() => { onApply({ start: null, end: null }); onClose(); }}
                            activeOpacity={0.7}
                        >
                            <Text style={s.clearBtnText}>Temizle</Text>
                        </Tappable>
                        <Tappable
                            style={s.applyBtn}
                            onPress={() => { onApply({ start, end }); onClose(); }}
                            activeOpacity={0.85}
                        >
                            <Text style={s.applyBtnText}>Uygula</Text>
                        </Tappable>
                    </View>
            </View>
        </AppBottomSheet>
    );
}

const s = StyleSheet.create({
    sheet: { paddingBottom: 32 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '800', color: '#111827' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },

    presetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    presetChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#FFF0E8',
    },
    presetChipText: { fontSize: 12.5, fontWeight: '700', color: PRIMARY },

    steppersRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
    },
    stepperBlock: { flex: 1 },
    stepperLabel: { fontSize: 11.5, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, marginLeft: 2 },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    stepperBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    stepperValue: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#111827' },

    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginTop: 20,
        backgroundColor: '#FFF0E8',
        borderRadius: 16,
        paddingVertical: 12,
    },
    previewText: { fontSize: 13.5, fontWeight: '700', color: PRIMARY },

    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        marginTop: 20,
    },
    clearBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtnText: { fontSize: 14.5, fontWeight: '700', color: '#6B7280' },
    applyBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    applyBtnText: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' },
});
