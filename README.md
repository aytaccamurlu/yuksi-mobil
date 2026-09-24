# Yüksi - Bireysel Kullanıcı Mobil Uygulaması

Yüksi, bireysel kullanıcıların kolayca kargo/kurye hizmeti alabilmesini sağlayan React Native (Expo) mobil uygulamasıdır.

## 📱 Özellikler

- **Yük Oluşturma** - Araç tipi seçimi, harita üzerinden adres belirleme, fotoğraflı kargo tarama
- **Fiyat Hesaplama** - Bottom Sheet ile hızlı fiyat teklifi alma
- **Gönderilerim** - Oluşturulmuş gönderileri filtreleme ve takip etme
- **Kanguru Chatbot** - kargo asistanı
- **Profil Yönetimi** - Profil fotoğrafı, isim ve iletişim bilgileri düzenleme

## 🛠 Teknoloji Stack

| Katman | Teknoloji |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigasyon | Expo Router (file-based routing) |
| State Management | Redux Toolkit + RTK Query |
| Styling | NativeWind (Tailwind CSS) |
| Harita | react-native-maps + Google Places API |
| UI | @gorhom/bottom-sheet, @expo/vector-icons, react-native-svg |

## 📁 Proje Yapısı

```
app/
├── (tabs)/           # Tab ekranları (Ana Sayfa, Gönderilerim, Profil)
├── auth/             # Login & Register
├── create-load.tsx   # Yük oluşturma
├── chat.tsx          # Kanguru chatbot
├── edit-profile.tsx  # Profil düzenleme
└── _layout.tsx       # Root layout (Auth guard, SessionProvider)
components/           # Yeniden kullanılabilir UI componentleri
constants/            # Sabitler (API endpoints, tema, filtreler)
hooks/                # Custom hook'lar (useCreateLoad vb.)
service/              # RTK Query API servisleri
store/                # Redux store ve slice'lar
types/                # TypeScript arayüzleri
utils/                # Yardımcı fonksiyonlar
```

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run start
```

## 📦 Build

```bash
# Android APK (EAS)
npx eas-cli build --platform android --profile preview

# iOS (EAS)
npx eas-cli build --platform ios --profile preview
```

## 🔑 Ortam

- **API Base URL:** `https://api.yuksi.tr/api`
- **EAS Project ID:** `c44ed676-7070-45a6-a697-5bdef23a51ee`
- **Android Package:** `com.yuksi.individual`
