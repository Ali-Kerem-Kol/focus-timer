import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

type LastSession = {
  category: string;
  duration: number; // total seconds
  distractions: number;
  finishedAt: string;
};

export default function FocusTimerScreen() {
  const [minutesInput, setMinutesInput] = useState('');
  const [secondsInput, setSecondsInput] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [distractionCount, setDistractionCount] = useState(0);

  // Yeni eklenen state (Commit 9)
  const [lastSession, setLastSession] = useState<LastSession | null>(null);

  // --------------------
  //     APPSTATE
  // --------------------
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        if (isRunning) {
          stopTimer();
          setDistractionCount(prev => prev + 1);
          alert("Dikkat dağıldı! Sayaç durduruldu.");
        }
      }
    });

    return () => subscription.remove();
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (!category) {
      alert("Lütfen kategori seçiniz.");
      return;
    }

    const minutes = parseInt(minutesInput) || 0;
    const seconds = parseInt(secondsInput) || 0;
    const total = minutes * 60 + seconds;

    if (total <= 0) {
      alert("Lütfen süreyi doğru giriniz.");
      return;
    }

    setTimeLeft(total);
    setIsRunning(true);
    setLastSession(null); // önceki özet gizlensin

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);

          // ------ SEANS ÖZETİNİ OLUŞTUR ------
          setLastSession({
            category: category!,
            duration: total,
            distractions: distractionCount,
            finishedAt: new Date().toISOString(),
          });

          alert("Süre bitti!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetTimer = () => {
    stopTimer();
    setTimeLeft(0);
    setDistractionCount(0);
    setLastSession(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Odaklanma Zamanlayıcı</Text>

      {/* --- Kategori Seçimi --- */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Kategori Seç:</Text>
        <RNPickerSelect
          onValueChange={(value) => setCategory(value)}
          placeholder={{ label: "Kategori seçiniz...", value: null }}
          items={[
            { label: "Ders Çalışma", value: "ders" },
            { label: "Kodlama", value: "kodlama" },
            { label: "Proje", value: "proje" },
            { label: "Kitap Okuma", value: "kitap" },
          ]}
          style={pickerSelectStyles}
          disabled={isRunning}
        />
      </View>

      {/* Süre giriş alanları */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Dakika"
          value={minutesInput}
          onChangeText={setMinutesInput}
          editable={!isRunning}
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Saniye"
          value={secondsInput}
          onChangeText={setSecondsInput}
          editable={!isRunning}
        />
      </View>

      {/* Geri sayım */}
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

      <Text style={styles.distraction}>
        Dikkat Dağınıklığı: {distractionCount}
      </Text>

      {/* Butonlar */}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.start]} onPress={startTimer} disabled={isRunning}>
          <Text style={styles.buttonText}>Başlat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.stop]} onPress={stopTimer}>
          <Text style={styles.buttonText}>Duraklat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.reset]} onPress={resetTimer}>
          <Text style={styles.buttonText}>Sıfırla</Text>
        </TouchableOpacity>
      </View>

      {/* ------------------- */}
      {/*   SEANS ÖZETİ UI    */}
      {/* ------------------- */}
      {lastSession && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Son Seans Özeti</Text>

          <Text style={styles.summaryText}>Kategori: {lastSession.category}</Text>
          <Text style={styles.summaryText}>Süre: {Math.floor(lastSession.duration / 60)} dk</Text>
          <Text style={styles.summaryText}>Dikkat Dağınıklığı: {lastSession.distractions}</Text>
          <Text style={styles.summaryText}>
            Bitiş Saati: {new Date(lastSession.finishedAt).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const pickerSelectStyles = {
  inputAndroid: {
    color: 'white',
    backgroundColor: '#1b2033',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  inputIOS: {
    color: 'white',
    backgroundColor: '#1b2033',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: 'white',
    marginBottom: 20,
  },
  dropdownContainer: {
    width: '80%',
    marginBottom: 20,
  },
  label: {
    color: 'white',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    width: 100,
    height: 45,
    backgroundColor: '#1b2033',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  timer: {
    fontSize: 50,
    color: 'white',
    marginVertical: 20,
  },
  distraction: {
    color: 'white',
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  start: {
    backgroundColor: '#3cb371',
  },
  stop: {
    backgroundColor: '#d4a017',
  },
  reset: {
    backgroundColor: '#5563c1',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  summaryBox: {
    marginTop: 25,
    backgroundColor: '#1b2033',
    padding: 15,
    borderRadius: 10,
    width: '90%',
  },
  summaryTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  summaryText: {
    color: 'white',
    fontSize: 15,
  },
});
