import AnchoredMenu, { AnchoredMenuItem } from '@/components/AnchoredMenu';
import CameraCaptureModal from '@/components/CameraCaptureModal';
import { planCameraSend } from '@/utils/cameraSendPlan';
import ChatImageViewer from '@/components/ChatImageViewer';
import ChatLocationModal, { ChatLocation } from '@/components/ChatLocationModal';
import ImageGrid from '@/components/ImageGrid';
import { addMessage, hideSuggestions, resetChat, setInputText, setLoading, setSessionId } from '@/store/feature/chat/actions';
import { useChat } from '@/store/feature/chat/hooks';
import { useSendMessageMutation } from '@/service/chat.service';
import { Feather } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ImageBackground, Keyboard, KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Expo Go'da native modül yok, statik import çökertir — runtime'da yüklüyoruz.
const SPEECH_RECOGNITION_AVAILABLE = !!requireOptionalNativeModule('ExpoSpeechRecognition');
const ExpoSpeechRecognitionModule: any = SPEECH_RECOGNITION_AVAILABLE
    ? require('expo-speech-recognition').ExpoSpeechRecognitionModule
    : null;
const useSpeechRecognitionEvent: (eventName: string, listener: (event: any) => void) => void =
    SPEECH_RECOGNITION_AVAILABLE ? require('expo-speech-recognition').useSpeechRecognitionEvent : () => {};

const WAVE_BAR_COUNT = 32;

const MAX_CHAT_IMAGES = 6;

function WaveformBar({ history, index }: { history: SharedValue<number[]>; index: number }) {
    const style = useAnimatedStyle(() => {
        const level = history.value[index] ?? 0;
        return { height: withTiming(3 + level * 24, { duration: 100 }) };
    });
    return <Animated.View className="w-[3px] rounded-full bg-primary" style={style} />;
}

function WaveformBars({ history }: { history: SharedValue<number[]> }) {
    return (
        <View className="flex-1 flex-row items-center justify-between h-7">
            {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => (
                <WaveformBar key={i} history={history} index={i} />
            ))}
        </View>
    );
}

let hasShownChatIntroLoading = false;

