import { store } from "@/store/app";
import CreateLoadService from "@/service/createLoad.service";
import { showLocalNotification } from "@/utils/notifications/localNotificationService";
import { hasNotificationPermission } from "@/utils/notifications/notificationPermissions";
import { isNativeNotificationPlatform } from "@/utils/notifications/platform";
import {
    _clearMatching,
    _setMatchedDriver,
    _setMatchingPhase,
    _setRadiusStage,
    _startMatching,
    MatchingSummary,
    SEARCH_RADIUS_STAGES,
    SEARCH_STAGE_MS,
} from "./slice";

// Süreç herhangi bir ekranın mount/unmount durumundan bağımsız ilerlemeli
// (kullanıcı "geri" yapıp başka ekrana gidebilir); bu yüzden zamanlayıcı ve
// istek burada, job-matching ekranına değil, modül seviyesinde tutuluyor —
// service/api.ts'teki paylaşılan refreshPromise ile aynı desen.
let timers: ReturnType<typeof setTimeout>[] = [];
let cancelled = false;

const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
};

const notify = async (title: string, body: string) => {
    if (!isNativeNotificationPlatform()) return;
    if (!(await hasNotificationPermission())) return;
    showLocalNotification(title, body).catch(() => {});
};

const isStillActive = (jobId: string) => !cancelled && store.getState().jobMatching.active?.jobId === jobId;

const runSearch = async (jobId: string) => {
    const driversPromise = store
        .dispatch(CreateLoadService.endpoints.getDrivers.initiate(undefined, { forceRefetch: true }))
        .unwrap()
        .catch(() => [] as any[]);

    for (let stage = 0; stage < SEARCH_RADIUS_STAGES.length; stage++) {
        if (!isStillActive(jobId)) return;
        store.dispatch(_setRadiusStage(stage));
        await new Promise<void>((resolve) => {
            timers.push(setTimeout(resolve, SEARCH_STAGE_MS));
        });
    }

    if (!isStillActive(jobId)) return;

    const drivers = await driversPromise;

    if (!isStillActive(jobId)) return;

    if (Array.isArray(drivers) && drivers.length > 0) {
        const driver = drivers[Math.floor(Math.random() * drivers.length)];
        store.dispatch(_setMatchedDriver({ id: driver.id, fullName: driver.fullName, phone: driver.phone }));
        store.dispatch(_setMatchingPhase("success"));
        notify("Taşıyıcı bulundu!", `${driver.fullName} yükünüzü almak için onayınızı bekliyor.`);
        timers.push(
            setTimeout(() => {
                if (isStillActive(jobId)) store.dispatch(_setMatchingPhase("review"));
            }, 1400),
        );
    } else {
        store.dispatch(_setMatchingPhase("not_found"));
        notify(
            "Talebiniz beklemede",
            "Şu an uygun taşıyıcı bulunamadı. İsteğiniz sunucuda bekletiliyor, uygun bir taşıyıcı bulununca bildirim alacaksınız.",
        );
    }
};

export const startMatching = (jobId: string, summary?: MatchingSummary) => {
    clearTimers();
    cancelled = false;
    store.dispatch(_startMatching({ jobId, startedAt: Date.now(), summary }));
    void runSearch(jobId);
};

// Kullanıcı işlemi iptal eder: süreç tamamen durur, rozet kalkar.
export const cancelMatching = () => {
    cancelled = true;
    clearTimers();
    store.dispatch(_clearMatching());
};

// Taşıyıcı onaylandı: süreç normal şekilde tamamlandı, rozet kalkar.
export const finishMatching = () => {
    cancelled = true;
    clearTimers();
    store.dispatch(_clearMatching());
};

// "Yük Oluştur" her nereden tetiklenirse tetiklensin (Home, fiyat
// hesaplayıcı, kayıtlı rota "Yeniden Kullan", Ticarim harita ekranı vb.)
// aynı kurala uymalı: arkada zaten aranan bir taşıyıcı varsa yeni bir form
// açmak yerine doğrudan o eşleşme ekranına gidilir — aksi halde kullanıcı
// aynı yükü ikinci kez oluşturabilir. `onGoingToCreateLoad`, yalnızca
// gerçekten create-load'a gidilecekse (ör. formu önceden doldurmak için)
// çalıştırılır — arkada aktif bir eşleşme varken forma dokunulmaz.
export const goToCreateLoadOrActiveMatching = (
    router: { push: (href: any) => void },
    onGoingToCreateLoad?: () => void,
) => {
    const activeJobId = store.getState().jobMatching.active?.jobId;
    if (activeJobId) {
        router.push({ pathname: "/job-matching/[id]", params: { id: activeJobId } });
    } else {
        onGoingToCreateLoad?.();
        router.push("/create-load");
    }
};
