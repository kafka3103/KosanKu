const fs = require('fs');

function replaceFile(path, replacements) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    fs.writeFileSync(path, content, 'utf8');
    console.log('Updated ' + path);
  }
}

// 1. NotificationScreen.jsx
replaceFile('src/screens/shared/NotificationScreen.jsx', [
  {
    search: /NOTIF_TYPE_CONFIG = {[\s\S]*?};/,
    replace: `NOTIF_TYPE_CONFIG = {
  rental_request_new: { icon: 'document-text', color: COLORS.info },
  rental_request_approved: { icon: 'checkmark-circle', color: COLORS.success },
  rental_request_rejected: { icon: 'close-circle', color: COLORS.error },
  invoice_generated: { icon: 'receipt', color: COLORS.warning },
  invoice_overdue: { icon: 'alert-circle', color: COLORS.error },
  payment_received: { icon: 'wallet', color: COLORS.success },
  contract_ending: { icon: 'calendar', color: COLORS.warning },
  system: { icon: 'notifications', color: COLORS.grey500 },
};`
  },
  {
    search: /import { useSafeAreaInsets } from 'react-native-safe-area-context';/,
    replace: "import { useSafeAreaInsets } from 'react-native-safe-area-context';\nimport { Ionicons } from '@expo/vector-icons';"
  },
  {
    search: /<Text style=\{styles\.notifEmoji\}>\{config\.emoji\}<\/Text>/,
    replace: `<Ionicons name={config.icon} size={20} color={config.color} />`
  },
  {
    search: /<Text style=\{styles\.emptyEmoji\}>🔔<\/Text>/,
    replace: `<Ionicons name="notifications-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />`
  },
  { search: /notifEmoji: { fontSize: 20 },/, replace: '' },
  { search: /emptyEmoji: { fontSize: 64, marginBottom: SPACING\[4\] },/, replace: 'emptyIcon: { marginBottom: SPACING[4] },' }
]);

// 2. FavoriteScreen.jsx
replaceFile('src/screens/tenant/FavoriteScreen.jsx', [
  {
    search: /import { Ionicons } from '@expo\/vector-icons';/,
    replace: "import { Ionicons } from '@expo/vector-icons';"
  },
  {
    search: /<Text style=\{styles\.emptyEmoji\}>🤍<\/Text>/,
    replace: `<Ionicons name="heart-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />`
  },
  {
    search: /emptyEmoji: { fontSize: 64, marginBottom: SPACING\[4\] },/,
    replace: 'emptyIcon: { marginBottom: SPACING[4] },'
  }
]);

// 3. ContractScreen.jsx
replaceFile('src/screens/owner/ContractScreen.jsx', [
  {
    search: /active: \{ color: COLORS\.success, bg: COLORS\.successLight, label: 'Aktif', emoji: '✅' \},/,
    replace: `active: { color: COLORS.success, bg: COLORS.successLight, label: 'Aktif', icon: 'checkmark-circle' },`
  },
  {
    search: /completed: \{ color: COLORS\.grey500, bg: COLORS\.grey100, label: 'Selesai', emoji: '🏁' \},/,
    replace: `completed: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Selesai', icon: 'flag' },`
  },
  {
    search: /terminated: \{ color: COLORS\.error, bg: COLORS\.errorLight, label: 'Dihentikan', emoji: '🛑' \},/,
    replace: `terminated: { color: COLORS.error, bg: COLORS.errorLight, label: 'Dihentikan', icon: 'stop-circle' },`
  },
  {
    search: /early_exit: \{ color: COLORS\.warning, bg: COLORS\.warningLight, label: 'Keluar Lebih Awal', emoji: '⚡' \},/,
    replace: `early_exit: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Keluar Lebih Awal', icon: 'flash' },`
  },
  {
    search: /<Text style=\{styles\.statusEmoji\}>\{status\.emoji\}<\/Text>/g,
    replace: `<Ionicons name={status.icon} size={12} color={status.color} style={{ marginRight: 4 }} />`
  },
  {
    search: /<Text style=\{styles\.emptyEmoji\}>📄<\/Text>/,
    replace: `<Ionicons name="document-text-outline" size={56} color={COLORS.textTertiary} style={styles.emptyIcon} />`
  },
  { search: /statusEmoji: \{ fontSize: 12 \},/, replace: '' },
  { search: /emptyEmoji: \{ fontSize: 56, marginBottom: SPACING\[3\] \},/, replace: 'emptyIcon: { marginBottom: SPACING[3] },' },
  {
    search: /import { format } from 'date-fns';/,
    replace: "import { format } from 'date-fns';\nimport { Ionicons } from '@expo/vector-icons';"
  }
]);

