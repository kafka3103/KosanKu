/**
 * navigation/AuthNavigator.jsx
 * Stack Navigator untuk alur autentikasi:
 * Login → Register → OTP → ProfileSetup
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/shared/LoginScreen';
import RegisterScreen from '../screens/shared/RegisterScreen';
import OtpScreen from '../screens/shared/OtpScreen';
import ProfileSetupScreen from '../screens/shared/ProfileSetupScreen';
import COLORS from '../constants/colors';

const AuthStack = createStackNavigator();

/**
 * Screen names — definisikan sebagai konstanta untuk mencegah typo
 */
export const AUTH_SCREENS = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'Otp',
  PROFILE_SETUP: 'ProfileSetup',
};

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      initialRouteName={AUTH_SCREENS.LOGIN}
      screenOptions={{
        headerShown: false,     // Header dikustom di masing-masing screen
        cardStyle: { backgroundColor: COLORS.background },
        // Transisi halus antar layar auth
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      <AuthStack.Screen name={AUTH_SCREENS.LOGIN} component={LoginScreen} />
      <AuthStack.Screen name={AUTH_SCREENS.REGISTER} component={RegisterScreen} />
      <AuthStack.Screen
        name={AUTH_SCREENS.OTP}
        component={OtpScreen}
        options={{ gestureEnabled: false }} // Tidak bisa swipe back dari OTP
      />
      <AuthStack.Screen
        name={AUTH_SCREENS.PROFILE_SETUP}
        component={ProfileSetupScreen}
        options={{ gestureEnabled: false }} // Tidak bisa swipe back dari profil setup
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
