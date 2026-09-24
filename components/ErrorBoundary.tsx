import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tappable from '@/components/Tappable';
import { clearUserSession } from '@/store/feature/user/actions';
import { clearUserSessionFromStorage } from '@/utils/storage';
import { reportIssue } from '@/utils/errorReporting';

const CRASH_WINDOW_MS = 60000;
const CRASH_THRESHOLD = 3;
const FORCE_LOGOUT_DELAY_MS = 1500;

const reportCrashToBackend = (error: unknown, info: React.ErrorInfo) => {
  const summary = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const detail = info?.componentStack ? info.componentStack.split('\n').slice(0, 6).join('\n') : undefined;
  reportIssue('crash', summary, detail);
};

type Props = { children: React.ReactNode };
type State = { hasError: boolean; forcingLogout: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, forcingLogout: false };

  private crashTimestamps: number[] = [];
  private forceLogoutTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    reportCrashToBackend(error, info);

    const now = Date.now();
    this.crashTimestamps = this.crashTimestamps.filter((t) => now - t < CRASH_WINDOW_MS);
    this.crashTimestamps.push(now);

    if (this.crashTimestamps.length >= CRASH_THRESHOLD) {
      this.setState({ forcingLogout: true });
      this.forceLogoutTimer = setTimeout(() => this.forceLogout(), FORCE_LOGOUT_DELAY_MS);
    }
  }

  componentWillUnmount() {
    if (this.forceLogoutTimer) clearTimeout(this.forceLogoutTimer);
  }

  reset = () => this.setState({ hasError: false });

  forceLogout = async () => {
    if (this.forceLogoutTimer) {
      clearTimeout(this.forceLogoutTimer);
      this.forceLogoutTimer = null;
    }
    try {
      await clearUserSessionFromStorage();
      clearUserSession();
    } catch {
      // yoksay
    }
    this.crashTimestamps = [];
    this.setState({ hasError: false, forcingLogout: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.forcingLogout) {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.iconWrap}>
            <ActivityIndicator size="small" color="#FF5B04" />
          </View>
          <Text style={s.title}>Sorun devam ediyor</Text>
          <Text style={s.subtitle}>Giriş ekranına yönlendiriliyorsunuz...</Text>
          <Tappable style={s.button} activeOpacity={0.85} onPress={this.forceLogout}>
            <Text style={s.buttonText}>Giriş Ekranına Dön</Text>
          </Tappable>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={s.container}>
        <View style={s.iconWrap}>
          <Feather name="alert-triangle" size={32} color="#FF5B04" />
        </View>
        <Text style={s.title}>Bir şeyler ters gitti</Text>
        <Text style={s.subtitle}>
          Beklenmedik bir hata oluştu. Tekrar denemek uygulamayı düzeltebilir.
        </Text>
        <Tappable style={s.button} activeOpacity={0.85} onPress={this.reset}>
          <Text style={s.buttonText}>Tekrar Dene</Text>
        </Tappable>
      </SafeAreaView>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFF1EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: { marginTop: 24, backgroundColor: '#FF5B04', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
