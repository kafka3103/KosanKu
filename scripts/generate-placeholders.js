/**
 * Script untuk generate semua placeholder screen yang dibutuhkan navigasi
 * Jalankan: node scripts/generate-placeholders.js
 */
const fs = require('fs');
const path = require('path');

const screens = [
  // Shared
  { file: 'src/screens/shared/OtpScreen.jsx', title: 'OTP Verification', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/ProfileSetupScreen.jsx', title: 'Profile Setup', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/ProfileScreen.jsx', title: 'Profile', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/NotificationScreen.jsx', title: 'Notifications', scope: 'All' },
  { file: 'src/screens/shared/SettingsScreen.jsx', title: 'Settings', scope: 'All' },
  // Owner
  { file: 'src/screens/owner/DashboardScreen.jsx', title: 'Owner Dashboard', scope: 'PROBIS-07' },
  { file: 'src/screens/owner/PropertyListScreen.jsx', title: 'Property List', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/PropertyFormScreen.jsx', title: 'Property Form', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/RoomListScreen.jsx', title: 'Room List', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/RoomFormScreen.jsx', title: 'Room Form', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/TenantListScreen.jsx', title: 'Tenant List', scope: 'PROBIS-04' },
  { file: 'src/screens/owner/RentalRequestScreen.jsx', title: 'Rental Requests', scope: 'PROBIS-04' },
  { file: 'src/screens/owner/InvoiceListScreen.jsx', title: 'Invoice List', scope: 'PROBIS-05' },
  { file: 'src/screens/owner/ReportScreen.jsx', title: 'Financial Report', scope: 'PROBIS-07' },
  { file: 'src/screens/owner/ContractScreen.jsx', title: 'Contract', scope: 'PROBIS-06' },
  // Tenant
  { file: 'src/screens/tenant/SearchScreen.jsx', title: 'Search', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/PropertyDetailScreen.jsx', title: 'Property Detail', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/RoomDetailScreen.jsx', title: 'Room Detail', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/FavoriteScreen.jsx', title: 'Favorites', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/RentalRequestFormScreen.jsx', title: 'Rental Request Form', scope: 'PROBIS-04' },
  { file: 'src/screens/tenant/MyRentScreen.jsx', title: 'My Rent', scope: 'PROBIS-04' },
  { file: 'src/screens/tenant/InvoiceDetailScreen.jsx', title: 'Invoice Detail', scope: 'PROBIS-05' },
  { file: 'src/screens/tenant/PaymentScreen.jsx', title: 'Payment', scope: 'PROBIS-05' },
];

// Semua screens berada di src/screens/{category}/ — 2 level dalam dari src/
// Jadi path ke src/constants adalah ../../constants
const CONSTANTS_RELATIVE_PATH = '../../constants';

const generatePlaceholder = ({ file, title, scope }) => {
  const componentName = path.basename(file, '.jsx');
  return `/**
 * ${file}
 * Placeholder Screen — Dikembangkan di ${scope}
 * Screen: ${title}
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '${CONSTANTS_RELATIVE_PATH}/colors';
import { FONT_SIZE, FONT_WEIGHT } from '${CONSTANTS_RELATIVE_PATH}/typography';
import { SPACING } from '${CONSTANTS_RELATIVE_PATH}/spacing';

const ${componentName} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.screenName}>${title}</Text>
      <Text style={styles.scopeLabel}>${scope}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING[6],
  },
  screenName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  scopeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: 20,
  },
});

export default ${componentName};
`;
};

screens.forEach(({ file, title, scope }) => {
  const fullPath = path.join(__dirname, '..', file);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Overwrite existing placeholder files
  fs.writeFileSync(fullPath, generatePlaceholder({ file, title, scope }), 'utf8');
  console.log(`✅ Created/Updated: ${file}`);
});

console.log('\n🎉 Semua placeholder screen berhasil dibuat!');


const screens = [
  // Shared
  { file: 'src/screens/shared/OtpScreen.jsx', title: 'OTP Verification', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/ProfileSetupScreen.jsx', title: 'Profile Setup', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/ProfileScreen.jsx', title: 'Profile', scope: 'PROBIS-01' },
  { file: 'src/screens/shared/NotificationScreen.jsx', title: 'Notifications', scope: 'All' },
  { file: 'src/screens/shared/SettingsScreen.jsx', title: 'Settings', scope: 'All' },
  // Owner
  { file: 'src/screens/owner/DashboardScreen.jsx', title: 'Owner Dashboard', scope: 'PROBIS-07' },
  { file: 'src/screens/owner/PropertyListScreen.jsx', title: 'Property List', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/PropertyFormScreen.jsx', title: 'Property Form', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/RoomListScreen.jsx', title: 'Room List', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/RoomFormScreen.jsx', title: 'Room Form', scope: 'PROBIS-02' },
  { file: 'src/screens/owner/TenantListScreen.jsx', title: 'Tenant List', scope: 'PROBIS-04' },
  { file: 'src/screens/owner/RentalRequestScreen.jsx', title: 'Rental Requests', scope: 'PROBIS-04' },
  { file: 'src/screens/owner/InvoiceListScreen.jsx', title: 'Invoice List', scope: 'PROBIS-05' },
  { file: 'src/screens/owner/ReportScreen.jsx', title: 'Financial Report', scope: 'PROBIS-07' },
  { file: 'src/screens/owner/ContractScreen.jsx', title: 'Contract', scope: 'PROBIS-06' },
  // Tenant
  { file: 'src/screens/tenant/SearchScreen.jsx', title: 'Search', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/PropertyDetailScreen.jsx', title: 'Property Detail', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/RoomDetailScreen.jsx', title: 'Room Detail', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/FavoriteScreen.jsx', title: 'Favorites', scope: 'PROBIS-03' },
  { file: 'src/screens/tenant/RentalRequestFormScreen.jsx', title: 'Rental Request Form', scope: 'PROBIS-04' },
  { file: 'src/screens/tenant/MyRentScreen.jsx', title: 'My Rent', scope: 'PROBIS-04' },
  { file: 'src/screens/tenant/InvoiceDetailScreen.jsx', title: 'Invoice Detail', scope: 'PROBIS-05' },
  { file: 'src/screens/tenant/PaymentScreen.jsx', title: 'Payment', scope: 'PROBIS-05' },
];

const generatePlaceholder = ({ file, title, scope }) => {
  const componentName = path.basename(file, '.jsx');
  return `/**
 * ${file}
 * Placeholder Screen — Dikembangkan di ${scope}
 * Screen: ${title}
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '${file.split('/').map(() => '..').slice(0, -1).join('/')}/../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '${file.split('/').map(() => '..').slice(0, -1).join('/')}/../constants/typography';
import { SPACING } from '${file.split('/').map(() => '..').slice(0, -1).join('/')}/../constants/spacing';

const ${componentName} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.screenName}>${title}</Text>
      <Text style={styles.scopeLabel}>${scope}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING[6] },
  screenName: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  scopeLabel: { fontSize: FONT_SIZE.sm, color: COLORS.primary, backgroundColor: COLORS.primarySurface, paddingHorizontal: SPACING[3], paddingVertical: SPACING[1], borderRadius: 20 },
});

export default ${componentName};
`;
};

screens.forEach(({ file, title, scope }) => {
  const fullPath = path.join(__dirname, '..', file);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, generatePlaceholder({ file, title, scope }), 'utf8');
    console.log(`✅ Created: ${file}`);
  } else {
    console.log(`⚠️  Skipped (exists): ${file}`);
  }
});

console.log('\n🎉 Semua placeholder screen berhasil dibuat!');
