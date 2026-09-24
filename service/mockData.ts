// Geçici mock backend verisi — yeni backend gelince bu dosya + mockBaseQuery.ts silinecek.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Paths } from "expo-file-system";
import { getNetworkUsageMb } from "@/utils/networkUsageTracker";

// ─── Test hesabı ─────────────────────────────────────────────

export const MOCK_CREDENTIALS = {
  email: "nomotetes.onetrue@icloud.com",
  password: "mert3543",
};

export const MOCK_USER = {
  userId: "mock-user-1",
  first_name: "Mert",
  last_name: "Yüksi",
  email: MOCK_CREDENTIALS.email,
  phone: "+905555555555",
  photo_url: null as string | null,
};

export const MOCK_TOKEN_SUFFIX = ".mock-signature";

export const isMockAccessToken = (token?: string | null): boolean =>
  !!token && token.endsWith(MOCK_TOKEN_SUFFIX);

// decodeJWT (utils/storage) ile çözülebilen yapıda sahte token üretir
const b64url = (str: string) => {
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4)];
    out += isNaN(b) ? "=" : B64[((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6)];
    out += isNaN(c) ? "=" : B64[c & 63];
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const makeMockToken = (extra: Record<string, any> = {}) => {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      userId: MOCK_USER.userId,
      sub: MOCK_USER.userId,
      email: MOCK_USER.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      ...extra,
    }),
  );
  return `${header}.${payload}${MOCK_TOKEN_SUFFIX}`;
};

// ─── Araçlar (GET /api/Vehicle) ──────────────────────────────

export const MOCK_VEHICLES = [
  {
    id: "veh-courier", productId: "veh-courier", template: "motorcycle", type: "courier", name: "Motorsiklet",
    capacityInfo: "Küçük paket ve koli taşımaya uygundur. Genellikle 20 kg'a kadar yükleri hızlı ve pratik şekilde teslim eder.",
  },
  {
    id: "veh-minivan", productId: "veh-minivan", template: "minivan", type: "minivan", name: "Minivan",
    capacityInfo: "Orta boy koli ve eşya taşımaya uygundur. Genellikle 500 kg'a kadar yük kapasitesine sahiptir.",
  },
  {
    id: "veh-panelvan", productId: "veh-panelvan", template: "panelvan", type: "panelvan", name: "Panelvan",
    capacityInfo: "Büyük koli ve ev eşyası taşımaya uygundur. Genellikle 1.000 kg'a kadar yük kapasitesine sahiptir.",
  },
  {
    id: "veh-pickup", productId: "veh-pickup", template: "pickup", type: "pickup", name: "Kamyonet",
    capacityInfo: "Orta ve büyük hacimli yükler için idealdir. Genellikle 1.500-3.500 kg arası yük taşıyabilir.",
  },
  {
    id: "veh-truck", productId: "veh-truck", template: "truck", type: "truck", name: "Kamyon",
    capacityInfo: "Ağır ve büyük hacimli yükler için tasarlanmıştır. Genellikle 3.500 kg üzerinde yük kapasitesine sahiptir.",
  },
];

// ─── Ticarim (araç ilan pazarı) kategorileri ──────────────────
export type TicarimCategory = "motorcycle" | "minivan" | "panelvan" | "pickup" | "truck";

export const TICARIM_CATEGORIES: { key: TicarimCategory; name: string }[] = [
  { key: "motorcycle", name: "Motorsiklet" },
  { key: "minivan", name: "Minivan" },
  { key: "panelvan", name: "Panelvan" },
  { key: "pickup", name: "Kamyonet" },
  { key: "truck", name: "Kamyon" },
];

