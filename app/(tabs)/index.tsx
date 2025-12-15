import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

const SESSIONS_KEY = 'FOCUS_SESSIONS';

const CATEGORY_OPTIONS = [
  { label: 'Ders Çalışma', value: 'ders' },
  { label: 'Kodlama', value: 'kodlama' },
  { label: 'Proje', value: 'proje' },
  { label: 'Kitap Okuma', value: 'kitap' },
];

type FocusSession = {
  id: string;
  category: string;
  durationSeconds: number;
  distractionCount: number;
  finishedAt: string; // ISO tarih
};

export default function TimerScreen() {
  // Kullanıcının girdiği süre
  const [inputMinutes, setInputMinutes] = useState<string>('25');
  const [inputSeconds, setInputSeconds] = useState<string>('0');

  // Sayaç (saniye)
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasSessionStarted, setHasSessionStarted] = useState(false);

  // Kategori
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dikkat dağınıklığı
  const [distractionCount, setDistractionCount] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Son seans özeti
  const [lastSession, setLastSession] = useState<FocusSession | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Bu seansın toplam süresi (saniye) – kayıt için
  const initialSecondsRef = useRef<number>(25 * 60);

  // Kullanıcının girdiği dakikayı/saniyeyi sayıya çevir
  const getTotalSeconds = (): number => {
    const m = parseInt(inputMinutes || '0', 10);
    const s = parseInt(inputSeconds || '0', 10);

    const safeM = isNaN(m) ? 0 : m;
    const safeS = isNaN(s) ? 0 : s;

    // saniye 0–59 arası olsun
    const clampedS = Math.max(0, Math.min(59, safeS));

    return safeM * 60 + clampedS;
  };

  // Süre alanları değiştiğinde, eğer seans başlamamışsa sayacı güncelle
  useEffect(() => {
    if (!hasSessionStarted && !isRunning) {
      const total = getTotalSeconds();
      setSecondsLeft(total);
      initialSecondsRef.current = total;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMinutes, inputSeconds, hasSessionStarted, isRunning]);

  // AsyncStorage'a seans kaydet
  const saveSession = async (session: FocusSession) => {
    try {
      const existing = await AsyncStorage.getItem(SESSIONS_KEY);
      const parsed: FocusSession[] = existing ? JSON.parse(existing) : [];
      parsed.push(session);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.error('Seans kaydedilirken hata:', err);
    }
  };

  const handleSessionFinished = async () => {
    const categoryLabel =
      CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label || 'Belirtilmemiş';

    const session: FocusSession = {
      id: Date.now().toString(),
      category: categoryLabel,
      durationSeconds: initialSecondsRef.current,
      distractionCount,
      finishedAt: new Date().toISOString(),
    };

    saveSession(session);
    setLastSession(session);
    setInfoMessage('Seans tamamlandı ve kaydedildi.');
    setHasSessionStarted(false);

    // Haptics feedback (ignore failures gracefully)
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Request permission and schedule a local notification
    try {
      if (Platform.OS !== 'web') {
        let perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') {
          perm = await Notifications.requestPermissionsAsync();
        }
        if (perm.status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Seans tamamlandı!',
              body: `${categoryLabel} odak seansı bitti.`,
              sound: true,
            },
            trigger: null,
          });
        }
      }
    } catch (e) {
      console.warn('Notification error:', e);
    }
  };

  // Sayaç çalışırken her 1 saniyede bir azalt
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsRunning(false);
            handleSessionFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // AppState ile dikkat dağınıklığı takibi
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      if (
        prevState === 'active' &&
        (nextState === 'background' || nextState === 'inactive') &&
        isRunning
      ) {
        setIsRunning(false);
        setDistractionCount((prev) => prev + 1);
        setInfoMessage('Uygulamadan çıktığın için sayaç duraklatıldı.');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  const handleStartPause = () => {
    const total = getTotalSeconds();

    // İlk kez başlatılıyorsa kategori ve süre zorunlu
    if (!isRunning && !hasSessionStarted) {
      if (total <= 0) {
        setErrorMessage('Lütfen 0\'dan büyük bir süre girin.');
        return;
      }
      if (!selectedCategory) {
        setErrorMessage('Lütfen seans için bir kategori seçin.');
        return;
      }
      // İlk kez başlatılıyorsa başlangıç süresini kilitle
      initialSecondsRef.current = total;
      setSecondsLeft(total);
    }

    // Süre 0 ise yeni seans için resetle
    if (secondsLeft === 0 && total > 0) {
      initialSecondsRef.current = total;
      setSecondsLeft(total);
      setDistractionCount(0);
      setLastSession(null);
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setHasSessionStarted(true);
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    const total = getTotalSeconds();
    initialSecondsRef.current = total;
    setSecondsLeft(total);
    setDistractionCount(0);
    setInfoMessage(null);
    setHasSessionStarted(false);
  };

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m} dk ${s} sn`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const inputsDisabled = hasSessionStarted || isRunning;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Odaklanma Zamanlayıcı</Text>

      {/* Süre girişi */}
      <View style={styles.durationContainer}>
        <Text style={styles.durationLabel}>Süre (dakika:saniye):</Text>
        <View style={styles.durationInputsRow}>
          <TextInput
            style={[styles.durationInput, inputsDisabled && styles.inputDisabled]}
            keyboardType="numeric"
            value={inputMinutes}
            editable={!inputsDisabled}
            onChangeText={(text) => setInputMinutes(text.replace(/[^0-9]/g, ''))}
            placeholder="Dakika"
            placeholderTextColor="#6b7280"
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={[styles.durationInput, inputsDisabled && styles.inputDisabled]}
            keyboardType="numeric"
            value={inputSeconds}
            editable={!inputsDisabled}
            onChangeText={(text) => setInputSeconds(text.replace(/[^0-9]/g, ''))}
            placeholder="Saniye"
            placeholderTextColor="#6b7280"
          />
        </View>
        <Text style={styles.durationHint}>
          Süreyi sadece seans başlamadan önce değiştirebilirsin.
        </Text>
      </View>

      {/* Kategori seçimi */}
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryLabel}>Kategori Seç:</Text>
        <View style={styles.pickerWrapper}>
          <RNPickerSelect
            onValueChange={(value) => {
              setSelectedCategory(value);
              setErrorMessage(null);
            }}
            items={CATEGORY_OPTIONS}
            placeholder={{ label: 'Kategori seçiniz...', value: null }}
            value={selectedCategory}
            style={{
              inputIOS: styles.pickerInput,
              inputAndroid: styles.pickerInput,
              placeholder: { color: '#9ca3af' },
            }}
            useNativeAndroidPickerStyle={false}
          />
        </View>
        {selectedCategory && (
          <Text style={styles.selectedCategoryText}>
            Seçilen kategori:{' '}
            <Text style={{ fontWeight: '600' }}>
              {CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label}
            </Text>
          </Text>
        )}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {/* Sayaç */}
      <Text style={styles.timerText}>
        {minutes}:{seconds}
      </Text>

      {/* Dikkat dağınıklığı bilgisi */}
      <Text style={styles.distractionText}>
        Toplam dikkat dağınıklığı: <Text style={{ fontWeight: '600' }}>{distractionCount}</Text>
      </Text>
      {infoMessage && <Text style={styles.infoText}>{infoMessage}</Text>}

      {/* Butonlar */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity onPress={handleStartPause} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>{isRunning ? 'Duraklat' : 'Başlat'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleReset} style={styles.buttonSecondary}>
          <Text style={styles.buttonText}>Sıfırla</Text>
        </TouchableOpacity>
      </View>

      {/* Son seans özeti */}
      {lastSession && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Son Seans Özeti</Text>
          <Text style={styles.summaryText}>Kategori: {lastSession.category}</Text>
          <Text style={styles.summaryText}>
            Süre: {formatDuration(lastSession.durationSeconds)}
          </Text>
          <Text style={styles.summaryText}>
            Dikkat dağınıklığı: {lastSession.distractionCount}
          </Text>
          <Text style={styles.summaryText}>Bitiş: {formatDate(lastSession.finishedAt)}</Text>
        </View>
      )}

      <Text style={styles.hint}>
        Seans bittiğinde otomatik kaydedilir. Raporlar sekmesinden tüm geçmiş seansları ve
        istatistikleri görebilirsin.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    backgroundColor: '#020617',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: 'white',
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationLabel: {
    color: '#e5e7eb',
    marginBottom: 8,
    fontSize: 14,
  },
  durationInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  colon: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '600',
  },
  durationHint: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 11,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryLabel: {
    color: '#e5e7eb',
    marginBottom: 8,
    fontSize: 14,
  },
  pickerWrapper: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  pickerInput: {
    color: 'white',
    paddingVertical: 8,
    fontSize: 14,
  },
  selectedCategoryText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 12,
  },
  errorText: {
    marginTop: 6,
    color: '#f97373',
    fontSize: 12,
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    letterSpacing: 4,
  },
  distractionText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: 14,
  },
  infoText: {
    marginTop: 4,
    textAlign: 'center',
    color: '#facc15',
    fontSize: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  buttonPrimary: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonSecondary: {
    backgroundColor: '#334155',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  summaryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    color: '#e5e7eb',
    fontSize: 13,
    marginBottom: 2,
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
  },
});
