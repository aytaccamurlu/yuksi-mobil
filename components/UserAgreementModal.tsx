import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FF5B04';
const SCROLL_BOTTOM_THRESHOLD = 60;

type Section = { key: string; title: string; body: string[] };

const SECTIONS: Section[] = [
    {
        key: 'terms',
        title: 'Kullanım Şartları',
        body: [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Uygulamayı kullanarak bu şartları kabul etmiş sayılırsınız. Hesabınızın güvenliğinden, paylaştığınız bilgilerin doğruluğundan ve hesabınız üzerinden gerçekleştirilen işlemlerden bizzat siz sorumlusunuz.',
            'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Hizmetin kötüye kullanımı, sahte ilan, yanıltıcı içerik paylaşımı veya diğer kullanıcıların rahatsız edilmesi hesabınızın geçici ya da kalıcı olarak askıya alınmasına yol açabilir.',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Uygulama üzerinden sunulan taşıma ve pazar yeri hizmetleri önceden haber verilmeksizin güncellenebilir, sınırlandırılabilir veya durdurulabilir.',
            'Curabitur pretium tincidunt lacus, nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Ödeme, iptal ve iade koşulları ilgili sipariş ekranında ayrıca belirtilir.',
            'Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Bu şartlarda yapılacak değişiklikler uygulama içinden duyurulur ve yayımlandığı andan itibaren geçerli olur.',
            'Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non, commodo a, sodales sit amet, nisi.',
        ],
    },
    {
        key: 'kvkk',
        title: 'KVKK Aydınlatma Metni',
        body: [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, veri sorumlusu sıfatıyla ve yalnızca hizmetin sunulması amacıyla işlenir.',
            'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. İşlenen veriler arasında kimlik, iletişim, konum, işlem güvenliği ve kullanım verileri yer alabilir; bu veriler amaç dışında kullanılmaz.',
            'Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Verileriniz hizmet sağlayıcılar, ödeme kuruluşları ve yasal olarak yetkili kamu kurumları ile sınırlı ölçüde ve gerektiği kadar paylaşılabilir.',
            'Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Verileriniz, ilgili mevzuatta öngörülen veya işleme amacının gerektirdiği süre boyunca saklanır, sürenin sonunda silinir veya anonim hâle getirilir.',
            'Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Kanunun 11. maddesi uyarınca; verilerinize erişme, düzeltilmesini, silinmesini veya işlenmesine itiraz etme haklarına sahipsiniz.',
            'Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Bu haklarınızı kullanmak için uygulama içindeki destek kanallarından veya belirtilen iletişim adreslerinden başvurabilirsiniz.',
            'Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi.',
        ],
    },
    {
        key: 'consent',
        title: 'Açık Rıza Beyanı',
        body: [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. İşbu beyan ile; pazarlama, kampanya, tanıtım ve bilgilendirme amaçlı elektronik ileti (SMS, e-posta, anlık bildirim) gönderilmesine açık rıza gösterdiğinizi kabul edersiniz.',
            'Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Konum verinizin, size yakın ilanların ve kuryelerin gösterilmesi ile teslimat süresinin daha doğru hesaplanması amacıyla işlenmesine onay verirsiniz.',
            'Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Bu kapsamda verileriniz, hizmetin iyileştirilmesi ve size özel öneriler sunulması için analiz edilebilir.',
            'Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Rızanız, yalnızca bu beyanda belirtilen amaçlarla sınırlıdır ve üçüncü taraflara satılmaz.',
            'Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Verdiğiniz açık rızayı dilediğiniz zaman uygulama ayarlarından geri çekebilirsiniz.',
            'Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Rızanın geri çekilmesi, geri çekme tarihinden önceki işlemlerin hukuka uygunluğunu etkilemez.',
            'Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus.',
        ],
    },
];

export default function UserAgreementModal({
    visible,
    index,
    accepted,
    onAcceptedChange,
    onClose,
    readOnly = false,
}: {
    visible: boolean;
    index: number;
    accepted?: boolean[];
    onAcceptedChange?: (next: boolean[]) => void;
    onClose: () => void;
    readOnly?: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [isRead, setIsRead] = useState(false);
    const containerHeight = useRef(0);

    useEffect(() => {
        if (visible) {
            setIsRead(false);
            containerHeight.current = 0;
        }
    }, [visible, index]);

    const checkReadFromEvent = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
        if (contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_BOTTOM_THRESHOLD) {
            setIsRead(true);
        }
    };

    const handleScroll = checkReadFromEvent;
    const handleMomentumScrollEnd = checkReadFromEvent;
    const handleScrollEndDrag = checkReadFromEvent;

    const handleContentSizeChange = (_w: number, contentHeight: number) => {
        if (containerHeight.current > 0 && contentHeight <= containerHeight.current) {
            setIsRead(true);
        }
    };

    const handleAccept = () => {
        if (!isRead || !accepted || !onAcceptedChange) return;
        const next = accepted.slice();
        next[index] = true;
        onAcceptedChange(next);
        onClose();
    };

    const section = SECTIONS[index];

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            snapPoints={['100%']}
            topInset={insets.top + 34}
            backgroundStyle={s.background}
        >
            <View style={s.sheet}>
                <View style={s.header}>
                    <Text style={s.headerTitle} numberOfLines={2}>{section.title}</Text>
                    <Tappable style={s.closeBtn} onPress={onClose} hitSlop={8}>
                        <Feather name="x" size={18} color="#6B7280" />
                    </Tappable>
                </View>

                <BottomSheetScrollView
                    key={`${index}-${visible}`}
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, readOnly && { paddingBottom: 28 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    onScrollEndDrag={handleScrollEndDrag}
                    scrollEventThrottle={16}
                    onLayout={(e: LayoutChangeEvent) => { containerHeight.current = e.nativeEvent.layout.height; }}
                    onContentSizeChange={handleContentSizeChange}
                >
                    {section.body.map((p, i) => (
                        <Text key={i} style={s.paragraph}>{p}</Text>
                    ))}
                </BottomSheetScrollView>

                {!readOnly && (
                    <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
                        {!isRead && <Text style={s.hint}>Onaylamak için metnin tamamını okuyun.</Text>}
                        <View style={s.actions}>
                            <Tappable style={s.closeTextBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={s.closeTextBtnText}>Kapat</Text>
                            </Tappable>
                            <Tappable
                                style={[s.acceptBtn, !isRead && s.acceptBtnDisabled]}
                                onPress={handleAccept}
                                disabled={!isRead}
                                activeOpacity={0.85}
                                haptic="medium"
                            >
                                <Text style={s.acceptBtnText}>Okudum, Kabul Ediyorum</Text>
                            </Tappable>
                        </View>
                    </View>
                )}
            </View>
        </AppBottomSheet>
    );
}

const s = StyleSheet.create({
    background: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
    sheet: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 12,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F1F1',
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827' },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
    paragraph: { fontSize: 13, lineHeight: 21, color: '#4B5563', marginBottom: 13 },

    footer: {
        borderTopWidth: 1,
        borderTopColor: '#F1F1F1',
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    hint: { fontSize: 11.5, color: '#9CA3AF', textAlign: 'center', marginBottom: 10 },
    actions: { flexDirection: 'row', gap: 10 },
    closeTextBtn: {
        flex: 1,
        height: 50,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeTextBtnText: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
    acceptBtn: {
        flex: 2,
        height: 50,
        borderRadius: 26,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtnDisabled: { backgroundColor: '#F0B79A' },
    acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
