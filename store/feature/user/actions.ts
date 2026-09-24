import AuthService from '@/service/auth.service';
import BannersService from '@/service/banners.service';
import ChatService from '@/service/chat.service';
import ComplaintsService from '@/service/complaints.service';
import CreateLoadService from '@/service/createLoad.service';
import DeleteAccountService from '@/service/deleteAccount.service';
import FeedbackService from '@/service/feedback.service';
import ClientLogsService from '@/service/clientLogs.service';
import MessagesService from '@/service/messages.service';
import NotificationSettingsService from '@/service/notificationSettings.service';
import NotificationsService from '@/service/notifications.service';
import PaymentService from '@/service/payment.service';
import PresenceService from '@/service/presence.service';
import ProfileService from '@/service/profile.service';
import SocialAccountsService from '@/service/socialAccounts.service';
import StorageSettingsService from '@/service/storageSettings.service';
import TicarimService from '@/service/ticarim.service';
import TrackingService from '@/service/tracking.service';
import { store } from "@/store/app";
import { clearQueryCache, hydrateQueryCache } from "@/utils/queryCachePersistence";
import { UserSessionType } from "@/types/UserSessionType";
import { _resetChat } from "../chat/slice";
import { _resetForm } from "../createLoad/slice";
import { cancelMatching } from "../jobMatching/actions";
import { _resetTicarimDraft } from "../ticarim/slice";
import { _clearUserSession, _setOnboardingDone, _setUserSession } from "./authSlice";

const API_SERVICES = [
    AuthService,
    BannersService,
    ChatService,
    ComplaintsService,
    CreateLoadService,
    DeleteAccountService,
    FeedbackService,
    ClientLogsService,
    MessagesService,
    NotificationSettingsService,
    NotificationsService,
    PaymentService,
    PresenceService,
    ProfileService,
    SocialAccountsService,
    StorageSettingsService,
    TicarimService,
    TrackingService,
];

export const setUserSession = (userSession: UserSessionType | null) => store.dispatch(_setUserSession(userSession));

export const loginWithSession = (userSession: UserSessionType) => {
    store.dispatch(_setUserSession(userSession));
    API_SERVICES.forEach((service) => store.dispatch(service.util.resetApiState()));
    void hydrateQueryCache();
};

export const setOnboardingDone = (done: boolean) => store.dispatch(_setOnboardingDone(done));

// Oturumu, tüm servis cache'lerini ve kullanıcıya ait taslakları temizler.
export const clearUserSession = () => {
    void clearQueryCache(store.getState().userSlice.userSession?.userId);
    store.dispatch(_clearUserSession());
    store.dispatch(_resetChat());
    store.dispatch(_resetForm());
    store.dispatch(_resetTicarimDraft());
    cancelMatching();
    API_SERVICES.forEach((service) => store.dispatch(service.util.resetApiState()));
};