// 4. SearchScreen.jsx
replaceFile('src/screens/tenant/SearchScreen.jsx', [
  {
    search: /<Ionicons name="home-outline" size=\{64\} color=\{COLORS\.textTertiary\} style=\{styles\.emptyEmoji\} \/>/,
    replace: `<Ionicons name="home-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />`
  },
  {
    search: /emptyEmoji: \{ marginBottom: SPACING\[3\] \},/,
    replace: 'emptyIcon: { marginBottom: SPACING[3] },'
  }
]);

// 5. PropertyFormScreen.jsx
replaceFile('src/screens/owner/PropertyFormScreen.jsx', [
  {
    search: /\{ key: 'parking', label: 'Parkir', emoji: '🅿️' \},/,
    replace: `{ key: 'parking', label: 'Parkir', icon: 'car-outline' },`
  },
  {
    search: /\{ key: 'cctv', label: 'CCTV', emoji: '📹' \},/,
    replace: `{ key: 'cctv', label: 'CCTV', icon: 'videocam-outline' },`
  },
  {
    search: /\{ key: 'security_24h', label: 'Security 24 Jam', emoji: '💂' \},/,
    replace: `{ key: 'security_24h', label: 'Security 24 Jam', icon: 'shield-checkmark-outline' },`
  },
  {
    search: /\{ key: 'wifi_area', label: 'WiFi Area', emoji: '📶' \},/,
    replace: `{ key: 'wifi_area', label: 'WiFi Area', icon: 'wifi-outline' },`
  },
  {
    search: /\{ key: 'laundry', label: 'Laundry', emoji: '👕' \},/,
    replace: `{ key: 'laundry', label: 'Laundry', icon: 'shirt-outline' },`
  },
  {
    search: /\{ key: 'canteen', label: 'Kantin', emoji: '🍽️' \},/,
    replace: `{ key: 'canteen', label: 'Kantin', icon: 'restaurant-outline' },`
  },
  {
    search: /\{ key: 'garden', label: 'Taman', emoji: '🌿' \},/,
    replace: `{ key: 'garden', label: 'Taman', icon: 'leaf-outline' },`
  },
  {
    search: /\{ key: 'gym', label: 'Gym', emoji: '💪' \},/,
    replace: `{ key: 'gym', label: 'Gym', icon: 'barbell-outline' },`
  },
  {
    search: /\{ value: 'male', label: 'Putra', emoji: '👨' \},/,
    replace: `{ value: 'male', label: 'Putra', icon: 'man-outline' },`
  },
  {
    search: /\{ value: 'female', label: 'Putri', emoji: '👩' \},/,
    replace: `{ value: 'female', label: 'Putri', icon: 'woman-outline' },`
  },
  {
    search: /\{ value: 'mixed', label: 'Campur', emoji: '👫' \},/,
    replace: `{ value: 'mixed', label: 'Campur', icon: 'people-outline' },`
  },
  {
    search: /<Text style=\{styles\.coverPhotoEmoji\}>📸<\/Text>/,
    replace: `<Ionicons name="camera-outline" size={32} color={COLORS.primary} style={styles.coverPhotoIcon} />`
  },
  {
    search: /<Text style=\{styles\.genderEmoji\}>\{opt\.emoji\}<\/Text>/,
    replace: `<Ionicons name={opt.icon} size={24} color={value === opt.value ? COLORS.primary : COLORS.textTertiary} style={styles.genderIcon} />`
  },
  {
    search: /<Text style=\{styles\.facilityEmoji\}>\{fac\.emoji\}<\/Text>/,
    replace: `<Ionicons name={fac.icon} size={20} color={isSelected ? COLORS.primary : COLORS.textTertiary} style={styles.facilityIcon} />`
  },
  {
    search: /coverPhotoEmoji: \{[\s\S]*?\},/,
    replace: `coverPhotoIcon: { marginBottom: SPACING[2] },`
  },
  {
    search: /genderEmoji: \{[\s\S]*?\},/,
    replace: `genderIcon: { marginBottom: SPACING[2] },`
  },
  {
    search: /facilityEmoji: \{[\s\S]*?\},/,
    replace: `facilityIcon: { marginRight: SPACING[2] },`
  }
]);

console.log('All icons replaced');
