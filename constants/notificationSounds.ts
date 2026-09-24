export type SoundOption = { id: string; label: string };

export const NOTIFICATION_SOUNDS: SoundOption[] = [
    { id: "default", label: "Varsayılan" },
    { id: "chime", label: "Çan" },
    { id: "marimba", label: "Marimba" },
    { id: "pop", label: "Pop" },
    { id: "xylophone", label: "Ksilofon" },
    { id: "none", label: "Sessiz" },
];

export const CALL_SOUNDS: SoundOption[] = [
    { id: "default", label: "Varsayılan" },
    { id: "classic", label: "Klasik Zil" },
    { id: "marimba", label: "Marimba" },
    { id: "pulse", label: "Nabız" },
    { id: "chimes", label: "Çanlar" },
];