export const MOCK_TICARIM_CATEGORIES = [
  { id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Motosiklet", slug: "motosiklet", icon_url: null, sort_order: 1, active_listing_count: 0 },
  { id: "7685bffa-8b5d-43ca-bf53-89efe93130fd", name: "Minivan", slug: "minivan", icon_url: null, sort_order: 2, active_listing_count: 0 },
  { id: "dbb2ee9c-c39c-4357-939e-e16fca0eed27", name: "Panelvan", slug: "panelvan", icon_url: null, sort_order: 3, active_listing_count: 0 },
  { id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Kamyonet", slug: "kamyonet", icon_url: null, sort_order: 4, active_listing_count: 0 },
  { id: "001f657c-987d-4077-a604-30954d3e34bb", name: "Kamyon", slug: "kamyon", icon_url: null, sort_order: 5, active_listing_count: 0 },
];

export const MOCK_TICARIM_BRANDS: Record<string, { id: string; name: string; slug: string }[]> = {
  "0175cb74-9cf8-4540-8eb1-5f84901b4a06": [{ id: "1251f998-8bc8-4a92-b127-5f026e90eb83", name: "Honda", slug: "honda" }],
  "7685bffa-8b5d-43ca-bf53-89efe93130fd": [
    { id: "bdc5e229-a195-4fd8-9fb2-7b5b787a7e43", name: "Volkswagen", slug: "volkswagen" },
    { id: "c8947717-98a5-4dad-9073-95ba8600f072", name: "Ford", slug: "ford" },
  ],
  "dbb2ee9c-c39c-4357-939e-e16fca0eed27": [
    { id: "bdc5e229-a195-4fd8-9fb2-7b5b787a7e43", name: "Volkswagen", slug: "volkswagen" },
    { id: "c8947717-98a5-4dad-9073-95ba8600f072", name: "Ford", slug: "ford" },
  ],
  "8bd3dba7-6666-499e-a170-dbc96c4fc70e": [
    { id: "1d967261-11ab-40a9-af94-c17c8021c918", name: "Isuzu", slug: "isuzu" },
    { id: "c8947717-98a5-4dad-9073-95ba8600f072", name: "Ford", slug: "ford" },
  ],
  "001f657c-987d-4077-a604-30954d3e34bb": [
    { id: "1d967261-11ab-40a9-af94-c17c8021c918", name: "Isuzu", slug: "isuzu" },
    { id: "48c8380a-991c-4111-a48d-45896981cf22", name: "Mercedes-Benz", slug: "mercedes-benz" },
  ],
};

export const MOCK_TICARIM_MODELS: Record<string, { id: string; brand_id: string; category_id: string; name: string; slug: string }[]> = {
  "1251f998-8bc8-4a92-b127-5f026e90eb83": [{ id: "a52a1360-98da-4ea7-9a55-48c229803cc7", brand_id: "1251f998-8bc8-4a92-b127-5f026e90eb83", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "PCX", slug: "pcx" }],
  "c8947717-98a5-4dad-9073-95ba8600f072": [
    { id: "b4f587bd-9b58-4b45-9208-f509088df4b8", brand_id: "c8947717-98a5-4dad-9073-95ba8600f072", category_id: "7685bffa-8b5d-43ca-bf53-89efe93130fd", name: "Transit Custom", slug: "transit-custom" },
    { id: "dbb7a957-186f-4fe8-93cf-b92b16a07ceb", brand_id: "c8947717-98a5-4dad-9073-95ba8600f072", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Ranger", slug: "ranger" },
  ],
  "bdc5e229-a195-4fd8-9fb2-7b5b787a7e43": [{ id: "0fbae8ef-79f1-41dd-badf-3a734e9d778f", brand_id: "bdc5e229-a195-4fd8-9fb2-7b5b787a7e43", category_id: "dbb2ee9c-c39c-4357-939e-e16fca0eed27", name: "Crafter", slug: "crafter" }],
  "48c8380a-991c-4111-a48d-45896981cf22": [{ id: "411f48fb-3f58-4caa-b6be-224217b95dea", brand_id: "48c8380a-991c-4111-a48d-45896981cf22", category_id: "001f657c-987d-4077-a604-30954d3e34bb", name: "Actros", slug: "actros" }],
};

export const MOCK_TICARIM_VEHICLE_TYPES: Record<string, { id: string; category_id: string; name: string; slug: string; sort_order: number }[]> = {
  "0175cb74-9cf8-4540-8eb1-5f84901b4a06": [
    { id: "4f14af0a-7f75-4c9b-9581-35b2f1008b98", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Scooter", slug: "scooter", sort_order: 1 },
    { id: "6be4a0dd-f786-431e-a378-734ae1150214", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Maxi Scooter", slug: "maxi-scooter", sort_order: 2 },
    { id: "5ab8e64f-726f-4ade-b944-50a7cfa40a89", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Naked", slug: "naked", sort_order: 3 },
    { id: "da36caed-e792-4417-a5d6-567e869f175e", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Touring", slug: "touring", sort_order: 4 },
    { id: "27030ccb-6fcc-43cd-9921-0756ef9bf363", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Elektrikli", slug: "elektrikli", sort_order: 5 },
    { id: "27c157bf-cf71-4748-93ac-4930a993a099", category_id: "0175cb74-9cf8-4540-8eb1-5f84901b4a06", name: "Kurye", slug: "kurye", sort_order: 6 },
  ],
  "7685bffa-8b5d-43ca-bf53-89efe93130fd": [
    { id: "e3afad0b-d515-4aa7-b22c-150a0dc09fe6", category_id: "7685bffa-8b5d-43ca-bf53-89efe93130fd", name: "Standart", slug: "standart", sort_order: 1 },
    { id: "9e7cecbc-67d2-4a41-baa9-81a44d4658f7", category_id: "7685bffa-8b5d-43ca-bf53-89efe93130fd", name: "Uzun şasi", slug: "uzun-sasi", sort_order: 2 },
  ],
  "dbb2ee9c-c39c-4357-939e-e16fca0eed27": [
    { id: "34c4e674-29c6-47d4-b6a8-5bf15aed90f0", category_id: "dbb2ee9c-c39c-4357-939e-e16fca0eed27", name: "Kapalı kasa", slug: "kapali-kasa", sort_order: 1 },
    { id: "7c279c0e-4ef9-4812-8b72-939f6cb12ef4", category_id: "dbb2ee9c-c39c-4357-939e-e16fca0eed27", name: "Frigorifik", slug: "frigorifik", sort_order: 2 },
  ],
  "8bd3dba7-6666-499e-a170-dbc96c4fc70e": [
    { id: "e3b0e8e4-1b3c-4728-a81b-f7ba86593fab", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Açık kasa", slug: "acik-kasa", sort_order: 1 },
    { id: "e383becd-c08d-4ef8-81da-810a84b021cf", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Kapalı kasa", slug: "kapali-kasa", sort_order: 2 },
    { id: "cf8a4420-358a-467f-837b-d6dc731c27ab", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Frigorifik", slug: "frigorifik", sort_order: 3 },
    { id: "201b42f1-46e5-4552-b8e8-59204d0cb1e0", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Damperli", slug: "damperli", sort_order: 4 },
    { id: "44eb2b18-04fd-4dbd-a59b-cac17881b396", category_id: "8bd3dba7-6666-499e-a170-dbc96c4fc70e", name: "Tenteli", slug: "tenteli", sort_order: 5 },
  ],
  "001f657c-987d-4077-a604-30954d3e34bb": [
    { id: "4c817dd1-3882-4b92-bc84-e5a9ec105d99", category_id: "001f657c-987d-4077-a604-30954d3e34bb", name: "Çekici", slug: "cekici", sort_order: 1 },
    { id: "9c99cc99-c212-4b3b-8870-04c3ce8e1ea2", category_id: "001f657c-987d-4077-a604-30954d3e34bb", name: "Kamyon", slug: "kamyon", sort_order: 2 },
    { id: "bd4087e5-2e43-49d9-8b60-1c6a97530a63", category_id: "001f657c-987d-4077-a604-30954d3e34bb", name: "Damperli", slug: "damperli", sort_order: 3 },
  ],
};

export type MockVehicleListing = {
  id: string;
  category: TicarimCategory;
  title: string;
  brand: string;
  model: string;
  price: number;
  location: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  createdAt: string;
  photos: string[];
  fuel?: string;
  condition: string;
  conditionScore?: string;
  type?: string;
  year?: number;
  km?: number;
  engineCc?: string;
  description: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  transmissionType?: string;
  cylinderCount?: string;
  gear?: string;
  cooling?: string;
  color?: string;
  origin?: string;
  plateNationality?: string;
  from?: string;
  tradeAccepted?: string;
  securityInfo?: string;
  accessoryInfo?: string;
};

const listingPhoto = (seed: string) => `https://picsum.photos/seed/${seed}/640/480`;

export const SEED_VEHICLE_LISTINGS: MockVehicleListing[] = [
  {
    id: "lst-1001",
    category: "motorcycle",
    title: "Abush PCX 125",
    brand: "Abush",
    model: "PCX125",
    price: 100000,
    location: "Kestel/Bursa",
    distanceKm: 15,
    latitude: 40.2168,
    longitude: 29.3417,
    rating: 4,
    reviewCount: 60,
    verified: true,
    createdAt: "2026-08-30T09:00:00.000Z",
    photos: [listingPhoto("pcx125-1"), listingPhoto("pcx125-2"), listingPhoto("pcx125-3")],
    fuel: "Benzin",
    condition: "İkinci El",
    conditionScore: "10/8.5",
    type: "Scooter / Maxi Scooter",
    year: 2024,
    km: 48000,
    engineCc: "25 hp'e kadar",
    description:
      "Kebapçıdan satılık taşıma boxlı kilometresi düşük motor. Bakımları düzenli yapıldı, değişensiz orijinal.",
    phone: "+905558887766",
    ownerName: "Nedim Usta",
  },
  {
    id: "lst-1002",
    category: "motorcycle",
    title: "Honda Forza 300",
    brand: "Honda",
    model: "Forza 300",
    price: 285000,
    location: "Osmangazi/Bursa",
    distanceKm: 8,
    latitude: 40.1885,
    longitude: 29.0610,
    rating: 5,
    reviewCount: 34,
    verified: true,
    createdAt: "2026-08-27T11:00:00.000Z",
    photos: [listingPhoto("forza-1"), listingPhoto("forza-2")],
    fuel: "Benzin",
    condition: "İkinci El",
    conditionScore: "10/9",
    type: "Scooter / Maxi Scooter",
    year: 2023,
    km: 12500,
    engineCc: "300cc",
    description: "Tek elden, hatasız, garaj arabası. Takas değerlendirilir.",
    phone: "+905321112233",
    ownerName: "Kemal Bey",
  },
  {
    id: "lst-1003",
    category: "minivan",
    title: "Volkswagen Caddy 2.0 TDI",
    brand: "Volkswagen",
    model: "Caddy",
    price: 950000,
    location: "Nilüfer/Bursa",
    distanceKm: 22,
    latitude: 40.2154,
    longitude: 28.9636,
    rating: 4,
    reviewCount: 18,
    verified: false,
    createdAt: "2026-08-25T14:30:00.000Z",
    photos: [listingPhoto("caddy-1"), listingPhoto("caddy-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/7",
    type: "Panel / Kamyonet",
    year: 2019,
    km: 142000,
    engineCc: "2000cc",
    description: "Ticari araç, düzenli bakımlı, klimalı. Fatura ve servis kayıtları mevcuttur.",
    phone: "+905434445566",
    ownerName: "Serkan Nakliyat",
  },
  {
    id: "lst-1004",
    category: "panelvan",
    title: "Ford Transit Panelvan",
    brand: "Ford",
    model: "Transit",
    price: 1450000,
    location: "Yıldırım/Bursa",
    distanceKm: 11,
    latitude: 40.1958,
    longitude: 29.1080,
    rating: 4,
    reviewCount: 27,
    verified: true,
    createdAt: "2026-08-20T08:15:00.000Z",
    photos: [listingPhoto("transit-1"), listingPhoto("transit-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Panelvan",
    year: 2021,
    km: 89000,
    engineCc: "2200cc",
    description: "Uzun şasi, yüksek tavan. Nakliye filosundan çıkma, tek sahibinden.",
    phone: "+905367778899",
    ownerName: "Ahmet Lojistik",
  },
  {
    id: "lst-1005",
    category: "pickup",
    title: "Isuzu D-Max Kamyonet",
    brand: "Isuzu",
    model: "D-Max",
    price: 1650000,
    location: "Gemlik/Bursa",
    distanceKm: 34,
    latitude: 40.4297,
    longitude: 29.1564,
    rating: 5,
    reviewCount: 12,
    verified: true,
    createdAt: "2026-08-18T10:00:00.000Z",
    photos: [listingPhoto("dmax-1"), listingPhoto("dmax-2")],
    fuel: "Dizel",
    condition: "Sıfır",
    type: "Kamyonet",
    year: 2026,
    km: 10,
    engineCc: "1900cc",
    description: "Sıfır kilometre, faturalı, tüm renk seçenekleri mevcuttur.",
    phone: "+905551239900",
    ownerName: "Bursa Isuzu Bayi",
  },
  {
    id: "lst-1006",
    category: "truck",
    title: "Mercedes Actros 1848",
    brand: "Mercedes",
    model: "Actros 1848",
    price: 4200000,
    location: "Kestel/Bursa",
    distanceKm: 17,
    latitude: 40.2205,
    longitude: 29.3480,
    rating: 4,
    reviewCount: 9,
    verified: false,
    createdAt: "2026-08-12T13:45:00.000Z",
    photos: [listingPhoto("actros-1"), listingPhoto("actros-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Çekici",
    year: 2020,
    km: 310000,
    engineCc: "12800cc",
    description: "Otomatik vites, hava yataklı, yeni lastikli. Muayenesi ve vergisi güncel.",
    phone: "+905311234567",
    ownerName: "Yıldız Nakliyat",
  },
];

// Yalnızca mock oturumunda görünür (bkz. isMockAccessToken) — mockBaseQuery filtreler.
export const EXTRA_VEHICLE_LISTINGS: MockVehicleListing[] = [
  {
    id: "lst-2001",
    category: "motorcycle",
    title: "Yamaha NMAX 155",
    brand: "Yamaha",
    model: "NMAX 155",
    price: 165000,
    location: "Nilüfer/Bursa",
    distanceKm: 6,
    latitude: 40.2201,
    longitude: 28.9701,
    rating: 5,
    reviewCount: 21,
    verified: true,
    createdAt: "2026-08-29T09:30:00.000Z",
    photos: [listingPhoto("nmax-1"), listingPhoto("nmax-2")],
    fuel: "Benzin",
    condition: "İkinci El",
    conditionScore: "10/9",
    type: "Scooter / Maxi Scooter",
    year: 2023,
    km: 6200,
    engineCc: "155cc",
    description: "Kusursuz, ilk sahibinden. Kasko dahil devredilebilir.",
    phone: "+905052223344",
    ownerName: "Onur K.",
  },
  {
    id: "lst-2002",
    category: "motorcycle",
    title: "Suzuki Burgman 400",
    brand: "Suzuki",
    model: "Burgman 400",
    price: 320000,
    location: "Şişli/İstanbul",
    distanceKm: 19,
    latitude: 41.0602,
    longitude: 28.9877,
    rating: 4,
    reviewCount: 15,
    verified: false,
    createdAt: "2026-08-24T16:10:00.000Z",
    photos: [listingPhoto("burgman-1"), listingPhoto("burgman-2")],
    fuel: "Benzin",
    condition: "İkinci El",
    conditionScore: "10/7.5",
    type: "Scooter / Maxi Scooter",
    year: 2021,
    km: 24000,
    engineCc: "400cc",
    description: "Şehir içi kullanım, düzenli yağ ve triger bakımlı.",
    phone: "+905063334455",
    ownerName: "Barış Y.",
  },
  {
    id: "lst-2003",
    category: "motorcycle",
    title: "Kawasaki Z900",
    brand: "Kawasaki",
    model: "Z900",
    price: 780000,
    location: "Kadıköy/İstanbul",
    distanceKm: 12,
    latitude: 40.9908,
    longitude: 29.0303,
    rating: 5,
    reviewCount: 8,
    verified: true,
    createdAt: "2026-08-22T12:00:00.000Z",
    photos: [listingPhoto("z900-1"), listingPhoto("z900-2")],
    fuel: "Benzin",
    condition: "İkinci El",
    conditionScore: "10/9",
    type: "Naked",
    year: 2022,
    km: 8100,
    engineCc: "948cc",
    description: "Hatasız, boyasız. Akrapovic egzoz ile birlikte satılık.",
    phone: "+905074445566",
    ownerName: "Deniz T.",
  },
  {
    id: "lst-2004",
    category: "minivan",
    title: "Fiat Doblo Cargo",
    brand: "Fiat",
    model: "Doblo Cargo",
    price: 720000,
    location: "Bornova/İzmir",
    distanceKm: 9,
    latitude: 38.4620,
    longitude: 27.2166,
    rating: 4,
    reviewCount: 11,
    verified: true,
    createdAt: "2026-08-19T08:45:00.000Z",
    photos: [listingPhoto("doblo-1"), listingPhoto("doblo-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Panel / Kamyonet",
    year: 2020,
    km: 98000,
    engineCc: "1600cc",
    description: "Esnaf aracı, klimalı, yeni kayış-triger yapıldı.",
    phone: "+905085556677",
    ownerName: "Hakan Ticaret",
  },
  {
    id: "lst-2005",
    category: "minivan",
    title: "Renault Kangoo",
    brand: "Renault",
    model: "Kangoo",
    price: 640000,
    location: "Çankaya/Ankara",
    distanceKm: 14,
    latitude: 39.9078,
    longitude: 32.8607,
    rating: 4,
    reviewCount: 6,
    verified: false,
    createdAt: "2026-08-15T14:20:00.000Z",
    photos: [listingPhoto("kangoo-1"), listingPhoto("kangoo-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/7",
    type: "Panel / Kamyonet",
    year: 2019,
    km: 121000,
    engineCc: "1500cc",
    description: "Tek elden, servis bakımlı, hasar kaydı yok.",
    phone: "+905096667788",
    ownerName: "Murat A.",
  },
  {
    id: "lst-2006",
    category: "panelvan",
    title: "Iveco Daily Panelvan",
    brand: "Iveco",
    model: "Daily",
    price: 1780000,
    location: "Osmangazi/Bursa",
    distanceKm: 21,
    latitude: 40.1820,
    longitude: 29.0685,
    rating: 4,
    reviewCount: 7,
    verified: true,
    createdAt: "2026-08-21T10:15:00.000Z",
    photos: [listingPhoto("daily-1"), listingPhoto("daily-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Panelvan",
    year: 2021,
    km: 76000,
    engineCc: "2300cc",
    description: "Uzun şasi, soğutmalı kasa, gıda taşımacılığına uygun.",
    phone: "+905107778899",
    ownerName: "Efe Lojistik",
  },
  {
    id: "lst-2007",
    category: "panelvan",
    title: "Mercedes Sprinter Panelvan",
    brand: "Mercedes",
    model: "Sprinter",
    price: 2150000,
    location: "Beşiktaş/İstanbul",
    distanceKm: 16,
    latitude: 41.0430,
    longitude: 29.0094,
    rating: 5,
    reviewCount: 13,
    verified: true,
    createdAt: "2026-08-16T09:00:00.000Z",
    photos: [listingPhoto("sprinter-1"), listingPhoto("sprinter-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/9",
    type: "Panelvan",
    year: 2022,
    km: 54000,
    engineCc: "2100cc",
    description: "Yüksek tavan, uzun şasi, garantisi devam ediyor.",
    phone: "+905118889900",
    ownerName: "Star Nakliyat",
  },
  {
    id: "lst-2008",
    category: "pickup",
    title: "Ford Ranger",
    brand: "Ford",
    model: "Ranger",
    price: 1890000,
    location: "Konak/İzmir",
    distanceKm: 25,
    latitude: 38.4192,
    longitude: 27.1287,
    rating: 4,
    reviewCount: 10,
    verified: false,
    createdAt: "2026-08-14T11:30:00.000Z",
    photos: [listingPhoto("ranger-1"), listingPhoto("ranger-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Kamyonet",
    year: 2021,
    km: 63000,
    engineCc: "2000cc",
    description: "4x4, deri döşeme, çekme demiri takılı.",
    phone: "+905129990011",
    ownerName: "Volkan D.",
  },
  {
    id: "lst-2009",
    category: "pickup",
    title: "Toyota Hilux",
    brand: "Toyota",
    model: "Hilux",
    price: 2050000,
    location: "Keçiören/Ankara",
    distanceKm: 30,
    latitude: 39.9884,
    longitude: 32.8544,
    rating: 5,
    reviewCount: 17,
    verified: true,
    createdAt: "2026-08-10T15:45:00.000Z",
    photos: [listingPhoto("hilux-1"), listingPhoto("hilux-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/9",
    type: "Kamyonet",
    year: 2022,
    km: 41000,
    engineCc: "2400cc",
    description: "Efsane dayanıklılık, tek sahibinden, tüm bakımları yetkili serviste.",
    phone: "+905131112233",
    ownerName: "Caner S.",
  },
  {
    id: "lst-2010",
    category: "truck",
    title: "Volvo FH16",
    brand: "Volvo",
    model: "FH16",
    price: 5100000,
    location: "Gemlik/Bursa",
    distanceKm: 28,
    latitude: 40.4340,
    longitude: 29.1490,
    rating: 4,
    reviewCount: 5,
    verified: true,
    createdAt: "2026-08-08T07:20:00.000Z",
    photos: [listingPhoto("fh16-1"), listingPhoto("fh16-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8",
    type: "Çekici",
    year: 2021,
    km: 245000,
    engineCc: "16100cc",
    description: "750 beygir, retarder'lı, uzun yol için hazır.",
    phone: "+905142223344",
    ownerName: "Toprak Nakliyat",
  },
  {
    id: "lst-2011",
    category: "truck",
    title: "Scania R450",
    brand: "Scania",
    model: "R450",
    price: 4650000,
    location: "Üsküdar/İstanbul",
    distanceKm: 20,
    latitude: 41.0226,
    longitude: 29.0244,
    rating: 4,
    reviewCount: 4,
    verified: false,
    createdAt: "2026-08-05T13:10:00.000Z",
    photos: [listingPhoto("r450-1"), listingPhoto("r450-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/7.5",
    type: "Çekici",
    year: 2019,
    km: 380000,
    engineCc: "12700cc",
    description: "Damperli römork ile birlikte de satılabilir, muayenesi güncel.",
    phone: "+905153334455",
    ownerName: "Fatih Karayolu",
  },
  {
    id: "lst-2012",
    category: "truck",
    title: "MAN TGX",
    brand: "MAN",
    model: "TGX",
    price: 4380000,
    location: "Yıldırım/Bursa",
    distanceKm: 13,
    latitude: 40.2010,
    longitude: 29.1145,
    rating: 5,
    reviewCount: 6,
    verified: true,
    createdAt: "2026-08-03T10:50:00.000Z",
    photos: [listingPhoto("tgx-1"), listingPhoto("tgx-2")],
    fuel: "Dizel",
    condition: "İkinci El",
    conditionScore: "10/8.5",
    type: "Çekici",
    year: 2020,
    km: 298000,
    engineCc: "12400cc",
    description: "Orijinal, hatasız, filodan çıkma. Servis kayıtları eksiksiz.",
    phone: "+905164445566",
    ownerName: "Kartal Lojistik",
  },
];

// ─── Gönderiler (alanlar transformJob'un beklediği şekilde) ──

const todayAt = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export type MockJob = Record<string, any>;

export const SEED_JOBS: MockJob[] = [
  // ─── Bekliyor (kurye henüz atanmadı) ──
  {
    id: "job-1001",
    deliveryType: "immediate",
    jobStatus: "pending",
    carrierType: "courier",
    vehicleType: "courier",
    courierName: "",
    pickupAddress: "Kadıköy, Moda Cd. No:12, İstanbul",
    dropoffAddress: "Beşiktaş, Barbaros Blv. No:45, İstanbul",
    totalPrice: 129.9,
    distanceKm: 6.4,
    createdAt: todayAt(9, 15),
  },
  {
    id: "job-1006",
    deliveryType: "immediate",
    jobStatus: "pending",
    carrierType: "panelvan",
    vehicleType: "panelvan",
    courierName: "",
    pickupAddress: "Üsküdar, Çengelköy Sahil Yolu No:8, İstanbul",
    dropoffAddress: "Kartal, Yakacık Cd. No:33, İstanbul",
    totalPrice: 210.0,
    distanceKm: 11.3,
    createdAt: todayAt(10, 5),
  },

  // ─── Kurye Atandı ──
  {
    id: "job-1002",
    deliveryType: "immediate",
    jobStatus: "assigned",
    carrierType: "minivan",
    vehicleType: "minivan",
    courierName: "Kağan İbrahim",
    courierConversationId: "conv-kagan",
    courierPhone: "+905339991122",
    plate: "34 KGN 12",
    pickupAddress: "Şişli, Halaskargazi Cd. No:200, İstanbul",
    dropoffAddress: "Bakırköy, İncirli Cd. No:8, İstanbul",
    totalPrice: 349.0,
    distanceKm: 14.2,
    createdAt: todayAt(11, 30),
  },
  {
    id: "job-1007",
    deliveryType: "scheduled",
    jobStatus: "assigned",
    carrierType: "kamyonet",
    vehicleType: "kamyonet",
    courierName: "Emre Şahin",
    courierConversationId: "conv-bambam",
    courierPhone: "+905352223344",
    plate: "34 EMR 77",
    pickupAddress: "Ataşehir, Barbaros Mah. No:19, İstanbul",
    dropoffAddress: "Pendik, Kurtköy Cd. No:41, İstanbul",
    deliveryDate: "10.09.2026",
    deliveryTime: "09:30",
    totalPrice: 480.0,
    distanceKm: 19.6,
    createdAt: todayAt(13, 20),
  },

  // ─── Teslim Alındı ──
  {
    id: "job-1008",
    deliveryType: "immediate",
    jobStatus: "picked_up",
    carrierType: "courier",
    vehicleType: "courier",
    courierName: "Deniz Yıldız",
    courierConversationId: "conv-chi",
    courierPhone: "+905363334455",
    plate: "34 DNZ 45",
    pickupAddress: "Beşiktaş, Ortaköy Meydanı No:5, İstanbul",
    dropoffAddress: "Sarıyer, Tarabya Cd. No:14, İstanbul",
    totalPrice: 165.0,
    distanceKm: 9.8,
    createdAt: todayAt(9, 50),
  },
  {
    id: "job-1009",
    deliveryType: "scheduled",
    jobStatus: "picked_up",
    carrierType: "minivan",
    vehicleType: "minivan",
    courierName: "Selin Kaya",
    courierConversationId: "conv-lucia",
    courierPhone: "+905374445566",
    plate: "34 SLN 21",
    pickupAddress: "Kadıköy, Bahariye Cd. No:88, İstanbul",
    dropoffAddress: "Maltepe, Cevizli Mah. No:60, İstanbul",
    deliveryDate: "09.09.2026",
    deliveryTime: "17:00",
    totalPrice: 395.0,
    distanceKm: 16.5,
    createdAt: daysAgo(1),
  },

  // ─── Yolda ──
  {
    id: "job-1003",
    deliveryType: "scheduled",
    jobStatus: "in_progress",
    carrierType: "panelvan",
    vehicleType: "panelvan",
    courierName: "Murat Demir",
    courierConversationId: "conv-mijan",
    courierPhone: "+905339998877",
    plate: "34 ABC 456",
    pickupAddress: "Ümraniye, Alemdağ Cd. No:77, İstanbul",
    dropoffAddress: "Maltepe, Bağdat Cd. No:310, İstanbul",
    deliveryDate: "12.09.2026",
    deliveryTime: "14:00",
    totalPrice: 720.0,
    distanceKm: 27.8,
    createdAt: todayAt(8, 0),
  },
  {
    id: "job-1010",
    deliveryType: "immediate",
    jobStatus: "in_progress",
    carrierType: "truck",
    vehicleType: "truck",
    courierName: "Hakan Öztürk",
    courierConversationId: "conv-chisom",
    courierPhone: "+905385556677",
    plate: "34 HKN 90",
    pickupAddress: "Zeytinburnu, Kazlıçeşme Mah. No:3, İstanbul",
    dropoffAddress: "Silivri, Fatih Mah. No:27, İstanbul",
    totalPrice: 1180.0,
    distanceKm: 58.2,
    createdAt: todayAt(7, 40),
  },

  // ─── Tamamlandı ──
  {
    id: "job-1004",
    deliveryType: "immediate",
    jobStatus: "completed",
    carrierType: "courier",
    vehicleType: "courier",
    courierName: "Burak Aslan",
    courierConversationId: "conv-aho",
    courierPhone: "+905396667788",
    plate: "34 KRY 789",
    pickupAddress: "Beyoğlu, İstiklal Cd. No:100, İstanbul",
    dropoffAddress: "Fatih, Vatan Cd. No:22, İstanbul",
    totalPrice: 95.5,
    distanceKm: 4.1,
    createdAt: daysAgo(3),
  },
  {
    id: "job-1011",
    deliveryType: "immediate",
    jobStatus: "completed",
    carrierType: "panelvan",
    vehicleType: "panelvan",
    courierName: "Ayşe Aydın",
    courierConversationId: "conv-afa",
    courierPhone: "+905407778899",
    plate: "34 AYS 63",
    pickupAddress: "Bahçelievler, Şirinevler Mah. No:9, İstanbul",
    dropoffAddress: "Avcılar, Firuzköy Bulvarı No:52, İstanbul",
    totalPrice: 265.0,
    distanceKm: 12.7,
    createdAt: daysAgo(6),
  },

  // ─── İptal ──
  {
    id: "job-1005",
    deliveryType: "scheduled",
    jobStatus: "cancelled",
    carrierType: "truck",
    vehicleType: "truck",
    courierName: "",
    pickupAddress: "Tuzla, Sanayi Mah. No:5, İstanbul",
    dropoffAddress: "Gebze, OSB 4. Cd. No:14, Kocaeli",
    totalPrice: 2450.0,
    distanceKm: 41.6,
    createdAt: daysAgo(10),
  },
  {
    id: "job-1012",
    deliveryType: "immediate",
    jobStatus: "cancelled",
    carrierType: "minivan",
    vehicleType: "minivan",
    courierName: "Onur Çelik",
    courierConversationId: "conv-nob",
    courierPhone: "+905418889900",
    plate: "34 ONR 18",
    pickupAddress: "Esenyurt, Kıraç Mah. No:21, İstanbul",
    dropoffAddress: "Beylikdüzü, Gürpınar Cd. No:6, İstanbul",
    totalPrice: 310.0,
    distanceKm: 8.9,
    createdAt: daysAgo(2),
  },
];

// ─── Bildirimler — title {{name}} yer tutucusu içerebilir ────

const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

export type MockNotification = {
  id: string;
  title: string;
  body?: string;
  hasImage?: boolean;
  createdAt: string;
};

export const SEED_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif-1",
    title: "Aramıza hoş geldin, {{name}}! 🎉",
    createdAt: minutesAgo(1),
  },
  {
    id: "notif-2",
    title: "Hesabın hazır",
    body: "Hesabın başarıyla oluşturuldu. Artık gönderi oluşturabilir, kuryeni harita üzerinden canlı takip edebilirsin.",
    createdAt: minutesAgo(5),
  },
  {
    id: "notif-3",
    title: "Gönderin yola çıktı",
    body: "Kuryeniz gönderinizi teslim almak üzere yola çıktı. Tahmini varış süresi 25 dakika.",
    hasImage: true,
    createdAt: hoursAgo(3),
  },
  {
    id: "notif-4",
    title: "Yeni özellik: Canlı kurye takibi",
    body: "Artık gönderilerinizin konumunu harita üzerinden anlık olarak takip edebilirsiniz. Aktif gönderilerinizde hemen deneyin.",
    createdAt: hoursAgo(20),
  },
  {
    id: "notif-5",
    title: "İlk gönderinde %20 indirim seni bekliyor",
    body: "Yüksi ailesine katıldığın için teşekkürler! İlk gönderinde geçerli indirim kodun: HOSGELDIN20",
    hasImage: true,
    createdAt: hoursAgo(30),
  },
];

// ─── Kayıtlı adresler (rota çifti: Nereden + Nereye, LocationData ile aynı) ──

export type MockAddress = Record<string, any>;

export const SEED_ADDRESSES: MockAddress[] = [
  {
    id: "addr-1",
    title: "Köfteci Yusuf",
    from: {
      latitude: 40.2168,
      longitude: 29.3417,
      address: "Ahmet Vefikpaşa, OSB Mahallesi, Bursa Caddesi No:73, Kestel/Bursa",
      addressDetails: {
        city: "Bursa",
        district: "Kestel",
        neighborhood: "Ahmet Vefikpaşa OSB Mahallesi",
        street: "Bursa Caddesi",
        buildingNo: "73",
        doorNo: "",
      },
    },
    to: {
      latitude: 40.2201,
      longitude: 29.3355,
      address: "Köfteci Yusuf, Kestel/Bursa",
      addressDetails: {
        city: "Bursa",
        district: "Kestel",
        neighborhood: "",
        street: "",
        buildingNo: "",
        doorNo: "",
      },
    },
  },
  {
    id: "addr-2",
    title: "Ev - İş",
    from: {
      latitude: 40.9808,
      longitude: 29.0253,
      address: "Caferağa, Moda Caddesi No:12, Kadıköy/İstanbul",
      addressDetails: {
        city: "İstanbul",
        district: "Kadıköy",
        neighborhood: "Caferağa",
        street: "Moda Caddesi",
        buildingNo: "12",
        doorNo: "",
      },
    },
    to: {
      latitude: 41.0672,
      longitude: 28.9915,
      address: "Mecidiyeköy, Büyükdere Caddesi No:120, Şişli/İstanbul",
      addressDetails: {
        city: "İstanbul",
        district: "Şişli",
        neighborhood: "Mecidiyeköy",
        street: "Büyükdere Caddesi",
        buildingNo: "120",
        doorNo: "",
      },
    },
  },
];

// ─── Mesajlar (GET /api/messages/conversations) ──────────────

export type MockConversation = {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  status: "online" | "away" | "offline";
  blocked?: boolean;
  muted?: boolean;
};

export type MockMessageReply = { image?: string; text?: string; side: "me" | "them" };
export type MockMessageLocation = { label: string; lat: number; lng: number; url: string };
export type MockMessageCall = {
  direction: "out" | "in";
  status: "completed" | "missed" | "cancelled" | "declined";
  durationSec: number;
};
export type MockMessage = {
  id: string;
  text?: string;
  images?: string[];
  location?: MockMessageLocation | null;
  call?: MockMessageCall | null;
  side: "me" | "them";
  createdAt: string;
  replyTo?: MockMessageReply | null;
};

const flk = (keywords: string, lock: number) =>
  `https://loremflickr.com/640/480/${keywords}?lock=${lock}`;
const geo = (label: string, lat: number, lng: number): MockMessageLocation => ({
  label,
  lat,
  lng,
  url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
});

export type MockBanner = {
  id: string;
  imageUrl: string;
  link: string;
};

// Backend hazır olana kadar boş — Home ekranı bunun yerine bir placeholder gösteriyor.
export const SEED_BANNERS: MockBanner[] = [];

export const SEED_CONVERSATIONS: MockConversation[] = [
  { id: "conv-kagan", name: "Kağan İbrahim", avatar: "https://i.pravatar.cc/150?img=12", lastMessage: "Belirtilen saatte depoda olacağım.", time: "16:27", unread: 1, status: "online" },
  { id: "conv-bambam", name: "Emre Şahin", avatar: "https://i.pravatar.cc/150?img=13", lastMessage: "Teslim edildi, alıcı memnun.", time: "16:12", unread: 0, status: "online" },
  { id: "conv-chi", name: "Deniz Yıldız", avatar: "https://i.pravatar.cc/150?img=32", lastMessage: "Aracı yola çıkınca haber verir misiniz?", time: "15:40", unread: 2, status: "online" },
  { id: "conv-lucia", name: "Selin Kaya", avatar: "https://i.pravatar.cc/150?img=45", lastMessage: "Tamam, kırılacakları önceden paketlerim.", time: "15:05", unread: 0, status: "away" },
  { id: "conv-mijan", name: "Murat Demir", avatar: "https://i.pravatar.cc/150?img=33", lastMessage: "Raporu mailine attım, eline sağlık.", time: "14:10", unread: 0, status: "away" },
  { id: "conv-chisom", name: "Hakan Öztürk", avatar: "https://i.pravatar.cc/150?img=20", lastMessage: "Doblo'nun fotoğraflarını bu akşam atarım.", time: "13:02", unread: 0, status: "offline" },
  { id: "conv-afa", name: "Ayşe Aydın", avatar: "https://i.pravatar.cc/150?img=44", lastMessage: "Yarın 14:00'te depoda görüşürüz.", time: "11:48", unread: 0, status: "offline" },
  { id: "conv-aho", name: "Burak Aslan", avatar: "https://i.pravatar.cc/150?img=24", lastMessage: "Cuma da olmadı. Bu iş böyle yürümüyor.", time: "11:30", unread: 0, status: "offline" },
  { id: "conv-nob", name: "Onur Çelik", avatar: "https://i.pravatar.cc/150?img=5", lastMessage: "Anlaştık, sabah araç planını atarım.", time: "10:15", unread: 0, status: "offline" },
];

const msgAt = (h: number, m: number): string => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const msgDaysAgo = (n: number, h: number, m: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const SEED_MESSAGES: Record<string, MockMessage[]> = {
  "conv-kagan": [
    { id: "km-1", text: "Merhaba, Ticarim'deki kamyon hâlâ duruyor mu?", side: "me", createdAt: msgDaysAgo(2, 10, 5) },
    { id: "km-2", text: "Merhaba, duruyor", side: "them", createdAt: msgDaysAgo(2, 10, 12) },
    { id: "km-3", text: "ilgileniyorsanız fotoğraf atayım", side: "them", createdAt: msgDaysAgo(2, 10, 12) },
    { id: "km-4", text: "olur atın", side: "me", createdAt: msgDaysAgo(2, 10, 15) },
    { id: "km-5", images: [flk("truck", 101), flk("semi-truck", 102)], side: "them", createdAt: msgDaysAgo(2, 10, 18) },
    { id: "km-6", text: "dış hali böyle", side: "them", createdAt: msgDaysAgo(2, 10, 18) },
    { id: "km-7", text: "kabin içini de görebilir miyim", side: "me", createdAt: msgDaysAgo(2, 10, 26) },
    { id: "km-8", images: [flk("pickup-truck", 103), flk("truck", 104), flk("truck", 105), flk("semi-truck", 106), flk("pickup-truck", 107), flk("truck", 108)], side: "them", createdAt: msgDaysAgo(2, 10, 33) },
    { id: "km-9", text: "içi de bakımlı, lastikler geçen ay değişti", side: "them", createdAt: msgDaysAgo(2, 10, 34) },
    { id: "km-10", text: "km kaç", side: "me", createdAt: msgDaysAgo(2, 10, 40) },
    { id: "km-11", text: "320 binde", side: "them", createdAt: msgDaysAgo(2, 10, 41), replyTo: { text: "km kaç", side: "me" } },
    { id: "km-12", text: "motor şanzıman orijinal, kaza kaydı yok", side: "them", createdAt: msgDaysAgo(2, 10, 41) },
    { id: "km-13", text: "fiyatta pazarlık var mı", side: "me", createdAt: msgDaysAgo(1, 9, 2) },
    { id: "km-14", text: "peşinde konuşuruz", side: "them", createdAt: msgDaysAgo(1, 9, 10) },
    { id: "km-15", text: "aracı görmek isterim", side: "me", createdAt: msgDaysAgo(1, 9, 12) },
    { id: "km-15c", call: { direction: "out", status: "completed", durationSec: 642 }, side: "me", createdAt: msgDaysAgo(1, 9, 14) },
    { id: "km-16", text: "Kestel'deki depoda, yarın öğleden sonra oradayım", side: "them", createdAt: msgDaysAgo(1, 9, 15) },
    { id: "km-17", location: geo("Kestel OSB Deposu", 40.2168, 29.3417), side: "them", createdAt: msgDaysAgo(1, 9, 16) },
    { id: "km-18", text: "girişte beni ara, içeri alırım", side: "them", createdAt: msgDaysAgo(1, 9, 16) },
    { id: "km-19", text: "şuraya mı geliyorum https://www.google.com/maps/search/?api=1&query=40.2168,29.3417", side: "me", createdAt: msgAt(16, 20) },
    { id: "km-20", text: "aynen oraya", side: "them", createdAt: msgAt(16, 21) },
    { id: "km-21", text: "ruhsat ve servis dosyası yanımda olur", side: "them", createdAt: msgAt(16, 22) },
    { id: "km-22", text: "muayenesi ne zamana kadar", side: "me", createdAt: msgAt(16, 24) },
    { id: "km-23", text: "şubat 2027", side: "them", createdAt: msgAt(16, 25), replyTo: { text: "muayenesi ne zamana kadar", side: "me" } },
    { id: "km-24", text: "tamam yarın görüşürüz", side: "me", createdAt: msgAt(16, 26) },
    { id: "km-25", text: "belirtilen saatte depoda olacağım", side: "them", createdAt: msgAt(16, 27) },
  ],
  "conv-bambam": [
    { id: "bm-1", text: "emre bugün nilüfer'de 3 teslimatım var", side: "me", createdAt: msgAt(13, 40) },
    { id: "bm-2", text: "sen o taraftaydın di mi", side: "me", createdAt: msgAt(13, 40) },
    { id: "bm-3", text: "evet görükle'deyim", side: "them", createdAt: msgAt(13, 44) },
    { id: "bm-4", text: "yoğunsan birini alırım", side: "them", createdAt: msgAt(13, 44) },
    { id: "bm-5", text: "2si acil, en uzağı sana kalsa süper olur", side: "me", createdAt: msgAt(13, 47) },
    { id: "bm-6", text: "at gelsin", side: "them", createdAt: msgAt(13, 48) },
    { id: "bm-6b", call: { direction: "in", status: "completed", durationSec: 128 }, side: "them", createdAt: msgAt(13, 49) },
    { id: "bm-7", location: geo("Teslim noktası – Nilüfer, FSM Bulvarı", 40.2265, 28.9861), side: "me", createdAt: msgAt(13, 50) },
    { id: "bm-8", text: "aldım, 20 dk'da oradayım", side: "them", createdAt: msgAt(13, 53) },
    { id: "bm-9", text: "alıcı no?", side: "them", createdAt: msgAt(13, 53) },
    { id: "bm-10", text: "0532 114 22 88", side: "me", createdAt: msgAt(13, 55), replyTo: { text: "alıcı no?", side: "them" } },
    { id: "bm-11", text: "kapıda nakit", side: "me", createdAt: msgAt(13, 55) },
    { id: "bm-12", images: [flk("package", 111), flk("cardboard-box", 112), flk("package", 116)], side: "me", createdAt: msgAt(13, 57) },
    { id: "bm-13", text: "paketler bunlar, ikisi de kırılabilir", side: "me", createdAt: msgAt(13, 57) },
    { id: "bm-14", text: "tamam dik taşırım", side: "them", createdAt: msgAt(14, 0), replyTo: { image: flk("package", 111), text: "paketler bunlar, ikisi de kırılabilir", side: "me" } },
    { id: "bm-15", text: "teslim edince atarım", side: "them", createdAt: msgAt(14, 0) },
    { id: "bm-16", text: "eyvallah kardeşim", side: "me", createdAt: msgAt(14, 2) },
    { id: "bm-17", images: [flk("delivery-van", 113)], side: "them", createdAt: msgAt(15, 30) },
    { id: "bm-18", text: "teslim ettim, adam memnun", side: "them", createdAt: msgAt(15, 30) },
    { id: "bm-19", text: "👍 sağ ol", side: "me", createdAt: msgAt(15, 32) },
  ],
  "conv-lucia": [
    { id: "lm-1", text: "merhaba, kadıköy'den ataşehir'e ev taşıyacağım", side: "them", createdAt: msgDaysAgo(1, 11, 0) },
    { id: "lm-2", text: "yardımcı olur musunuz", side: "them", createdAt: msgDaysAgo(1, 11, 0) },
    { id: "lm-3", text: "tabii, kaç oda", side: "me", createdAt: msgDaysAgo(1, 11, 18) },
    { id: "lm-4", text: "2+1", side: "them", createdAt: msgDaysAgo(1, 11, 22) },
    { id: "lm-5", text: "çıkışta asansör var, yeni evde yok, 3. kat", side: "them", createdAt: msgDaysAgo(1, 11, 23) },
    { id: "lm-6", text: "eşyayı görebilir miyim", side: "me", createdAt: msgDaysAgo(1, 11, 28) },
    { id: "lm-7", images: [flk("moving-boxes", 121), flk("living-room", 122), flk("cardboard-box", 125), flk("moving-boxes", 126), flk("living-room", 127)], side: "them", createdAt: msgDaysAgo(1, 11, 35) },
    { id: "lm-8", text: "aşağı yukarı bu kadar", side: "them", createdAt: msgDaysAgo(1, 11, 35) },
    { id: "lm-9", text: "beyaz eşya, koltuk takımı, 15 koli falan", side: "them", createdAt: msgDaysAgo(1, 11, 36) },
    { id: "lm-10", text: "panelvan + 2 kişi yeter", side: "me", createdAt: msgDaysAgo(1, 11, 50), replyTo: { image: flk("living-room", 122), side: "them" } },
    { id: "lm-11", text: "cumartesi 10 uygun mu", side: "me", createdAt: msgDaysAgo(1, 11, 50) },
    { id: "lm-12", text: "uygun", side: "them", createdAt: msgDaysAgo(1, 12, 2) },
    { id: "lm-13", text: "yeni evin adresini atıyorum", side: "them", createdAt: msgDaysAgo(1, 12, 3) },
    { id: "lm-14", location: geo("Yeni ev – Ataşehir, Barbaros Mah.", 40.9910, 29.1275), side: "them", createdAt: msgDaysAgo(1, 12, 4) },
    { id: "lm-15", text: "aldım, cumartesi 9:45'te eski evde oluruz", side: "me", createdAt: msgDaysAgo(1, 12, 12) },
    { id: "lm-16", text: "3. kata çıkarma ayrı ücret mi", side: "them", createdAt: msgAt(14, 50) },
    { id: "lm-17", text: "asansörsüz kat başı ufak fark var, yerinde netleştiririz", side: "me", createdAt: msgAt(14, 58), replyTo: { text: "3. kata çıkarma ayrı ücret mi", side: "them" } },
    { id: "lm-18", text: "tamam", side: "them", createdAt: msgAt(15, 3) },
    { id: "lm-19", text: "kırılacakları önceden paketlerim", side: "them", createdAt: msgAt(15, 5) },
  ],
  "conv-mijan": [
    { id: "mm-1", text: "murat abi selam", side: "me", createdAt: msgDaysAgo(1, 10, 0) },
    { id: "mm-2", text: "alacağım kamyonete ekspertiz lazım", side: "me", createdAt: msgDaysAgo(1, 10, 0) },
    { id: "mm-3", text: "selam, hangi araç", side: "them", createdAt: msgDaysAgo(1, 10, 12) },
    { id: "mm-4", text: "fotoğraf var mı", side: "them", createdAt: msgDaysAgo(1, 10, 12) },
    { id: "mm-5", images: [flk("pickup-truck", 131)], side: "me", createdAt: msgDaysAgo(1, 10, 16) },
    { id: "mm-6", text: "2018, 180 binde", side: "me", createdAt: msgDaysAgo(1, 10, 16) },
    { id: "mm-7", text: "motor şasi + 9 nokta boya 750", side: "them", createdAt: msgDaysAgo(1, 10, 25), replyTo: { image: flk("pickup-truck", 131), side: "me" } },
    { id: "mm-8", text: "yarın 2ye getir", side: "them", createdAt: msgDaysAgo(1, 10, 25) },
    { id: "mm-9", text: "bi de alt takımda ses var", side: "me", createdAt: msgDaysAgo(1, 10, 30) },
    { id: "mm-10", text: "ona da bakar mısın", side: "me", createdAt: msgDaysAgo(1, 10, 30) },
    { id: "mm-11", text: "bakarım", side: "them", createdAt: msgDaysAgo(1, 10, 33) },
    { id: "mm-12", text: "büyük ihtimal rotil, lifte alınca görürüz", side: "them", createdAt: msgDaysAgo(1, 10, 33) },
    { id: "mm-12b", call: { direction: "in", status: "completed", durationSec: 386 }, side: "them", createdAt: msgDaysAgo(1, 10, 36) },
    { id: "mm-13", images: [flk("car-repair", 132)], side: "them", createdAt: msgAt(14, 20) },
    { id: "mm-14", text: "şu an lifte", side: "them", createdAt: msgAt(14, 20) },
    { id: "mm-15", text: "rotiller değişmiş, körükler sağlam", side: "them", createdAt: msgAt(14, 30) },
    { id: "mm-16", text: "boyalar orijinal, sadece sağ ön kapı lokal", side: "them", createdAt: msgAt(14, 31) },
    { id: "mm-17", text: "kaza çıkar mı", side: "me", createdAt: msgAt(14, 34) },
    { id: "mm-18", text: "çıkmaz, lokal işlem", side: "them", createdAt: msgAt(14, 36), replyTo: { text: "kaza çıkar mı", side: "me" } },
    { id: "mm-19", text: "genel durum iyi, alınır", side: "them", createdAt: msgAt(14, 36) },
    { id: "mm-20", text: "eyvallah abi", side: "me", createdAt: msgAt(14, 40) },
    { id: "mm-21", text: "raporu maile attım, eline sağlık", side: "them", createdAt: msgAt(14, 45) },
  ],
  "conv-chi": [
    { id: "cm-1", text: "Deniz Bey merhaba, bu haftanın aracı ayarlandı", side: "me", createdAt: msgDaysAgo(1, 9, 15) },
    { id: "cm-2", text: "teşekkürler", side: "them", createdAt: msgDaysAgo(1, 9, 40) },
    { id: "cm-3", text: "yine salı 8'de depo çıkışı di mi", side: "them", createdAt: msgDaysAgo(1, 9, 40) },
    { id: "cm-4", text: "evet, 3 palet bursa osb'den hadımköy'e", side: "me", createdAt: msgDaysAgo(1, 9, 45) },
    { id: "cm-5", text: "faturayı bu sefer şirkete keselim", side: "them", createdAt: msgDaysAgo(1, 9, 55) },
    { id: "cm-6", text: "bilgileri az önce attım", side: "them", createdAt: msgDaysAgo(1, 9, 55) },
    { id: "cm-7", text: "aldım, muhasebeye ilettim", side: "me", createdAt: msgDaysAgo(1, 10, 5) },
    { id: "cm-8", text: "irsaliye şoförde olacak", side: "me", createdAt: msgDaysAgo(1, 10, 5) },
    { id: "cm-9", text: "geçen hafta bi koli ezikti", side: "them", createdAt: msgAt(15, 15) },
    { id: "cm-10", images: [flk("cardboard-box", 141)], side: "them", createdAt: msgAt(15, 16) },
    { id: "cm-11", text: "buydu bu arada", side: "them", createdAt: msgAt(15, 16) },
    { id: "cm-12", text: "evet onu tutanağa geçtik, o taşıyıcıyı değiştirdim", side: "me", createdAt: msgAt(15, 22), replyTo: { image: flk("cardboard-box", 141), side: "them" } },
    { id: "cm-13", text: "bu hafta paletleri streçliyoruz", side: "me", createdAt: msgAt(15, 22) },
    { id: "cm-14", text: "nisan'dan sonra haftada 2 sefere çıkabiliriz", side: "them", createdAt: msgAt(15, 32) },
    { id: "cm-15", text: "not aldım, kapasiteyi ayırırız", side: "me", createdAt: msgAt(15, 36) },
    { id: "cm-16", text: "araç yola çıkınca haber verir misiniz", side: "them", createdAt: msgAt(15, 40) },
  ],
  "conv-chisom": [
    { id: "chm-1", text: "merhaba, panelvan ilanı duruyor mu", side: "me", createdAt: msgDaysAgo(1, 12, 10) },
    { id: "chm-2", text: "evet duruyor", side: "them", createdAt: msgDaysAgo(1, 12, 18) },
    { id: "chm-3", text: "2016, 210 binde", side: "them", createdAt: msgDaysAgo(1, 12, 18) },
    { id: "chm-4", text: "hasar kaydı var mı", side: "me", createdAt: msgDaysAgo(1, 12, 22) },
    { id: "chm-5", text: "sağ arka çamurluk boyalı", side: "them", createdAt: msgDaysAgo(1, 12, 25), replyTo: { text: "hasar kaydı var mı", side: "me" } },
    { id: "chm-6", text: "gerisi orijinal, kaza yok", side: "them", createdAt: msgDaysAgo(1, 12, 25) },
    { id: "chm-7", images: [flk("delivery-van", 151), flk("delivery-van", 152), flk("delivery-van", 153), flk("delivery-van", 154)], side: "them", createdAt: msgDaysAgo(1, 12, 27) },
    { id: "chm-8", text: "dış ve iç, lastikler yeni", side: "them", createdAt: msgDaysAgo(1, 12, 27) },
    { id: "chm-9", text: "pazarlık payı ne kadar", side: "me", createdAt: msgAt(12, 40) },
    { id: "chm-10", text: "peşin + takas olursa konuşuruz", side: "them", createdAt: msgAt(12, 48) },
    { id: "chm-11", text: "sizde araç var mı", side: "them", createdAt: msgAt(12, 48) },
    { id: "chm-12", text: "2013 doblo var, o da satılık", side: "me", createdAt: msgAt(12, 52) },
    { id: "chm-13", text: "fotoğraflarını at, ekspere sorayım", side: "them", createdAt: msgAt(12, 56) },
    { id: "chm-14", text: "bu akşam atarım", side: "me", createdAt: msgAt(13, 2) },
  ],
  "conv-afa": [
    { id: "am-1", text: "Ayşe Hanım merhaba, depo için görüşmüştük", side: "me", createdAt: msgAt(10, 20) },
    { id: "am-2", text: "merhaba, 120 m2 olan boş", side: "them", createdAt: msgAt(10, 30) },
    { id: "am-3", text: "aylık 18.000, depozito 2 kira", side: "them", createdAt: msgAt(10, 30) },
    { id: "am-4", text: "elektrik aidat dahil mi", side: "me", createdAt: msgAt(10, 35) },
    { id: "am-5", text: "aidat dahil, elektrik ayrı sayaç", side: "them", createdAt: msgAt(10, 38) },
    { id: "am-6", text: "yükleme rampası da var", side: "them", createdAt: msgAt(10, 38) },
    { id: "am-7", images: [flk("warehouse", 161)], side: "them", createdAt: msgAt(10, 42) },
    { id: "am-8", text: "içerisi böyle, tavan 6 metre", side: "them", createdAt: msgAt(10, 42) },
    { id: "am-9", text: "kapıdan forklift girer mi", side: "me", createdAt: msgAt(10, 48) },
    { id: "am-10", text: "girer, kapı 3.5", side: "them", createdAt: msgAt(10, 52), replyTo: { text: "kapıdan forklift girer mi", side: "me" } },
    { id: "am-11", text: "yarın 2de yerinde gösterebilirim", side: "them", createdAt: msgAt(10, 52) },
    { id: "am-12", text: "olur, adres atar mısınız", side: "me", createdAt: msgAt(10, 58) },
    { id: "am-13", location: geo("Depo – Demirtaş OSB", 40.2049, 29.1546), side: "them", createdAt: msgAt(11, 5) },
    { id: "am-14", text: "yarın 14:00'te depoda görüşürüz", side: "me", createdAt: msgAt(11, 48) },
  ],
  "conv-aho": [
    { id: "ah-1", text: "merhaba, kamyonet için anlaşmıştık", side: "them", createdAt: msgDaysAgo(6, 15, 0) },
    { id: "ah-2", text: "kaparoyu attım", side: "them", createdAt: msgDaysAgo(6, 15, 0) },
    { id: "ah-3", text: "aldım, kalanı noterde", side: "me", createdAt: msgDaysAgo(6, 15, 20) },
    { id: "ah-4", text: "noteri perşembeye alalım mı", side: "them", createdAt: msgDaysAgo(5, 10, 0) },
    { id: "ah-5", text: "uygun, aracı o gün teslim ederim", side: "me", createdAt: msgDaysAgo(5, 10, 15) },
    { id: "ah-6", text: "hocam bi sorun çıktı", side: "them", createdAt: msgDaysAgo(4, 18, 0) },
    { id: "ah-7", text: "bu hafta ödemeyi tamamlayamıyorum, gelecek haftaya kalsa", side: "them", createdAt: msgDaysAgo(4, 18, 1) },
    { id: "ah-8", text: "kaparo şartı var, ilanı geri açmam gerekir", side: "me", createdAt: msgDaysAgo(4, 18, 30), replyTo: { text: "bu hafta ödemeyi tamamlayamıyorum, gelecek haftaya kalsa", side: "them" } },
    { id: "ah-9", text: "yok yok hallederim, cuma kesin", side: "them", createdAt: msgDaysAgo(3, 12, 0) },
    { id: "ah-9b", call: { direction: "out", status: "cancelled", durationSec: 0 }, side: "me", createdAt: msgDaysAgo(3, 12, 5) },
    { id: "ah-10", text: "cuma biraz zor, pazartesi net", side: "them", createdAt: msgDaysAgo(2, 17, 0) },
    { id: "ah-10b", call: { direction: "in", status: "missed", durationSec: 0 }, side: "them", createdAt: msgDaysAgo(2, 17, 30) },
    { id: "ah-11", text: "cuma da olmadı pazartesi de", side: "me", createdAt: msgDaysAgo(1, 11, 28) },
    { id: "ah-12", text: "bu iş yürümüyor Burak Bey", side: "me", createdAt: msgDaysAgo(1, 11, 30) },
  ],
  "conv-nob": [
    { id: "nb-1", text: "merhaba, istanbul-izmir 8 palet yük için fiyat", side: "them", createdAt: msgAt(9, 25) },
    { id: "nb-2", text: "merhaba, yük cinsi ve ağırlık", side: "me", createdAt: msgAt(9, 30) },
    { id: "nb-3", text: "ambalajlı gıda, ~4 ton, paletli", side: "them", createdAt: msgAt(9, 33) },
    { id: "nb-4", text: "tenteli araçla 14.500 + kdv", side: "me", createdAt: msgAt(9, 38) },
    { id: "nb-5", text: "yarın yükleme olur", side: "me", createdAt: msgAt(9, 38) },
    { id: "nb-6", text: "sigorta dahil mi", side: "them", createdAt: msgAt(9, 42) },
    { id: "nb-7", text: "taşıma sigortası dahil", side: "me", createdAt: msgAt(9, 44), replyTo: { text: "sigorta dahil mi", side: "them" } },
    { id: "nb-8", images: [flk("pallet", 171)], side: "them", createdAt: msgAt(9, 48) },
    { id: "nb-9", text: "yük bu şekilde", side: "them", createdAt: msgAt(9, 48) },
    { id: "nb-10", text: "tamam, standart palet", side: "me", createdAt: msgAt(9, 52) },
    { id: "nb-11", text: "13.000 olur mu, düzenli yükümüz var", side: "them", createdAt: msgAt(9, 56) },
    { id: "nb-12", text: "düzenli olursa ilk sefer 13.500'e anlaşalım", side: "me", createdAt: msgAt(10, 0) },
    { id: "nb-13", text: "anlaştık", side: "them", createdAt: msgAt(10, 5) },
    { id: "nb-14", text: "yükleme adresi ve saat için yarın yazışalım", side: "them", createdAt: msgAt(10, 6) },
    { id: "nb-15", text: "tamam, sabah araç planını atarım", side: "me", createdAt: msgAt(10, 15) },
  ],
};

// ─── Sohbet medyası ve bağlantıları (Medya ve bağlantılar sayfası) ─
export type MockConvLink = { title: string; url: string; date: string };
export type MockConvMedia = { media: string[]; links: MockConvLink[] };

export const SEED_CONVERSATION_MEDIA: Record<string, MockConvMedia> = {
  "conv-kagan": {
    media: [flk("truck", 106), flk("semi-truck", 107), flk("warehouse", 108)],
    links: [
      { title: "Sahibinden – Ağır tonaj kamyon ilanı", url: "https://www.sahibinden.com/ilan/1234567", date: "Dün" },
      { title: "Araç muayene randevu", url: "https://randevu.tuvturk.com.tr", date: "2 gün önce" },
      { title: "Yüksi – Yük oluştur", url: "https://yuksi.tr/yuk-olustur", date: "1 hafta önce" },
    ],
  },
  "conv-bambam": {
    media: [flk("package", 114), flk("cardboard-box", 115)],
    links: [
      { title: "Teslim noktası – Google Haritalar", url: "https://www.google.com/maps/search/?api=1&query=40.2265,28.9861", date: "Bugün" },
      { title: "Yüksi – Kurye takip", url: "https://yuksi.tr/takip", date: "Bugün" },
    ],
  },
  "conv-lucia": {
    media: [flk("moving", 123), flk("moving-boxes", 124)],
    links: [
      { title: "Yeni ev konumu – Google Haritalar", url: "https://www.google.com/maps/search/?api=1&query=40.9910,29.1275", date: "Dün" },
      { title: "Nakliye sözleşmesi taslağı", url: "https://drive.google.com/file/d/xyz", date: "2 gün önce" },
    ],
  },
  "conv-chi": {
    media: [flk("pallet", 142), flk("forklift", 143), flk("storage-warehouse", 144)],
    links: [],
  },
};

// ─── Kanguru chatbot yanıtları ───────────────────────────────

const CHAT_REPLIES = [
  "Merhaba! Ben Kanguru, Yüksi kargo asistanınız. Size nasıl yardımcı olabilirim?",
  "Gönderileriniz 'İşlemlerim' sekmesinden takip edebilirsiniz. Aktif bir gönderiniz varsa kuryenin konumunu haritada canlı görebilirsiniz.",
  "Fiyat teklifi almak için ana sayfadaki 'Fiyat Hesapla' butonunu kullanabilir, çıkış ve varış adresini girerek anında tahmini ücreti görebilirsiniz.",
  "Standart teslimat süresi şehir içi için ortalama 45-90 dakikadır. Randevulu gönderilerde seçtiğiniz saat aralığı geçerlidir.",
];

export const pickChatReply = (message: string) => {
  const m = (message || "").toLowerCase();
  if (m.includes("nerede") || m.includes("takip") || m.includes("kargo")) return CHAT_REPLIES[1];
  if (m.includes("ücret") || m.includes("fiyat") || m.includes("kaç para")) return CHAT_REPLIES[2];
  if (m.includes("süre") || m.includes("ne zaman") || m.includes("kaç saat")) return CHAT_REPLIES[3];
  return CHAT_REPLIES[0];
};

// ─── Kurye canlı rota (GOOGLE_MAPS_API_KEY yok, driver boş) ──

export const MOCK_ROUTE_FULL = {
  driver: { lat: 41.0361, lng: 28.9847 },
  pickup: { lat: 41.0255, lng: 28.9741 },
  dropoff: { lat: 41.0511, lng: 29.0093 },
  distance: 4200,
};

export const MOCK_ROUTE: Record<string, any> = MOCK_ROUTE_FULL;

// ─── Fiyat tahmini ───────────────────────────────────────────

const haversineKm = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
};

const VEHICLE_RATE: Record<string, { base: number; perKm: number }> = {
  "veh-courier": { base: 45, perKm: 11 },
  "veh-minivan": { base: 120, perKm: 22 },
  "veh-panelvan": { base: 200, perKm: 32 },
  "veh-pickup": { base: 260, perKm: 40 },
  "veh-truck": { base: 600, perKm: 75 },
};

export const estimatePrice = (payload: any): number => {
  const from = payload?.pickupCoordinates;
  const to = payload?.dropoffCoordinates;
  const rate = VEHICLE_RATE[payload?.vehicleProductId] || { base: 60, perKm: 15 };
  let km = 6;
  if (Array.isArray(from) && Array.isArray(to)) {
    km = Math.max(1, haversineKm(from as [number, number], to as [number, number]));
  }
  let price = rate.base + rate.perKm * km + (payload?.extraServicesTotal || 0);
  if (payload?.campaignCode) price *= 0.9;
  return Math.round(price * 100) / 100;
};

// ─── Eşleşen kurye profili (Yük Oluştur → eşleşme akışı) ──────
export const MOCK_COURIER_PROFILE = {
  conversationId: "conv-kagan",
  name: "Kağan İbrahim",
  avatar: "https://i.pravatar.cc/150?img=12",
  phone: "+905339991122",
  vehicleType: "Motorsiklet",
  plate: "34 KGN 12",
  completedDeliveries: 72,
  rating: 4.8,
  recommended: true,
};

export const updateStoredJob = async (id: string, patch: Record<string, any>) => {
  const list = await readList(JOBS_KEY);
  const idx = list.findIndex((j) => String(j.id) === String(id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    await writeList(JOBS_KEY, list);
    return list[idx];
  }
  return null;
};

// ─── Ödeme yöntemleri (kredi kartları) — seed yok, boş başlar ──

export type MockCard = {
  id: string;
  brand: string;
  last4: string;
  card_holder_name: string;
  expiry_month: number | null;
  expiry_year: number | null;
};

// ─── AsyncStorage kalıcılığı (oluşturulan gönderi / adres) ────

const JOBS_KEY = "mock_jobs";
const ADDR_KEY = "mock_addresses";
const NOTIF_DISMISSED_KEY = "mock_dismissed_notifications";
const JOB_DISMISSED_KEY = "mock_dismissed_jobs";

const readList = async (key: string): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeList = async (key: string, list: any[]) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // yoksay
  }
};

export const getStoredJobs = () => readList(JOBS_KEY);
export const addStoredJob = async (job: MockJob) => {
  const list = await readList(JOBS_KEY);
  list.unshift(job);
  await writeList(JOBS_KEY, list);
  return job;
};
// Seed kayıtlar sabit kodda; silme diziden çıkarmak yerine bir dismissed-id listesiyle gizler.
export const getDismissedJobIds = () => readList(JOB_DISMISSED_KEY);
export const dismissJobIds = async (ids: string[]) => {
  const existing = await readList(JOB_DISMISSED_KEY);
  const merged = Array.from(new Set([...existing, ...ids.map(String)]));
  await writeList(JOB_DISMISSED_KEY, merged);
};
export const clearStoredJobs = async () => {
  await writeList(JOBS_KEY, []);
};
export const restoreDismissedJobs = async () => {
  await writeList(JOB_DISMISSED_KEY, []);
};

// ─── Siparişler (yeni Orders API, bkz. issuesProblemsAgain.md) ──

export type MockOrderAddress = {
  city: string;
  district: string;
  neighborhood: string;
  addressText: string;
  buildingNo: string | null;
};
export type MockOrderCargo = {
  weightCategory: string;
  isThermal: boolean;
  note: string | null;
  photos: string[];
};
export type MockOrderPricing = {
  basePrice: number;
  discount: number;
  total: number;
  currency: string;
};
export type MockOrderCarrier = {
  name: string;
  rating: number;
  phone: string;
  plate: string;
};
export type MockOrderStatusHistory = {
  id: number;
  orderId: string;
  status: string;
  timestamp: string;
};
export type MockOrder = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  serviceType: string;
  carrierType: string;
  pickupLocation: MockOrderAddress;
  dropoffLocation: MockOrderAddress;
  cargoDetails: MockOrderCargo;
  pricing: MockOrderPricing;
  carrierInfo: MockOrderCarrier | null;
  statusHistories: MockOrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
};

const orderHistory = (id: string, entries: { status: string; hoursAgo: number }[]): MockOrderStatusHistory[] =>
  entries.map((e, i) => ({ id: i + 1, orderId: id, status: e.status, timestamp: hoursAgo(e.hoursAgo) }));

export const SEED_ORDERS: MockOrder[] = [
  {
    id: "order-2001",
    orderNumber: "YKS-240915-2001",
    userId: MOCK_USER.userId,
    status: "Bekliyor",
    serviceType: "Hemen",
    carrierType: "Moto Kurye",
    pickupLocation: { city: "İstanbul", district: "Kadıköy", neighborhood: "Moda", addressText: "Moda Cd. No:12", buildingNo: "12" },
    dropoffLocation: { city: "İstanbul", district: "Beşiktaş", neighborhood: "Levent", addressText: "Barbaros Blv. No:45", buildingNo: "45" },
    cargoDetails: { weightCategory: "0-5kg", isThermal: false, note: "Kırılabilir eşya", photos: [] },
    pricing: { basePrice: 110, discount: 0, total: 129.9, currency: "TRY" },
    carrierInfo: null,
    statusHistories: orderHistory("order-2001", [{ status: "Bekliyor", hoursAgo: 2 }]),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: "order-2002",
    orderNumber: "YKS-240915-2002",
    userId: MOCK_USER.userId,
    status: "Yolda",
    serviceType: "Hemen",
    carrierType: "Minivan",
    pickupLocation: { city: "İstanbul", district: "Şişli", neighborhood: "Halaskargazi", addressText: "Halaskargazi Cd. No:200", buildingNo: "200" },
    dropoffLocation: { city: "İstanbul", district: "Bakırköy", neighborhood: "İncirli", addressText: "İncirli Cd. No:8", buildingNo: "8" },
    cargoDetails: { weightCategory: "20-50kg", isThermal: false, note: null, photos: [] },
    pricing: { basePrice: 320, discount: 20, total: 349, currency: "TRY" },
    carrierInfo: { name: "Kağan İbrahim", rating: 4.8, phone: "+905339991122", plate: "34 KGN 12" },
    statusHistories: orderHistory("order-2002", [
      { status: "Bekliyor", hoursAgo: 5 },
      { status: "Atandı", hoursAgo: 4 },
      { status: "Yolda", hoursAgo: 1 },
    ]),
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(1),
  },
  {
    id: "order-2003",
    orderNumber: "YKS-240910-2003",
    userId: MOCK_USER.userId,
    status: "Tamamlandı",
    serviceType: "Randevulu",
    carrierType: "Kamyonet",
    pickupLocation: { city: "İstanbul", district: "Ataşehir", neighborhood: "Barbaros", addressText: "Barbaros Mah. No:19", buildingNo: "19" },
    dropoffLocation: { city: "İstanbul", district: "Pendik", neighborhood: "Kurtköy", addressText: "Kurtköy Cd. No:41", buildingNo: "41" },
    cargoDetails: { weightCategory: "50-100kg", isThermal: false, note: "Mobilya", photos: [] },
    pricing: { basePrice: 450, discount: 0, total: 480, currency: "TRY" },
    carrierInfo: { name: "Emre Şahin", rating: 4.6, phone: "+905352223344", plate: "34 EMR 77" },
    statusHistories: orderHistory("order-2003", [
      { status: "Bekliyor", hoursAgo: 120 },
      { status: "Atandı", hoursAgo: 110 },
      { status: "Yolda", hoursAgo: 100 },
      { status: "Tamamlandı", hoursAgo: 96 },
    ]),
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(96),
  },
  {
    id: "order-2004",
    orderNumber: "YKS-240905-2004",
    userId: MOCK_USER.userId,
    status: "İptal",
    serviceType: "Hemen",
    carrierType: "Moto Kurye",
    pickupLocation: { city: "İstanbul", district: "Üsküdar", neighborhood: "Çengelköy", addressText: "Çengelköy Sahil Yolu No:8", buildingNo: "8" },
    dropoffLocation: { city: "İstanbul", district: "Kartal", neighborhood: "Yakacık", addressText: "Yakacık Cd. No:33", buildingNo: "33" },
    cargoDetails: { weightCategory: "0-5kg", isThermal: false, note: null, photos: [] },
    pricing: { basePrice: 95, discount: 0, total: 95, currency: "TRY" },
    carrierInfo: null,
    statusHistories: orderHistory("order-2004", [
      { status: "Bekliyor", hoursAgo: 240 },
      { status: "İptal", hoursAgo: 238 },
    ]),
    createdAt: daysAgo(10),
    updatedAt: hoursAgo(238),
  },
];

const ORDERS_KEY = "mock_orders";
export const getStoredOrders = () => readList(ORDERS_KEY);
export const addStoredOrder = async (order: MockOrder) => {
  const list = await readList(ORDERS_KEY);
  list.unshift(order);
  await writeList(ORDERS_KEY, list);
  return order;
};

export const getStoredAddresses = () => readList(ADDR_KEY);
export const addStoredAddress = async (addr: MockAddress) => {
  const list = await readList(ADDR_KEY);
  list.unshift(addr);
  await writeList(ADDR_KEY, list);
  return addr;
};
export const removeStoredAddress = async (id: string) => {
  const list = await readList(ADDR_KEY);
  await writeList(
    ADDR_KEY,
    list.filter((a) => String(a.id) !== String(id)),
  );
};

// Seed kayıtlar sabit — silme, dismissed-id listesine ekleyip GET'te filtreler.
export const getDismissedNotificationIds = () => readList(NOTIF_DISMISSED_KEY);
export const dismissNotificationIds = async (ids: string[]) => {
  const existing = await readList(NOTIF_DISMISSED_KEY);
  const merged = Array.from(new Set([...existing, ...ids.map(String)]));
  await writeList(NOTIF_DISMISSED_KEY, merged);
};
export const restoreDismissedNotifications = async () => {
  await writeList(NOTIF_DISMISSED_KEY, []);
};

const ADDR_DISMISSED_KEY = "mock_dismissed_addresses";
export const getDismissedAddressIds = () => readList(ADDR_DISMISSED_KEY);
export const dismissAddressIds = async (ids: string[]) => {
  const existing = await readList(ADDR_DISMISSED_KEY);
  const merged = Array.from(new Set([...existing, ...ids.map(String)]));
  await writeList(ADDR_DISMISSED_KEY, merged);
};
export const restoreDismissedAddresses = async () => {
  await writeList(ADDR_DISMISSED_KEY, []);
};

// ─── Kredi kartları kalıcılığı ─────────────────────────────────
const CARD_KEY = "mock_cards";
const DEFAULT_CARD_KEY = "mock_default_card_id";

export const getStoredCards = () => readList(CARD_KEY) as Promise<MockCard[]>;
export const addStoredCard = async (card: MockCard) => {
  const list = await readList(CARD_KEY);
  list.unshift(card);
  await writeList(CARD_KEY, list);
  if (list.length === 1) await AsyncStorage.setItem(DEFAULT_CARD_KEY, card.id);
  return card;
};
export const removeStoredCard = async (id: string) => {
  const list: MockCard[] = await readList(CARD_KEY);
  const next = list.filter((c) => String(c.id) !== String(id));
  await writeList(CARD_KEY, next);

  const defaultId = await AsyncStorage.getItem(DEFAULT_CARD_KEY);
  if (defaultId === id) {
    if (next[0]) await AsyncStorage.setItem(DEFAULT_CARD_KEY, next[0].id);
    else await AsyncStorage.removeItem(DEFAULT_CARD_KEY);
  }
};
export const getDefaultCardId = () => AsyncStorage.getItem(DEFAULT_CARD_KEY);
export const setDefaultCardId = (id: string) => AsyncStorage.setItem(DEFAULT_CARD_KEY, id);

// ─── Hesap bağlantıları (Google / Apple / Facebook) ────────────
export type SocialProvider = "google" | "apple" | "facebook";

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  google: "mert.yuksi@gmail.com",
  apple: "mert.yuksi@icloud.com",
  facebook: "Mert Yüksi",
};

const SOCIAL_KEY = "mock_connected_accounts";

export const getConnectedProviders = async (): Promise<Partial<Record<SocialProvider, boolean>>> => {
  try {
    const raw = await AsyncStorage.getItem(SOCIAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setProviderConnected = async (provider: SocialProvider, connected: boolean) => {
  const current = await getConnectedProviders();
  const next = { ...current, [provider]: connected };
  await AsyncStorage.setItem(SOCIAL_KEY, JSON.stringify(next));
  return next;
};

export const getSocialAccountLabel = (provider: SocialProvider) => SOCIAL_LABELS[provider];

// ─── Ticarim kalıcılığı — kullanıcının verdiği ilanlar + favoriler ──
const TICARIM_LISTINGS_KEY = "mock_ticarim_listings";
const TICARIM_FAVORITES_KEY = "mock_ticarim_favorites";

export type StoredListing = MockVehicleListing | (Record<string, any> & { id: string });

export const getStoredListings = () => readList(TICARIM_LISTINGS_KEY) as Promise<StoredListing[]>;
export const addStoredListing = async (listing: StoredListing) => {
  const list = await readList(TICARIM_LISTINGS_KEY);
  list.unshift(listing);
  await writeList(TICARIM_LISTINGS_KEY, list);
  return listing;
};
export const removeStoredListing = async (id: string) => {
  const list: StoredListing[] = await readList(TICARIM_LISTINGS_KEY);
  await writeList(TICARIM_LISTINGS_KEY, list.filter((l) => String(l.id) !== String(id)));
};

export const getFavoriteListingIds = () => readList(TICARIM_FAVORITES_KEY) as Promise<string[]>;
export const toggleFavoriteListingId = async (id: string) => {
  const list = await getFavoriteListingIds();
  const key = String(id);
  const next = list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
  await writeList(TICARIM_FAVORITES_KEY, next);
  return next;
};

// ─── Mesajlar kalıcılığı — seed sohbetler yalnızca MOCK_USER'a ait ──
const MSG_STORE_KEY = "mock_messages";
const MSG_READ_KEY = "mock_read_conversations";
const MSG_FLAGS_KEY = "mock_conversation_flags";
const MSG_DELETED_KEY = "mock_deleted_conversations";
const DYN_CONV_META_KEY = "mock_dynamic_conversations";

export const accountKey = (email?: string | null) => (email || "anon").trim().toLowerCase();

const readMap = async (key: string): Promise<Record<string, any>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const writeMap = async (key: string, map: Record<string, any>) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(map));
  } catch {
    // yoksay
  }
};

export const getConversationMessages = async (
  id: string,
  email?: string | null,
): Promise<MockMessage[]> => {
  const seed = SEED_MESSAGES[id] || [];
  const store = await readMap(MSG_STORE_KEY);
  const forAccount = store[accountKey(email)] || {};
  const extra: MockMessage[] = Array.isArray(forAccount[id]) ? forAccount[id] : [];
  return [...seed, ...extra];
};

export const searchMessages = async (
  q: string,
  email?: string | null,
): Promise<{ conversationId: string; snippet: string; count: number }[]> => {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const store = await readMap(MSG_STORE_KEY);
  const forAccount = store[accountKey(email)] || {};
  const deleted = await getDeletedConversationIds(email);
  const out: { conversationId: string; snippet: string; count: number }[] = [];
  for (const c of SEED_CONVERSATIONS) {
    if (deleted.includes(c.id)) continue;
    const extra: MockMessage[] = Array.isArray(forAccount[c.id]) ? forAccount[c.id] : [];
    const hits = [...(SEED_MESSAGES[c.id] || []), ...extra].filter((m) =>
      (m.text || "").toLowerCase().includes(term),
    );
    if (hits.length) {
      out.push({
        conversationId: c.id,
        snippet: hits[hits.length - 1].text || "",
        count: hits.length,
      });
    }
  }
  return out;
};

export const addConversationMessage = async (
  id: string,
  msg: MockMessage,
  email?: string | null,
) => {
  const store = await readMap(MSG_STORE_KEY);
  const ak = accountKey(email);
  const forAccount = store[ak] || {};
  forAccount[id] = [...(Array.isArray(forAccount[id]) ? forAccount[id] : []), msg];
  store[ak] = forAccount;
  await writeMap(MSG_STORE_KEY, store);
  return msg;
};

export const setDynamicConversationMeta = async (
  id: string,
  meta: { name: string; avatar: string | null },
  email?: string | null,
) => {
  const map = await readMap(DYN_CONV_META_KEY);
  const ak = accountKey(email);
  const forAccount = map[ak] || {};
  if (!forAccount[id]) {
    forAccount[id] = meta;
    map[ak] = forAccount;
    await writeMap(DYN_CONV_META_KEY, map);
  }
};

const getDynamicConversationMeta = async (
  email?: string | null,
): Promise<Record<string, { name: string; avatar: string | null }>> => {
  const map = await readMap(DYN_CONV_META_KEY);
  const forAccount = map[accountKey(email)];
  return forAccount && typeof forAccount === "object" ? forAccount : {};
};

export const markConversationRead = async (id: string, email?: string | null) => {
  const map = await readMap(MSG_READ_KEY);
  const ak = accountKey(email);
  const read: string[] = Array.isArray(map[ak]) ? map[ak] : [];
  if (!read.includes(id)) {
    map[ak] = [...read, id];
    await writeMap(MSG_READ_KEY, map);
  }
};

export const getReadConversationIds = async (email?: string | null): Promise<string[]> => {
  const map = await readMap(MSG_READ_KEY);
  const read = map[accountKey(email)];
  return Array.isArray(read) ? read : [];
};

// ─── Çevrimiçi durumu (presence) ────────────────────────────
const PRESENCE_KEY = "mock_presence";
export type MockPresence = { isOnline: boolean };

export const getPresence = async (email?: string | null): Promise<MockPresence> => {
  const map = await readMap(PRESENCE_KEY);
  const p = map[accountKey(email)];
  return { isOnline: !!p?.isOnline };
};

export const setPresence = async (
  patch: { isOnline?: boolean },
  email?: string | null,
): Promise<MockPresence> => {
  const map = await readMap(PRESENCE_KEY);
  const ak = accountKey(email);
  const next: MockPresence = { isOnline: !!patch.isOnline };
  map[ak] = next;
  await writeMap(PRESENCE_KEY, map);
  return next;
};

// ─── Bildirim ayarları ───────────────────────────────────────
const NOTIFICATION_SETTINGS_KEY = "mock_notification_settings";

export type InAppAlertStyle = "none" | "banners" | "alerts";

export type NotificationSettings = {
  messages: boolean;
  shipments: boolean;
  sounds: boolean;
  notificationSoundId: string;
  callSound: boolean;
  showCallSound: boolean;
  callSoundId: string;
  inApp: { alertStyle: InAppAlertStyle; sounds: boolean; vibration: boolean };
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  messages: true,
  shipments: true,
  sounds: true,
  notificationSoundId: "default",
  callSound: true,
  showCallSound: true,
  callSoundId: "default",
  inApp: { alertStyle: "banners", sounds: true, vibration: true },
};

export const getNotificationSettings = async (email?: string | null): Promise<NotificationSettings> => {
  const map = await readMap(NOTIFICATION_SETTINGS_KEY);
  const s = map[accountKey(email)];
  return s && typeof s === "object"
    ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...s, inApp: { ...DEFAULT_NOTIFICATION_SETTINGS.inApp, ...(s.inApp || {}) } }
    : DEFAULT_NOTIFICATION_SETTINGS;
};

const ALERT_STYLE_FROM_API_MOCK: Record<string, InAppAlertStyle> = { none: "none", banner: "banners", alert: "alerts" };

export const setNotificationSettings = async (patch: any, email?: string | null): Promise<NotificationSettings> => {
  const current = await getNotificationSettings(email);
  const inAppPatch = patch?.in_app ?? patch?.inApp;
  const next: NotificationSettings = {
    messages: patch?.messages ?? current.messages,
    shipments: patch?.shipments ?? current.shipments,
    sounds: patch?.sounds ?? current.sounds,
    notificationSoundId: patch?.notification_sound_id ?? patch?.notificationSoundId ?? current.notificationSoundId,
    callSound: patch?.call_sound ?? patch?.callSound ?? current.callSound,
    showCallSound: patch?.show_call_sound ?? patch?.showCallSound ?? current.showCallSound,
    callSoundId: patch?.call_sound_id ?? patch?.callSoundId ?? current.callSoundId,
    inApp: inAppPatch
      ? {
            alertStyle: ALERT_STYLE_FROM_API_MOCK[inAppPatch.alert_style] ?? inAppPatch.alertStyle ?? current.inApp.alertStyle,
            sounds: inAppPatch.sounds ?? current.inApp.sounds,
            vibration: inAppPatch.vibration ?? current.inApp.vibration,
        }
      : current.inApp,
  };
  const map = await readMap(NOTIFICATION_SETTINGS_KEY);
  map[accountKey(email)] = next;
  await writeMap(NOTIFICATION_SETTINGS_KEY, map);
  return next;
};

export const resetNotificationSettings = async (email?: string | null): Promise<NotificationSettings> => {
  const map = await readMap(NOTIFICATION_SETTINGS_KEY);
  map[accountKey(email)] = DEFAULT_NOTIFICATION_SETTINGS;
  await writeMap(NOTIFICATION_SETTINGS_KEY, map);
  return DEFAULT_NOTIFICATION_SETTINGS;
};

// ─── Kullanıcı konumu ────────────────────────────────────────
const USER_LOCATION_KEY = "mock_user_location";

export type UserLocation = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  district: string;
  neighborhood: string;
};

export const getUserLocation = async (email?: string | null): Promise<UserLocation | null> => {
  const map = await readMap(USER_LOCATION_KEY);
  const loc = map[accountKey(email)];
  return loc && typeof loc === "object" ? loc : null;
};

export const setUserLocation = async (loc: UserLocation, email?: string | null): Promise<UserLocation> => {
  const map = await readMap(USER_LOCATION_KEY);
  map[accountKey(email)] = loc;
  await writeMap(USER_LOCATION_KEY, map);
  return loc;
};

// ─── Depolama ve veri ────────────────────────────────────────
const STORAGE_SETTINGS_KEY = "mock_storage_settings";

export type DownloadPref = "never" | "wifi" | "wifi_cellular";
export type MediaQuality = "standard" | "hd";

export type StorageSettings = {
  lessDataForCalls: boolean;
  proxyEnabled: boolean;
  proxyHost: string;
  uploadQuality: MediaQuality;
  autoDownloadQuality: MediaQuality;
  autoDownload: { photos: DownloadPref; audio: DownloadPref; video: DownloadPref; documents: DownloadPref };
};

const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  lessDataForCalls: false,
  proxyEnabled: false,
  proxyHost: "",
  uploadQuality: "hd",
  autoDownloadQuality: "hd",
  autoDownload: { photos: "wifi_cellular", audio: "wifi", video: "wifi", documents: "wifi" },
};

export const getStorageSettings = async (email?: string | null): Promise<StorageSettings> => {
  const map = await readMap(STORAGE_SETTINGS_KEY);
  const s = map[accountKey(email)];
  return s && typeof s === "object"
    ? { ...DEFAULT_STORAGE_SETTINGS, ...s, autoDownload: { ...DEFAULT_STORAGE_SETTINGS.autoDownload, ...(s.autoDownload || {}) } }
    : DEFAULT_STORAGE_SETTINGS;
};

export const setStorageSettings = async (
  patch: Partial<Omit<StorageSettings, "autoDownload">> & { autoDownload?: Partial<StorageSettings["autoDownload"]> },
  email?: string | null,
): Promise<StorageSettings> => {
  const current = await getStorageSettings(email);
  const next: StorageSettings = {
    ...current,
    ...patch,
    autoDownload: { ...current.autoDownload, ...(patch.autoDownload || {}) },
  };
  const map = await readMap(STORAGE_SETTINGS_KEY);
  map[accountKey(email)] = next;
  await writeMap(STORAGE_SETTINGS_KEY, map);
  return next;
};

const BYTES_PER_MB = 1024 * 1024;

export const getStorageUsage = async () => {
  let mediaMb = 0;
  try {
    mediaMb = Paths.cache.exists ? (Paths.cache.size || 0) / BYTES_PER_MB : 0;
  } catch {}

  let documentsMb = 0;
  try {
    documentsMb = Paths.document.exists ? (Paths.document.size || 0) / BYTES_PER_MB : 0;
  } catch {}

  let chatsMb = 0;
  try {
    const raw = await AsyncStorage.getItem(MSG_STORE_KEY);
    chatsMb = raw ? raw.length / BYTES_PER_MB : 0;
  } catch {}

  return { chatsMb, mediaMb, documentsMb, totalMb: chatsMb + mediaMb + documentsMb };
};

export const getNetworkUsage = async () => getNetworkUsageMb();

// ─── Geribildirim ────────────────────────────────────────────
const FEEDBACK_KEY = "mock_feedback";

export const addFeedback = async (
  entry: { message: string; rating?: number },
  email?: string | null,
) => {
  const map = await readMap(FEEDBACK_KEY);
  const ak = accountKey(email);
  const list: any[] = Array.isArray(map[ak]) ? map[ak] : [];
  const item = { id: `fb-${Date.now()}`, ...entry, createdAt: new Date().toISOString() };
  map[ak] = [...list, item];
  await writeMap(FEEDBACK_KEY, map);
  return item;
};

// ─── Hesap silme talebi ──────────────────────────────────────
const DELETE_ACCOUNT_KEY = "mock_delete_account_requests";

export const addDeleteAccountRequest = async (
  entry: { reason: string; details?: string },
  email?: string | null,
) => {
  const map = await readMap(DELETE_ACCOUNT_KEY);
  const ak = accountKey(email);
  const list: any[] = Array.isArray(map[ak]) ? map[ak] : [];
  const item = { id: `del-${Date.now()}`, ...entry, createdAt: new Date().toISOString() };
  map[ak] = [...list, item];
  await writeMap(DELETE_ACCOUNT_KEY, map);
  await setAccountDeletionRequested();
  return item;
};

const DELETION_LOCK_KEY = "mock_account_deletion_locked";
// Mock hesap test edilebilsin diye kilit kalıcı değil — süresi dolunca kendiliğinden açılır.
const DELETION_LOCK_DURATION_MS = 5 * 60 * 1000;

export const setAccountDeletionRequested = async () => {
  const map = await readMap(DELETION_LOCK_KEY);
  map[accountKey(MOCK_CREDENTIALS.email)] = Date.now();
  await writeMap(DELETION_LOCK_KEY, map);
};

export const isAccountDeletionRequested = async (): Promise<boolean> => {
  const map = await readMap(DELETION_LOCK_KEY);
  const requestedAt = map[accountKey(MOCK_CREDENTIALS.email)];
  if (!requestedAt) return false;
  return Date.now() - requestedAt < DELETION_LOCK_DURATION_MS;
};

export const getConversationFlags = async (
  email?: string | null,
): Promise<Record<string, { blocked?: boolean; muted?: boolean }>> => {
  const map = await readMap(MSG_FLAGS_KEY);
  const f = map[accountKey(email)];
  return f && typeof f === "object" ? f : {};
};

export const setConversationFlags = async (
  id: string,
  patch: { blocked?: boolean; muted?: boolean },
  email?: string | null,
) => {
  const map = await readMap(MSG_FLAGS_KEY);
  const ak = accountKey(email);
  const forAccount = map[ak] || {};
  forAccount[id] = { ...(forAccount[id] || {}), ...patch };
  map[ak] = forAccount;
  await writeMap(MSG_FLAGS_KEY, map);
  return forAccount[id];
};

export const isConversationBlocked = async (id: string, email?: string | null) => {
  const flags = await getConversationFlags(email);
  return !!flags[id]?.blocked;
};

export const getDeletedConversationIds = async (email?: string | null): Promise<string[]> => {
  const map = await readMap(MSG_DELETED_KEY);
  const list = map[accountKey(email)];
  return Array.isArray(list) ? list : [];
};

export const deleteConversation = async (id: string, email?: string | null) => {
  const ak = accountKey(email);
  const deletedMap = await readMap(MSG_DELETED_KEY);
  const list: string[] = Array.isArray(deletedMap[ak]) ? deletedMap[ak] : [];
  if (!list.includes(id)) {
    deletedMap[ak] = [...list, id];
    await writeMap(MSG_DELETED_KEY, deletedMap);
  }
  for (const key of [MSG_STORE_KEY, MSG_FLAGS_KEY]) {
    const m = await readMap(key);
    if (m[ak] && m[ak][id]) {
      delete m[ak][id];
      await writeMap(key, m);
    }
  }
  const readMapData = await readMap(MSG_READ_KEY);
  if (Array.isArray(readMapData[ak])) {
    readMapData[ak] = readMapData[ak].filter((x: string) => x !== id);
    await writeMap(MSG_READ_KEY, readMapData);
  }
};

export const restoreDeletedConversations = async () => {
  await writeMap(MSG_DELETED_KEY, {});
};

export const getConversationMedia = async (
  id: string,
  email?: string | null,
): Promise<MockConvMedia> => {
  const seed = SEED_CONVERSATION_MEDIA[id] || { media: [], links: [] };
  const fromChat = (SEED_MESSAGES[id] || []).flatMap((m) => m.images || []);
  return { media: [...fromChat, ...seed.media], links: seed.links };
};

export const restoreMessages = async () => {
  await writeMap(MSG_STORE_KEY, {});
  await writeMap(MSG_READ_KEY, {});
  await writeMap(MSG_FLAGS_KEY, {});
  await writeMap(MSG_DELETED_KEY, {});
};

export const getConversationList = async (
  email?: string | null,
): Promise<MockConversation[]> => {
  const read = await getReadConversationIds(email);
  const store = await readMap(MSG_STORE_KEY);
  const flags = await getConversationFlags(email);
  const deleted = await getDeletedConversationIds(email);
  const dynMeta = await getDynamicConversationMeta(email);
  const forAccount = store[accountKey(email)] || {};

  // ekstra mesajı olmayan sohbetler için sıralama kaynağı SEED_MESSAGES değil, orijinal sıra.
  const SEED_ORDER_BASE = 1_000_000_000;

  const seeded = SEED_CONVERSATIONS.filter((c) => !deleted.includes(c.id)).map((c, index) => {
    const extra: MockMessage[] = Array.isArray(forAccount[c.id]) ? forAccount[c.id] : [];
    const last = extra[extra.length - 1];
    const cf = flags[c.id] || {};
    return {
      conv: {
        ...c,
        lastMessage: last
          ? last.text ||
            (last.location ? "📍 Konum" : last.images?.length ? "📷 Fotoğraf" : c.lastMessage)
          : c.lastMessage,
        unread: cf.blocked || read.includes(c.id) ? 0 : c.unread,
        blocked: !!cf.blocked,
        muted: !!cf.muted,
      },
      sortAt: last?.createdAt ? new Date(last.createdAt).getTime() : SEED_ORDER_BASE - index,
    };
  });

  const dynamicIds = Object.keys(forAccount).filter(
    (id) => dynMeta[id] && !SEED_CONVERSATIONS.some((c) => c.id === id) && !deleted.includes(id),
  );
  const dynamic = dynamicIds.map((id) => {
    const extra: MockMessage[] = forAccount[id] || [];
    const last = extra[extra.length - 1];
    const cf = flags[id] || {};
    const meta = dynMeta[id];
    return {
      conv: {
        id,
        name: meta.name,
        avatar: meta.avatar,
        lastMessage: last
          ? last.text || (last.location ? "📍 Konum" : last.images?.length ? "📷 Fotoğraf" : "")
          : "",
        time: last?.createdAt
          ? new Date(last.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
          : "",
        unread: 0,
        status: "offline" as const,
        blocked: !!cf.blocked,
        muted: !!cf.muted,
      },
      sortAt: last?.createdAt ? new Date(last.createdAt).getTime() : SEED_ORDER_BASE,
    };
  });

  return [...seeded, ...dynamic]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map((entry) => entry.conv);
};

// ─── Şikayetler (GET /api/complaints) ───────────────────────
export type MockComplaintUpdate = {
  id: string;
  from: "system" | "support" | "user";
  status: string;
  text: string;
  createdAt: string;
};
export type MockComplaint = {
  id: string;
  conversationId: string | null;
  targetName: string;
  targetAvatar?: string | null;
  reason: string;
  description: string;
  images: string[];
  createdAt: string;
};

const COMPLAINTS_KEY = "mock_complaints";
const COMPLAINT_MSGS_KEY = "mock_complaint_messages";

const COMPLAINT_SUPPORT_REPLIES = [
  "Mesajınız için teşekkürler, ilgili ekibe ilettik.",
  "Bu bilgiyi inceleme dosyasına ekledik. Bir gelişme olduğunda haber vereceğiz.",
  "Anlıyoruz. Konuyu değerlendirip en kısa sürede dönüş yapacağız.",
  "Ek detay için teşekkürler, süreci hızlandırmak adına not düştük.",
];

const SEED_COMPLAINTS: MockComplaint[] = [
  {
    id: "cmp-seed-1",
    conversationId: "conv-aho",
    targetName: "Burak Aslan",
    targetAvatar: "https://i.pravatar.cc/150?img=24",
    reason: "Dolandırıcılık girişimi",
    description:
      "Ticarim'den araç için kaparo gönderdi ama ödemeyi haftalardır oyalıyor, sürekli tarih değiştiriyor.",
    images: [],
    createdAt: daysAgo(4),
  },
];

const COMPLAINT_STAGES: { after: number; status: string; from: "support"; text: string }[] = [
  {
    after: 20,
    status: "in_review",
    from: "support",
    text: "Merhaba, şikayetini aldık ve inceliyoruz. Kısa süre içinde tekrar dönüş yapacağız.",
  },
  {
    after: 75,
    status: "responded",
    from: "support",
    text: "Bildirimin için teşekkürler. İlgili kullanıcı hakkında inceleme başlatıldı. Güvenliğin için sohbeti engelleyebilir veya silebilirsin.",
  },
  {
    after: 160,
    status: "resolved",
    from: "support",
    text: "Şikayetin sonuçlandırıldı ve gerekli işlemler uygulandı. Anlayışın için teşekkür ederiz.",
  },
];

export const deriveComplaint = (c: MockComplaint) => {
  const base = new Date(c.createdAt).getTime();
  const ageSec = (Date.now() - base) / 1000;
  const updates: MockComplaintUpdate[] = [
    {
      id: `${c.id}-received`,
      from: "system",
      status: "received",
      text: "Şikayetin alındı. Müşteri hizmetleri ekibimiz en kısa sürede inceleyecek.",
      createdAt: c.createdAt,
    },
  ];
  let status = "received";
  for (const s of COMPLAINT_STAGES) {
    if (ageSec >= s.after) {
      status = s.status;
      updates.push({
        id: `${c.id}-${s.status}`,
        from: s.from,
        status: s.status,
        text: s.text,
        createdAt: new Date(base + s.after * 1000).toISOString(),
      });
    }
  }
  return { ...c, status, updates, lastUpdate: updates[updates.length - 1] };
};

type StoredComplaintMsg = { id: string; text: string; createdAt: string };

export const hydrateComplaint = (c: MockComplaint, userMsgs: StoredComplaintMsg[]) => {
  const d = deriveComplaint(c);
  const convo: MockComplaintUpdate[] = [...d.updates];
  userMsgs.forEach((um, i) => {
    convo.push({ id: um.id, from: "user", status: d.status, text: um.text, createdAt: um.createdAt });
    const ageSec = (Date.now() - new Date(um.createdAt).getTime()) / 1000;
    if (ageSec >= 6) {
      convo.push({
        id: `${um.id}-r`,
        from: "support",
        status: d.status,
        text: COMPLAINT_SUPPORT_REPLIES[i % COMPLAINT_SUPPORT_REPLIES.length],
        createdAt: new Date(new Date(um.createdAt).getTime() + 6000).toISOString(),
      });
    }
  });
  convo.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { ...d, updates: convo, lastUpdate: convo[convo.length - 1] };
};

export const getComplaints = async (email?: string | null, includeSeed = false) => {
  const map = await readMap(COMPLAINTS_KEY);
  const stored: MockComplaint[] = Array.isArray(map[accountKey(email)]) ? map[accountKey(email)] : [];
  const seed = includeSeed ? SEED_COMPLAINTS : [];
  const msgMap = await readMap(COMPLAINT_MSGS_KEY);
  const forAccount = msgMap[accountKey(email)] || {};
  return [...stored, ...seed]
    .map((c) => hydrateComplaint(c, Array.isArray(forAccount[c.id]) ? forAccount[c.id] : []))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getComplaint = async (id: string, email?: string | null, includeSeed = false) => {
  const all = await getComplaints(email, includeSeed);
  return all.find((c) => c.id === id) || null;
};

export const addComplaintMessage = async (
  email: string | null | undefined,
  id: string,
  text: string,
) => {
  const map = await readMap(COMPLAINT_MSGS_KEY);
  const ak = accountKey(email);
  const forAccount = map[ak] || {};
  const list: StoredComplaintMsg[] = Array.isArray(forAccount[id]) ? forAccount[id] : [];
  const msg: StoredComplaintMsg = {
    id: `cum-${Date.now()}`,
    text: String(text || "").trim(),
    createdAt: new Date().toISOString(),
  };
  forAccount[id] = [...list, msg];
  map[ak] = forAccount;
  await writeMap(COMPLAINT_MSGS_KEY, map);
  return msg;
};

export const addComplaint = async (
  email: string | null | undefined,
  input: Partial<MockComplaint>,
) => {
  const map = await readMap(COMPLAINTS_KEY);
  const ak = accountKey(email);
  const list: MockComplaint[] = Array.isArray(map[ak]) ? map[ak] : [];
  const complaint: MockComplaint = {
    id: `cmp-${Date.now()}`,
    conversationId: input.conversationId ?? null,
    targetName: input.targetName || "Kullanıcı",
    targetAvatar: input.targetAvatar ?? null,
    reason: input.reason || "Diğer",
    description: input.description || "",
    images: Array.isArray(input.images) ? input.images : [],
    createdAt: new Date().toISOString(),
  };
  map[ak] = [complaint, ...list];
  await writeMap(COMPLAINTS_KEY, map);
  return hydrateComplaint(complaint, []);
};

export const restoreComplaints = async () => {
  await writeMap(COMPLAINT_MSGS_KEY, {});
  await writeMap(COMPLAINTS_KEY, {});
};
