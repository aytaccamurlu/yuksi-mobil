import { Alert } from 'react-native';

export function confirmImportantChange(message: string, onConfirm: () => void) {
    Alert.alert('Emin misiniz?', message, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet, Devam Et', onPress: onConfirm },
    ]);
}
