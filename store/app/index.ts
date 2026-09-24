import AuthService from '@/service/auth.service';
import BannersService from '@/service/banners.service';
import ChatService from '@/service/chat.service';
import ComplaintsService from '@/service/complaints.service';
import CallsService from '@/service/calls.service';
import CreateLoadService from '@/service/createLoad.service';
import DeleteAccountService from '@/service/deleteAccount.service';
import FeedbackService from '@/service/feedback.service';
import ClientLogsService from '@/service/clientLogs.service';
import MessagesService from '@/service/messages.service';
import NotificationSettingsService from '@/service/notificationSettings.service';
import NotificationsService from '@/service/notifications.service';
import OrdersService from '@/service/orders.service';
import PaymentService from '@/service/payment.service';
import PresenceService from '@/service/presence.service';
import ProfileService from '@/service/profile.service';
import SocialAccountsService from '@/service/socialAccounts.service';
import StorageSettingsService from '@/service/storageSettings.service';
import TicarimService from '@/service/ticarim.service';
import TrackingService from '@/service/tracking.service';
import NetInfo from '@react-native-community/netinfo';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';
import { errorReportingMiddleware } from '../errorReportingMiddleware';
import chatSlice from '../feature/chat/slice';
import createLoadSlice from '../feature/createLoad/slice';
import jobMatchingSlice from '../feature/jobMatching/slice';
import ticarimSlice from '../feature/ticarim/slice';
import userSlice from '../feature/user/authSlice';

export const store = configureStore({
    reducer: {
        userSlice,
        chat: chatSlice,
        createLoad: createLoadSlice,
        jobMatching: jobMatchingSlice,
        ticarim: ticarimSlice,
        [AuthService.reducerPath]: AuthService.reducer,
        [ChatService.reducerPath]: ChatService.reducer,
        [ProfileService.reducerPath]: ProfileService.reducer,
        [CreateLoadService.reducerPath]: CreateLoadService.reducer,
        [TrackingService.reducerPath]: TrackingService.reducer,
        [NotificationsService.reducerPath]: NotificationsService.reducer,
        [MessagesService.reducerPath]: MessagesService.reducer,
        [PaymentService.reducerPath]: PaymentService.reducer,
        [ComplaintsService.reducerPath]: ComplaintsService.reducer,
        [SocialAccountsService.reducerPath]: SocialAccountsService.reducer,
        [TicarimService.reducerPath]: TicarimService.reducer,
        [BannersService.reducerPath]: BannersService.reducer,
        [PresenceService.reducerPath]: PresenceService.reducer,
        [NotificationSettingsService.reducerPath]: NotificationSettingsService.reducer,
        [StorageSettingsService.reducerPath]: StorageSettingsService.reducer,
        [FeedbackService.reducerPath]: FeedbackService.reducer,
        [ClientLogsService.reducerPath]: ClientLogsService.reducer,
        [DeleteAccountService.reducerPath]: DeleteAccountService.reducer,
        [OrdersService.reducerPath]: OrdersService.reducer,
        [CallsService.reducerPath]: CallsService.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ immutableCheck: false, serializableCheck: false })
            .concat(AuthService.middleware)
            .concat(BannersService.middleware)
            .concat(ChatService.middleware)
            .concat(ProfileService.middleware)
            .concat(CreateLoadService.middleware)
            .concat(TrackingService.middleware)
            .concat(NotificationsService.middleware)
            .concat(MessagesService.middleware)
            .concat(PaymentService.middleware)
            .concat(ComplaintsService.middleware)
            .concat(SocialAccountsService.middleware)
            .concat(TicarimService.middleware)
            .concat(PresenceService.middleware)
            .concat(NotificationSettingsService.middleware)
            .concat(StorageSettingsService.middleware)
            .concat(FeedbackService.middleware)
            .concat(ClientLogsService.middleware)
            .concat(DeleteAccountService.middleware)
            .concat(OrdersService.middleware)
            .concat(CallsService.middleware)
            .concat(errorReportingMiddleware)
});

setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost, onOnline, onOffline }) => {
    const appStateSub = AppState.addEventListener('change', (state) => {
        dispatch(state === 'active' ? onFocus() : onFocusLost());
    });

    let wasConnected = true;
    const netInfoSub = NetInfo.addEventListener((state) => {
        const isConnected = state.isConnected !== false && state.isInternetReachable !== false;
        if (isConnected === wasConnected) return;
        wasConnected = isConnected;
        dispatch(isConnected ? onOnline() : onOffline());
    });

    return () => {
        appStateSub.remove();
        netInfoSub();
    };
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
