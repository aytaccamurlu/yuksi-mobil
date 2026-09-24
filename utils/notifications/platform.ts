import { Platform } from 'react-native';

export const isNativeNotificationPlatform = () => Platform.OS === 'ios' || Platform.OS === 'android';
