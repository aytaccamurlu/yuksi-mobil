import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import { BORDER_FILLED, BORDER_IDLE, useAnimatedBorderColor } from '@/hooks/useAnimatedBorderColor';
import Animated from 'react-native-reanimated';

const s = StyleSheet.create({
    sheetBackground: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },
    box: {
        width: '100%',
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
});

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

interface DateTimePickerFieldProps {
    label: string;
    placeholder: string;
    icon?: React.ReactNode;
    value: Date | null | string;
    onChange: (date: Date) => void;
    mode?: 'date' | 'time';
}

// ── Calendar Grid ──
function CalendarGrid({
    selectedDate,
    currentMonth,
    currentYear,
    onSelectDate,
    minDate,
}: {
    selectedDate: Date;
    currentMonth: number;
    currentYear: number;
    onSelectDate: (d: Date) => void;
    minDate: Date;
}) {
    const days = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        let startDay = firstDay.getDay() - 1; // Monday = 0
        if (startDay < 0) startDay = 6;

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const cells: (number | null)[] = [];

        for (let i = 0; i < startDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);

        return cells;
    }, [currentMonth, currentYear]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <View>
            {/* Weekday headers */}
            <View className="flex-row mb-2">
                {DAYS_TR.map((d) => (
                    <View key={d} className="flex-1 items-center">
                        <Text className="text-xs font-semibold text-gray-400">{d}</Text>
                    </View>
                ))}
            </View>

            {/* Day grid */}
            <View className="flex-row flex-wrap">
                {days.map((day, i) => {
                    if (day === null) {
                        return <View key={`empty-${i}`} style={{ width: '14.28%', height: 44 }} />;
                    }

                    const cellDate = new Date(currentYear, currentMonth, day);
                    cellDate.setHours(0, 0, 0, 0);
                    const isPast = cellDate < minDate;
                    const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === currentMonth &&
                        selectedDate.getFullYear() === currentYear;
                    const isToday =
                        today.getDate() === day &&
                        today.getMonth() === currentMonth &&
                        today.getFullYear() === currentYear;

                    return (
                        <Tappable
                            key={`day-${day}`}
                            disabled={isPast}
                            onPress={() => onSelectDate(cellDate)}
                            activeOpacity={0.6}
                            style={{ width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <View
                                className={`w-10 h-10 rounded-full items-center justify-center ${isSelected
                                        ? 'bg-primary'
                                        : isToday
                                            ? 'bg-orange-100'
                                            : ''
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-semibold ${isSelected
                                            ? 'text-white'
                                            : isPast
                                                ? 'text-gray-200'
                                                : isToday
                                                    ? 'text-primary'
                                                    : 'text-gray-800'
                                        }`}
                                >
                                    {day}
                                </Text>
                            </View>
                        </Tappable>
                    );
                })}
            </View>
        </View>
    );
}

