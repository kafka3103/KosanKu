/**
 * navigation/OwnerNavigator.jsx
 * Navigasi Owner: Drawer (luar) + Bottom Tab Navigator (dalam)
 *
 * Struktur:
 * Drawer
 * └── BottomTabs
 *     ├── Dashboard
 *     ├── Properties (+ Stack: RoomList, RoomForm)
 *     ├── Invoices
 *     └── Notifications
 * Drawer Items Tambahan:
 *     ├── Tenants
 *     ├── Reports
 *     ├── Profile
 *     └── Settings
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import COLORS from '../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import useAuthStore from '../store/authStore';
import { logout } from '../services/authService';
import { OWNER_SCREENS } from '../constants/screenNames';
import USER_ROLE from '../constants/userRole';

export { OWNER_SCREENS }; // re-export untuk backward compatibility sementara

// Owner Screens
import DashboardScreen from '../screens/owner/DashboardScreen';
import PropertyListScreen from '../screens/owner/PropertyListScreen';
import PropertyFormScreen from '../screens/owner/PropertyFormScreen';
import RoomListScreen from '../screens/owner/RoomListScreen';
import RoomFormScreen from '../screens/owner/RoomFormScreen';
import TenantListScreen from '../screens/owner/TenantListScreen';
import RentalRequestScreen from '../screens/owner/RentalRequestScreen';
import InvoiceListScreen from '../screens/owner/InvoiceListScreen';
import ReportScreen from '../screens/owner/ReportScreen';
import ContractScreen from '../screens/owner/ContractScreen';
import FacilityMasterScreen from '../screens/owner/FacilityMasterScreen';


// Shared Screens
import NotificationScreen from '../screens/shared/NotificationScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import CustomTabBar from '../components/navigation/CustomTabBar';


const OwnerDrawer = createDrawerNavigator();
const OwnerBottomTab = createBottomTabNavigator();
const PropertyStack = createStackNavigator();
const DashboardStack = createStackNavigator();

/**
 * Screen name constants untuk mencegah typo
 * (diekspor dari screenNames.js, di-re-export di sini untuk kompatibilitas)
 */


/**
 * Stack navigator untuk alur properti:
 * PropertyList → PropertyForm → RoomList → RoomForm
 */
const PropertyStackNavigator = () => {
  return (
    <PropertyStack.Navigator screenOptions={{ headerShown: false }}>
      <PropertyStack.Screen name={OWNER_SCREENS.PROPERTY_LIST} component={PropertyListScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.PROPERTY_FORM} component={PropertyFormScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.ROOM_LIST} component={RoomListScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.ROOM_FORM} component={RoomFormScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.RENTAL_REQUEST} component={RentalRequestScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.CONTRACT} component={ContractScreen} />
      <PropertyStack.Screen name={OWNER_SCREENS.FACILITY_MASTER} component={FacilityMasterScreen} />
    </PropertyStack.Navigator>
  );
};


/**
 * Stack navigator untuk alur Dashboard agar tidak melompat ke tab Properti:
 * Dashboard → RentalRequest / PropertyForm
 */
const DashboardStackNavigator = () => {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name={OWNER_SCREENS.RENTAL_REQUEST} component={RentalRequestScreen} />
      <DashboardStack.Screen name={OWNER_SCREENS.PROPERTY_FORM} component={PropertyFormScreen} />
      <DashboardStack.Screen name={OWNER_SCREENS.FACILITY_MASTER} component={FacilityMasterScreen} />
    </DashboardStack.Navigator>
  );
};

/**
 * Bottom Tab Navigator untuk Owner
 */
const OwnerBottomTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <OwnerBottomTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.DASHBOARD}
        component={DashboardStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'DashboardMain';
          if (routeName !== 'DashboardMain') {
            return { tabBarStyle: { display: 'none' } };
          }
          return {};
        }}
      />
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.PROPERTY_STACK}
        component={PropertyStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? OWNER_SCREENS.PROPERTY_LIST;
          if (routeName !== OWNER_SCREENS.PROPERTY_LIST) {
            return { tabBarStyle: { display: 'none' } };
          }
          return {};
        }}
      />
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.INVOICE_LIST}
        component={InvoiceListScreen}
      />
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.NOTIFICATIONS}
        component={NotificationScreen}
      />
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.PROFILE_TAB}
        component={ProfileScreen}
      />
    </OwnerBottomTab.Navigator>
  );
};

/**
 * Custom Drawer Content untuk Owner
 */