export default function ChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showIntroLoading, setShowIntroLoading] = React.useState(!hasShownChatIntroLoading);
    const introRingRotation = useSharedValue(0);

    useFocusEffect(
        React.useCallback(() => {
            if (hasShownChatIntroLoading) return;
            setShowIntroLoading(true);
            introRingRotation.value = 0;
            introRingRotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
            const timer = setTimeout(() => {
                hasShownChatIntroLoading = true;
                setShowIntroLoading(false);
            }, 2500);
            return () => clearTimeout(timer);
        }, []),
    );

    const introRingStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${introRingRotation.value}deg` }],
    }));
    const { messages, inputText, suggestions, showSuggestions, isLoading, sessionId } = useChat();
    const [sendChatMessage] = useSendMessageMutation();
    const [keyboardVisible, setKeyboardVisible] = React.useState(false);
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);
    const [menuAnchor, setMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
    const [attachAnchor, setAttachAnchor] = React.useState<{ x: number; y: number } | null>(null);
    const [locationModalVisible, setLocationModalVisible] = React.useState(false);
    const [cameraModalVisible, setCameraModalVisible] = React.useState(false);
    const [pending, setPending] = React.useState<string[]>([]);
    const [viewer, setViewer] = React.useState<{ images: string[]; index: number } | null>(null);
    const waveHistory = useSharedValue<number[]>(Array(WAVE_BAR_COUNT).fill(0));
    const inputBottomOffset = keyboardVisible ? (Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 0) : Math.max(insets.bottom, 8);

    const [isListening, setIsListening] = React.useState(false);

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        const transcript = event.results[0]?.transcript;
        if (transcript != null) setInputText(transcript);
    });
    useSpeechRecognitionEvent('volumechange', (event) => {
        const level = Math.max(0, Math.min(1, (event.value + 2) / 12));
        waveHistory.value = [...waveHistory.value.slice(1), level];
    });
    useSpeechRecognitionEvent('error', (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            Alert.alert('Sesli Arama', 'Sesiniz metne çevrilemedi, lütfen tekrar deneyin.');
        }
    });

    React.useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates?.height ?? 0);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleMicPress = async () => {
        if (!SPEECH_RECOGNITION_AVAILABLE) {
            Alert.alert(
                'Sesli Arama Kullanılamıyor',
                'Bu özellik yalnızca geliştirme derlemesinde (dev build) çalışır, Expo Go üzerinde çalışmaz.',
            );
            return;
        }
        if (isListening) {
            ExpoSpeechRecognitionModule.stop();
            return;
        }
        try {
            const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('İzin Gerekli', 'Sesli soru sorabilmek için mikrofon ve konuşma tanıma izni vermelisiniz.');
                return;
            }
            waveHistory.value = Array(WAVE_BAR_COUNT).fill(0);
            setInputText('');
            ExpoSpeechRecognitionModule.start({
                lang: 'tr-TR',
                interimResults: true,
                continuous: false,
                addsPunctuation: true,
            });
        } catch {
            Alert.alert(
                'Sesli Arama Kullanılamıyor',
                'Bu özellik yalnızca geliştirme derlemesinde (dev build) çalışır, Expo Go üzerinde çalışmaz.',
            );
        }
    };

    const handleSend = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        addMessage({ id: `m-${Date.now()}`, text: trimmed, side: 'user' });
        setInputText('');
        hideSuggestions();
        setLoading(true);
        try {
            const res = await sendChatMessage({ message: trimmed, sessionId }).unwrap();
            if (res.sessionId) setSessionId(res.sessionId);
            addMessage({
                id: `b-${Date.now()}`,
                text: res.response || 'Şu an yanıt veremiyorum, birazdan tekrar dener misin?',
                side: 'bot',
            });
        } catch {
            addMessage({
                id: `b-${Date.now()}`,
                text: 'Bağlantı sorunu yaşadım. Lütfen biraz sonra tekrar dene.',
                side: 'bot',
            });
        } finally {
            setLoading(false);
        }
    }, [isLoading, sessionId, sendChatMessage]);

    const handleActionPress = () => {
        if (isListening) {
            handleMicPress();
            return;
        }
        if (pending.length > 0) {
            sendStagedImages();
            return;
        }
        if (inputText.trim()) {
            handleSend(inputText);
            return;
        }
        handleMicPress();
    };

    const sendStagedImages = useCallback(async () => {
        const images = pending;
        if (!images.length || isLoading) return;
        const text = inputText.trim();
        addMessage({ id: `m-${Date.now()}`, text, side: 'user', images });
        setInputText('');
        setPending([]);
        hideSuggestions();
        setLoading(true);
        try {
            const res = await sendChatMessage({ message: text, sessionId, images }).unwrap();
            if (res.sessionId) setSessionId(res.sessionId);
            addMessage({
                id: `b-${Date.now()}`,
                text: res.response || 'Şu an yanıt veremiyorum, birazdan tekrar dener misin?',
                side: 'bot',
            });
        } catch {
            addMessage({
                id: `b-${Date.now()}`,
                text: 'Bağlantı sorunu yaşadım. Lütfen biraz sonra tekrar dene.',
                side: 'bot',
            });
        } finally {
            setLoading(false);
        }
    }, [pending, inputText, isLoading, sessionId, sendChatMessage]);

    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: MAX_CHAT_IMAGES - pending.length,
        });
        if (!res.canceled) {
            setPending((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_CHAT_IMAGES));
        }
    };

    const handleCameraCapture = (photos: { uri: string }[]) => {
        setCameraModalVisible(false);
        if (!photos.length) return;
        setPending((prev) => [...prev, ...photos.map((p) => p.uri)].slice(0, MAX_CHAT_IMAGES));
    };

    const sendCameraPhoto = useCallback(async (photos: { uri: string; caption?: string }[]) => {
        if (isLoading || !photos.length) return;
        hideSuggestions();
        setLoading(true);
        try {
            let activeSessionId = sessionId;
            for (const item of planCameraSend(photos)) {
                addMessage({ id: `m-${Date.now()}`, text: item.text, side: 'user', images: item.images });
                try {
                    const res = await sendChatMessage({ message: item.text, sessionId: activeSessionId, images: item.images }).unwrap();
                    if (res.sessionId) {
                        activeSessionId = res.sessionId;
                        setSessionId(res.sessionId);
                    }
                    addMessage({
                        id: `b-${Date.now()}`,
                        text: res.response || 'Şu an yanıt veremiyorum, birazdan tekrar dener misin?',
                        side: 'bot',
                    });
                } catch {
                    addMessage({
                        id: `b-${Date.now()}`,
                        text: 'Bağlantı sorunu yaşadım. Lütfen biraz sonra tekrar dene.',
                        side: 'bot',
                    });
                }
            }
        } finally {
            setLoading(false);
        }
    }, [isLoading, sessionId, sendChatMessage]);

    const handleSendLocation = (loc: ChatLocation) => {
        addMessage({ id: `m-${Date.now()}`, text: '', side: 'user', location: loc });
        hideSuggestions();
        setLocationModalVisible(false);
    };

    const attachMenuItems: AnchoredMenuItem[] = [
        { key: 'gallery', label: 'Galeriden Fotoğraf Seç', icon: 'image', onPress: pickFromGallery },
        { key: 'location', label: 'Konum Gönder', icon: 'map-pin', onPress: () => setLocationModalVisible(true) },
    ];

    const headerMenuItems: AnchoredMenuItem[] = [
        { key: 'refresh', label: 'Sohbeti Yenile', icon: 'refresh-ccw', onPress: () => resetChat() },
        {
            key: 'report',
            label: 'Hata Gönder',
            icon: 'alert-circle',
            danger: true,
            onPress: () => router.push('/complaint/assistant'),
        },
    ];

    const renderMessage = useCallback(({ item: message }: { item: any }) => {
        const isUser = message.side === 'user';
        const hasImages = !!message.images?.length;
        return (
            <Animated.View
                entering={FadeIn.duration(200)}
                className="w-full flex-row py-1 pb-3"
                style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
            >
                <View
                    className={`max-w-[80%] rounded-2xl overflow-hidden ${hasImages ? 'p-1' : ''} ${isUser
                        ? 'bg-gray-600 rounded-br-sm'
                        : 'bg-primary rounded-bl-sm'
                        }`}>
                    {hasImages && (
                        <ImageGrid
                            images={message.images}
                            onOpen={(i) => setViewer({ images: message.images, index: i })}
                        />
                    )}
                    {!!message.location && (
                        <View className="flex-row items-center px-4 py-3">
                            <Feather name="map-pin" size={16} color="#fff" />
                            <Text className="text-white font-urbanist text-sm ml-2 flex-1" numberOfLines={2}>
                                {message.location.address}
                            </Text>
                        </View>
                    )}
                    {!!message.text && (
                        <Text className="text-white font-urbanist text-sm leading-5 p-4">
                            {message.text}
                        </Text>
                    )}
                </View>
            </Animated.View>
        );
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    header: () => (
                        <SafeAreaView edges={['top']} className="bg-white border-b border-gray-100">
                            <View className="flex-row items-center justify-between px-1 h-14">
                                <Tappable onPress={() => router.back()} className="w-10 h-10 items-center justify-center" hitSlop={8}>
                                    <Feather name="chevron-left" size={24} color="#374151" />
                                </Tappable>
                                <View className="items-center justify-center">
                                    <View className="flex-row items-baseline">
                                        <Text className="text-primary font-bold text-lg font-urbanist">Yüksi</Text>
                                        <Text className="text-gray-900 font-bold text-base font-urbanist ml-1">kanguru</Text>
                                    </View>
                                    <Text className="text-primary text-xs font-semibold font-urbanist text-center">Aktif</Text>
                                </View>
                                <Tappable
                                    className="w-10 h-10 items-center justify-center"
                                    onPress={(e) => setMenuAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                                >
                                    <Feather name="more-vertical" size={20} color="#374151" />
                                </Tappable>
                            </View>
                        </SafeAreaView>
                    ),
                }}
            />
            <Modal visible={showIntroLoading} animationType="fade" statusBarTranslucent>
                <View className="flex-1 bg-white items-center justify-center">
                    <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
                        <View
                            style={{
                                position: 'absolute',
                                width: 140,
                                height: 140,
                                borderRadius: 70,
                                backgroundColor: '#FFEDE3',
                            }}
                        />
                        <Animated.View
                            style={[
                                {
                                    position: 'absolute',
                                    width: 140,
                                    height: 140,
                                    borderRadius: 70,
                                    borderWidth: 4,
                                    borderColor: '#FF5B04',
                                    borderTopColor: 'transparent',
                                },
                                introRingStyle,
                            ]}
                        />
                        <Image source={require('@/assets/kanguru.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
                    </View>
                    <Text className="text-gray-400 font-urbanist text-sm mt-6">Kanguru hazırlanıyor…</Text>
                </View>
            </Modal>
            <ImageBackground
                source={require('@/assets/background-motor-grey.jpg')}
                className="flex-1"
                resizeMode="cover"
            >
                <KeyboardAvoidingView
                    style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View className="flex-1 px-4">
                        <FlatList
                            data={[...messages].reverse()}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            inverted
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingTop: 20 }}
                            ListHeaderComponent={
                                isLoading ? (
                                    <View className="self-start bg-primary p-4 rounded-2xl rounded-bl-sm w-20 items-center justify-center mb-3">
                                        <ActivityIndicator color="white" size="small" />
                                    </View>
                                ) : null
                            }
                        />
                    </View>

                    {showSuggestions && (
                        <View className="px-4 pt-1 pb-2">
                            <View className="flex-row flex-wrap gap-2">
                                {suggestions.map((suggestion, index) => (
                                    <Tappable
                                        key={index}
                                        onPress={() => handleSend(suggestion)}
                                        className="bg-white/95 border border-primary/25 px-4 py-2 rounded-full shadow-sm"
                                    >
                                        <Text className="text-primary font-bold font-urbanist text-sm">{suggestion}</Text>
                                    </Tappable>
                                ))}
                            </View>
                        </View>
                    )}

                    {pending.length > 0 && (
                        <View className="px-4 pb-1 flex-row flex-wrap gap-2">
                            {pending.map((uri) => (
                                <View key={uri} className="w-14 h-14">
                                    <Image source={{ uri }} className="w-14 h-14 rounded-xl bg-gray-200" />
                                    <Tappable
                                        className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-gray-900 items-center justify-center"
                                        onPress={() => setPending((p) => p.filter((u) => u !== uri))}
                                        hitSlop={6}
                                    >
                                        <Feather name="x" size={11} color="#FFFFFF" />
                                    </Tappable>
                                </View>
                            ))}
                            {pending.length < MAX_CHAT_IMAGES && (
                                <Tappable
                                    className="w-14 h-14 rounded-xl border-[1.5px] border-dashed border-primary items-center justify-center"
                                    onPress={pickFromGallery}
                                >
                                    <Feather name="plus" size={20} color="#FF5B04" />
                                </Tappable>
                            )}
                        </View>
                    )}

                    <View className="p-4 bg-transparent" style={{ paddingBottom: inputBottomOffset }}>
                        <View className="flex-row gap-2">
                            <View className="flex-1 flex-row items-center bg-white/80 border border-primary rounded-full pl-3 pr-4 py-2 shadow-sm h-12">
                                {isListening ? (
                                    <View className="flex-1 flex-row items-center">
                                        <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
                                        <Text className="text-gray-900 font-urbanist text-base mr-3">
                                            Dinleniyor…
                                        </Text>
                                        <WaveformBars history={waveHistory} />
                                    </View>
                                ) : (
                                    <>
                                        <Tappable
                                            className="mr-2"
                                            onPress={(e) => setAttachAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                                        >
                                            <Feather name="paperclip" size={18} color="#FF5B04" />
                                        </Tappable>
                                        <TextInput
                                            className="flex-1 p-0 text-gray-900 font-urbanist text-base"
                                            placeholder="Soru sor"
                                            placeholderTextColor="#64748B"
                                            value={inputText}
                                            onChangeText={(text) => setInputText(text)}
                                            onSubmitEditing={() => handleSend(inputText)}
                                            returnKeyType="send"
                                        />
                                        {!inputText.trim() && !pending.length && (
                                            <Tappable className="ml-2" onPress={() => setCameraModalVisible(true)}>
                                                <Feather name="camera" size={18} color="#FF5B04" />
                                            </Tappable>
                                        )}
                                    </>
                                )}
                            </View>

                            <Tappable
                                onPress={handleActionPress}
                                className={`w-12 h-12 rounded-full items-center justify-center shadow-md ${isListening ? 'bg-red-500' : 'bg-primary active:bg-orange-600'}`}
                            >
                                <Feather
                                    name={isListening ? 'square' : ((inputText.trim() || pending.length > 0) ? 'send' : 'mic')}
                                    size={20}
                                    color="white"
                                />
                            </Tappable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </ImageBackground>

            <AnchoredMenu visible={!!menuAnchor} anchor={menuAnchor} items={headerMenuItems} onClose={() => setMenuAnchor(null)} />
            <AnchoredMenu visible={!!attachAnchor} anchor={attachAnchor} items={attachMenuItems} onClose={() => setAttachAnchor(null)} />
            <ChatLocationModal
                visible={locationModalVisible}
                onClose={() => setLocationModalVisible(false)}
                onSend={handleSendLocation}
            />
            <CameraCaptureModal
                visible={cameraModalVisible}
                onClose={() => setCameraModalVisible(false)}
                onCapture={handleCameraCapture}
                sendMode={{ onSend: sendCameraPhoto, placeholder: 'Mesaj yazın...' }}
            />
            <ChatImageViewer
                images={viewer?.images ?? []}
                startIndex={viewer?.index ?? 0}
                visible={!!viewer}
                onClose={() => setViewer(null)}
            />
        </SafeAreaView>
    );
}
