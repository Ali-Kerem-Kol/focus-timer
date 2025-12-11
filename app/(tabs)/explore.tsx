import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusSession } from './types';
import { useFocusEffect } from '@react-navigation/native';

const STORAGE_KEY = "FOCUS_SESSIONS";

export default function ReportsScreen() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [todayTime, setTodayTime] = useState(0);
  const [totalDistractions, setTotalDistractions] = useState(0);

  const loadSessions = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const data: FocusSession[] = json ? JSON.parse(json) : [];

      setSessions(data);

      // ---------- TOPLAM SÜRE ----------
      const total = data.reduce((sum, s) => sum + s.duration, 0);
      setTotalTime(total);

      // ---------- BUGÜNKÜ SÜRE ----------
      const today = new Date().toDateString();
      const todayTotal = data
        .filter(s => new Date(s.finishedAt).toDateString() === today)
        .reduce((sum, s) => sum + s.duration, 0);
      setTodayTime(todayTotal);

      // ---------- TOPLAM DİKKAT DAĞ. ----------
      const dist = data.reduce((sum, s) => sum + s.distractions, 0);
      setTotalDistractions(dist);

    } catch (err) {
      console.log("Raporlar yüklenirken hata:", err);
    }
  };

  // Ekrana her dönüldüğünde çalışır
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const renderItem = ({ item }: { item: FocusSession }) => (
    <View style={styles.sessionBox}>
      <Text style={styles.sessionText}>Kategori: {item.category}</Text>
      <Text style={styles.sessionText}>Süre: {Math.floor(item.duration / 60)} dk</Text>
      <Text style={styles.sessionText}>Dikkat Dağınıklığı: {item.distractions}</Text>
      <Text style={styles.sessionText}>Tarih: {new Date(item.finishedAt).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Raporlar</Text>

      <View style={styles.statBox}>
        <Text style={styles.statText}>Bugünkü Süre: {Math.floor(todayTime / 60)} dk</Text>
        <Text style={styles.statText}>Toplam Süre: {Math.floor(totalTime / 60)} dk</Text>
        <Text style={styles.statText}>Toplam Dikkat Dağınıklığı: {totalDistractions}</Text>
      </View>

      <Text style={styles.subtitle}>Geçmiş Seanslar</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
}

// --------------------
//   TİPLER
// --------------------
export type FocusSession = {
  id: string;
  category: string;
  duration: number;
  distractions: number;
  finishedAt: string;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0f1a',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  statBox: {
    backgroundColor: '#1b2033',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  subtitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  sessionBox: {
    backgroundColor: '#1b2033',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  sessionText: {
    color: 'white',
    fontSize: 14,
  },
});