const OwnerDrawerContent = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser, clearAuthState, switchRole } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    clearAuthState();
  };

  const drawerItems = [
    { label: t('navigation.owner.rentalRequest', 'Pengajuan Masuk'), screen: OWNER_SCREENS.RENTAL_REQUEST, icon: '📋' },
    { label: t('navigation.owner.tenants'), screen: OWNER_SCREENS.TENANT_LIST, icon: '👥' },
    { label: t('navigation.owner.reports'), screen: OWNER_SCREENS.REPORT, icon: '📈' },
    { label: t('navigation.owner.profile'), screen: OWNER_SCREENS.PROFILE, icon: '👤' },
    { label: t('navigation.owner.settings'), screen: OWNER_SCREENS.SETTINGS, icon: '⚙️' },
  ];


  const [hasTenantProfile, setHasTenantProfile] = React.useState(false);

  React.useEffect(() => {
    const checkProfile = async () => {
      const { checkTenantProfileExists } = require('../services/userService');
      const exists = await checkTenantProfileExists(currentUser.id);
      setHasTenantProfile(exists);
    };
    if (currentUser?.id) {
      checkProfile();
    }
  }, [currentUser]);

  const handleSwitchRole = () => {
    if (!hasTenantProfile) {
      navigation.navigate('RoleRegistrationScreen', { targetRole: USER_ROLE.TENANT });
      return;
    }

    Alert.alert(
      t('navigation.switchRole.title', 'Beralih Peran'),
      t('navigation.switchRole.toTenantMsg', 'Apakah Anda ingin beralih mode aplikasi menjadi Pencari Kosan?'),
      [
        { text: t('navigation.switchRole.btnCancel', 'Batal'), style: 'cancel' },
        {
          text: t('navigation.switchRole.btnSwitch', 'Beralih'),
          onPress: async () => {
            const { updateUserProfile } = require('../services/userService');
            const { data, error } = await updateUserProfile(currentUser.id, {
              role: USER_ROLE.TENANT,
            });
            if (error) {
              Alert.alert(t('navigation.switchRole.failTitle', 'Gagal'), error.message);
            } else if (data) {
              useAuthStore.getState().setAuthenticatedUser(
                useAuthStore.getState().currentSession,
                data
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.drawerContainer, { paddingBottom: Math.max(insets.bottom, SPACING[5]) }]}>
      {/* Header Drawer */}
      <View style={styles.drawerHeader}>
        <View style={styles.drawerAvatar}>
          <Text style={styles.drawerAvatarText}>
            {currentUser?.full_name?.[0]?.toUpperCase() ?? 'O'}
          </Text>
        </View>
        <Text style={styles.drawerUserName}>{currentUser?.full_name ?? 'Owner'}</Text>
        <Text style={styles.drawerUserRole}>{t('auth.register.roleOwner')}</Text>
      </View>

      {/* Drawer Menu Items */}
      <View style={styles.drawerMenuContainer}>
        {drawerItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.drawerMenuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.drawerMenuIcon}>{item.icon}</Text>
            <Text style={styles.drawerMenuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: COLORS.primary, marginBottom: SPACING[3] }]} onPress={handleSwitchRole}>
        <Text style={[styles.logoutText, { color: COLORS.white }]}>
          {hasTenantProfile ? t('navigation.switchRole.switchToTenantBtn', 'Beralih ke Mode Pencari') : t('navigation.switchRole.registerTenantBtn', 'Daftar sebagai Pencari Kos')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logoutButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

import RoleRegistrationScreen from '../screens/shared/RoleRegistrationScreen';

/**
 * Owner Root Navigator — Drawer yang membungkus Bottom Tab
 */
const OwnerNavigator = () => {
  return (
    <OwnerDrawer.Navigator
      drawerContent={(props) => <OwnerDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        swipeEnabled: false,
      }}
    >
      {/* Tab Navigator sebagai layar utama Drawer */}
      <OwnerDrawer.Screen
        name="OwnerMain"
        component={OwnerBottomTabNavigator}
        options={{ drawerItemStyle: { display: 'none' } }} // Tersembunyi dari drawer list
      />
      {/* Layar yang hanya bisa diakses dari Drawer */}
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.RENTAL_REQUEST}
        component={RentalRequestScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.TENANT_LIST}
        component={TenantListScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.REPORT}
        component={ReportScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.PROPERTY_FORM}
        component={PropertyFormScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.ROOM_FORM}
        component={RoomFormScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.INVOICE_LIST}
        component={InvoiceListScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name="RoleRegistrationScreen"
        component={RoleRegistrationScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.SETTINGS}
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.FACILITY_MASTER}
        component={FacilityMasterScreen}
        options={{ headerShown: false }}
      />
    </OwnerDrawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawer: {
    width: 280,
    backgroundColor: COLORS.white,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: COLORS.primary,
    padding: SPACING[6],
    paddingTop: SPACING[12],
    alignItems: 'flex-start',
  },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  drawerAvatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  drawerUserName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.white,
  },
  drawerUserRole: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  drawerMenuContainer: {
    flex: 1,
    paddingVertical: SPACING[4],
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[4],
  },
  drawerMenuIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING[4],
  },
  drawerMenuLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  logoutButton: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[5],
  },
  logoutText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default OwnerNavigator;
