const fs = require('fs');
const path = 'src/screens/shared/ProfileScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  /import \{ logout \} from '\.\.\/\.\.\/services\/authService';/,
  "import { logout, deleteAccount } from '../../services/authService';"
);

// Safe regex for TextInput and Alert
content = content.replace(
  /TextInput,[\r\n]+\} from 'react-native';/,
  "TextInput,\n  Alert,\n} from 'react-native';"
);

// ONLY add Ionicons and useSafeAreaInsets if they are not there
if (!content.includes('import { Ionicons }')) {
  content = content.replace(
    /import \{ useFocusEffect \} from '@react-navigation\/native';/,
    "import { useFocusEffect } from '@react-navigation/native';\nimport { Ionicons } from '@expo/vector-icons';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';"
  );
}

// Add insets to component
if (!content.includes('const insets = useSafeAreaInsets();')) {
  content = content.replace(
    /const \{ t \} = useTranslation\(\);/,
    "const { t } = useTranslation();\n  const insets = useSafeAreaInsets();"
  );
}

// 2. Add handleDeleteAccount
const deleteHandler = `  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun ini secara permanen? Semua data Anda (termasuk properti/kamar yang Anda kelola atau sewa) akan ikut terhapus dan tidak dapat dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Hapus Permanen', 
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const { error } = await deleteAccount();
            setIsSaving(false);
            if (error) {
              Alert.alert('Gagal Menghapus Akun', error.message || 'Terjadi kesalahan saat menghapus akun.');
            } else {
              Alert.alert(
                'Akun Berhasil Dihapus',
                'Akun beserta seluruh data Anda telah dihapus secara permanen dari sistem.',
                [
                  { text: 'Tutup', onPress: () => useAuthStore.getState().clearAuthState() }
                ],
                { cancelable: false }
              );
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile`;
content = content.replace(/  const handleSaveProfile/, deleteHandler);

// 3. Extract and replace InfoRow components
// Remove them from inside the component
content = content.replace(/  const InfoRow = \(\{[\s\S]*?<\/View>\s*\);\s*const EditableInfoRow = \(\{[\s\S]*?<\/View>\s*\);/, '');

// Put them above the component
const outsideComponents = `const InfoRow = ({ label, value, icon, iconColor = COLORS.textSecondary }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  </View>
);

const EditableInfoRow = ({ label, value, onChangeText, icon, placeholder, keyboardType = 'default' }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={styles.infoInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  </View>
);

const ProfileScreen`;
content = content.replace(/const ProfileScreen/, outsideComponents);

// 4. Update usage in render (emojis -> icons)
content = content.replace(/emoji="👤"/g, 'icon="person-outline"');
content = content.replace(/emoji="📧"/g, 'icon="mail-outline"');
content = content.replace(/emoji="📱"/g, 'icon="call-outline"');
content = content.replace(/emoji=\{profile\?\.is_profile_complete \? '✅' : '⚠️'\}/g, 'icon={profile?.is_profile_complete ? "checkmark-circle" : "warning"} iconColor={profile?.is_profile_complete ? COLORS.success : COLORS.warning}');
content = content.replace(/emoji/g, 'icon'); // catch any remaining prop names

// 5. Replace Logout/Delete buttons and dynamic padding
const logoutBlock = `      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutBtnText}>Keluar (Logout)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          <Text style={styles.deleteBtnText}>Hapus Akun Permanen</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: insets.bottom + 100 }} />
    </ScrollView>`;

content = content.replace(
  /{?\/\*\s*Logout\s*\*\/}?[\s\S]*?<TouchableOpacity style=\{styles.logoutBtn\}[\s\S]*?<\/ScrollView>/,
  logoutBlock
);

// 6. Replace avatar edit badge emoji
content = content.replace(
  /<Text style=\{styles\.avatarEditText\}>📷<\/Text>/,
  '<Ionicons name="camera" size={16} color={COLORS.white} />'
);

// 7. Styles
// remove infoEmoji completely, add infoIcon, infoContent, infoInput
content = content.replace(
  /infoEmoji:\s*\{[^}]*\},\s*/,
  "infoIcon: { width: 24, textAlign: 'center', marginRight: SPACING[2] },\n  "
);

content = content.replace(/logoutBtn: \{[\s\S]*?\},/, `logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.errorLight,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
  },`);

content = content.replace(
  /logoutBtnText: \{[\s\S]*?\},/,
  `logoutBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    marginTop: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },`
);

fs.writeFileSync(path, content, 'utf8');
console.log('ProfileScreen.jsx fully restored and fixed');