// ── Time Selector ──
function TimeSelector({
    selectedHour,
    selectedMinute,
    onHourChange,
    onMinuteChange,
}: {
    selectedHour: number;
    selectedMinute: number;
    onHourChange: (h: number) => void;
    onMinuteChange: (m: number) => void;
}) {
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
        <View className="items-center py-4">
            <View className="flex-row items-center">
                {/* Hour */}
                <View className="items-center">
                    <Tappable
                        onPress={() => onHourChange(selectedHour < 23 ? selectedHour + 1 : 0)}
                        className="w-16 h-10 items-center justify-center"
                    >
                        <Feather name="chevron-up" size={22} color="#9CA3AF" />
                    </Tappable>
                    <View className="w-20 h-16 bg-primary/10 rounded-2xl items-center justify-center border-2 border-primary/20">
                        <Text className="text-3xl font-extrabold text-primary">
                            {String(selectedHour).padStart(2, '0')}
                        </Text>
                    </View>
                    <Tappable
                        onPress={() => onHourChange(selectedHour > 0 ? selectedHour - 1 : 23)}
                        className="w-16 h-10 items-center justify-center"
                    >
                        <Feather name="chevron-down" size={22} color="#9CA3AF" />
                    </Tappable>
                </View>

                <Text className="text-3xl font-extrabold text-gray-300 mx-3">:</Text>

                {/* Minute */}
                <View className="items-center">
                    <Tappable
                        onPress={() => {
                            const idx = minutes.indexOf(selectedMinute);
                            onMinuteChange(minutes[(idx + 1) % minutes.length]);
                        }}
                        className="w-16 h-10 items-center justify-center"
                    >
                        <Feather name="chevron-up" size={22} color="#9CA3AF" />
                    </Tappable>
                    <View className="w-20 h-16 bg-primary/10 rounded-2xl items-center justify-center border-2 border-primary/20">
                        <Text className="text-3xl font-extrabold text-primary">
                            {String(selectedMinute).padStart(2, '0')}
                        </Text>
                    </View>
                    <Tappable
                        onPress={() => {
                            const idx = minutes.indexOf(selectedMinute);
                            onMinuteChange(minutes[idx > 0 ? idx - 1 : minutes.length - 1]);
                        }}
                        className="w-16 h-10 items-center justify-center"
                    >
                        <Feather name="chevron-down" size={22} color="#9CA3AF" />
                    </Tappable>
                </View>
            </View>

            {/* Quick select chips */}
            <View className="flex-row mt-5 space-x-2">
                {[
                    { label: 'Şimdi', h: new Date().getHours(), m: Math.ceil(new Date().getMinutes() / 5) * 5 },
                    { label: '09:00', h: 9, m: 0 },
                    { label: '12:00', h: 12, m: 0 },
                    { label: '15:00', h: 15, m: 0 },
                    { label: '18:00', h: 18, m: 0 },
                ].map((preset) => {
                    const isActive = selectedHour === preset.h && selectedMinute === (preset.m >= 60 ? 0 : preset.m);
                    return (
                        <Tappable
                            key={preset.label}
                            onPress={() => {
                                onHourChange(preset.h);
                                onMinuteChange(preset.m >= 60 ? 0 : preset.m);
                            }}
                            className={`px-3.5 py-2 rounded-full mx-1 ${isActive ? 'bg-primary' : 'bg-gray-100'
                                }`}
                            activeOpacity={0.7}
                        >
                            <Text
                                className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'
                                    }`}
                            >
                                {preset.label}
                            </Text>
                        </Tappable>
                    );
                })}
            </View>
        </View>
    );
}

// ── Main Component ──
export default function DateTimePickerField({
    label,
    placeholder,
    icon,
    value,
    onChange,
    mode = 'date',
}: DateTimePickerFieldProps) {
    const [show, setShow] = useState(false);

    const initialDate = value ? new Date(value) : new Date();
    const [tempDate, setTempDate] = useState(initialDate);
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
    const [selectedMinute, setSelectedMinute] = useState(
        Math.round(initialDate.getMinutes() / 5) * 5,
    );

    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);

    const handleOpen = () => {
        const d = value ? new Date(value) : new Date();
        setTempDate(d);
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
        setSelectedHour(d.getHours());
        setSelectedMinute(Math.round(d.getMinutes() / 5) * 5);
        setShow(true);
    };

    const handleConfirm = () => {
        if (mode === 'date') {
            onChange(tempDate);
        } else {
            const d = new Date(tempDate);
            d.setHours(selectedHour, selectedMinute, 0, 0);
            onChange(d);
        }
        setShow(false);
    };

    const handleCancel = () => {
        setShow(false);
    };

    const goNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const goPrevMonth = () => {
        const now = new Date();
        if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const formatValue = (dateStr: Date | string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (mode === 'date') {
            return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
        } else {
            return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
    };

    const borderStyle = useAnimatedBorderColor(value ? BORDER_FILLED : BORDER_IDLE);

    return (
        <View className="flex-1 mt-3">
            <Text className="text-sm font-medium text-gray-400 mb-1 ml-1">{label}</Text>
            <Animated.View style={[s.box, borderStyle]}>
                <Tappable
                    className="w-full h-full px-4 justify-center"
                    activeOpacity={0.8}
                    onPress={handleOpen}
                >
                <View className="flex-row items-center space-x-2">
                    {icon && <View className="w-5 h-5 mr-2">{icon}</View>}
                    <Text
                        className={`flex-1 text-base ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                        numberOfLines={1}
                    >
                        {value ? formatValue(value) : placeholder}
                    </Text>
                    <Feather
                        name={mode === 'date' ? 'calendar' : 'clock'}
                        size={16}
                        color="#D4D4D8"
                    />
                </View>
                </Tappable>
            </Animated.View>

            <AppBottomSheet visible={show} onClose={handleCancel} backgroundStyle={s.sheetBackground}>
                <View>
                        <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
                            <View>
                                <Text className="text-xl font-extrabold text-gray-900">
                                    {mode === 'date' ? '📅 Tarih Seçin' : '🕐 Saat Seçin'}
                                </Text>
                                <Text className="text-xs text-gray-400 mt-0.5">
                                    {mode === 'date'
                                        ? 'Gönderim tarihini belirleyin'
                                        : 'Gönderim saatini belirleyin'}
                                </Text>
                            </View>
                            <Tappable
                                onPress={handleCancel}
                                className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center"
                                activeOpacity={0.7}
                            >
                                <Feather name="x" size={16} color="#6B7280" />
                            </Tappable>
                        </View>

                        {mode === 'date' ? (
                            <View className="px-5 pb-2">
                                {/* Month Navigation */}
                                <View className="flex-row items-center justify-between mb-4 px-1">
                                    <Tappable
                                        onPress={goPrevMonth}
                                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="chevron-left" size={20} color="#374151" />
                                    </Tappable>
                                    <Text className="text-base font-bold text-gray-900">
                                        {MONTHS_TR[viewMonth]} {viewYear}
                                    </Text>
                                    <Tappable
                                        onPress={goNextMonth}
                                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="chevron-right" size={20} color="#374151" />
                                    </Tappable>
                                </View>

                                <CalendarGrid
                                    selectedDate={tempDate}
                                    currentMonth={viewMonth}
                                    currentYear={viewYear}
                                    onSelectDate={(d) => setTempDate(d)}
                                    minDate={minDate}
                                />
                            </View>
                        ) : (
                            <TimeSelector
                                selectedHour={selectedHour}
                                selectedMinute={selectedMinute}
                                onHourChange={setSelectedHour}
                                onMinuteChange={setSelectedMinute}
                            />
                        )}

                        {/* Selected preview */}
                        <View className="mx-6 mt-3 mb-2 bg-orange-50 rounded-2xl py-3 px-4 flex-row items-center justify-center">
                            <Feather
                                name={mode === 'date' ? 'calendar' : 'clock'}
                                size={16}
                                color="#FF5B04"
                            />
                            <Text className="text-primary font-bold text-sm ml-2">
                                {mode === 'date'
                                    ? tempDate.toLocaleDateString('tr-TR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        weekday: 'long',
                                    })
                                    : `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row px-6 mt-3 mb-8 space-x-3">
                            <Tappable
                                className="flex-1 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-2"
                                onPress={handleCancel}
                                activeOpacity={0.7}
                            >
                                <Text className="font-bold text-base text-gray-500">İptal</Text>
                            </Tappable>
                            <Tappable
                                className="flex-1 h-14 rounded-2xl items-center justify-center ml-2 bg-primary"
                                onPress={handleConfirm}
                                activeOpacity={0.8}
                                style={{
                                    shadowColor: '#FF5B04',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text className="font-bold text-base text-white">Onayla</Text>
                            </Tappable>
                        </View>
                </View>
            </AppBottomSheet>
        </View>
    );
}
