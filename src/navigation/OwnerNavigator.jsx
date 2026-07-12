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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

import COLORS from '../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import useAuthStore from '../store/authStore';
import { logout } from '../services/authService';

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
 */
export const OWNER_SCREENS = {
  // Bottom Tabs
  DASHBOARD: 'OwnerDashboard',
  PROPERTY_STACK: 'PropertyStack',
  INVOICE_LIST: 'OwnerInvoiceList',
  NOTIFICATIONS: 'OwnerNotifications',
  PROFILE_TAB: 'OwnerProfileTab',
  // Stack di dalam Property
  PROPERTY_LIST: 'PropertyList',
  PROPERTY_FORM: 'PropertyForm',
  ROOM_LIST: 'RoomList',
  ROOM_FORM: 'RoomForm',
  RENTAL_REQUEST: 'RentalRequest',
  CONTRACT: 'Contract',
  // Drawer Items
  TENANT_LIST: 'TenantList',
  REPORT: 'Report',
  PROFILE: 'OwnerProfile',
  SETTINGS: 'OwnerSettings',
};

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
      />
      <OwnerBottomTab.Screen
        name={OWNER_SCREENS.PROPERTY_STACK}
        component={PropertyStackNavigator}
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
  const { currentUser, clearAuthState } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    clearAuthState();
  };

  const drawerItems = [
    { label: 'Pengajuan Masuk', screen: OWNER_SCREENS.RENTAL_REQUEST, icon: '📋' },
    { label: t('navigation.owner.tenants'), screen: OWNER_SCREENS.TENANT_LIST, icon: '👥' },
    { label: t('navigation.owner.reports'), screen: OWNER_SCREENS.REPORT, icon: '📈' },
    { label: t('navigation.owner.profile'), screen: OWNER_SCREENS.PROFILE, icon: '👤' },
    { label: t('navigation.owner.settings'), screen: OWNER_SCREENS.SETTINGS, icon: '⚙️' },
  ];

  return (
    <View style={styles.drawerContainer}>
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

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logoutButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

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
        swipeEdgeWidth: 50,
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
        name={OWNER_SCREENS.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <OwnerDrawer.Screen
        name={OWNER_SCREENS.SETTINGS}
        component={SettingsScreen}
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
