/**
 * navigation/TenantNavigator.jsx
 * Navigasi Tenant: Drawer (luar) + Bottom Tab Navigator (dalam)
 *
 * Bottom Tabs: Search, Favorites, MyRent, Notifications
 * Drawer Items: Profile, Settings
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
import { TENANT_SCREENS } from '../constants/screenNames';
import USER_ROLE from '../constants/userRole';

export { TENANT_SCREENS }; // re-export untuk backward compatibility sementara

// Tenant Screens
import SearchScreen from '../screens/tenant/SearchScreen';
import PropertyDetailScreen from '../screens/tenant/PropertyDetailScreen';
import RoomDetailScreen from '../screens/tenant/RoomDetailScreen';
import FavoriteScreen from '../screens/tenant/FavoriteScreen';
import RentalRequestFormScreen from '../screens/tenant/RentalRequestFormScreen';
import MyRentScreen from '../screens/tenant/MyRentScreen';
import InvoiceDetailScreen from '../screens/tenant/InvoiceDetailScreen';
import PaymentScreen from '../screens/tenant/PaymentScreen';

// Shared Screens
import NotificationScreen from '../screens/shared/NotificationScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import CustomTabBar from '../components/navigation/CustomTabBar';

const TenantDrawer = createDrawerNavigator();
const TenantBottomTab = createBottomTabNavigator();
const SearchStack = createStackNavigator();
const MyRentStack = createStackNavigator();

/**
 * Screen name constants
 * (diekspor dari screenNames.js, di-re-export di sini untuk kompatibilitas)
 */


import AddReviewScreen from '../screens/tenant/AddReviewScreen';

/**
 * Stack Navigator untuk alur pencarian dan detail:
 * Search → PropertyDetail → RoomDetail → RentalRequestForm
 */
const SearchStackNavigator = () => (
  <SearchStack.Navigator screenOptions={{ headerShown: false }}>
    <SearchStack.Screen name={TENANT_SCREENS.SEARCH} component={SearchScreen} />
    <SearchStack.Screen name={TENANT_SCREENS.PROPERTY_DETAIL} component={PropertyDetailScreen} />
    <SearchStack.Screen name={TENANT_SCREENS.ROOM_DETAIL} component={RoomDetailScreen} />
    <SearchStack.Screen name={TENANT_SCREENS.RENTAL_REQUEST_FORM} component={RentalRequestFormScreen} />
    <SearchStack.Screen name="AddReviewScreen" component={AddReviewScreen} />
  </SearchStack.Navigator>
);

/**
 * Stack Navigator untuk alur hunian aktif:
 * MyRent → InvoiceDetail → Payment
 */
const MyRentStackNavigator = () => (
  <MyRentStack.Navigator screenOptions={{ headerShown: false }}>
    <MyRentStack.Screen name={TENANT_SCREENS.MY_RENT} component={MyRentScreen} />
    <MyRentStack.Screen name={TENANT_SCREENS.INVOICE_DETAIL} component={InvoiceDetailScreen} />
    <MyRentStack.Screen name={TENANT_SCREENS.PAYMENT} component={PaymentScreen} />
  </MyRentStack.Navigator>
);

/**
 * Bottom Tab Navigator untuk Tenant
 */
const TenantBottomTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <TenantBottomTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <TenantBottomTab.Screen
        name={TENANT_SCREENS.SEARCH_STACK}
        component={SearchStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? TENANT_SCREENS.SEARCH;
          if (routeName !== TENANT_SCREENS.SEARCH) {
            return { tabBarStyle: { display: 'none' } };
          }
          return {};
        }}
      />
      <TenantBottomTab.Screen
        name={TENANT_SCREENS.FAVORITES}
        component={FavoriteScreen}
      />
      <TenantBottomTab.Screen
        name={TENANT_SCREENS.MY_RENT_STACK}
        component={MyRentStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? TENANT_SCREENS.MY_RENT;
          if (routeName !== TENANT_SCREENS.MY_RENT) {
            return { tabBarStyle: { display: 'none' }, unmountOnBlur: true };
          }
          return { unmountOnBlur: true };
        }}
      />
      <TenantBottomTab.Screen
        name={TENANT_SCREENS.NOTIFICATIONS}
        component={NotificationScreen}
      />
      <TenantBottomTab.Screen
        name={TENANT_SCREENS.PROFILE_TAB}
        component={ProfileScreen}
      />
    </TenantBottomTab.Navigator>
  );
};

/**
 * Custom Drawer Content untuk Tenant
 */
const TenantDrawerContent = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser, clearAuthState, switchRole } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    clearAuthState();
  };

  const drawerItems = [
    { label: t('navigation.tenant.profile'), screen: TENANT_SCREENS.PROFILE, icon: '👤' },
    { label: t('navigation.tenant.settings'), screen: TENANT_SCREENS.SETTINGS, icon: '⚙️' },
  ];

  const handleSwitchRole = () => {
    Alert.alert(
      'Beralih Peran',
      'Apakah Anda ingin beralih mode aplikasi menjadi Pemilik Kosan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Beralih',
          onPress: async () => {
            const { updateUserProfile } = require('../services/userService');
            const { data, error } = await updateUserProfile(currentUser.id, {
              role: USER_ROLE.OWNER,
            });
            if (error) {
              Alert.alert('Gagal', error.message);
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
      <View style={styles.drawerHeader}>
        <View style={styles.drawerAvatar}>
          <Text style={styles.drawerAvatarText}>
            {currentUser?.full_name?.[0]?.toUpperCase() ?? 'T'}
          </Text>
        </View>
        <Text style={styles.drawerUserName}>{currentUser?.full_name ?? 'Tenant'}</Text>
        <Text style={styles.drawerUserRole}>{t('auth.register.roleTenant')}</Text>
      </View>

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
        <Text style={[styles.logoutText, { color: COLORS.white }]}>Beralih ke Mode Pemilik</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logoutButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Tenant Root Navigator — Drawer + Bottom Tab
 */
const TenantNavigator = () => {
  return (
    <TenantDrawer.Navigator
      drawerContent={(props) => <TenantDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        swipeEnabled: false,
      }}
    >
      <TenantDrawer.Screen
        name="TenantMain"
        component={TenantBottomTabNavigator}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <TenantDrawer.Screen
        name={TENANT_SCREENS.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <TenantDrawer.Screen
        name={TENANT_SCREENS.SETTINGS}
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </TenantDrawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawer: {
    width: 280,
    backgroundColor: COLORS.white,
  },
  drawerContainer: { flex: 1 },
  drawerHeader: {
    backgroundColor: COLORS.secondary,
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
    color: COLORS.secondary,
  },
  drawerUserName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.white,
  },
  drawerUserRole: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
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

export default TenantNavigator;
