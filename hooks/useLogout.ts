import { useLogoutMutation } from '@/service/auth.service';
import { clearUserSession } from '@/store/feature/user/actions';
import { useUserSession } from '@/store/feature/user/hooks';
import { clearAllLocalData, clearAutoReloginCredentials } from '@/utils/storage';
import { Alert } from 'react-native';

export function useLogout() {
    const userSession = useUserSession();
    const [logoutApi] = useLogoutMutation();

    return () => {
        Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Çıkış Yap',
                style: 'destructive',
                onPress: async () => {
                    // API'ye haber vermek best-effort; cihazdaki her şey her
                    // durumda temizlenir (storage + store + servis cache'leri).
                    const refreshToken = userSession?.refreshToken;
                    await clearAllLocalData();
                    await clearAutoReloginCredentials();
                    clearUserSession();
                    logoutApi(refreshToken).catch(() => {});
                },
            },
        ]);
    };
}
