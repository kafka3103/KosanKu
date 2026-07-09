import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

const { width: windowWidth } = Dimensions.get('window');
const TAB_BAR_MARGIN_LEFT = 32;
const TAB_BAR_WIDTH = windowWidth - (TAB_BAR_MARGIN_LEFT * 2);
const TAB_WIDTH = TAB_BAR_WIDTH / 4;
const INDICATOR_WIDTH = 64;
const INDICATOR_MARGIN = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bubbleX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;

  useEffect(() => {
    Animated.spring(bubbleX, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: false,
      friction: 7,
      tension: 40
    }).start();
  }, [state.index]);

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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      }}
    >
      {/* Animated Bubble Indicator */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 8,
          left: INDICATOR_MARGIN,
          width: INDICATOR_WIDTH,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${COLORS.primary}25`, // Transparent primary color
          transform: [{ translateX: bubbleX }],
        }}
      />

      {/* Tab Icons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
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

        const tabCenter = index * TAB_WIDTH;
        const scale = bubbleX.interpolate({
          inputRange: [tabCenter - TAB_WIDTH, tabCenter, tabCenter + TAB_WIDTH],
          outputRange: [1, 1.2, 1],
          extrapolate: 'clamp',
        });

        // Determine icon based on route name
        let iconName = 'home-outline';
        
        // Owner Screens
        if (route.name === 'OwnerDashboard') iconName = 'stats-chart-outline';
        else if (route.name === 'PropertyStack') iconName = 'business-outline';
        else if (route.name === 'OwnerInvoiceList') iconName = 'document-text-outline';
        else if (route.name === 'OwnerNotifications') iconName = 'notifications-outline';
        
        // Tenant Screens
        else if (route.name === 'SearchStack') iconName = 'search-outline';
        else if (route.name === 'Favorites') iconName = 'heart-outline';
        else if (route.name === 'MyRentStack') iconName = 'home-outline';
        else if (route.name === 'TenantNotifications') iconName = 'notifications-outline';

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
            <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
              <Ionicons 
                name={iconName} 
                color={isFocused ? COLORS.primary : COLORS.grey400} 
                size={24} 
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
