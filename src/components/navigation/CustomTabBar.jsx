import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

const { width: windowWidth } = Dimensions.get('window');
const TAB_BAR_MARGIN_LEFT = 24;
const TAB_BAR_WIDTH = windowWidth - (TAB_BAR_MARGIN_LEFT * 2);

// Lebar setiap tab dihitung dinamis berdasarkan jumlah tab
const getTabWidth = (tabCount) => TAB_BAR_WIDTH / tabCount;
const INDICATOR_WIDTH = 50;

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const tabWidth = getTabWidth(tabCount);
  const indicatorMargin = (tabWidth - INDICATOR_WIDTH) / 2;

  const bubbleX = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(bubbleX, {
      toValue: state.index * tabWidth,
      useNativeDriver: false,
      friction: 7,
      tension: 40,
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 16,
        left: TAB_BAR_MARGIN_LEFT,
        right: TAB_BAR_MARGIN_LEFT,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        borderColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      }}
    >
      {/* Animated Bubble Indicator */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 8,
          left: indicatorMargin,
          width: INDICATOR_WIDTH,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${COLORS.primary}20`,
          transform: [{ translateX: bubbleX }],
        }}
      />

      {/* Tab Icons */}
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const tabCenter = index * tabWidth;
        const scale = bubbleX.interpolate({
          inputRange: [tabCenter - tabWidth, tabCenter, tabCenter + tabWidth],
          outputRange: [1, 1.2, 1],
          extrapolate: 'clamp',
        });

        // Tentukan ikon berdasarkan nama route
        let iconName = 'home-outline';

        // Owner Screens
        if (route.name === 'OwnerDashboard') iconName = 'stats-chart-outline';
        else if (route.name === 'PropertyStack') iconName = 'business-outline';
        else if (route.name === 'OwnerInvoiceList') iconName = 'document-text-outline';
        else if (route.name === 'OwnerNotifications') iconName = 'notifications-outline';
        else if (route.name === 'OwnerProfileTab') iconName = 'person-outline';

        // Tenant Screens
        else if (route.name === 'SearchStack') iconName = 'search-outline';
        else if (route.name === 'Favorites') iconName = 'heart-outline';
        else if (route.name === 'MyRentStack') iconName = 'home-outline';
        else if (route.name === 'TenantNotifications') iconName = 'notifications-outline';
        else if (route.name === 'TenantProfileTab') iconName = 'person-outline';

        if (isFocused) {
          iconName = iconName.replace('-outline', '');
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale }],
              }}
            >
              <Ionicons
                name={iconName}
                color={isFocused ? COLORS.primary : COLORS.grey400}
                size={22}
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
