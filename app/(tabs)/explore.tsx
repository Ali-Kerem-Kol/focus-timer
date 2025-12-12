import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';

const STORAGE_KEY = "FOCUS_SESSIONS";
const screenWidth = Dimensions.get("window").width;

export type FocusSession = {
  id: string;
  category: string;
  duration: number;
  distractions: number;
  finishedAt: string;
};

export default function ReportsScreen() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [todayTime, setTodayTime] = useState(0);
  const [totalDistractions, setTotalDistractions] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);

  const loadSessions = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const data: FocusSession[] = json ? JSON.parse(json) : [];

      setSessions(data);

      // ---------- TOPLAM SÜRE ----------
      setTotalTime(data.reduce((sum, s) => sum + s.duration, 0));

      // ---------- BUGÜNKÜ SÜRE ----------
      const today = new Date().toDateString();
      setTodayTime(
        data
          .filter(s => new Date(s.finishedAt).toDateString() === today)
          .reduce((sum, s) => sum + s.duration, 0)
      );

      // ---------- TOPLAM DİKKAT DAĞ. ----------
      setTotalDistractions(
        data.reduce((sum, s) => sum + s.distractions, 0)
      );

      // ---------- 7 GÜNLÜK BAR CHART VERİSİ ----------
      const last7days: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);

        const dayString = day.toDateString();
        const totalDayMinutes =
          data
            .filter(s => new Date(s.finishedAt).toDateString() === dayString)
            .reduce((sum, s) => sum + s.duration / 60, 0); // dakika cinsinden

        last7days.push(Math.round(totalDayMinutes));
      }

      setWeeklyData(last7days);

    } catch (err) {
      console.log("Raporlar yüklenirken hata:", err);
    }
  };

  // Ekrana her dönüldüğünde veri yenilenir
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Raporlar</Text>

      {/* ------------------- */}
      {/*   7 GÜNLÜK BAR CHART */}
      {/* ------------------- */}
      <Text style={styles.subtitle}>Son 7 Gün</Text>

      <BarChart
        data={{
          labels: ["-6", "-5", "-4", "-3", "-2", "-1", "Bugün"],
          datasets: [{ data: weeklyData }],
        }}
        width={screenWidth - 30}
        height={220}
        chartConfig={{
          backgroundColor: "#1b2033",
          backgroundGradientFrom: "#1b2033",
          backgroundGradientTo: "#1b2033",
          decimalPlaces: 0,
          color: () => `rgba(255, 255, 255, 0.9)`,
          labelColor: () => `rgba(255, 255, 255, 0.7)`,
        }}
        style={{ marginVertical: 10, borderRadius: 12, alignSelf: "center" }}
      />

      {/* ------------------- */}
      {/*   İSTATİSTİKLER     */}
      {/* ------------------- */}
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
        scrollEnabled={false}
      />
    </ScrollView>
  );
}

// --------------------
//   STYLES
// --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0f1a',
    padding: 15,
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    color: 'white',
    fontSize: 18,
    marginTop: 15,
    marginBottom: 8,
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
