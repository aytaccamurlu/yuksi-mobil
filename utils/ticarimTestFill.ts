import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '@/store/app';
import TicarimService from '@/service/ticarim.service';
import { patchTicarimDraft } from '@/store/feature/ticarim/actions';
import { CATEGORY_ID_TO_KEY } from '@/utils/ticarim';
import { TicarimDraft } from '@/store/feature/ticarim/slice';

const COUNTER_KEY = 'ticarim_test_listing_counter';

const LOCATIONS = ['Kadıköy/İstanbul', 'Çankaya/Ankara', 'Konak/İzmir', 'Nilüfer/Bursa', 'Muratpaşa/Antalya'];
const CONDITIONS = ['Sıfır', 'İkinci El', 'Hasarlı'];
const FUEL_TYPES = ['Benzin', 'Dizel', 'LPG', 'Elektrik', 'Hibrit', 'Diğer'];
const GEARS = ['Manuel', 'Otomatik', 'Yarı Otomatik'];
const COOLINGS = ['Hava', 'Sıvı'];
const COLORS = ['Beyaz', 'Siyah', 'Gri', 'Gümüş', 'Kırmızı', 'Mavi', 'Lacivert', 'Yeşil', 'Sarı', 'Turuncu', 'Kahverengi', 'Bej', 'Mor'];
const ORIGINS = ['Türkiye', 'Almanya', 'Japonya', 'Güney Kore', 'İtalya'];
const FROM_OPTIONS = ['Sahibinden', 'Galeriden'];
const TRADE_OPTIONS = ['Olur', 'Olmaz'];
const TRANSMISSIONS = ['4 Zamanlı', 'Otomatik Şanzıman', 'Manuel Şanzıman', 'CVT'];

const DESC_OPENERS = [
    'Aracım düzenli bakımlıdır ve hiç değişeni yoktur.',
    'Tek elden çıkma, hasar kaydı bulunmamaktadır.',
    'Günlük kullanılmıştır, mekanik ve kaporta olarak sorunsuzdur.',
    'Garaj arabasıdır, özenle kullanılmıştır.',
    'Periyodik bakımları yetkili serviste yaptırılmıştır.',
];
const DESC_BODY = [
    'Lastikleri yeni değişmiştir.',
    'Klima gazı dolumu yeni yapılmıştır.',
    'Aküsü yeni değişmiştir.',
    'Yağ bakımı yeni yapılmıştır.',
    'Boyasız, orijinal parçalardan oluşmaktadır.',
    'İç mekan temiz ve bakımlıdır.',
    'Ekspertiz raporu mevcuttur, talep halinde gösterilebilir.',
    'Kullanım kılavuzu ve servis kayıtları eksiksizdir.',
];
const DESC_CLOSERS = [
    'Ciddi alıcılarla pazarlık payı vardır.',
    'Muayenesi ve vergisi günceldir.',
    'Detaylı bilgi ve randevu için mesaj atabilirsiniz.',
    'Hafta içi her saat görülebilir.',
];

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const pickMany = <T,>(list: T[], count: number): T[] => [...list].sort(() => Math.random() - 0.5).slice(0, count);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const nextListingNumber = async (): Promise<number> => {
    const raw = await AsyncStorage.getItem(COUNTER_KEY);
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(COUNTER_KEY, String(next));
    return next;
};

const randomDescription = (): string => {
    const sentences = [
        pick(DESC_OPENERS),
        ...pickMany(DESC_BODY, randomInt(2, 4)),
        pick(DESC_CLOSERS),
        `Referans: TA-${randomInt(1000, 9999)}.`,
    ];
    return sentences.join(' ');
};

const randomYear = () => String(randomInt(2005, new Date().getFullYear()));

export const fillRandomTicarimDraft = async (): Promise<Partial<TicarimDraft> | null> => {
    const categories = await store.dispatch(TicarimService.endpoints.getCategories.initiate(undefined, { forceRefetch: true })).unwrap();
    if (!categories?.length) return null;
    const category = pick(categories);

    const [brands, vehicleTypes] = await Promise.all([
        store.dispatch(TicarimService.endpoints.getBrands.initiate({ categoryId: category.id }, { forceRefetch: true })).unwrap(),
        store.dispatch(TicarimService.endpoints.getVehicleTypes.initiate({ categoryId: category.id }, { forceRefetch: true })).unwrap(),
    ]);
    if (!brands?.length || !vehicleTypes?.length) return null;
    const brand = pick(brands);
    const vehicleType = pick(vehicleTypes);

    const models = await store
        .dispatch(TicarimService.endpoints.getModels.initiate({ brandId: brand.id, categoryId: category.id }, { forceRefetch: true }))
        .unwrap();
    if (!models?.length) return null;
    const model = pick(models);

    const condition = pick(CONDITIONS);
    const number = await nextListingNumber();

    const patch: Partial<TicarimDraft> = {
        photos: pickMany(
            ['a', 'b', 'c', 'd', 'e'].map(() => `https://picsum.photos/seed/${Math.random().toString(36).slice(2)}/640/480`),
            randomInt(2, 3),
        ),
        categoryId: category.id,
        category: CATEGORY_ID_TO_KEY[category.id] || null,
        brand: brand.name,
        brandId: brand.id,
        model: model.name,
        modelId: model.id,
        vehicleType: vehicleType.name,
        vehicleTypeId: vehicleType.id,
        condition,
        conditionScore: condition === 'İkinci El' ? `10/${randomInt(4, 9)}` : '',
        location: pick(LOCATIONS),
        title: `Bu Bir Test İlanıdır ${number}`,
        description: randomDescription(),
        price: (randomInt(50, 1500) * 1000).toLocaleString('tr-TR'),
        fuelType: pick(FUEL_TYPES),
        year: randomYear(),
        km: randomInt(0, 250000).toLocaleString('tr-TR'),
        engineCc: String(randomInt(100, 6000)),
        transmissionType: pick(TRANSMISSIONS),
        cylinderCount: String(randomInt(1, 12)),
        gear: pick(GEARS),
        cooling: pick(COOLINGS),
        color: pick(COLORS),
        origin: pick(ORIGINS),
        plateNationality: 'TR',
        from: pick(FROM_OPTIONS),
        tradeAccepted: pick(TRADE_OPTIONS),
        securityInfo: 'İmmobilizer ve alarm sistemi mevcuttur.',
        accessoryInfo: 'Orijinal lastik ve jantlar dahildir.',
    };

    patchTicarimDraft(patch);
    return patch;
};
