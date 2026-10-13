---
name: kosanku-screen-patterns
description: Pola standar pembuatan dan modifikasi screen di KosanKu. Gunakan skill ini saat diminta membuat screen baru, menambah fitur ke screen yang sudah ada, atau memperbaiki UI/UX screen.
---

# Pola Screen KosanKu

## Template Screen Standar

Setiap screen di KosanKu mengikuti pola yang konsisten. Berikut adalah template dasar:

```jsx
/**
 * screens/{role}/{ScreenName}.jsx
 * Deskripsi singkat fungsi screen
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DrawerButton from '../../components/navigation/DrawerButton';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';

const ScreenName = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    // Panggil service ...
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <DrawerButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('namespace.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('namespace.subtitle')}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadData(true); }}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item }) => (
          // Card component
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  headerTitle: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  listContent: { padding: SPACING[4], gap: SPACING[4] },
});

export default ScreenName;
```

## Pola Header
- Selalu gunakan `DrawerButton` di sisi kiri
- Warna header: `COLORS.primary` (Teal)
- Safe area: `paddingTop: Math.max((insets?.top || 0) + 16, 48)`

## Pola Dropdown Sort/Filter
Selalu gunakan komponen `Menu` dari `react-native-paper`:
```jsx
import { Menu, Button } from 'react-native-paper';

// Di dalam komponen:
const [sortVisible, setSortVisible] = useState(false);
const [sortBy, setSortBy] = useState('nameAsc');

// JSX:
<Menu
  visible={sortVisible}
  onDismiss={() => setSortVisible(false)}
  anchor={
    <Button mode="outlined" onPress={() => setSortVisible(true)}
      textColor={COLORS.textPrimary}
      style={{ borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md }}
      labelStyle={{ fontSize: 13, marginHorizontal: 12, marginVertical: 6 }}>
      {t('common.sort.title', 'Urutkan')}
    </Button>
  }
>
  <Menu.Item onPress={() => { setSortBy('nameAsc'); setSortVisible(false); }} title={`${t('common.sort.asc')}`} />
  <Menu.Item onPress={() => { setSortBy('nameDesc'); setSortVisible(false); }} title={`${t('common.sort.desc')}`} />
</Menu>
```

## Pola Card
- Wrapper: `TouchableOpacity` dengan `activeOpacity={0.85}`
- Styling: `backgroundColor: COLORS.white`, `borderRadius: BORDER_RADIUS.xl`, `...SHADOW.md`
- Photo container: height 180, `resizeMode: 'cover'`
- Body: `padding: SPACING[4]`

## Pola Format Angka
```jsx
const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount ?? 0);
```

## Pola Navigasi
- Selalu gunakan konstanta dari `screenNames.js`:
```jsx
import { TENANT_SCREENS } from '../../constants/screenNames';
navigation.navigate(TENANT_SCREENS.PROPERTY_DETAIL, { property: item });
```

## Pola Harga per Bulan
Gunakan kunci i18n, JANGAN hardcode:
```jsx
<Text>{formatCurrency(price)}{t('common.perMonth')}</Text>
// id.json: "perMonth": "/bln"
// en.json: "perMonth": "/mo"
```

## Checklist Membuat Screen Baru
1. [ ] Buat file `.jsx` di folder `screens/{role}/`
2. [ ] Tambahkan nama screen di `screenNames.js`
3. [ ] Daftarkan di navigator yang sesuai (`OwnerNavigator.jsx` atau `TenantNavigator.jsx`)
4. [ ] Tambahkan semua kunci terjemahan di `id.json` DAN `en.json`
5. [ ] Gunakan token desain dari `constants/` (JANGAN hardcode)
6. [ ] Pastikan ada safe area handling dan pull-to-refresh
