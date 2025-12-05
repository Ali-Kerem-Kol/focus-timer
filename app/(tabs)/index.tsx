import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function FocusTimerScreen() {
  const [minutesInput, setMinutesInput] = useState('');
  const [secondsInput, setSecondsInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startTimer = () => {
    const minutes = parseInt(minutesInput) || 0;
    const seconds = parseInt(secondsInput) || 0;
    const total = minutes * 60 + seconds;

    if (total <= 0) {
      alert("Lütfen süreyi doğru giriniz.");
      return;
    }

    setTimeLeft(total);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
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
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Odaklanma Zamanlayıcı</Text>

      {/* Süre giriş alanları */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Dakika"
          value={minutesInput}
          onChangeText={setMinutesInput}
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Saniye"
          value={secondsInput}
          onChangeText={setSecondsInput}
        />
      </View>

      {/* Geri sayım */}
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

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
    </View>
  );
}

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
});
