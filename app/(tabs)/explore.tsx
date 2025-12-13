import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const SESSIONS_KEY = 'FOCUS_SESSIONS';

type FocusSession = {
  id: string;
  category: string;
  durationSeconds: number;
  distractionCount: number;
  finishedAt: string;
};

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#020617',
  backgroundGradientFrom: '#020617',
  backgroundGradientTo: '#020617',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
  propsForBackgroundLines: {
    stroke: '#1f2937',
  },
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#eab308', '#8b5cf6'];

export default function ReportsScreen() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      const parsed: FocusSession[] = stored ? JSON.parse(stored) : [];
      setSessions(parsed);
    } catch (err) {
      console.error('Seanslar okunurken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadSessions();
    }, [])
  );

  const totalFocus = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalDistractions = sessions.reduce((sum, s) => sum + s.distractionCount, 0);

  const todayStr = new Date().toDateString();
  const todayFocus = sessions
    .filter((s) => new Date(s.finishedAt).toDateString() === todayStr)
    .reduce((sum, s) => sum + s.durationSeconds, 0);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} dk ${s} sn`;
  };

  // ----- Son 7 gün için bar chart verisi -----
  const getDayLabel = (d: Date) => {
    const days = ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return days[d.getDay()];
  };

  const last7Labels: string[] = [];
  const last7ValuesMinutes: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);

    const dayStr = day.toDateString();

    const totalForDaySeconds = sessions
      .filter((s) => new Date(s.finishedAt).toDateString() === dayStr)
      .reduce((sum, s) => sum + s.durationSeconds, 0);

    last7Labels.push(getDayLabel(day));
    last7ValuesMinutes.push(totalForDaySeconds / 60); // dakika
  }

  const barData = {
    labels: last7Labels,
    datasets: [
      {
        data: last7ValuesMinutes,
      },
    ],
  };

  // ----- Kategorilere göre toplam süre (pie chart) -----
  const totalsByCategory = new Map<string, number>(); // label -> seconds

  sessions.forEach((s) => {
    const current = totalsByCategory.get(s.category) ?? 0;
    totalsByCategory.set(s.category, current + s.durationSeconds);
  });

  const pieData = Array.from(totalsByCategory.entries()).map(
    ([categoryLabel, seconds], index) => ({
      name: categoryLabel,
      population: seconds / 60, // dakika
      color: PIE_COLORS[index % PIE_COLORS.length],
      legendFontColor: '#e5e7eb',
      legendFontSize: 12,
    })
  );

  const hasAnyData = sessions.length > 0;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Raporlar</Text>
        <Text style={styles.infoText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!hasAnyData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Raporlar</Text>
        <Text style={styles.infoText}>
          Henüz kayıtlı seans yok. Zamanlayıcı ekranından bir seans tamamla.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions.slice().reverse()} // en son seans en üstte
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Raporlar</Text>

            {/* Genel istatistikler */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Genel İstatistikler</Text>
              <Text style={styles.statsItem}>
                Bugün toplam odaklanma süresi:{' '}
                <Text style={styles.statsValue}>{formatDuration(todayFocus)}</Text>
              </Text>
              <Text style={styles.statsItem}>
                Tüm zamanların toplam odaklanma süresi:{' '}
                <Text style={styles.statsValue}>{formatDuration(totalFocus)}</Text>
              </Text>
              <Text style={styles.statsItem}>
                Toplam dikkat dağınıklığı:{' '}
                <Text style={styles.statsValue}>{totalDistractions}</Text>
              </Text>
            </View>

            {/* Bar Chart: Son 7 gün */}
            <Text style={styles.sectionTitle}>Son 7 Gün (Dakika)</Text>
            <BarChart
              style={styles.chart}
              data={barData}
              width={screenWidth - 48}
              height={220}
              yAxisSuffix=" dk"
              chartConfig={chartConfig}
              fromZero
              showBarTops={false}
            />

            {/* Pie Chart: Kategori dağılımı */}
            {pieData.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Kategorilere Göre Süre Dağılımı</Text>
                <PieChart
                  data={pieData}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="12"
                  absolute={false}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Geçmiş Seanslar</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.sessionItem}>
            <Text style={styles.sessionCategory}>{item.category}</Text>
            <Text style={styles.sessionText}>
              Süre: {formatDuration(item.durationSeconds)} | Dikkat dağınıklığı:{' '}
              {item.distractionCount}
            </Text>
            <Text style={styles.sessionDate}>
              {new Date(item.finishedAt).toLocaleString()}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
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
    color: 'white',
    marginBottom: 16,
  },
  infoText: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 8,
  },
  statsCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  statsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsItem: {
    color: '#e5e7eb',
    fontSize: 13,
    marginBottom: 4,
  },
  statsValue: {
    fontWeight: '600',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  chart: {
    borderRadius: 16,
    marginBottom: 12,
  },
  sessionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  sessionCategory: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sessionDate: {
    color: '#6b7280',
    fontSize: 11,
  },
});
