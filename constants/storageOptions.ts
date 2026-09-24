export type DownloadPref = "never" | "wifi" | "wifi_cellular";
export type MediaQuality = "standard" | "hd";

export const DOWNLOAD_PREF_LABEL: Record<DownloadPref, string> = {
    never: "Hiçbir Zaman",
    wifi: "Sadece Wi-Fi",
    wifi_cellular: "Wi-Fi ve Hücresel Veri",
};

export const DOWNLOAD_PREF_OPTIONS: DownloadPref[] = ["never", "wifi", "wifi_cellular"];

export const MEDIA_QUALITY_LABEL: Record<MediaQuality, string> = {
    standard: "Standart",
    hd: "HD",
};

export const MEDIA_QUALITY_OPTIONS: MediaQuality[] = ["standard", "hd"];

export const AUTO_DOWNLOAD_FIELD_LABEL: Record<string, string> = {
    photos: "Fotoğraflar",
    audio: "Ses",
    video: "Video",
    documents: "Belgeler",
};

export const MEDIA_QUALITY_FIELD_LABEL: Record<string, string> = {
    upload: "Yükleme Kalitesi",
    autoDownload: "Otomatik İndirme Kalitesi",
};
